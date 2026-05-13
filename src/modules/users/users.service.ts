import { Prisma } from '@prisma/client';

import { publishUserBlocked } from '@/utils/events';
import { AppError } from '@/utils/app-error';

import type { ListUsersQuery } from './users.schema';
import type { UserPublicRow } from './users.repository';
import { UsersRepository } from './users.repository';

function toPublicUser(user: UserPublicRow) {
  return {
    id: user.id,
    fullName: user.fullName,
    dateOfBirth: user.dateOfBirth.toISOString().slice(0, 10),
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async getById(userId: string): Promise<ReturnType<typeof toPublicUser>> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }
    return toPublicUser(user);
  }

  async listUsers(query: ListUsersQuery): Promise<{
    data: ReturnType<typeof toPublicUser>[];
    meta: { total: number; page: number; lastPage: number; hasNext: boolean };
  }> {
    const { page, limit, role, status, search, sortBy, order } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (role) {
      where.role = role;
    }
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = { [sortBy]: order };

    const { total, items } = await this.repo.findManyPaginated({
      skip,
      take: limit,
      where,
      orderBy,
    });

    const lastPage = Math.max(1, Math.ceil(total / limit));
    const hasNext = page < lastPage;

    return {
      data: items.map(toPublicUser),
      meta: { total, page, lastPage, hasNext },
    };
  }

  async blockUser(actorId: string, targetUserId: string): Promise<ReturnType<typeof toPublicUser>> {
    const existing = await this.repo.findById(targetUserId);
    if (!existing) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const wasActive = existing.isActive;
    let user: UserPublicRow;
    try {
      user = await this.repo.blockUser(targetUserId);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
      }
      throw err;
    }

    if (wasActive) {
      await publishUserBlocked({ userId: targetUserId, actorId });
    }

    return toPublicUser(user);
  }
}
