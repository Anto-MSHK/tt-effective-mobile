import { Router } from 'express';

import { prisma } from '@/db/prisma';
import { authenticate } from '@/middlewares/authenticate';

import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';

const authRepository = new AuthRepository(prisma);
const authService = new AuthService(authRepository);
const authController = new AuthController(authService);

export const authRouter = Router();

authRouter.post('/register', (req, res, next) => authController.register(req, res).catch(next));
authRouter.post('/login', (req, res, next) => authController.login(req, res).catch(next));
authRouter.post('/refresh', (req, res, next) => authController.refresh(req, res).catch(next));
authRouter.post('/logout', authenticate, (req, res, next) => authController.logout(req, res).catch(next));
