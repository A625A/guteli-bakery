ARG NODE_VERSION=22-bookworm-slim

FROM node:${NODE_VERSION} AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ENV NEXT_PUBLIC_DEMO_MODE=true
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:${NODE_VERSION} AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV UPLOADS_ROOT=/app/uploads
WORKDIR /app

RUN groupadd --gid 1001 nodejs \
  && useradd --uid 1001 --gid nodejs --shell /usr/sbin/nologin --create-home nextjs \
  && mkdir -p /app/uploads /app/scripts \
  && chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh

RUN chmod 755 /app/scripts/docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["node", "server.js"]
