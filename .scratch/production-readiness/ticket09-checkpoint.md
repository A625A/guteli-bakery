# Ticket09 checkpoint

The manual-only checkpoint below is historical. The owner subsequently approved customer-plus-owner automation and scoped GitHub publication on 2026-10-13. See the extension record at the end and `docs/operations/whatsapp-automation.md`; old no-push instructions in this historical section are superseded.

Verified locally 2026-10-13. Work only on customer WhatsApp summaries. Oracle deployment is on hold; no Oracle access or hackathon infrastructure changes. Payments and automatic WhatsApp notifications remain disabled. Do not start another ticket automatically.

## Publication boundary

Before Ticket09 implementation, the owner-authorized prior milestone was committed and pushed as `41230827268a3b8efd196ea175aec1835ca75dba` on `origin/main` (`A625A/guteli-bakery`). Remote SHA equality was verified. That checkpoint included earlier checkout/promotions and runtime-preflight work. Existing `products/` and other worktrees were preserved. All Ticket09 changes are local and uncommitted; publishing them needs further authorization.

## Implementation and review

- Reused the checkout-owner HttpOnly credential, trusted-Origin guard, catalog/order locks, pricing revisions, receipt screen, configured handoff destination and URL helper. No schema changes.
- Added a bounded, private POST summary endpoint: matching owner/order required, expiry rechecked after locks and before response, anonymized orders rejected, safe generic errors and no-store headers.
- Summary includes item quantities/sale units, regular/effective unit prices, discounts, line totals, subtotal, shipping/final-total uncertainty, order/payment state, acceptance, requested date, necessary fulfillment/contact details and Guatemala pricing timestamp.
- Server refreshes unpaid prices. Open/copy supplies a semantic preview fingerprint; changed prices, shipping, status or customer details produce a new preview requiring review. Stored paid/refunded totals are preserved, but payment markers are explicitly unverified because no provider verification record exists.
- Customer opts into the private preview. Preview clears on expiry, focus return, session failure or hide; no local storage. Every share/copy refreshes. Encoding is applied once, with full selectable-text/copy fallbacks for blocked navigation or long links.
- Local review caught and fixed a demo-mode regression before completion: preview/copy remain available but opening WhatsApp respects the existing live-handoff gate. Its unit test was observed failing before the fix, then passing.
- Browser harness uses a dedicated local port and one server; test identities are distinct so production rate limits remain unchanged. External navigation and clipboard are intercepted. No real WhatsApp message was sent.

## Validation

Logs are local artifacts in `/private/tmp/guteli-ticket09-harness`; they are not committed.

| Check                                                                       | Result                                                                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| New formatter/encoding/demo-gate unit tests                                 | 10 passed; initial missing formatter and demo-gate tests observed red before implementation             |
| Full unit suite                                                             | 244 passed, 2 failed (246 total)                                                                        |
| Focused integration plus existing order/receipt/pricing/session regressions | 36 passed across 5 files, including 8 new summary tests                                                 |
| New browser suite                                                           | 8 passed: desktop and 390×844 mobile/touch emulation; separate demo-only case passed (9 distinct cases) |
| Existing checkout browser regressions                                       | 27 passed on the suite run; one page-load timeout passed on isolated retry (28 distinct cases)          |
| Typecheck                                                                   | Passed                                                                                                  |
| Full ESLint                                                                 | Passed                                                                                                  |
| Production build                                                            | Passed with local fixture configuration, demo mode and payments disabled; no deployment                 |
| Scoped Prettier and git diff whitespace check                               | Passed                                                                                                  |

The two unit failures are unchanged README string assertions in `tests/unit/docker-runtime.test.ts`: ordinary Docker Compose commands and migration/secret-injection prerequisites. They predate Ticket09 and were not repaired outside the authorized scope. Initial browser attempts also exposed test-server configuration conflicts; the final summary run passed all eight live-mode cases together after fixing the new harness. An earlier mobile element-stability timeout passed on retry and in the final full summary run.

Reproduce compact checks with `.scratch/production-readiness/verify-ticket09.py` profiles `unit`, `summary-unit`, `integration`, `browser`, `checkout-browser`, `types`, `lint`, `build`. Database/browser profiles require an isolated `DATABASE_URL_TEST`; never run them concurrently. The demo regression uses `GUTELI_SUMMARY_DEMO=true` with `playwright.summary.config.ts` and grep `demo mode allows`. This run used a task-owned local PostgreSQL cluster on port 55439, stopped after validation; no shared database was used.

## Remaining limits

Ticket09's provider-independent implementation is verified locally. Do not mark the entire ticket complete: actual verified-paid messages require Ticket05's authoritative verification evidence, which depends on blocked Ticket01. No provider behavior or successful payment verification is simulated as production proof. PAID/REFUNDED markers fail closed in the message.

Mobile testing was Chromium mobile/touch emulation, not a physical device or native WhatsApp delivery test. The user still chooses whether to send in WhatsApp; previously copied/sent summaries cannot be revoked and explicitly identify pricing time and possible unpaid-price changes. A copied draft is never payment authority or a price lock.

## Automatic customer-plus-owner extension — final local verification, 2026-10-13

The owner approved direct Meta Cloud API, opt-in customer receipts plus owner notifications on submission, future verified customer payment confirmations, and scoped publication to the existing main branch. All real sending and deployment remain unauthorized. The implementation adds optional consent, atomic deduplicated outbox events, fresh-price rendering at send time, bounded safe retries, uncertain-send holds, signed delivery/opt-out callbacks, early-callback reconciliation, owner-visible status, and a disabled-by-default operator worker. Manual handoff is preserved. See `docs/superpowers/specs/2026-10-13-whatsapp-automation.md` and `docs/operations/whatsapp-automation.md` for the complete contract and activation blockers.

Review corrections verified by regression tests: checkout's request allowlist now preserves explicit consent; callback deduplication includes recipient so an unrelated recipient cannot poison a later correct callback; delivery acceptance is distinct from delivery/read; known rate-limit exhaustion is blocked rather than mislabeled uncertain; incoming bodies have both size and time limits. Existing owner adapter transport is reused. No credentials, local database or generated test artifacts belong to the publication scope. The existing products/ directory and other worktrees are untouched.

Final results:

| Check                                                          | Result                                                                                                                                                                             |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Full unit suite                                                | 254 passed; 2 pre-existing README assertions failed (256 total)                                                                                                                    |
| Full integration regression suite                              | 162 passed across 23 files                                                                                                                                                         |
| Final targeted automation integration suite after review fixes | 9 passed; includes one additional retry-limit case, for 163 distinct integration cases exercised overall                                                                           |
| Summary/consent browsers                                       | 10 passed across desktop and mobile/touch emulation; separate demo-only case passed (11 distinct cases)                                                                            |
| Checkout browser regressions                                   | 27 passed on the suite run; the expected control-count change was updated to include the new checkbox and its full keyboard interaction, then that case passed (28 distinct cases) |
| Typecheck, full ESLint, production build                       | Passed with fixture-only configuration and payment/messaging flags disabled                                                                                                        |
| Migration consistency                                          | Drizzle reports no ungenerated schema changes; both new migrations exercised in isolated database tests                                                                            |
| Scoped formatting, whitespace and publication scan             | Checked before publication; no credential-pattern matches, databases or temporary logs included                                                                                    |

The two README failures were reviewed rather than silenced. They expect the ordinary `docker compose up --build -d` workflow and explicit provision/migration/secret-injection instructions that the current abbreviated README omits. A separate documentation/test-contract fix should restore maintained operational instructions (or deliberately move them to a canonical guide and test that guide). No unrelated runtime behavior or test expectations were changed to make them pass. The updated keyboard test is directly required by Ticket09's new consent control.

Evidence lives under `/private/tmp/guteli-ticket09-harness`, outside Git. The harness now includes full `automation-integration` and focused `automation-unit` profiles. Database/browser profiles must run sequentially against an isolated test database. The task-owned PostgreSQL cluster on port 55439 is stopped after verification. No real WhatsApp requests, native-device delivery, provider approval or payment verification are claimed.

Publication scope is the 48 reviewed Ticket09 files (manual summary and automation together); products/ and generated next-env.d.ts are excluded. This record is prepared for the authorized normal push; the final remote commit SHA is reported separately after equality verification. Ticket09 remains externally blocked for live activation/template approval and actual verified-paid messages. Ticket01 remains blocked, payments stay disabled, Oracle is on hold, and no next ticket begins.
