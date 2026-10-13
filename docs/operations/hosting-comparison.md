# Web-store hosting comparison

Researched 2026-10-12. The owner authorized comparison only. No provider has been selected and no account, paid resource or deployment is authorized. Ticket10 remains in progress; payments remain disabled.

## Requirements from the current repository

Reuse the standalone Next.js Docker release, PostgreSQL and the persistent uploads directory. Start with one web-server instance. Configure HTTPS, private database connectivity, backups and tested restoration. Product images must survive restarts and releases. The current local Compose defaults are not production settings.

## Shortlist

Prices below are USD per month before tax, domain registration and additional usage. They are published starting costs, not measured Güteli bills or evidence that the smallest instance has sufficient memory.

| Option                                    | Cost basis                                                                                 | Main trade-off                                                                                                                                                                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Railway Pro                               | $20 minimum including $20 of resource usage; usage above that is extra                     | Recommended for straightforward Docker, database and volume setup with platform support. Variable bill; configure backups and verify recovery.                                                     |
| Render paid services on a Hobby workspace | $7 web compute + $6 smallest PostgreSQL compute, plus database storage and an uploads disk | Lower starting compute cost and separately sized services. Small memory allocations need validation. An attached disk restricts the service to one instance and disables zero-downtime deployment. |
| DigitalOcean 2 GiB Basic Droplet          | $12 server + $3.60 daily image backups = $15.60 before other costs                         | Reuses Compose closely, but we must administer Linux, PostgreSQL, TLS, firewall and recovery. Database-aware backups and a separate recovery copy still need a plan.                               |

Sources: [Railway pricing](https://railway.com/pricing), [Railway commercial-plan guidance](https://docs.railway.com/pricing/faqs), [Railway database responsibilities](https://docs.railway.com/platform/use-cases), [Render pricing](https://render.com/pricing), [Render published PostgreSQL starting price](https://render.com/articles/production-rails-hosting-guide), [Render workspace plans](https://render.com/blog/better-pricing-for-fast-growing-teams), [Render disk limitations](https://render.com/docs/disks), [DigitalOcean server prices](https://www.digitalocean.com/pricing/droplets), [DigitalOcean backup pricing](https://docs.digitalocean.com/products/backups/details/pricing/).

Railway Hobby has a $5 minimum, but this is not a complete-stack price guarantee. Railway recommends Pro for commercial workloads. The Pro recommendation here favors reduced operational work and platform support; it is our assessment, not a requirement imposed by the code.

For either hosted platform, validate forwarded-header handling, private connectivity, upload permissions and persistence, release interruption, backup restoration and actual memory use before launch. A provider's advertised features do not establish those controls for this web store.

## Pending decision

### Lower-cost alternatives requested by owner

Updated 2026-10-12: the owner asked for cheaper options. The earlier Pro recommendation prioritized support rather than minimum spend. For a lower entry cost with less server administration, evaluate Railway Hobby first: $5 minimum including usage, with additional usage billed separately. This is not a $5 fixed total for the web store, database and image storage; actual consumption needs measurement before a launch budget can be confirmed. Railway recommends Pro for commercial workloads, but the cited guidance is a recommendation rather than a stated prohibition on Hobby. See [pricing](https://railway.com/pricing) and [pricing FAQ](https://docs.railway.com/pricing/faqs).

Hetzner CX23 in Germany/Finland is listed at $6.49 per month excluding IPv4 and VAT. Server backups add 20% (about $1.30), with other recovery storage and domain costs separate. Availability must be checked before purchase. This option requires Linux/database maintenance and a Guatemala-to-Europe latency check. Sources: [current price adjustment table](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/) and [backup billing](https://docs.hetzner.com/cloud/billing/faq/).

Oracle Always Free could eliminate the hosting bill within its limits, but capacity may be unavailable and idle instances may be reclaimed. It is not the recommended default for customer orders. See [Oracle Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm). No free capacity or compatibility has been verified for this web store.

Choose a provider for local configuration preparation, or state a different monthly budget/preference. Provider selection alone does not authorize purchasing resources or deploying publicly. Record the selected design after the owner answers; do not treat this comparison as an accepted architecture decision.
