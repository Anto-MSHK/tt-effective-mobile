import { z } from 'zod';

/** Минимум 8 символов, 1 заглавная, 1 цифра, 1 спецсимвол (PRD). */
export const PASSWORD_POLICY_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const passwordPolicyMessage =
  'Password must be at least 8 characters and include uppercase, digit, and special character';

export const passwordFieldSchema = z
  .string()
  .regex(PASSWORD_POLICY_REGEX, passwordPolicyMessage);
