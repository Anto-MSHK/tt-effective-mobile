import type { ListAuditLogQuery } from './audit.schema';
import type { AuditLogRow } from './audit.repository';
import { AuditRepository } from './audit.repository';

function toPublicEntry(row: AuditLogRow) {
  return {
    id: row.id,
    actorId: row.actorId,
    targetId: row.targetId,
    action: row.action,
    ip: row.ip,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
  };
}

export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  async list(query: ListAuditLogQuery): Promise<{
    data: ReturnType<typeof toPublicEntry>[];
    meta: { total: number; page: number; lastPage: number; hasNext: boolean };
  }> {
    const { page, limit, action } = query;
    const skip = (page - 1) * limit;

    const where = action ? { action } : {};

    const { total, items } = await this.repo.findManyPaginated({
      skip,
      take: limit,
      where,
    });

    const lastPage = Math.max(1, Math.ceil(total / limit));
    const hasNext = page < lastPage;

    return {
      data: items.map(toPublicEntry),
      meta: { total, page, lastPage, hasNext },
    };
  }
}
