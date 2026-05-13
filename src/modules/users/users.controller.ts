import type { Request, Response } from 'express';

import { AppError } from '@/utils/app-error';

import { listUsersQuerySchema } from './users.schema';
import { UsersService } from './users.service';

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await this.usersService.listUsers(query);
    res.status(200).json(result);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const user = await this.usersService.getById(id);
    res.status(200).json(user);
  };

  block = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    const user = await this.usersService.blockUser(req.user.sub, id);
    res.status(200).json(user);
  };
}
