# 01: Prove the Recurrente payment and expiry contract

**Priority:** P0
**Status:** BLOCKED — external provider verification required.

**What to build:** Produce an evidence-backed decision on launch payment methods and payment-expiry behavior before designing around assumptions.

**Scope:** One-time GTQ hosted checkout only. Documentation, signed fixtures and sandbox experiments; no live money, purchases, public deployment or account creation without separate authorization.

**Blocked by:** No Recurrente account or Sandbox access. Signed provider fixtures, actual account capabilities and terminal payment behavior remain unverified. This ticket is not completed.

## Acceptance criteria

- [ ] Prove the strict promotion-validity policy: provider-enforced deadline, terminal non-payability after it (including in-flight methods), authoritative success timestamp, and delayed-webhook handling. Starting payment before expiry must not bypass expiry; unsupported methods cannot issue promotional payment links. See the [pricing correction](../../../docs/superpowers/specs/2026-10-08-dynamic-pricing.md).

- [ ] Document merchant verification, enabled methods, account-specific fees, settlement, amount minimum/units and environment separation.
- [ ] Capture sanitized signed webhook fixtures and authoritative checkout/intent retrieval showing amount, currency and immutable local reference mapping; resolve documented envelope inconsistencies.
- [ ] Prove POST-create idempotency or a deterministic recovery procedure for a lost response; record unsupported behavior as a gate, never infer PATCH guarantees apply to POST.
- [ ] Determine whether unpaid expiry and in-flight card/ACH terminal states prevent later success or manual association; distinguish card Sandbox evidence from real ACH behavior.
- [ ] Record method-specific full/partial refund support, unknown refund recovery and unmatched transfer handling.
- [ ] Recommend supported methods and a payment-expiry/replacement policy. If strict validity cannot be established, keep affected automatic collection blocked and present supported-method or request-first alternatives for owner approval.

## Tests and evidence

Contract matrix: create/read/match, invalid amount/currency, replayed signed fixture, expiry before payment, payment in progress at expiry, unknown response, refund result. Label each as documentation-only, simulated, Sandbox-observed or unverified. No fixture is proof of real ACH terminality.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.
