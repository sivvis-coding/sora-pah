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
```

### Frontend (`frontend/`)

```
pnpm install
pnpm run build          # tsc -b && vite build → dist/
pnpm run dev            # vite dev server on :5173, proxies /api → localhost:3000
```

### Docker (root)

```
# Producción
docker-compose up --build

# Desarrollo con hot reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

## Architecture: feature-first

Both packages are organized feature-first. Every new domain area gets its own folder that owns all of its own code.

### Backend (`backend/src/`)

```
features/
  auth/           # JWT strategy, auth service, auto user creation
  users/          # GET /api/me, GET /api/users (admin only)
  products/       # CRUD /api/products
  stakeholders/   # assign users to products with weight
  health/         # GET /api/health (no auth)
integrations/     # AIService, ClickupService, MsGraphService stubs (not wired to any module yet)
common/           # guards, decorators, filters, interfaces — shared infrastructure only
```

- New feature = new folder under `features/` with its own module, controller, service, dto/, interfaces/
- `common/` is for cross-cutting infrastructure only, not business logic
- Import depth: files directly in `features/X/` use `../../common/`; files in `features/X/subdir/` use `../../../common/`

### Frontend (`frontend/src/`)

```
features/
  auth/           # AuthContext (mock JWT), pages/LoginPage.tsx, routes (no top-level route file — handled by router.tsx)
  products/
    api/          # products.api.ts — all fetch logic for this feature
    pages/        # ProductList.tsx, ProductDetail.tsx
    routes.tsx    # exports productRoutes: RouteObject[]
  users/
    pages/        # UserList.tsx
    routes.tsx    # exports userRoutes: RouteObject[]
shared/
  api/            # axios client with JWT interceptor (client.ts)
  layouts/        # MainLayout (AppBar + sidebar, renders <Outlet />)
  i18n/           # i18n config + locales/en.json, locales/es.json
  nav.tsx         # central nav item config — drives the sidebar
  theme.ts
App.tsx           # mounts <Router />
router.tsx        # composes all feature RouteObject[] under ProtectedLayout
main.tsx          # providers: Router, QueryClient, ThemeProvider, AuthProvider
```

- New feature = new folder under `features/` with `api/`, `pages/`, `routes.tsx`
- Each feature exports a `RouteObject[]` from its `routes.tsx` and the array is spread into `router.tsx`
- `ProtectedLayout` in `router.tsx` handles the auth gate — redirects to `/login` if unauthenticated
- To add a sidebar entry: add a `NavItem` to `shared/nav.tsx` (icon + path + `labelKey` from `shared` namespace)

## Backend specifics

- Global prefix `/api` — all routes are `/api/*`.
- Auth: `passport-jwt` strategy. In dev (`AUTH_DEV_MODE=true`), accepts a symmetric HS256 token signed with `AUTH_DEV_SECRET`. In production, validates against Azure AD JWKS endpoint.
- Copy `backend/.env.example` → `backend/.env` for local dev.
- Data layer is in-memory arrays (no DB connection). Services return plain objects — ready to swap for Cosmos DB repositories.
- Integration stubs (`src/integrations/ai.service.ts`, `clickup.service.ts`) are not wired into any module yet — they're standalone `@Injectable()` classes.

## Frontend specifics

- Vite dev server proxies `/api` to `http://localhost:3000` (see `vite.config.ts`).
- In Docker, nginx handles the proxy (`nginx.conf` → `http://backend:3000`).
- i18n: `react-i18next` with **per-feature namespaces**. Translation files live next to the feature they describe:
  - `src/shared/i18n/locales/{en,es}.json` → namespace `shared` (default) — app title, nav, common errors
  - `src/features/auth/i18n/{en,es}.json` → namespace `auth`
  - `src/features/products/i18n/{en,es}.json` → namespace `products`
  - New feature = new `features/X/i18n/{en,es}.json` + register the namespace in `shared/i18n/index.ts`
- Components use `useTranslation('products')` / `useTranslation('auth')` etc. Keys are flat within the namespace (e.g. `t('title')` not `t('products.title')`). Use two `useTranslation` calls when a component needs both a feature namespace and `shared`.
- All UI strings use `t()` — never hardcode display text.
- Mock auth generates a fake JWT stored in `localStorage` (`sora_token`). Language preference stored as `sora_lang`.

## Gotchas

- No test framework is configured yet. Don't assume `pnpm test` works.
- No linter/prettier config exists. Don't run `pnpm lint` without checking first.
- Backend uses `class-validator` with `whitelist: true, forbidNonWhitelisted: true` globally — unknown DTO fields are rejected.
- Frontend `tsconfig.json` has `"noEmit": true` — TypeScript checking only, Vite handles emit.
