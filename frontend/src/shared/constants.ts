// ─── App ──────────────────────────────────────────────────────────────────────

export const APP_NAME = 'SORA';

// ─── Layout ───────────────────────────────────────────────────────────────────

export const DRAWER_WIDTH = 240;

// ─── localStorage keys ────────────────────────────────────────────────────────

export const STORAGE_KEYS = {
  TOKEN: 'sora_token',
  ADMIN_TOKEN: 'sora_admin_token',
  MODE: 'sora_mode',
  LANG: 'sora_lang',
} as const;

// ─── User roles ───────────────────────────────────────────────────────────────

export const UserRole = {
  ADMIN: 'admin',
  STANDARD: 'standard',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// ─── App modes ────────────────────────────────────────────────────────────────

export const AppMode = {
  ADMIN: 'admin',
  STAKEHOLDER: 'stakeholder',
} as const;

export type AppMode = (typeof AppMode)[keyof typeof AppMode];
