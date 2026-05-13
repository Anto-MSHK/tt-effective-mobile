import { z } from 'zod';

export const listAuditLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  action: z
    .string()
    .trim()
    .max(64)
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
});

export type ListAuditLogQuery = z.infer<typeof listAuditLogQuerySchema>;
