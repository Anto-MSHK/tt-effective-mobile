import type { PrismaClient, Role, User } from '@prisma/client';

import { env } from '@/config/env';

export class AuthRepository {
  constructor(private readonly db: PrismaClient) {}

  findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  }

  createUser(data: {
    fullName: string;
    email: string;
    passwordHash: string;
    dateOfBirth: Date;
    role?: Role;
  }): Promise<User> {
    return this.db.user.create({
      data: {
        fullName: data.fullName,
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        dateOfBirth: data.dateOfBirth,
        role: data.role ?? 'user',
      },
    });
  }

  findValidRefreshTokenByHash(tokenHash: string) {
    return this.db.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });
  }

  createRefreshToken(userId: string, tokenHash: string): Promise<{ id: string }> {
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL * 1000);
    return this.db.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
      select: { id: true },
    });
  }

  async rotateRefreshToken(oldTokenId: string, userId: string, newTokenHash: string): Promise<void> {
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL * 1000);
    await this.db.$transaction([
      this.db.refreshToken.update({
        where: { id: oldTokenId },
        data: { revokedAt: new Date() },
      }),
      this.db.refreshToken.create({
        data: {
          userId,
          tokenHash: newTokenHash,
          expiresAt,
        },
      }),
    ]);
  }

  revokeRefreshTokenById(id: string): Promise<void> {
    return this.db.refreshToken
      .update({
        where: { id },
        data: { revokedAt: new Date() },
      })
      .then(() => undefined);
  }
}
