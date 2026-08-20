# OP Day CTF — single image, pull-and-run deployment. Build from the repo
# root (this Dockerfile lives in docker/, but needs the whole repo as its
# build context):
#
#   docker build -f docker/Dockerfile -t opday-ctf .
#   docker run -p 3000:3000 \
#     -e JWT_SECRET="$(openssl rand -base64 48)" \
#     -v opday_data:/app/data \
#     opday-ctf
#
# No admin password to pass in — each game session gets its own, shown once
# when you create it at /admin. See README.md for the full guide.

FROM node:22-slim AS base
WORKDIR /app
# Prisma's query engine needs libssl at runtime on Debian-based images.
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---- build ---------------------------------------------------------------
FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Only needed so `next build` doesn't fail on an unset env var — never used at runtime.
ENV JWT_SECRET=build-time-placeholder-unused-at-runtime
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

# ---- runtime ---------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV DATABASE_URL="file:/app/data/prod.db"

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs \
    && mkdir -p /app/data \
    && chown -R nextjs:nodejs /app/data

COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# prisma/seed-cipher-hints.ts imports from here, run at every startup (see docker-entrypoint.sh).
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts
COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

VOLUME ["/app/data"]
EXPOSE 3000
USER nextjs

ENTRYPOINT ["./docker-entrypoint.sh"]
