import { Router } from 'express';

import { prisma } from '@/db/prisma';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';
import { auditLog } from '@/modules/audit/audit.middleware';

import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

const usersRepository = new UsersRepository(prisma);
const usersService = new UsersService(usersRepository);
const usersController = new UsersController(usersService);

export const usersRouter = Router();

usersRouter.use(auditLog());

usersRouter.get('/', authenticate, authorize('admin'), (req, res, next) =>
  usersController.list(req, res).catch(next),
);

usersRouter.get('/:id', authenticate, authorize('self', 'admin'), (req, res, next) =>
  usersController.getById(req, res).catch(next),
);

usersRouter.patch('/:id/block', authenticate, authorize('self', 'admin'), (req, res, next) =>
  usersController.block(req, res).catch(next),
);
