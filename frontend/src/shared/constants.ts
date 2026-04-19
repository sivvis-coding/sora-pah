// ─── App ──────────────────────────────────────────────────────────────────────

export const APP_NAME = 'SORA';

// ─── Layout ───────────────────────────────────────────────────────────────────

export const DRAWER_WIDTH = 240;  // mobile temporary drawer
export const RAIL_WIDTH = 72;     // desktop icon rail

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

// ─── External links ───────────────────────────────────────────────────────────
// Replace with real URLs from environment variables when available.

export const EXTERNAL_LINKS = {
  /** Freshservice portal for bug/incident reporting */
  FRESHSERVICE: (import.meta as any).env?.VITE_FRESHSERVICE_URL ?? 'https://support.example.com',
  /** Internal help / knowledge base */
  HELP: (import.meta as any).env?.VITE_HELP_URL ?? '/help',
} as const;
