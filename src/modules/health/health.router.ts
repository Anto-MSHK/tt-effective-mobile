import { Router } from 'express';

import { healthCheck } from './health.controller';

export const healthRouter = Router();

healthRouter.get('/', (req, res, next) => healthCheck(req, res).catch(next));
