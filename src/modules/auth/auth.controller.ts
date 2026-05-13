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

  register = async (req: Request, res: Response): Promise<void> => {
    const body = registerSchema.parse(req.body);
    const result = await this.authService.register(body);
    res.status(201).json(result);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const body = loginSchema.parse(req.body);
    const result = await this.authService.login(body);
    res.status(200).json(result);
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const body = refreshSchema.parse(req.body);
    const result = await this.authService.refresh(body);
    res.status(200).json(result);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const body = logoutSchema.parse(req.body);
    if (!req.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    await this.authService.logout(req.user.sub, body);
    res.status(204).send();
  };
}
