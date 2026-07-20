# Build Report

Status: **PASS — 2026-07-19**

Command: `npm run build`

Result: Next.js 16.2.10 completed an optimized static export with exit code 0. It generated `/`, `/_not-found`, `/cart`, `/contact`, `/menu`, and `/order` into `out/`.

Static-start check: `npm run start` served `out/` locally at `http://127.0.0.1:3000`; direct Playwright received successful responses for all five in-scope routes.
