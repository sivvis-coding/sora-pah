# ---- Build stage ----
FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

# Non-root user for security
RUN addgroup -S sora && adduser -S sora -G sora

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./

USER sora

EXPOSE 3000
ENV PORT=3000
CMD ["node", "dist/main.js"]
