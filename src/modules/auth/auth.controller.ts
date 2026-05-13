import type { Request, Response } from 'express';

import { AppError } from '@/utils/app-error';

import {
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
} from './auth.schema';
import { AuthService } from './auth.service';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * @openapi
   * /auth/register:
   *   post:
   *     tags: [Auth]
   *     summary: Регистрация пользователя
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [fullName, dateOfBirth, email, password]
   *             properties:
   *               fullName: { type: string }
   *               dateOfBirth: { type: string, format: date }
   *               email: { type: string, format: email }
   *               password: { type: string }
   *     responses:
   *       '201': { description: Пользователь создан }
   *       '400': { description: Ошибка валидации }
   *       '409': { description: Email занят }
   *       '422': { description: Возраст меньше 18 лет }
   */
  register = async (req: Request, res: Response): Promise<void> => {
    const body = registerSchema.parse(req.body);
    const result = await this.authService.register(body);
    res.status(201).json(result);
  };

  /**
   * @openapi
   * /auth/login:
   *   post:
   *     tags: [Auth]
   *     summary: Вход (access + refresh токены)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string }
   *     responses:
   *       '200': { description: Успешный вход }
   *       '401': { description: Неверные учётные данные }
   */
  login = async (req: Request, res: Response): Promise<void> => {
    const body = loginSchema.parse(req.body);
    const result = await this.authService.login(body);
    res.status(200).json(result);
  };

  /**
   * @openapi
   * /auth/refresh:
   *   post:
   *     tags: [Auth]
   *     summary: Обновление пары токенов (rotation)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *             properties:
   *               refreshToken: { type: string }
   *     responses:
   *       '200': { description: Новая пара токенов }
   *       '401': { description: Невалидный или отозванный refresh }
   */
  refresh = async (req: Request, res: Response): Promise<void> => {
    const body = refreshSchema.parse(req.body);
    const result = await this.authService.refresh(body);
    res.status(200).json(result);
  };

  /**
   * @openapi
   * /auth/logout:
   *   post:
   *     tags: [Auth]
   *     summary: Выход (отзыв refresh-токена)
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [refreshToken]
   *             properties:
   *               refreshToken: { type: string }
   *     responses:
   *       '204': { description: Сессия завершена }
   *       '401': { description: Не авторизован }
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    const body = logoutSchema.parse(req.body);
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    await this.authService.logout(req.user.sub, body);
    res.status(204).send();
  };
}
