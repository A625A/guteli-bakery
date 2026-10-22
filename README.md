<div align="center">

# Güteli Bakery

**Full-stack bakery ordering experience built with Next.js, TypeScript, PostgreSQL, and Docker.**

Spanish-first, mobile-first storefront for browsing baked goods, building an order request, choosing pickup or delivery, and handing the request to the bakery for human confirmation

![Güteli Bakery storefront](artifacts/screenshots/desktop/milestone-3-homepage.png)

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-persistent%20data-4169E1?logo=postgresql&logoColor=white)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-tests-6E9F18?logo=vitest&logoColor=white)

</div>

## What It Demonstrates

Güteli began as a storefront MVP and evolved into a full-stack application with persistent catalog and order workflows, protected administrative routes, product media handling, and a bounded WhatsApp notification integration.

| Area | Implemented |
| --- | --- |
| Storefront | Responsive home, menu, cart, order, confirmation, and contact experiences |
| Commerce UX | GTQ totals, editable quantities, pickup/delivery, date validation, and Spanish order summaries |
| Backend | Next.js server routes, validation, PostgreSQL persistence, and health checks |
| Data layer | Drizzle ORM with versioned SQL migrations |
| Admin | Protected order, product, category, user, and media-management workflows |
| Integration | User-controlled WhatsApp handoff plus an owner-notification provider boundary |
| Quality | Vitest, integration tests, Playwright E2E, linting, formatting, and type checking |

## Product Walkthrough

<table>
  <tr>
    <td width="50%" align="center">
      <a href="artifacts/screenshots/desktop/milestone-3-homepage.png"><img src="artifacts/screenshots/desktop/milestone-3-homepage.png" height="250" alt="Güteli Bakery homepage"></a><br>
      <strong>Storefront</strong><br>
      Branded Spanish-first landing experience with a clear ordering journey.
    </td>
    <td width="50%" align="center">
      <a href="artifacts/screenshots/desktop/milestone-3-cart.png"><img src="artifacts/screenshots/desktop/milestone-3-cart.png" height="250" alt="Güteli Bakery cart and order form"></a><br>
      <strong>Cart & order request</strong><br>
      Editable products, GTQ subtotal, fulfillment choice, and customer details.
    </td>
  </tr>
  <tr>
    <td align="center">
      <a href="artifacts/screenshots/desktop/milestone-3-confirmation.png"><img src="artifacts/screenshots/desktop/milestone-3-confirmation.png" height="250" alt="Güteli Bakery order confirmation"></a><br>
      <strong>Order confirmation</strong><br>
      Receipt-style confirmation with order state and requested products.
    </td>
    <td align="center">
      <a href="artifacts/screenshots/mobile/milestone-3-homepage.png"><img src="artifacts/screenshots/mobile/milestone-3-homepage.png" height="250" alt="Güteli Bakery mobile homepage"></a><br>
      <strong>Mobile-first UX</strong><br>
      The same customer journey verified on a narrow mobile viewport.
    </td>
  </tr>
</table>

## Architecture at a Glance

```mermaid
flowchart LR
    CUSTOMER[Customer] --> UI[Next.js storefront]
    UI --> API[Server routes]
    API --> DB[(PostgreSQL)]
    API --> ORDER[Order workflow]
    ORDER --> WA[WhatsApp handoff]
    ADMIN[Protected admin] --> API
    ADMIN --> MEDIA[Product media]
```

The customer-facing flow stays intentionally simple while persistence, administration, media handling, and integrations remain separate backend concerns.

## Engineering Highlights

- **Persistent commerce state:** product catalog and order workflows use PostgreSQL rather than browser-only demo state.
- **Explicit migrations:** schema changes are versioned under `drizzle/`; the application does not silently migrate on request handling.
- **Admin boundary:** separate routes exist for orders, products, categories, users, and media operations.
- **Image handling:** product image storage and validation are implemented behind dedicated server/storage modules.
- **Order safety:** order contracts, request hashing, validation, and status handling are server-side concerns.
- **Testing isolation:** database-backed tests use an isolated test database, while Playwright validates the browser journey.
- **Operational baseline:** Docker Compose and a `/health` route support repeatable local runtime checks.

## Tech Stack

**Frontend:** Next.js 16 · React 19 · TypeScript  
**Backend:** Next.js server routes · Zod · Better Auth  
**Data:** PostgreSQL · Drizzle ORM  
**Testing:** Vitest · Playwright · integration tests  
**Infrastructure:** Docker · Docker Compose

## Run Locally

Requirements: Node.js 20.19+ and npm 10+. Use only a disposable local database and fictitious data for the commands below. The Node development workflow does not require Docker if PostgreSQL 17 is already available locally.

```bash
npm ci
cp .env.example .env
```

Before starting, configure `.env` with the local `DATABASE_URL`, `UPLOADS_ROOT`, `BETTER_AUTH_URL=http://localhost:3000` and three distinct local secrets of at least 32 bytes: `BETTER_AUTH_SECRET`, `RATE_LIMIT_SECRET` and `RECEIPT_TOKEN_SECRET`. Set `TRUSTED_PROXY_HOPS=0` for direct local access. Keep this file private and out of Git. Never reuse local database credentials or example/build secrets for production.

If using the repository's **local development** database container:

```bash
docker compose up -d database
docker compose ps
docker compose exec -T database pg_isready -U guteli -d guteli
```

Then explicitly initialize the disposable database before starting Node:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Seeding is for local fixtures, not an approved bakery catalog. Public order handlers remain disabled by default; only isolated checkout regression tests should opt into `COMMERCIAL_ORDERS_ENABLED=true`. Keep payments and automatic WhatsApp disabled.

### Existing local Compose workflow

The root `compose.yaml` is a development/demo configuration, **not the Oracle production configuration**. Its database password is a local default and its app port is published on the host network. Run it only on an isolated development machine; do not expose it publicly. The separate Oracle candidate has [local Linux ARM64 Docker validation](artifacts/oracle-preparation/ticket-02/RESULTADO.md); this root development workflow was not part of that rehearsal.

Check your installed daemon and Compose first; on macOS with an existing Colima installation, use `colima status`. Do not change Docker contexts or socket settings to bypass a failed check.

```bash
docker compose config
```

This prints resolved configuration; inspect it locally and do not share output containing secrets. The root app does not inherit the shell's secrets or `.env` automatically. For a local container rehearsal, prepare a private supplemental Compose file outside Git, selected with `export COMPOSE_FILE=compose.yaml:/absolute/private/compose.local.yaml`, containing:

```yaml
services:
  app:
    env_file:
      - /absolute/private/guteli-local.env
```

The private env file supplies the three independent local secrets above, `BETTER_AUTH_URL=http://localhost:3000`, `TRUSTED_PROXY_HOPS=0`, and `COMMERCIAL_ORDERS_ENABLED=false`, `PAYMENTS_ENABLED=false`, `WHATSAPP_NOTIFICATIONS_ENABLED=false`. Root Compose explicitly sets the app's internal database address and uploads path; those values take precedence over `env_file`. This HTTP rehearsal does not validate secure admin cookies or public TLS.

For a new disposable database, provisioning builds from the Dockerfile's `builder` stage and mounts `uploads_data` at `/app/uploads`. It runs `npm run db:migrate && npm run db:seed` only when explicitly invoked:

```bash
docker compose up -d database
docker compose --profile provision run --rm provision
docker compose up --build -d
docker compose ps
```

Ordinary startup does not migrate or seed. To stop this local stack without deleting its named volumes:

```bash
docker compose down
```

For Oracle, use only the [separate preparation guide](docs/operations/oracle/README.md). A production migration tool must receive DATABASE_URL from its secret environment, with the internal host `@database:5432/<database>`, never `localhost`. Do not pass database credentials in command-line arguments. Production migrations require separate approval; the development `provision` command also seeds fixtures and must not initialize a real catalog.

Useful quality checks:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:integration
npm run test:e2e
npm run build
```

See the repository scripts and `.env.example` for the local test/runtime configuration.

## Scope

This is a portfolio/demo implementation for a real bakery workflow. It intentionally does **not** claim public payment processing or a fully automated checkout. Orders are request-based and remain subject to human confirmation.

A public deployment is not currently provided from this repository.

## Evidence & Documentation

- [Running-app screenshots and implementation evidence](artifacts/README.md)
- [Milestone history](docs/MILESTONES.md)
- [Engineering handbook](AI/AI-EOS/00_START_HERE.md)

The screenshots in this README come from the running application, not design mockups.

## Preparación local para Oracle

La configuración independiente de demostración, guía de instalación manual y límites de validación están en [Oracle Always Free](docs/operations/oracle/README.md). No se ha desplegado esta preparación. El servidor mantiene pedidos públicos desactivados salvo `COMMERCIAL_ORDERS_ENABLED=true` explícito; el Compose de Oracle lo fuerza a `false`. Pagos y WhatsApp automático permanecen bloqueados.
