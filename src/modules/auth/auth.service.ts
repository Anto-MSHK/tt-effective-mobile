import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

import { env } from '@/config/env';
import { publishUserRegistered } from '@/utils/events';
import { isAtLeast18YearsOld } from '@/utils/age-check';
import { AppError } from '@/utils/app-error';
import { hashToken, signAccess, signRefresh } from '@/utils/token';

import type { LoginInput, LogoutInput, RefreshInput, RegisterInput } from './auth.schema';
import { AuthRepository } from './auth.repository';

function parseDateOnlyUtc(yyyyMmDd: string): Date {
  return new Date(`${yyyyMmDd}T00:00:00.000Z`);
}

function publicUser(user: {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}

export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  async register(input: RegisterInput): Promise<{
    accessToken: string;
    refreshToken: string;
    user: ReturnType<typeof publicUser>;
  }> {
    const dateOfBirth = parseDateOnlyUtc(input.dateOfBirth);
    if (!isAtLeast18YearsOld(dateOfBirth)) {
      throw new AppError(422, 'AGE_TOO_YOUNG', 'User must be at least 18 years old');
    }

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
    let user;
    try {
      user = await this.repo.createUser({
        fullName: input.fullName.trim(),
        email: input.email,
        passwordHash,
        dateOfBirth,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new AppError(409, 'EMAIL_TAKEN', 'Email already registered');
      }
      throw err;
    }

    const refreshPlain = signRefresh();
    await this.repo.createRefreshToken(user.id, hashToken(refreshPlain));
    const accessToken = signAccess(user.id, user.role);

    await publishUserRegistered({ userId: user.id, email: user.email });

    return {
      accessToken,
      refreshToken: refreshPlain,
      user: publicUser(user),
    };
  }

  async login(input: LoginInput): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.repo.findByEmail(input.email);
    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
    }
    if (!user.isActive) {
      throw new AppError(403, 'FORBIDDEN', 'Account is disabled');
    }

    const match = await bcrypt.compare(input.password, user.passwordHash);
    if (!match) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
    }

    const refreshPlain = signRefresh();
    await this.repo.createRefreshToken(user.id, hashToken(refreshPlain));
    const accessToken = signAccess(user.id, user.role);

    return { accessToken, refreshToken: refreshPlain };
  }

  async refresh(input: RefreshInput): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = hashToken(input.refreshToken);
    const row = await this.repo.findValidRefreshTokenByHash(tokenHash);
    if (!row) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
    }
    if (!row.user.isActive) {
      throw new AppError(403, 'FORBIDDEN', 'Account is disabled');
    }

    const newPlain = signRefresh();
    const newHash = hashToken(newPlain);
    await this.repo.rotateRefreshToken(row.id, row.userId, newHash);
    const accessToken = signAccess(row.user.id, row.user.role);

    return { accessToken, refreshToken: newPlain };
  }

  async logout(userId: string, input: LogoutInput): Promise<void> {
    const tokenHash = hashToken(input.refreshToken);
    const row = await this.repo.findValidRefreshTokenByHash(tokenHash);
    if (!row) {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired refresh token');
    }
    if (row.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Refresh token does not belong to the current user');
    }
    await this.repo.revokeRefreshTokenById(row.id);
  }
}
