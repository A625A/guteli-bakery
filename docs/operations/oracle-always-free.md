# Oracle Always Free: web-store preparation

Status: investigation and local preparation, 2026-10-12. The owner selected free hosting only and accepted capacity shortages and idle-instance reclamation. No account access, provisioning, public deployment, paid upgrade, commit or push is authorized. Payments remain disabled. Ticket10 is not complete.

## Current provider evidence

Oracle's current [Always Free resource documentation](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) lists A1 ARM compute allowances of 1,500 OCPU-hours and 9,000 GB-hours monthly, equivalent to 2 OCPUs and 12 GB RAM. It also lists 200 GB combined boot/block storage and five volume backups. Compute and block storage must be in the tenancy's home region. Capacity may be unavailable; idle compute may be reclaimed. These are shared tenancy allowances, not an allocation reserved for Güteli. Verify actual eligibility and remaining allowance in the owner's Console before provisioning; do not assume older 4-CPU/24-GB figures apply.

The [Free Tier overview](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier.htm) distinguishes ongoing Always Free resources from temporary trial credit and notes that signup usually requires a phone and credit card. The owner handles identity/payment verification directly. A zero estimate covered by trial credit does not establish ongoing free eligibility.

## Proposed fit for the existing architecture

Use one eligible Ubuntu ARM64 A1 VM, subject to remaining quota and capacity. A provisional sizing target is 1 OCPU, 6 GB RAM, 50 GB boot storage and a separate 50 GB data volume. This is an engineering starting point for validation, not a measured capacity requirement or an authorized resource request.

Keep the existing standalone Next.js Docker image and PostgreSQL 17. PostgreSQL runs privately on the VM; do not replace it with Oracle's different database engines. Mount the data volume before starting containers and store both database data and product images there. Startup must fail if the mount is absent rather than writing to the boot disk accidentally.

Plan a Caddy HTTPS edge with only ports 80/443 public and SSH restricted to the operator. Keep PostgreSQL and the Next server off public host ports. Forwarded headers must be replaced at the trusted edge; validate the actual proxy chain before choosing its trust setting. Host firewall and OCI ingress both require verification. A hostname and domain ownership remain unresolved.

The upstream [Node image architecture list](https://github.com/nodejs/docker-node/blob/main/architectures) and [PostgreSQL image](https://hub.docker.com/_/postgres) include ARM64 support. This is promising compatibility evidence, not an executed ARM build of Güteli. The local Docker daemon was unavailable during investigation, so no image execution or cloud acceptance is claimed.

## Free-only operating boundary

- Inventory existing usage first; do not resize, delete or share another project's resources by assumption.
- Use only resources whose ongoing Always Free eligibility is confirmed. Do not upgrade the tenancy or substitute paid shapes if capacity is exhausted.
- Do not use trial credits to justify paid databases, load balancers, NAT gateways or paid images. Prefer the single-server design above and confirm every selected resource's cost.
- Keep database-aware dumps and image backups outside the VM, with bounded retention inside verified free storage limits. Test restoring both together before launch; snapshots alone are not a database restore test. Never store backup archives in the public uploads directory.
- Reclamation remains a real availability risk. Keep rebuild instructions and backups; do not create artificial load to evade idle policies.
- Separate migrations and owner provisioning from startup. Preserve stable signing keys and document MFA recovery. The existing production preflight and database-only health check do not yet satisfy full readiness.

## Next evidence and decision

Determine whether the owner will use an existing Oracle account or needs signup guidance. Then verify its home region, unused free quota and A1 availability without changing resources. This must precede choosing concrete resource sizes and host-specific settings. The hostname, backup retention/recovery target, local ARM build, secure Compose configuration and production TLS tests remain open. Account selection does not authorize provisioning or deployment.
