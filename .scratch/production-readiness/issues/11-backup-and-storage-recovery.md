# 11: Recover orders and images from an off-host backup

**Priority:** P0
**Status:** draft — awaiting owner approval; not authorized for implementation.

**What to build:** The operator can restore the bakery database, images and pending work after losing the application host.

**Scope:** Single-host persistent storage plus encrypted off-host backup if approved; existing object storage interface only if host is ephemeral/scaled. No paid resource creation in this ticket without explicit approval.

**Blocked by:** 10; approved host/storage choice, retention and RPO/RTO.

## Acceptance criteria

- [ ] Database and image persistence survive ordinary restart; backup includes needed consistency/version information and excludes exposed secrets.
- [ ] Encrypted off-host backup freshness and failure are monitored; retention and access are explicit.
- [ ] Restore tooling refuses destructive use against production/default databases and requires an isolated named target.
- [ ] Demonstrate restore of orders, users, images and pending work, including safe reconciliation recovery; report measured recovery times.
- [ ] Image cleanup jobs have a bounded safe operational invocation and cannot remove referenced media.
- [ ] Document migrations/rollback and recovery ownership; a named Docker volume alone is not called a backup.

## Tests and evidence

Temporary DB/media fixture backup, corruption/failure reporting, isolated restore equality, restart, missing image and pending-job recovery. No production data used.

## Completion boundary

Demonstrate the stated behavior and record evidence. Do not commit, push, deploy, purchase, send messages, modify production data or run real-money transactions without the authorization applicable at implementation time.
