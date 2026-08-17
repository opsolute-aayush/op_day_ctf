# OP Day CTF — single image, pull-and-run deployment.
#
#   docker build -t opday-ctf .
#   docker run -p 3000:3000 \
#     -e JWT_SECRET="$(openssl rand -base64 48)" \
#     -e ADMIN_KEY="$(openssl rand -hex 8)" \
#     -v opday_data:/app/data \
#     opday-ctf
#
# See README.md "Deploying with Docker" for the full guide (volumes, cloud
# examples, updating an already-running deployment).

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
# Next.js imports every route module during the build to collect page data.
# Our auth module validates these are set, so the build needs *something*
# present — these placeholders never leave this stage; the real secrets are
# supplied at `docker run` time in the runner stage below.
ENV JWT_SECRET=build-time-placeholder-unused-at-runtime
ENV ADMIN_KEY=build-time-placeholder-unused-at-runtime
RUN npx prisma generate
RUN npm run build
# Drop devDependencies (typescript, tailwind, eslint, ...) now that the
# build artifacts exist — only runtime deps ship in the final image.
RUN npm prune --omit=dev

# ---- runtime ---------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# SQLite file lives on a mounted volume so data survives container restarts
# and redeploys — see the -v flag in the usage comment above.
ENV DATABASE_URL="file:/app/data/prod.db"

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs \
    && mkdir -p /app/data \
    && chown -R nextjs:nodejs /app/data

COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts ./next.config.ts
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

VOLUME ["/app/data"]
EXPOSE 3000
USER nextjs

ENTRYPOINT ["./docker-entrypoint.sh"]
