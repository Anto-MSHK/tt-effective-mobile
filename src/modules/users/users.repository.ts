import type { Prisma, PrismaClient } from '@prisma/client';

const userPublicSelect = {
  id: true,
  fullName: true,
  dateOfBirth: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type UserPublicRow = Prisma.UserGetPayload<{ select: typeof userPublicSelect }>;

export class UsersRepository {
  constructor(private readonly db: PrismaClient) {}

  findById(id: string): Promise<UserPublicRow | null> {
    return this.db.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });
  }

  async findManyPaginated(params: {
    skip: number;
    take: number;
    where: Prisma.UserWhereInput;
    orderBy: Prisma.UserOrderByWithRelationInput;
  }): Promise<{ total: number; items: UserPublicRow[] }> {
    const { skip, take, where, orderBy } = params;
    const [total, items] = await Promise.all([
      this.db.user.count({ where }),
      this.db.user.findMany({
        where,
        skip,
        take,
        orderBy,
        select: userPublicSelect,
      }),
    ]);
    return { total, items };
  }

  blockUser(id: string): Promise<UserPublicRow> {
    return this.db.user.update({
      where: { id },
      data: { isActive: false },
      select: userPublicSelect,
    });
  }
}
