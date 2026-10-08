# 08: Surface and acknowledge every paid order

**Priority:** P0
**Status:** draft — awaiting owner approval; not authorized for implementation.

**What to build:** The owner finds paid orders in the existing dashboard independently of WhatsApp and explicitly acknowledges them.

**Scope:** Extend existing list/detail/dashboard; no WebSockets or paid messaging integration. Preserve dirty notification worktree without merging it implicitly.

**Blocked by:** 05.

## Acceptance criteria

- [ ] Persistent paid-unacknowledged queue/count and financial exception list survive browser/app restart.
- [ ] List/detail expose verified amount, currency, reference, payment state and verification time with plain Spanish labels.
- [ ] Explicit audited acknowledgement is idempotent; page visit/WhatsApp click never acknowledges automatically.
- [ ] Visible polling/manual refresh shows last successful update and staleness; return to tab refreshes immediately.
- [ ] Add validated customer WhatsApp contact action while preserving role/MFA/Origin and minimal list PII.
- [ ] Agree owner checking routine; clearly state that a closed dashboard receives no push alert and disabled Meta delivery is not sending.

## Tests and evidence

Browser closes after payment, owner later logs in, missed polls/reconnect, stale indication, duplicate acknowledgement, unauthorized read/mutation, financial exception visibility and normalized Guatemala phone link.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.
