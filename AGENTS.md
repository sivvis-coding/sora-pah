# AGENTS.md

## Project structure

Monorepo with two independent packages — no workspace manager, each has its own `pnpm-lock.yaml`:

- `backend/` — NestJS REST API (TypeScript, CommonJS)
- `frontend/` — React SPA (TypeScript, Vite, ESM)

## Package manager

**pnpm** (not npm/yarn). Both Dockerfiles use `corepack enable && corepack prepare pnpm@latest`.

## Commands

All commands must be run from the respective package directory.

### Backend (`backend/`)

```
pnpm install
pnpm run build          # nest build → dist/
pnpm run start:dev      # nest start --watch
pnpm run start:prod     # node dist/main.js
pnpm run lint           # eslint (config exists)
```

### Frontend (`frontend/`)

```
pnpm install
pnpm run build          # tsc -b && vite build → dist/
pnpm run dev            # vite dev server on :5173, proxies /api → localhost:3000
```

### Type-checking (no test framework exists)

```
# Backend
cd backend && npx tsc --noEmit

# Frontend (tsconfig has noEmit:true, so just:)
cd frontend && npx tsc -b
```

### Docker (root)

```
docker-compose up --build
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Architecture: feature-first

Both packages are organized feature-first.

### Backend (`backend/src/`)

```
features/
  auth/           # JWT strategy, auth service, auto user creation
  users/          # GET /api/me, GET /api/users (admin only)
  products/       # CRUD /api/products
  stakeholders/   # assign users to products with weight
  ideas/          # ideas CRUD
  categories/     # idea categories
  decisions/      # decision tracking
  narratives/     # product narratives
  graph/          # graph relationships
  health/         # GET /api/health (no auth)
integrations/
  ai.*            # AIService, AIController, AIModule — idea improvement, user story gen, knowledge Q&A
  clickup.*       # ClickUp read + write (tasks, user story creation with custom fields)
  msgraph.*       # MS Graph stub (not wired yet)
  rag/            # RAG pipeline: chunker, embeddings, ClickUp docs fetcher, vector retrieval
database/         # Cosmos DB provider (@Global DatabaseModule, exports COSMOS_DATABASE token)
common/           # guards, decorators, filters, interfaces — shared infrastructure only
```

- New feature = new folder under `features/` with its own module, controller, service, dto/, interfaces/
- `common/` is for cross-cutting infrastructure only
- `DatabaseModule` is `@Global()` — inject `COSMOS_DATABASE` anywhere without importing it

### Frontend (`frontend/src/`)

```
features/
  auth/             # AuthContext (mock JWT), LoginPage
  products/         # CRUD pages + routes
  ideas/            # idea wizard, detail, AI integration (ai.api.ts, classify-intent.ts)
  help/             # Knowledge Assistant chat (RAG-powered)
  users/            # admin user list
  stakeholder-home/ # stakeholder landing
  categories/, decisions/, narratives/, landing/, my-activity/
shared/
  api/              # axios client with JWT interceptor (client.ts)
  layouts/          # MainLayout (responsive drawer)
  i18n/             # config + locales/en.json, locales/es.json (namespace: shared)
  nav.tsx           # sidebar nav items
  theme.ts
router.tsx          # composes all feature RouteObject[] under ProtectedLayout
```

- Each feature exports `RouteObject[]` from its `routes.tsx`, spread into `router.tsx`
- To add a sidebar entry: add a `NavItem` to `shared/nav.tsx`
- i18n: per-feature namespaces (`features/X/i18n/{en,es}.json`), register in `shared/i18n/index.ts`
- All UI strings use `t()` — never hardcode. Keys are flat within namespace.

## Backend specifics

- Global prefix `/api` — all routes are `/api/*`.
- Auth: `passport-jwt`. Dev mode (`AUTH_DEV_MODE=true`) accepts HS256 token signed with `AUTH_DEV_SECRET`. Production validates Azure AD JWKS.
- Copy `backend/.env.example` → `backend/.env` for local dev.
- Data layer: Cosmos DB (via `@azure/cosmos`). The `DatabaseModule` creates containers on init.
- AI endpoints (`/api/ai/*`): `improve-idea`, `classify-intent`, `generate-user-story`, `ask`, `send-to-clickup`, `index-docs`, `index-status`.
- AI falls back to mock responses when `OPENAI_API_KEY` is not set.
- RAG uses Cosmos DB vector search (DiskANN, cosine, 1536 dims) + OpenAI `text-embedding-3-small`.
- ClickUp integration uses v3 API for Docs, v2 for tasks. Custom field IDs are hardcoded in `clickup.service.ts`.

## Frontend specifics

- Vite proxies `/api` → `http://localhost:3000` (dev). In Docker, nginx does the proxy.
- State: `@tanstack/react-query` for server state, React context for auth.
- UI: MUI (Material UI) components throughout.
- Mock auth generates a fake JWT in `localStorage` (`sora_token`). Language pref: `sora_lang`.

## Gotchas

- **No test framework configured.** Don't assume `pnpm test` works.
- **No prettier config.** Don't run format commands without checking.
- Backend `class-validator` uses `whitelist: true, forbidNonWhitelisted: true` globally — unknown DTO fields are rejected.
- Frontend `tsconfig.json` has `"noEmit": true` — TypeScript checking only, Vite handles emit.

## Responsive design rules

### Stakeholder mode — MUST be 100% mobile-friendly
All stakeholder-facing screens must work from 320px up.

### Admin mode — reasonable responsiveness
Usable down to tablet (768px), graceful degradation on phones.

### Key patterns
- MainLayout: permanent drawer `>=900px`, temporary (hamburger) `<900px`
- Dialogs: `fullScreen` on `xs` breakpoint
- Grid: `xs={12} sm={6} md={4}` for cards
- Never use fixed widths on content containers
- Touch targets: minimum 44px height
- Filter bars: `flexWrap: 'wrap'`, full-width children on `<600px`
