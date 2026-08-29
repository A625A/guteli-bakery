# Güteli Bakery Full-Stack Foundation

Spanish-first, mobile-first bakery catalog and order-request experience for Güteli Bakery in Guatemala, now prepared to run as a standalone Next.js server with PostgreSQL.

## Current status

Milestone 1 storefront behavior remains intact, and the backend foundation now runs as a standalone Next.js 16 server with a PostgreSQL-backed `/health` route. This plan establishes runtime, health, and Docker foundations only; product/catalog/order migrations begin in Plan 02.

The repository evidence for this runtime foundation was refreshed on 2026-08-28. Public deployment remains out of scope.

## Local requirements and commands

- Node.js `^20.9.0 || >=22.0.0`
- npm `>=10.0.0`

Install dependencies with `npm install`, then use these verified commands:

```bash
npm run dev
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e:install
npm run build
npm run start
```

`npm run start` runs the built Next.js server from `.next/standalone` behavior at `http://127.0.0.1:3000`; run `npm run build` first.

Database integration and browser tests never use `DATABASE_URL`. They require an explicit `DATABASE_URL_TEST` and run against the isolated `guteli_test` database described below.

## Isolated integration and E2E database

The test database uses the same committed `database` Compose service in a separate `guteli-test` Compose project. It binds to `127.0.0.1:55433`, creates only `guteli_test`, and stores data in a project-scoped test volume. The development `guteli` database and its volume are not reused.

Start from a clean isolated database, export the required test URL, apply the current migrations, and run the database-backed suites with:

```bash
npm run test:db:down
npm run test:db:up
export DATABASE_URL_TEST=postgresql://guteli:guteli@127.0.0.1:55433/guteli_test
DATABASE_URL="$DATABASE_URL_TEST" npm run db:migrate
npm run test:integration
npm run test:e2e
```

Plan 01 has no SQL migration, so the migration command is currently a no-op; Plan 02 can apply its first migration to this clean database without adding another service. `npm run test:e2e` maps `DATABASE_URL_TEST` into the Next.js web server as `DATABASE_URL` and refuses to reuse an already-running server.

When finished, remove only the isolated test containers, network, and test volume:

```bash
npm run test:db:down
```

The teardown command is intentionally fixed to the `guteli-test` Compose project. It does not target the development `guteli` project or its persistent volume.

## Docker runtime

Bring up the two-service local runtime with:

```bash
docker compose config
docker compose up --build -d
curl --fail http://127.0.0.1:3000/health
docker compose down
```

`docker compose config` is the live operational validation gate and requires an installed Docker Compose CLI. The default `npm test` suite validates the committed Compose YAML directly and does not require Docker.

The runtime exposes the app on `http://localhost:3000`, binds PostgreSQL only to `127.0.0.1:5432`, and preserves the named `db_data` and `uploads_data` volumes on ordinary `docker compose down`.

If your local Docker client uses a non-default socket or context, export that override before rerunning the same commands. For example, Colima users can confirm the socket with `colima status` and set `DOCKER_HOST` only as a troubleshooting override.

## Migrations

This foundation plan does not create an empty migration. When Plan 02 adds non-empty SQL files under `drizzle/`, apply them explicitly as a separate step before promoting a release.

The production runtime image intentionally stays lean and does not bundle Drizzle Kit. Start the database first, wait for it to become healthy, then invoke the opt-in builder-stage provisioning service instead of running migrations or seed work from the long-lived app container:

```bash
docker compose up -d database
docker compose ps database
docker compose exec -T database pg_isready -U guteli -d guteli
docker compose --profile provision run --rm provision
```

The first command creates the Compose network and starts PostgreSQL; `docker compose ps database` should report the container as healthy, and `pg_isready` must succeed before you run provisioning. The `provision` service builds from the Dockerfile's `builder` stage, joins the Compose network, mounts `uploads_data` at `/app/uploads`, and runs `npm run db:migrate && npm run db:seed` only when explicitly invoked with the `provision` profile. Because the provisioning container joins the Compose network, its URL must use the network-reachable `database` host, such as `postgresql://<user>:<password>@database:5432/<database>`, never `localhost`. Production should run the equivalent provisioning step separately from `docker compose up`; the app entrypoint never migrates or seeds implicitly, and the release environment injects DATABASE_URL from its secret environment instead of local credentials.

## Approved MVP

- Responsive home, menu, cart, order, and contact experiences
- Browser-based cart with editable quantities and subtotal in GTQ
- Pickup or delivery selection
- Two-day advance-order validation in Guatemala local time
- Spanish order summary, copy fallback, and WhatsApp click-to-chat handoff
- Human confirmation and clear order-request disclaimers

The approved storefront still excludes public payment processing, a real WhatsApp API, and public deployment. Databases and server runtime now exist only as foundation infrastructure for later plans.

## Governance

- Engineering handbook: [`AI/AI-EOS`](AI/AI-EOS/00_START_HERE.md)
- Active scope: [`AI/AI-EOS/CURRENT_TASK.md`](AI/AI-EOS/CURRENT_TASK.md)
- Capability audit: [`AI/AI-EOS/CAPABILITY_TABLE.md`](AI/AI-EOS/CAPABILITY_TABLE.md)
- Proposed structure: [`docs/PROPOSED_FILE_STRUCTURE.md`](docs/PROPOSED_FILE_STRUCTURE.md)
- Milestones: [`docs/MILESTONES.md`](docs/MILESTONES.md)
- Evidence: [`artifacts/README.md`](artifacts/README.md)

Long-term project memory is maintained in the external Obsidian folder `Phase 2 - Guteli Demo`. The application never depends on that vault at build time or runtime. The Milestone 1 approval and merge notes are synchronized and validated, while Milestone 2 awaits explicit user approval.
