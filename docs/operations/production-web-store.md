# Güteli web store: production preparation

Ticket10 work in progress, 2026-10-09. This is a local configuration contract, not a deployment or launch approval. Ticket03 is skipped. Ticket01 is blocked; payments remain disabled.

## Configuration preflight

From the checked-out release with dependencies installed, inject settings through the host's secret environment and run:

```sh
npm run production:check
```

This command performs no database writes, migrations, seeding, provider calls or deployment. It is an explicit operator check, not yet an automatic startup or readiness gate. A successful result validates configuration shape only; it does not prove secret entropy, DNS ownership, HTTPS termination, firewall rules, mounted storage durability, or schema readiness.

Required settings:

| Setting                          | Contract                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                       | `production`                                                                                               |
| `DATABASE_URL`                   | PostgreSQL URL with explicit user and an independent non-placeholder password                              |
| `BETTER_AUTH_URL`                | Canonical HTTPS store origin, without credentials, path, query or fragment; not a local development origin |
| `BETTER_AUTH_SECRET`             | Independently generated secret, at least32 UTF-8 bytes                                                     |
| `RATE_LIMIT_SECRET`              | A different independently generated secret, at least32 UTF-8 bytes                                         |
| `RECEIPT_TOKEN_SECRET`           | A different independently generated secret, at least32 UTF-8 bytes                                         |
| `UPLOADS_ROOT`                   | Explicit absolute directory on persistent storage, not the filesystem root                                 |
| `TRUSTED_PROXY_HOPS`             | Explicit integer0–10 matching the verified proxy chain                                                     |
| `PAYMENTS_ENABLED`               | Exactly `false` while the provider contract is blocked                                                     |
| `WHATSAPP_NOTIFICATIONS_ENABLED` | Exactly `false` for this release; no production notification worker has been verified                      |

Generate random secrets with a cryptographic generator (at least32 random bytes each), rather than inventing memorable strings. The check rejects known placeholders and obvious low-diversity strings; passing that heuristic is not proof of entropy. Never copy build/test values or commit credentials. Keep receipt-signing material stable across normal releases so existing recovery credentials continue to work; deliberate rotation needs a recovery plan.

## Existing local setup

`compose.yaml` is the existing local-development stack. Its development database password, published server port and missing production secret injection do not qualify it for public use. `NODE_ENV=production` selects the optimized Next.js runtime; it does not make this Compose file a safe production deployment.

The current `/health` endpoint checks database connectivity only. It does not verify schema, upload durability or integration-worker health. Stronger readiness and the production override remain pending in Ticket10.

## Build and runtime settings

Next.js inlines `NEXT_PUBLIC_*` values at build time. The existing Docker builder fixes `NEXT_PUBLIC_DEMO_MODE=true`. Changing only the running container's public variables cannot convert that built store into a live release. A deliberate live build and its acceptance tests are required before any launch; this slice does not enable one.

Server secrets must be injected at runtime. Build-only placeholders in the Docker builder must never be reused as deployed credentials.

## Hosting-dependent work still pending

The owner selected Oracle Always Free for investigation and local preparation on 2026-10-12; see [the proposed setup and open evidence](oracle-always-free.md). Verify account quota, capacity and hostname before finalizing configuration. It must support the existing Node/Next server, PostgreSQL and persistent product-image storage. Static-only hosting cannot run the current order and admin backend.

The deployment design must cover HTTPS termination/renewal, private database access, no direct public bypass of the web server, and replacement of untrusted forwarded headers at the trusted edge. Proxy-hop settings must reflect that actual chain. Existing local production HTTPS tests can be reused after the configuration is defined; they do not prove an external host's firewall or certificate renewal.

Migrations, catalog provisioning and owner creation must remain explicit release steps; never run them automatically on web-server startup. Before deployment, complete the runbook for backups, migration compatibility, rollback, owner MFA recovery and storage restoration. No host, paid resource, public deployment or real payment has been approved.
