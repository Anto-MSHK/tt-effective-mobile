import type { Request, Response } from 'express';

import { AppError } from '@/utils/app-error';

import { listUsersQuerySchema } from './users.schema';
import { UsersService } from './users.service';

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * @openapi
   * /users:
   *   get:
   *     tags: [Users]
   *     summary: Список пользователей (admin)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, minimum: 1, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
   *       - in: query
   *         name: role
   *         schema: { type: string, enum: [admin, user] }
   *       - in: query
   *         name: status
   *         schema: { type: string, enum: [active, inactive] }
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *       - in: query
   *         name: sortBy
   *         schema: { type: string, enum: [createdAt, fullName, email] }
   *       - in: query
   *         name: order
   *         schema: { type: string, enum: [asc, desc] }
   *     responses:
   *       '200': { description: Пагинированный список }
   *       '401': { description: Не авторизован }
   *       '403': { description: Не admin }
   */
  list = async (req: Request, res: Response): Promise<void> => {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await this.usersService.listUsers(query);
    res.status(200).json(result);
  };

  /**
   * @openapi
   * /users/{id}:
   *   get:
   *     tags: [Users]
   *     summary: Профиль пользователя (self или admin)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       '200': { description: Профиль }
   *       '403': { description: Нет доступа }
   *       '404': { description: Пользователь не найден }
   */
  getById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const user = await this.usersService.getById(id);
    res.status(200).json(user);
  };

  /**
   * @openapi
   * /users/{id}/block:
   *   patch:
   *     tags: [Users]
   *     summary: Блокировка пользователя (self или admin)
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       '200': { description: Пользователь заблокирован }
   *       '403': { description: Нет доступа }
   *       '404': { description: Пользователь не найден }
   */
  block = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    const user = await this.usersService.blockUser(req.user.sub, id);
    res.status(200).json(user);
  };
}
