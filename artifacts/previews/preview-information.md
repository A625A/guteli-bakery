# Preview Information

Status: **Verified locally on 2026-07-19; not left running.**

Run `npm run build`, then `npm run start`. The latter served the built `out/` directory at `http://127.0.0.1:3000` during the evidence pass. Direct Playwright exercised all five static routes from that server.

Development-server check: `npm run dev -- --hostname 127.0.0.1` reported Next.js 16.2.10 at `http://127.0.0.1:3000` and `Ready in 448ms`. A `HEAD /` request returned HTTP 200, after which the server was stopped cleanly.

This is a local preview only. Public preview or deployment requires separate approval.
