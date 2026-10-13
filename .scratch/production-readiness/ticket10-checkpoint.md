# Ticket10 checkpoint

Owner authorized Ticket10 for the web store (2026-10-09). Keep payments disabled, capacity excluded, all uncommitted work/worktrees preserved. No commit/push/deploy/paid resources.

First slice: production configuration preflight through the existing environment parser boundary and a local CLI. Tests cover invalid/missing environment, HTTPS origin, independent non-placeholder secrets, explicit upload/proxy settings, and disabled integrations as already specified in Ticket10. Reuse Docker/Next/PostgreSQL and existing production TLS harness. Do not infer deployment readiness from NODE_ENV or /health alone.

Pending hosting decision before provider-specific TLS/private ingress/storage configuration. No hosting vendor is approved. Logs: /private/tmp/guteli-ticket10-harness. Use focused commands and a checkpoint; no delegated exploration.

Verification refreshed 2026-10-12: 10 focused configuration/CLI tests pass; full typecheck, scoped ESLint, scoped Prettier and git diff --check pass. Fixed the CLI test-case array typing found by typecheck. Previous temporary logs are no longer available; these results were rerun. Ticket10 remains incomplete: automatic startup/readiness safeguards, deliberate live build, hosting configuration and TLS acceptance are still pending. Next question: use existing hosting or compare hosting options before selecting one. No commit, push or deployment performed.

Owner chose comparison first. Current primary-source comparison is saved in docs/operations/hosting-comparison.md (2026-10-12): Railway Pro recommended for preparation, Render and a DigitalOcean server are alternatives. No selection yet; ask one provider/budget choice and wait. No runtime changes or new test runs in the comparison slice.

Owner then requested cheaper options. Comparison extended with Railway Hobby ($5 minimum, variable usage), Hetzner CX23 Europe ($6.49 base plus IPv4/backups/tax), and Oracle Always Free (capacity/reclamation limitations). Lower-entry-cost recommendation is now to evaluate Railway Hobby, not assume a $5 total. Provider decision remains pending; no infrastructure or runtime changes.

Owner selected Oracle Always Free for investigation/local preparation, accepting capacity/reclamation limitations. Research and proposed architecture: docs/operations/oracle-always-free.md. Current Oracle resource page lists 2 OCPU/12 GB equivalent, not older 4/24 figures; account quota remains unverified. Local Docker daemon absent, so no ARM image execution claimed. No runtime changes/tests in this research slice. Next question: existing Oracle account or signup guidance; do not inspect/reuse another project's cloud resources by assumption. Still no provisioning/deployment/paid upgrade/commit/push authorization.
