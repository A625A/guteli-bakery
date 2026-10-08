# 14: Prove readiness of one release candidate

**Priority:** P0
**Status:** draft — awaiting owner approval; not authorized for implementation.

**What to build:** Produce a dated, reviewable go/no-go release record proving the complete supported paid-order lifecycle and recovery.

**Scope:** Run current local/staging isolated verification first; public deployment/DNS/paid resources/live payments remain separate explicit gates.

**Blocked by:** 01–13; separate owner approval required for deployment and any real-money test.

## Acceptance criteria

- [ ] Candidate SHA/config/source provenance recorded; no dirty notification WIP is silently included. Documentation updated to actual behavior.
- [ ] Lint/type/unit/build, isolated DB integration, full customer/admin E2E and production TLS security checks pass; failures remain visible.
- [ ] Capacity/payment races, duplicate/reordered webhooks, provider outage, refund/unknown/late-payment scenarios and browser-closed success all have evidence.
- [ ] Restart and isolated restore drill pass with measured RPO/RTO evidence and owner operational walkthrough.
- [ ] Dependency/advisory review and final standards/spec/security review have no unresolved launch blocker.
- [ ] Provider account/method/terminality contract and owner policies are approved; ACH live verification, if necessary, has separate capped authorization.
- [ ] Complete launch checklist distinguishes implemented, configured and deployed; explicit owner go/no-go and rollback owner are recorded before any launch action.

## Tests and evidence

Execute the specification scenario matrix with real isolated PostgreSQL, browser and TLS evidence. Clearly separate fixture, Sandbox and authorized live evidence. No all-green claim when a required suite or contract remains unverified.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.
