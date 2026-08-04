# Preview Information

## Banner redesign private preview — 2026-08-04

Status: **Verified locally; awaiting user approval; not deployed.**

The approved banner-led homepage was checked at 1440×1000 and 390×844. The banner remains uncropped, the compact header mark is corrected, repeated hero and menu-preview areas are absent, and the existing menu-to-order journey remains intact. The current live Sites version was not replaced.

## Milestone 3 verified local preview — 2026-07-21

Status: **Verified locally; stopped after checks; not publicly deployed.**

The restored default-demo static export was served with `npm run start` at `http://127.0.0.1:3000`. Requests to `/`, `/menu/`, `/cart/`, `/order/`, and `/contact/` each returned HTTP 200. The exported homepage includes the demo notice and no exact live or test WhatsApp destination.

The server stopped cleanly after verification. Public deployment remains explicitly unauthorized.

## Milestone 2 verified preview — 2026-07-21

Status: **Verified locally at capture time; public preview not authorized.**

Playwright traversed `/`, `/menu/`, `/cart/`, and `/order/` at exact 1440×1000 and 390×844 viewports and captured seven full-page PNG files with animations disabled. After the final static build, `npm run start` served `out/` at `http://127.0.0.1:3000`; HEAD requests to `/`, `/menu/`, `/cart/`, `/order/`, and `/contact/` each returned HTTP 200.

The local preview was stopped cleanly after verification. Nothing was published, and availability after this recorded check is not guaranteed.

## Milestone 1 evidence (preserved)

Status: **Verified locally on 2026-07-19; not left running.**

Run `npm run build`, then `npm run start`. The latter served the built `out/` directory at `http://127.0.0.1:3000` during the evidence pass. Direct Playwright exercised all five static routes from that server.

Development-server check: `npm run dev -- --hostname 127.0.0.1` reported Next.js 16.2.10 at `http://127.0.0.1:3000` and `Ready in 448ms`. A `HEAD /` request returned HTTP 200, after which the server was stopped cleanly.

This is a local preview only. Public preview or deployment requires separate approval.
