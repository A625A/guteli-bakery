# 10: Prepare a secure commercial runtime configuration

**Priority:** P0
**Status:** IN PROGRESS — independent configuration safeguards authorized; production deployment remains unapproved.

**What to build:** A web-store release can start with explicit secure settings and fail safely when commercial prerequisites are absent.

**Scope:** Reuse Docker/Next/PostgreSQL, add production override/runbook, no public deploy/domain purchase. No framework replacement.

**Blocked by:** No ticket dependency. Oracle Always Free selected for investigation/local preparation; account, remaining free quota, capacity and hostname still require verification before final host-specific configuration.

## Acceptance criteria

- [ ] Document/inject required independent secrets, canonical HTTPS origin, proxy hops, integration flags and durable upload settings; local credentials cannot qualify for production.
- [ ] Build public demo/live settings deliberately; runtime-only NEXT_PUBLIC changes are not claimed to enable live mode.
- [ ] Specify TLS edge/renewal, private DB and blocked direct web-server bypass; sanitize forwarded client headers.
- [ ] Readiness covers schema/config/storage and integration worker health as applicable, in addition to DB connection.
- [ ] Startup performs no implicit migration/seed; release/rollback steps and owner MFA recovery are explicit.
- [ ] Production-mode TLS tests prove secure cookies, Origin checks, role boundaries and safe headers in isolated environment.

## Tests and evidence

Invalid/missing environment and build/runtime separation tests; Compose validation; local production TLS smoke; spoofed forwarded headers and direct ingress verification plan. Public firewall/DNS evidence is a separate approved launch action.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.

## First configuration slice (2026-10-09)

Implemented an explicit `npm run production:check` preflight and [web-store preparation guide](../../../docs/operations/production-web-store.md). Checks reuse the existing environment parsers and reject local/placeholder/reused credentials, unsafe canonical origins, implicit storage/proxy settings and integration activation. The CLI does not expose values or touch the database/providers. This is not yet an automatic startup/readiness gate; acceptance criteria remain open until the complete runtime contract is verified.

Next business decision: intended hosting arrangement. The existing local Compose file is not a public-production override. No vendor, resource or deployment is authorized.

Superseding hosting direction (2026-10-12): owner selected Oracle Always Free only, accepting capacity and reclamation limitations. See [Oracle preparation](../../../docs/operations/oracle-always-free.md). No resource creation or deployment is authorized. Add verification that the data volume is actually mounted before startup, that the release supports ARM64, and that all proposed resources fit the account's unused ongoing free allowance; do not count temporary trial credit as free hosting.

Verification refreshed 2026-10-12: 10 focused configuration and CLI tests passed, along with full typecheck, scoped ESLint/Prettier and diff whitespace checks. Fixed test-case typing discovered by typecheck. This evidence covers the preflight slice only; Ticket10 remains in progress.
