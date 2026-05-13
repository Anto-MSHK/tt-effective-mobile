import type { Request, Response } from 'express';

import { listAuditLogQuerySchema } from './audit.schema';
import { AuditService } from './audit.service';

export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * @openapi
   * /audit-log:
   *   get:
   *     tags: [Audit]
   *     summary: Журнал аудита (admin)
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
   *         name: action
   *         schema: { type: string, maxLength: 64 }
   *     responses:
   *       '200':
   *         description: Пагинированный список записей
   *       '401':
   *         description: Не авторизован
   *       '403':
   *         description: Не admin
   */
  list = async (req: Request, res: Response): Promise<void> => {
    const query = listAuditLogQuerySchema.parse(req.query);
    const result = await this.auditService.list(query);
    res.status(200).json(result);
  };
}
