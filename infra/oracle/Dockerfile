# Every base must be reviewed and pinned to its multi-platform digest.
ARG NODE_IMAGE
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
FROM deps AS builder
COPY . .
ENV NEXT_PUBLIC_DEMO_MODE=true
ENV COMMERCIAL_ORDERS_ENABLED=false
# Non-secret placeholders only for import-time configuration during next build.
# They exist in the builder stage and are never copied into runtime environment.
RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/guteli \
    BETTER_AUTH_SECRET=build-only-auth-secret-at-least-32-bytes \
    BETTER_AUTH_URL=http://127.0.0.1:3000 \
    RATE_LIMIT_SECRET=build-only-rate-secret-at-least-32-bytes \
    RECEIPT_TOKEN_SECRET=build-only-receipt-secret-at-least-32-bytes \
    TRUSTED_PROXY_HOPS=1 npm run build
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
RUN groupadd --gid 1001 guteli && useradd --uid 1001 --gid 1001 --shell /usr/sbin/nologin guteli
COPY --from=builder --chown=1001:1001 /app/public ./public
COPY --from=builder --chown=1001:1001 /app/.next/standalone ./
COPY --from=builder --chown=1001:1001 /app/.next/static ./.next/static
COPY --chown=1001:1001 infra/oracle/app-entrypoint.sh ./infra/oracle/app-entrypoint.sh
RUN mkdir -p /app/uploads /app/.next/cache && chown -R 1001:1001 /app/uploads /app/.next/cache
USER 1001:1001
ENTRYPOINT ["sh", "/app/infra/oracle/app-entrypoint.sh"]
CMD ["node", "server.js"]
