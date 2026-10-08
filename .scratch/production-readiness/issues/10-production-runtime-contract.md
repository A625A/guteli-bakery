# 10: Prepare a secure commercial runtime configuration

**Priority:** P0
**Status:** IN PROGRESS — independent configuration safeguards authorized; production deployment remains unapproved.

**What to build:** A release can start with explicit secure settings and fail safely when commercial prerequisites are absent.

**Scope:** Reuse Docker/Next/PostgreSQL, add production override/runbook, no public deploy/domain purchase. No framework replacement.

**Blocked by:** None; owner hosting selection required before final host-specific configuration.

## Acceptance criteria

- [ ] Document/inject required independent secrets, canonical HTTPS origin, proxy hops, integration flags and durable upload settings; local credentials cannot qualify for production.
- [ ] Build public demo/live settings deliberately; runtime-only NEXT_PUBLIC changes are not claimed to enable live mode.
- [ ] Specify TLS edge/renewal, private DB and blocked app bypass; sanitize forwarded client headers.
- [ ] Readiness covers schema/config/storage and integration worker health as applicable, in addition to DB connection.
- [ ] Startup performs no implicit migration/seed; release/rollback steps and owner MFA recovery are explicit.
- [ ] Production-mode TLS tests prove secure cookies, Origin checks, role boundaries and safe headers in isolated environment.

## Tests and evidence

Invalid/missing environment and build/runtime separation tests; Compose validation; local production TLS smoke; spoofed forwarded headers and direct ingress verification plan. Public firewall/DNS evidence is a separate approved launch action.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.
