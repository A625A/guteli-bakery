# Build Report

Status: **Merged-main static build and preview PASS — 2026-07-19**

Command: `npm run build`

Result: a fresh Next.js 16.2.10 optimized static export from `main` exited 0. It generated `/`, `/_not-found`, `/cart`, `/contact`, `/menu`, and `/order` into `out/`.

Static-start check: `npm run start` served `out/` locally at `http://127.0.0.1:3000`; `HEAD /` returned HTTP 200 and the server stopped cleanly.

Main-checkout portability check: the first merged-main build exposed an empty, untracked legacy root `app/` directory that took precedence over `src/app/` and exported only `/404`. The directory was verified empty and removed with `rmdir`; the immediate GREEN build exported all approved routes. ESLint's flat config was also hardened to ignore repository-owned `.worktrees/**` output.

Post-review runtime recapture: direct installed Playwright received HTTP 200 for the root route at 1440×1000 and 390×844, found zero console errors and no horizontal overflow, transferred skip-link focus to `main-content`, and measured the footer at the document bottom in both viewports.

Development-start check: `npm run dev -- --hostname 127.0.0.1` reported `http://127.0.0.1:3000`, reached `Ready in 448ms`, returned HTTP 200 for `HEAD /`, and stopped cleanly.

## Dependency risk audit

Direct runtime dependencies are `next@16.2.10`, `react@19.2.7`, and `react-dom@19.2.7` (all MIT). Direct development dependencies are `@playwright/test@1.61.1` and `typescript@5.9.3` (Apache-2.0); `@types/node@24.13.3`, `@types/react@19.2.17`, `@types/react-dom@19.2.3`, `eslint@9.39.5`, `eslint-config-next@16.2.10`, `prettier@3.9.5`, `serve@14.2.6`, `typescript-eslint@8.55.0`, `vite@6.4.3`, and `vitest@3.2.7` (MIT). No direct-package license conflict is identified; no project license policy was supplied.

Fresh `npm audit --json` and `npm audit --omit=dev --json` each exited 1 with 2 moderate package entries, 0 high, and 0 critical. They identify one advisory: [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93), “PostCSS has XSS via Unescaped `</style>` in its CSS Stringify Output” (CWE-79, CVSS 6.1), affecting `postcss <8.5.10`. The affected runtime path is direct `next@16.2.10` → `postcss@8.4.31` (`node_modules/next` and `node_modules/postcss`); Vite separately resolves unaffected `postcss@8.5.20`.

Scope risk is currently limited because this static foundation processes only repository-authored CSS, not user-controlled CSS. It remains a runtime dependency risk for later milestones. `npm audit` suggests `next@9.3.3`, a semver-major downgrade that is incompatible with this approved Next 16 foundation, so it was not applied. Safest mitigation: upgrade Next.js to a supported release that resolves PostCSS 8.5.10 or newer, then rerun the full gate and audit; evaluate an override only with compatibility evidence.
