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
npm run test:e2e
npm run build
npm run start
```

`npm run start` runs the built Next.js server from `.next/standalone` behavior at `http://127.0.0.1:3000`; run `npm run build` first.

## Docker runtime

Bring up the two-service local runtime with:

```bash
DOCKER_CONFIG=.superpowers/sdd/2026-08-27-guteli-backend-01-foundation/docker-config DOCKER_HOST=unix://${HOME}/.colima/default/docker.sock docker compose up --build -d
curl --fail http://127.0.0.1:3000/health
DOCKER_CONFIG=.superpowers/sdd/2026-08-27-guteli-backend-01-foundation/docker-config DOCKER_HOST=unix://${HOME}/.colima/default/docker.sock docker compose down
```

The runtime exposes the app on `http://localhost:3000`, binds PostgreSQL only to `127.0.0.1:5432`, and preserves the named `db_data` and `uploads_data` volumes on ordinary `docker compose down`. If your Colima socket path differs, replace `unix://${HOME}/.colima/default/docker.sock` with the socket reported by `colima status`.

## Migrations

This foundation plan does not create an empty migration. When Plan 02 adds non-empty SQL files under `drizzle/`, apply them explicitly as a separate step before promoting a release.

The production runtime image intentionally stays lean and does not bundle Drizzle Kit. Use a dedicated builder-stage container for migrations instead of running them from the long-lived app container:

```bash
docker build --target builder -t guteli-bakery-migrate .
docker run --rm \
  --network backend-admin-orders_default \
  -e DATABASE_URL=postgresql://guteli:guteli@database:5432/guteli \
  guteli-bakery-migrate \
  npm run db:migrate
```

Replace `backend-admin-orders_default` if your Compose project name differs. Production should run the equivalent one-off migration step separately from `docker compose up`; the app entrypoint never migrates or seeds implicitly.

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
