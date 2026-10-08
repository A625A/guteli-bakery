# 12: Keep customer and payment data out of unsafe surfaces

**Priority:** P0
**Status:** draft — awaiting owner approval; not authorized for implementation.

**What to build:** Customers receive private status and operators can diagnose failures without logging personal data or credentials.

**Scope:** Structured safe logs, token-safe receipt headers, bounded retention/cleanup and access controls; no analytics service.

**Blocked by:** 02; owner-approved retention and financial record policy.

## Acceptance criteria

- [ ] Allowlist safe operational fields; redact customer name/phone/address/notes, cookies, receipt/recovery tokens, signatures, keys and provider PII at app and edge.
- [ ] Receipt HTML/API and full summary have appropriate no-store/no-referrer/noindex behavior; public DTO remains minimal.
- [ ] Batched idempotent maintenance supports dry run and approved retention; preserve financial reconciliation/audit evidence and long-lived idempotency needed to prevent repeat charges.
- [ ] Monitor failed verification, unknown payments, pending age, worker heartbeat and backup/storage failures with safe actionable codes.
- [ ] Document customer privacy notice and recovery/access procedure without claiming a particular legal regime is satisfied.

## Tests and evidence

Canary PII/secret inputs through every error path and log sink, cross-order token access, expired credentials, repeated/dry-run maintenance and pending-financial-record preservation.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.
