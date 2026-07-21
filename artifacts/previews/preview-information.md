# Preview Information

## Milestone 2 capture — 2026-07-21

Status: **Verified locally at capture time; public preview not authorized.**

The existing Next.js development server at `http://127.0.0.1:3000` was reused by Playwright. `curl -sS -I http://127.0.0.1:3000/` returned HTTP 200 at `Tue, 21 Jul 2026 08:05:26 GMT`. The artifact spec traversed `/`, `/menu/`, `/cart/`, and `/order/` at exact 1440×1000 and 390×844 viewports and captured seven full-page PNG files with animations disabled.

The process was already running before Task 8 and was not started, stopped, or published by this evidence pass. Availability after this recorded check is not guaranteed.

## Milestone 1 evidence (preserved)

Status: **Verified locally on 2026-07-19; not left running.**

Run `npm run build`, then `npm run start`. The latter served the built `out/` directory at `http://127.0.0.1:3000` during the evidence pass. Direct Playwright exercised all five static routes from that server.

Development-server check: `npm run dev -- --hostname 127.0.0.1` reported Next.js 16.2.10 at `http://127.0.0.1:3000` and `Ready in 448ms`. A `HEAD /` request returned HTTP 200, after which the server was stopped cleanly.

This is a local preview only. Public preview or deployment requires separate approval.
