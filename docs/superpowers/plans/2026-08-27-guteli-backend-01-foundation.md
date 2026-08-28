# Güteli Backend 01: Runtime and Database Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the static export into a tested Node.js application with validated server configuration, a PostgreSQL connection, health checks, and a two-service Docker development runtime.

**Architecture:** Keep one Next.js application and one PostgreSQL database. Server-only modules own environment access and database connections. This plan establishes infrastructure only; business tables start in Plan 02.

**Tech Stack:** Next.js 16.3.3, TypeScript 5.9, Zod, Drizzle ORM/Kit, `pg`, Vitest, Docker Compose, PostgreSQL 17

**Spec:** [Güteli Backend, Admin, Orders, and Operations Design](../specs/2026-08-27-guteli-backend-admin-orders-design.md)

## Global Constraints

- Preserve the approved storefront appearance and behavior.
- Never read, write, move, stage, or delete `products/`.
- Read the relevant local Next.js 16 guide under `node_modules/next/dist/docs/` before changing framework configuration or route behavior.
- Keep secrets server-only. Commit `.env.example`, never `.env` or credentials.
- Store money as integer GTQ centavos; no business table in this plan may introduce floating-point money.
- Complete plans in numeric order. Plan 02 consumes the runtime produced here.

---

## Task 1: Add validated server configuration

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Create: `.env.example`
- Create: `src/server/config/env.ts`
- Test: `tests/unit/server-env.test.ts`

**Interfaces:**

- Produces `serverEnv`, the only validated source for database and runtime configuration.
- Consumes process environment variables only inside `src/server/`.

- [ ] Write `tests/unit/server-env.test.ts` with cases proving a valid configuration parses, an invalid URL fails, and a missing `DATABASE_URL` fails without printing its value.

```ts
import { describe, expect, it } from 'vitest';
import { parseServerEnv } from '@/server/config/env';

describe('parseServerEnv', () => {
  it('accepts the local Docker configuration', () => {
    expect(
      parseServerEnv({
        NODE_ENV: 'test',
        DATABASE_URL: 'postgresql://guteli:secret@database:5432/guteli',
      }).NODE_ENV,
    ).toBe('test');
  });

  it('rejects a missing database URL', () => {
    expect(() => parseServerEnv({ NODE_ENV: 'test' })).toThrow(
      'Invalid server environment',
    );
  });
});
```

- [ ] Run `npm test -- tests/unit/server-env.test.ts`; expect failure because `@/server/config/env` does not exist.
- [ ] Run `npm install drizzle-orm pg zod server-only` and `npm install --save-dev drizzle-kit dotenv tsx @types/pg`; commit the resolved versions in `package-lock.json`.
- [ ] Implement `parseServerEnv` with Zod and export a lazily parsed `serverEnv` so importing pure test helpers does not require a live database.

```ts
import 'server-only';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
});

export function parseServerEnv(input: NodeJS.ProcessEnv) {
  const result = schema.safeParse(input);
  if (!result.success) throw new Error('Invalid server environment');
  return result.data;
}

export const getServerEnv = () => parseServerEnv(process.env);
```

- [ ] Add `.env.example` with `DATABASE_URL=postgresql://guteli:guteli@localhost:5432/guteli` and `DATABASE_URL_TEST=postgresql://guteli:guteli@localhost:5433/guteli_test`; ensure `.env*` remains ignored except `.env.example`.
- [ ] Run `npm test -- tests/unit/server-env.test.ts && npm run typecheck`; expect both to pass.
- [ ] Commit: `git add package.json package-lock.json .gitignore .env.example src/server/config/env.ts tests/unit/server-env.test.ts && git commit -m "build: add validated server configuration"`.

## Task 2: Add the PostgreSQL connection and migration tooling

**Files:**

- Modify: `package.json`
- Create: `drizzle.config.ts`
- Create: `src/server/db/client.ts`
- Create: `src/server/db/schema/index.ts`
- Create: `src/server/db/health.ts`
- Test: `tests/integration/db-health.test.ts`

**Interfaces:**

- Produces `db`, `pool`, and `checkDatabaseConnection()` for server modules.
- Produces scripts `db:generate`, `db:migrate`, `db:studio`, and `test:integration`.
- Requires `DATABASE_URL_TEST` for integration tests; never silently falls back to the development database.

- [ ] Add an integration test that calls `checkDatabaseConnection()` and expects `{ database: 'up' }`.
- [ ] Run `npm run test:integration -- tests/integration/db-health.test.ts`; expect failure because the script and helper do not exist.
- [ ] Implement a singleton `pg.Pool`, Drizzle client, and `select 1` health probe. Use a development global only to prevent extra pools during hot reload; never expose the pool to client code.

```ts
import 'server-only';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getServerEnv } from '@/server/config/env';

const pool = new Pool({ connectionString: getServerEnv().DATABASE_URL });
export const db = drizzle({ client: pool });
export { pool };
```

- [ ] Configure `drizzle.config.ts` to use `src/server/db/schema/index.ts`, output versioned SQL under `drizzle/`, and use the PostgreSQL dialect.
- [ ] Configure Vitest so `tests/integration/**/*.test.ts` is excluded from the default unit run and included by `vitest.integration.config.ts`; the integration setup must copy `DATABASE_URL_TEST` to `DATABASE_URL` and reject a missing value.
- [ ] Start PostgreSQL with `docker compose up -d database` after Task 4 exists, then run `npm run test:integration -- tests/integration/db-health.test.ts`; expect one passing test.
- [ ] Commit: `git add package.json drizzle.config.ts vitest.config.ts vitest.integration.config.ts src/server/db tests/integration/db-health.test.ts && git commit -m "feat: add postgres data foundation"`.

## Task 3: Replace static export with a dynamic health endpoint

**Files:**

- Modify: `next.config.ts`
- Modify: `package.json`
- Create: `src/app/health/route.ts`
- Create: `src/server/observability/request-id.ts`
- Test: `tests/unit/request-id.test.ts`
- Test: `tests/browser/health.spec.ts`

**Interfaces:**

- Produces `GET /health` returning `200 {"status":"ok","database":"up","requestId":"..."}` or a safe `503` response.
- Produces `getRequestId(headers)` that accepts a valid UUID request header or generates one.

```ts
export async function GET(request: Request) {
  const requestId = getRequestId(request.headers);
  const database = await checkDatabaseConnection();
  return Response.json(
    { status: database === 'up' ? 'ok' : 'unavailable', database, requestId },
    {
      status: database === 'up' ? 200 : 503,
      headers: { 'x-request-id': requestId },
    },
  );
}
```

- [ ] Add unit coverage for accepted UUIDs and replacement of malformed request IDs; add a browser/API test for the success response and `x-request-id` response header.
- [ ] Run the two focused tests; expect failures because the helper and route do not exist.
- [ ] Remove `output: 'export'`, use `output: 'standalone'`, retain the existing image behavior for this milestone, and change `start` to `next start`.
- [ ] Implement the health route with `export const dynamic = 'force-dynamic'`, a database probe, JSON-only safe errors, and matching body/header request IDs.
- [ ] Run `npm test -- tests/unit/request-id.test.ts && npm run test:e2e -- tests/browser/health.spec.ts`; expect both to pass with PostgreSQL running.
- [ ] Run `npm run build`; expect Next.js to report a dynamic route and produce `.next/standalone`.
- [ ] Commit: `git add next.config.ts package.json src/app/health src/server/observability tests/unit/request-id.test.ts tests/browser/health.spec.ts && git commit -m "feat: run storefront as dynamic next server"`.

## Task 4: Add the two-service Docker runtime

**Files:**

- Create: `.dockerignore`
- Create: `Dockerfile`
- Create: `compose.yaml`
- Create: `scripts/docker-entrypoint.sh`
- Modify: `README.md`
- Test: `tests/unit/docker-runtime.test.ts`

**Interfaces:**

- Produces services `app` and `database` only.
- Produces named volumes `db_data` and `uploads_data`.
- Exposes the app at `http://localhost:3000` and PostgreSQL only on the local development port.

```yaml
services:
  app:
    build: .
    depends_on:
      database:
        condition: service_healthy
  database:
    image: postgres:17
volumes:
  db_data:
  uploads_data:
```

- [ ] Write a contract test that reads `compose.yaml` and asserts the two service names, non-empty health checks, named volumes, and absence of Redis, queue, and worker services.
- [ ] Run `npm test -- tests/unit/docker-runtime.test.ts`; expect failure because `compose.yaml` does not exist.
- [ ] Create a multi-stage Dockerfile using the repository Node engine, `npm ci`, `npm run build`, Next standalone output, a non-root runtime user, and `HOSTNAME=0.0.0.0`.
- [ ] Create `compose.yaml` with PostgreSQL 17, database health gating, app health against `/health`, explicit environment variables, and persistent database/upload volumes. The entrypoint validates the writable uploads directory and then executes the container command; it must not mutate schema or seed data implicitly.
- [ ] Document and run migrations explicitly with `docker compose exec app npm run db:migrate`; production documentation must require the equivalent separate release step.
- [ ] Run `docker compose config`; expect a valid two-service model with no unresolved variables.
- [ ] Run `docker compose up --build -d`, then `curl --fail http://127.0.0.1:3000/health`; expect `status=ok` and `database=up`.
- [ ] Run `npm test -- tests/unit/docker-runtime.test.ts`; expect it to pass.
- [ ] Commit: `git add .dockerignore Dockerfile compose.yaml scripts/docker-entrypoint.sh README.md tests/unit/docker-runtime.test.ts && git commit -m "build: add docker app and database runtime"`.

## Task 5: Verify the foundation without storefront regressions

**Files:**

- Modify only if a verified regression requires it: existing files under `src/` or `tests/`

**Interfaces:**

- Consumes the repository-wide validation commands.
- Produces a clean baseline for Plan 02.

- [ ] Run `npm run format:check`; expect success.
- [ ] Run `npm run lint && npm run typecheck`; expect success with zero warnings.
- [ ] Run `npm test`; expect all unit tests, including the original 49-test baseline, to pass.
- [ ] Run `npm run build`; expect a successful standalone server build.
- [ ] Run `npm run test:e2e`; expect all existing storefront journeys plus the health test to pass.
- [ ] Run `git status --short`; expect only `products/` to remain untracked and untouched, plus any intentionally uncommitted later-plan documents.
