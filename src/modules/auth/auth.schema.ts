import { z } from 'zod';

import { passwordFieldSchema } from '@/utils/password-policy';

const dateOfBirthString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD');

export const registerSchema = z.object({
  fullName: z.string().min(1).max(255),
  dateOfBirth: dateOfBirthString,
  email: z.string().min(1).max(255).email(),
  password: passwordFieldSchema,
});

export const loginSchema = z.object({
  email: z.string().min(1).email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
