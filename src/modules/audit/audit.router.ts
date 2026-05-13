import { Router } from 'express';

import { prisma } from '@/db/prisma';
import { authenticate } from '@/middlewares/authenticate';
import { authorize } from '@/middlewares/authorize';

import { AuditController } from './audit.controller';
import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';

const auditRepository = new AuditRepository(prisma);
const auditService = new AuditService(auditRepository);
const auditController = new AuditController(auditService);

export const auditRouter = Router();

auditRouter.get('/', authenticate, authorize('admin'), (req, res, next) =>
  auditController.list(req, res).catch(next),
);
