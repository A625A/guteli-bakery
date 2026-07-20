# Build Report

Status: **PASS — 2026-07-19**

Command: `npm run build`

Result: Next.js 16.2.10 completed an optimized static export with exit code 0. It generated `/`, `/_not-found`, `/cart`, `/contact`, `/menu`, and `/order` into `out/`.

Static-start check: `npm run start` served `out/` locally at `http://127.0.0.1:3000`; direct Playwright received successful responses for all five in-scope routes.

Development-start check: `npm run dev -- --hostname 127.0.0.1` reported `http://127.0.0.1:3000`, reached `Ready in 448ms`, returned HTTP 200 for `HEAD /`, and stopped cleanly.

## Dependency advisory

The Task 4 review reported two moderate-severity npm-audit findings in PostCSS through the required `next@16.2.10`. The installed dependency tree confirms `next@16.2.10` resolves `postcss@8.4.31`; Vite separately resolves `postcss@8.5.20`. The two findings remain unresolved and non-blocking because no safe Next.js-compatible automated remediation was available during this milestone. A fresh registry audit was not permitted in this pass, so no new external advisory lookup is claimed.
