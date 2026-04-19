export const UserRole = {
  ADMIN: 'admin',
  STANDARD: 'standard',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
