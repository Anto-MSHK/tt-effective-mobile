import type { Prisma, PrismaClient } from '@prisma/client';

const auditRowSelect = {
  id: true,
  actorId: true,
  targetId: true,
  action: true,
  ip: true,
  userAgent: true,
  createdAt: true,
} satisfies Prisma.AuditLogSelect;

export type AuditLogRow = Prisma.AuditLogGetPayload<{ select: typeof auditRowSelect }>;

export class AuditRepository {
  constructor(private readonly db: PrismaClient) {}

  async findManyPaginated(params: {
    skip: number;
    take: number;
    where: Prisma.AuditLogWhereInput;
  }): Promise<{ total: number; items: AuditLogRow[] }> {
    const { skip, take, where } = params;
    const [total, items] = await Promise.all([
      this.db.auditLog.count({ where }),
      this.db.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: auditRowSelect,
      }),
    ]);
    return { total, items };
  }
}
