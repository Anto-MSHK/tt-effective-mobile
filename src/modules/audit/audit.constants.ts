/** Значения `audit_log.action` (PRD: VARCHAR(64)) */
export const AuditAction = {
  LIST_USERS: 'LIST_USERS',
  GET_USER: 'GET_USER',
  BLOCK_USER: 'BLOCK_USER',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];
