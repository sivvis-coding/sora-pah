# AGENTS.md

## Project structure

Monorepo — no workspace manager, two independent packages each with their own `pnpm-lock.yaml`:

- `backend/` — NestJS REST API (TypeScript, CommonJS)
- `frontend/` — React SPA (TypeScript, Vite, ESM)

No root `package.json`. No CI workflows.

## Package manager

**pnpm only** (not npm/yarn). Both packages pin the exact version:
```
packageManager: pnpm@10.33.0+sha512...
```
Use `corepack enable` to activate the pinned version automatically.

## Commands

Run from the respective package directory.

### Backend (`backend/`)

```
pnpm install
pnpm run build          # nest build → dist/ (deleteOutDir: true — always wipes dist)
pnpm run start:dev      # nest start --watch
pnpm run start:prod     # node dist/main.js
pnpm run lint           # eslint "{src,test}/**/*.ts" — NOTE: no eslint config file exists; will fail
```

- `nest build` uses `tsconfig.build.json` (not `tsconfig.json`) — excludes `test/`
- No `test` script configured

### Frontend (`frontend/`)

```
pnpm install
pnpm run dev            # vite dev server :5173, proxies /api → localhost:3000
pnpm run build          # tsc -b && vite build → dist/
pnpm run preview        # vite preview (serves built dist/)
```

- No `lint` script. No `test` script.

### Type-checking

```bash
# Backend — uses tsconfig.build.json implicitly via nest; for raw check:
cd backend && npx tsc --noEmit

# Frontend — tsconfig.json has "noEmit": true
cd frontend && npx tsc -b
```

### Docker (root)

```bash
# Production
docker-compose up --build
# → backend on :3000, frontend (nginx) on :8080

# Dev (hot-reload, volume mounts)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
# → backend on :3000, frontend (vite) on :80
```

## Environment variables

Copy `backend/.env.example` → `backend/.env`. Frontend uses `VITE_*` vars at build time.

**Backend — hard requirements (app crashes on missing):**
```
COSMOS_ENDPOINT=     # throws Error at bootstrap if absent
COSMOS_KEY=          # throws Error at bootstrap if absent
```

**Backend — auth:**
```
AUTH_DEV_MODE=true          # enables /api/auth/dev-token, ignores token expiry
AUTH_DEV_SECRET=sora-dev-secret-change-me
AZURE_AD_TENANT_ID=         # required in production
AZURE_AD_CLIENT_ID=         # required in production (JWT audience)
AZURE_AD_CLIENT_SECRET=     # MS Graph OBO flow
PORT=3000
CORS_ORIGIN=http://localhost:5173
COSMOS_DATABASE_NAME=sora   # optional, defaults to "sora"
```

**Backend — optional (mock fallbacks if missing):**
```
OPENAI_API_KEY=             # AI falls back to mock responses if absent
CLICKUP_API_KEY=
CLICKUP_LIST_ID=
CLICKUP_PRODUCT_BACKLOG_LIST_ID=
CLICKUP_TEAM_ID=
CLICKUP_DOCS_FOLDER_ID=
```

**Frontend — optional with fallbacks:**
```
VITE_API_TARGET=            # overrides proxy target (set to http://backend:3000 in docker-compose.dev.yml)
VITE_FRESHSERVICE_URL=      # read at build time, not browser runtime
VITE_HELP_URL=
```

Note: `VITE_API_TARGET` is read by `vite.config.ts` at parse time via `process.env` — it is NOT bundled into the app.

## Architecture: feature-first

### Backend (`backend/src/`)

```
features/
  auth/           # JWT strategy, auth service, auto user creation on first login
  users/          # /api/me, /api/users (admin only), avatar endpoints
  stakeholders/   # assign users to products with weight
  ideas/          # ideas CRUD
  categories/     # idea categories
  decisions/      # decision tracking
  narratives/     # product narratives
  graph/          # graph relationships
  health/         # GET /api/health — @Public(), no auth
integrations/
  ai.*            # AIService, AIController — improve-idea, classify-intent, generate-user-story, ask
  clickup.*       # ClickUp v2 (tasks) + v3 (Docs). Custom field IDs hardcoded in clickup.service.ts
  msgraph.*       # MS Graph — user lookup, photo cache (NOT fully wired)
  rag/            # RAG pipeline + RagController; endpoints under /api/ai/index-docs, /api/ai/index-status
database/         # Cosmos DB provider, @Global DatabaseModule, exports COSMOS_DATABASE token
common/           # guards, decorators, filters — cross-cutting only
```

**WARNING:** `features/products/` does NOT exist in backend. Products live in frontend only.

- New feature → `features/<name>/` with module, controller, service, dto/, interfaces/
- `DatabaseModule` is `@Global()` — inject `COSMOS_DATABASE` token without importing the module
- Global prefix: `/api`. All routes are `/api/*`.
- `ValidationPipe` is global with `whitelist: true, forbidNonWhitelisted: true, transform: true` — unknown DTO fields rejected; `@Type()` from `class-transformer` works automatically
- `HttpExceptionFilter` registered globally

### Frontend (`frontend/src/`)

```
features/
  auth/             # AuthContext, LoginPage, impersonation logic
  products/         # CRUD pages + routes (frontend only — no backend feature)
  ideas/            # idea wizard, detail, AI integration
  help/             # Knowledge Assistant chat (RAG)
  users/            # admin user list + invite
  admin/            # AdminPage at /admin (admin mode only)
  stakeholder-home/ # / index route
  categories/, decisions/, narratives/, landing/, my-activity/
shared/
  api/              # axios client with JWT interceptor (client.ts)
  layouts/          # MainLayout
  ModeContext.tsx   # ModeProvider + useMode() — admin vs stakeholder mode switching
  constants.ts      # AppMode, UserRole, STORAGE_KEYS, EXTERNAL_LINKS — authoritative source
  i18n/             # config + locales/en.json, locales/es.json (namespace: "shared")
  nav.tsx           # sidebar NavItem[] — add entries here for new routes
  theme.ts
router.tsx          # composes all feature RouteObject[] under ProtectedLayout
```

- Each feature exports `RouteObject[]` from `routes.tsx`, spread into `router.tsx`
- Admin-only routes (`categoryRoutes`, `userRoutes`, adminRoutes) only mounted when `mode === AppMode.ADMIN`
- To add sidebar entry: add `NavItem` to `shared/nav.tsx`
- i18n: per-feature namespaces at `features/X/i18n/{en,es}.json`, register in `shared/i18n/index.ts`
- All UI strings use `t()` — never hardcode

## Key versions (avoid wrong codegen)

| Dependency | Version |
|---|---|
| MUI `@mui/material` | `^5.16.0` — NOT v6 |
| `@tanstack/react-query` | `^5.51.0` |
| `react-router-dom` | `^6.26.0` |
| `i18next` | `^26.0.6` |
| NestJS `@nestjs/common` | `^10.4.0` |
| TypeScript | `^5.5.0` |

## Auth system

- Global guards on every route: `JwtAuthGuard` → `RolesGuard`
- Skip auth: `@Public()` decorator
- Skip roles: no `@Roles()` decorator
- Dev token: `POST /api/auth/dev-token` (`@Public()`, disabled unless `AUTH_DEV_MODE=true`) — returns HS256 JWT with `role: 'admin'`, 24h expiry
- Impersonation: `POST /api/auth/impersonate/:userId` (admin + dev mode only)
- On first valid JWT: user auto-created in Cosmos matched by `oid` field
- Production: JWKS from `https://login.microsoftonline.com/{TENANT_ID}/discovery/v2.0/keys`, audience = `AZURE_AD_CLIENT_ID`

## localStorage keys (from `shared/constants.ts`)

| Key | Purpose |
|---|---|
| `sora_token` | Active JWT |
| `sora_admin_token` | Original admin JWT during impersonation |
| `sora_mode` | `'admin'` or `'stakeholder'` |
| `sora_lang` | Language preference |

## Cosmos DB containers

Created at startup by `cosmos.provider.ts` via `createIfNotExists`:
`users`, `narratives`, `decisions`, `stakeholders`, `ideas`, `votes`, `categories`, `comments`

`embeddings` container (RAG/vector) is created **on-demand** by `RagService.ensureContainer()` — NOT at startup. Avoids crash if Cosmos account lacks Vector Search enabled.

## TypeScript quirks

**Backend:**
- `emitDecoratorMetadata: true` + `experimentalDecorators: true` — required for NestJS DI; never remove
- NOT full `strict: true`; has `strictNullChecks` + `noImplicitAny` individually
- `baseUrl: "./"` — bare imports resolve from `src/` root

**Frontend:**
- `moduleResolution: "bundler"` — Vite-native, not `node16`/`nodenext`
- `isolatedModules: true` — no `const enum`, no namespace-only files
- `strict: true` — full strict (stricter than backend)
- `noUnusedLocals/Parameters: false` — dead code won't error
- `include: ["src"]` — files outside `src/` are invisible to TS

## Frontend mode system

- `ModeContext`: `'admin'` | `'stakeholder'`; non-admins locked to `'stakeholder'`
- Mode persisted in `localStorage` (`sora_mode`)
- Admin-only routes only rendered in `admin` mode
- New user onboarding: `hasSeenLanding === false` + not impersonating → redirect to `/welcome`

## MainLayout responsive behavior

- `RAIL_WIDTH = 72` on desktop (icon rail, not full sidebar)
- `DRAWER_WIDTH = 240` on mobile (temporary overlay)
- Permanent rail `>=900px`, temporary hamburger `<900px`
- Dialogs: `fullScreen` on `xs`
- Grid cards: `xs={12} sm={6} md={4}`
- Filter bars: `flexWrap: 'wrap'`, full-width on `<600px`
- Touch targets: min 44px height

## Stakeholder screens — MUST be 100% mobile-friendly (320px+)

Admin screens — usable to tablet (768px).

## Gotchas

- **No test framework.** `pnpm test` does not exist in either package.
- **No prettier config.** Don't run format commands.
- **`pnpm run lint` (backend) has no eslint config file** — will fail unless one is added.
- `nest build` wipes `dist/` on every run (`deleteOutDir: true`).
- AI system prompt (`USER_STORY_SYSTEM_PROMPT`) is **hardcoded in Spanish** with company-specific domain terms (PDV, promotores, PlanT, etc.) — don't translate or generalize.
- ClickUp custom field IDs are hardcoded in `clickup.service.ts` — changing them breaks task creation.
- `COSMOS_ENDPOINT` / `COSMOS_KEY` missing = immediate crash at startup, not a graceful degradation.
