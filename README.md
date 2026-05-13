# User Management Service

Тестовое задание Effective Mobile — сервис управления пользователями на Node.js + TypeScript.

## Стек

| Слой | Технология |
|---|---|
| Runtime | Node.js 20 LTS + TypeScript 5 |
| Framework | Express 4 |
| База данных | PostgreSQL 16 |
| ORM | Prisma 5 |
| Cache / Events | Redis 7 (rate limiting + Pub/Sub) |
| Auth | JWT: access 15m + refresh 7d + rotation |
| Валидация | Zod |
| Логирование | Pino (JSON в prod, pretty в dev) |
| Тесты | Jest + Supertest |
| Инфраструктура | Docker + docker-compose |

---

## Быстрый старт (Docker)

```bash
cp .env.example .env
docker compose up --build
```

После старта:

| Сервис | URL |
|---|---|
| API | http://localhost:3000 |
| Swagger UI | http://localhost:3000/docs |
| Health check | http://localhost:3000/health |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

Миграции и seed первого admin применяются автоматически при старте контейнера.

**Учётные данные admin по умолчанию** (из `.env.example`):
- Email: `admin@example.com`
- Пароль: `Admin1!Strong`

---

## Локальный запуск (без Docker)

Требования: Node.js ≥ 20, PostgreSQL 16, Redis 7.

```bash
cp .env.example .env
# Отредактировать .env: поменять хосты db → localhost, redis → localhost

npm install
npx prisma migrate dev
npm run db:seed   # создать первого admin
npm run dev
```

---

## Переменные окружения

Все переменные описаны Zod-схемой и валидируются при старте. Невалидный `.env` завершает процесс с понятной ошибкой.

| Переменная | Описание | Пример |
|---|---|---|
| `DATABASE_URL` | Строка подключения Prisma | `postgresql://app:secret@db:5432/userservice` |
| `JWT_SECRET` | Секрет для подписи токенов (≥ 32 символа) | `change-me-in-production-min-32-chars` |
| `ACCESS_TOKEN_TTL` | Время жизни access token (сек) | `900` |
| `REFRESH_TOKEN_TTL` | Время жизни refresh token (сек) | `604800` |
| `BCRYPT_ROUNDS` | Раунды bcrypt | `12` |
| `REDIS_URL` | Строка подключения Redis | `redis://redis:6379` |
| `RATE_LIMIT_MAX` | Максимум запросов на `/auth/*` за окно | `5` |
| `RATE_LIMIT_WINDOW_MS` | Окно rate-limit (мс) | `900000` |
| `PORT` | Порт сервера | `3000` |
| `NODE_ENV` | Окружение | `development` / `production` |
| `CORS_ORIGIN` | Разрешённые origins (через запятую или `*`) | `*` |
| `SEED_ADMIN_EMAIL` | Email первого admin | `admin@example.com` |
| `SEED_ADMIN_PASSWORD` | Пароль первого admin | `Admin1!Strong` |

---

## API

### Публичные эндпоинты

| Метод | Путь | Описание |
|---|---|---|
| `POST` | `/auth/register` | Регистрация нового пользователя |
| `POST` | `/auth/login` | Авторизация, получение токенов |
| `POST` | `/auth/refresh` | Обновление токена (rotation) |
| `GET` | `/health` | Health-check сервиса |

### Аутентифицированные эндпоинты

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| `POST` | `/auth/logout` | user / admin | Выход, отзыв refresh-токена |
| `GET` | `/users/:id` | self / admin | Получить пользователя по ID |
| `GET` | `/users` | admin | Список пользователей |
| `PATCH` | `/users/:id/block` | self / admin | Заблокировать пользователя |
| `GET` | `/audit-log` | admin | Журнал действий |

### Заголовки авторизации

```
Authorization: Bearer <accessToken>
```

### Примеры запросов

**Регистрация:**
```json
POST /auth/register
{
  "fullName": "Иван Иванов",
  "dateOfBirth": "2000-01-15",
  "email": "ivan@example.com",
  "password": "Secure1!"
}
```

**Авторизация:**
```json
POST /auth/login
{
  "email": "ivan@example.com",
  "password": "Secure1!"
}
// Ответ: { "accessToken": "...", "refreshToken": "..." }
```

**Список пользователей (admin):**
```
GET /users?page=1&limit=20&role=user&status=active&search=Иван&sortBy=createdAt&order=desc
```

### Формат ошибок

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "password: минимум 8 символов",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

| HTTP | Код | Ситуация |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Невалидные данные (Zod) |
| 401 | `UNAUTHORIZED` | Нет токена или токен истёк |
| 403 | `FORBIDDEN` | Недостаточно прав |
| 404 | `USER_NOT_FOUND` | Пользователь не найден |
| 409 | `EMAIL_TAKEN` | Email уже зарегистрирован |
| 422 | `AGE_TOO_YOUNG` | Пользователь младше 18 лет |
| 429 | `RATE_LIMITED` | Превышен лимит попыток авторизации |
| 500 | `INTERNAL_ERROR` | Непредвиденная ошибка |

---

## Парольная политика

- Минимум 8 символов
- Минимум 1 заглавная буква
- Минимум 1 цифра
- Минимум 1 спецсимвол (`!@#$%^&*` и т.д.)

---

## Структура проекта

```
src/
  config/          # валидация env (Zod), логгер, Swagger
  db/              # Prisma client singleton, Redis client
  modules/
    auth/          # register, login, refresh, logout
    users/         # get, list, block
    audit/         # audit-log middleware + controller
    health/        # health-check endpoint
  middlewares/     # authenticate, authorize, rate-limiter, request-id, error-handler
  utils/           # age-check, password-policy, token helpers, AppError
  types/           # расширения типов Express
  app.ts           # Express app factory
  server.ts        # graceful shutdown, port binding
prisma/
  schema.prisma    # модели: User, RefreshToken, AuditLog
  migrations/      # SQL-миграции
  seed.ts          # создание первого admin
tests/
  unit/            # тесты утилит и сервисов с mock-репозиториями
  integration/     # end-to-end тесты через Supertest
```

---

## Команды

| Команда | Описание |
|---|---|
| `npm run dev` | Запуск в режиме разработки (tsx watch) |
| `npm run build` | Сборка TypeScript → dist/ |
| `npm start` | Запуск собранного приложения |
| `npm test` | Запустить все тесты |
| `npm run test:coverage` | Тесты с отчётом покрытия |
| `npm run lint` | Проверка ESLint |
| `npm run lint:fix` | Автоисправление ESLint |
| `npm run format` | Форматирование Prettier |
| `npm run db:migrate:dev` | Применить новые миграции (dev) |
| `npm run db:seed` | Создать первого admin |
| `docker compose up --build` | Поднять весь стек |
| `docker compose down -v` | Остановить и удалить volumes |
| `npx prisma studio` | GUI для просмотра БД |

---

## Тесты

```bash
# Все тесты
npm test

# С отчётом покрытия
npm run test:coverage

# Интеграционные тесты требуют запущенного PostgreSQL и Redis.
# Используйте отдельный compose для тестовой среды:
docker compose -f docker-compose.test.yml up -d
npm test
docker compose -f docker-compose.test.yml down -v
```

Порог покрытия: **≥ 80%**. Критические ветки (auth, block, role-check) покрыты на 100%.

---

## Архитектура

Слоистая архитектура: `Controller → Service → Repository`.

- **Controller** — только HTTP in/out, никакой бизнес-логики
- **Service** — бизнес-логика, без прямых обращений к Prisma
- **Repository** — только запросы к БД
- **Middleware** — сквозная логика (auth, rate-limit, трейсинг, обработка ошибок)

### Refresh Token Rotation

При каждом `/auth/refresh` старый токен аннулируется и выдаётся новая пара. Refresh-токен хранится в БД как SHA-256 хэш. При компрометации — `/auth/logout` отзывает всю сессию.

### Redis

- **Rate Limiting** — `INCR + TTL` по ключу `rl:{ip}`. Работает при горизонтальном масштабировании.
- **Pub/Sub** — события `user.registered` и `user.blocked` публикуются в Redis-каналы (заготовка под email/push-уведомления).

### Request Tracing

Каждый запрос получает уникальный `X-Request-ID` (UUID v4), который пробрасывается в заголовки ответа и во все логи.
