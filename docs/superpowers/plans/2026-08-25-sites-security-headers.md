# Sites Security Headers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add compatible security response headers to the Sites Worker without altering application behavior.

**Architecture:** Fetch the static asset once, construct a new response with the original stream and metadata, then set a fixed, audited set of response headers. Keep the policy in the Worker boundary so it applies uniformly to HTML and static assets deployed through Sites.

**Tech Stack:** TypeScript, Cloudflare-compatible Fetch API, Vitest, Next.js static export

**Spec:** `docs/superpowers/specs/2026-08-25-sites-security-headers-design.md`

## Global Constraints

- Do not install a new dependency.
- Do not change visual design or disable user flows.
- Preserve the asset response body, status, status text, and existing headers.
- Keep framework-required inline script and style compatibility explicit in CSP.
- Stage explicit approved paths only; exclude `products/`.

---

### Task 1: Harden Sites responses

**Files:**

- Modify: `tests/unit/sites-deployment.test.ts`
- Modify: `hosting/sites-worker.ts`

**Interfaces:**

- Consumes: `env.ASSETS.fetch(request): Promise<Response>`
- Produces: `worker.fetch(request, env): Promise<Response>` with the original response semantics plus security headers

- [x] **Step 1: Write the failing response-contract test**

Add a Vitest case that returns an asset response with status `206`, status text `Partial Content`, `Content-Type: text/html`, and `Cache-Control: public, max-age=300`. Assert that the Worker preserves those values and the body while adding the exact CSP, HSTS, nosniff, referrer, permissions, frame, and legacy XSS-filter headers from the design.

- [x] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/unit/sites-deployment.test.ts`

Expected: FAIL because the current pass-through Worker returns no `Content-Security-Policy` header.

- [x] **Step 3: Implement the minimal response wrapper**

In `hosting/sites-worker.ts`, await `env.ASSETS.fetch(request)`, construct `new Response(assetResponse.body, assetResponse)`, set the approved headers on the new response, and return it. Do not alter request forwarding or asset response content.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `npm test -- tests/unit/sites-deployment.test.ts`

Expected: all Sites deployment contract tests pass.

- [x] **Step 5: Run complete verification**

Run `npm audit --audit-level=high`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run build:sites`, `npm run test:e2e`, `npm run test:e2e:live`, and `npm run test:e2e:unavailable`. Inspect the final Git diff and run `git diff --check`.

- [x] **Step 6: Publish the verified scope**

Stage only `package.json`, `package-lock.json`, `AGENTS.md`, `CLAUDE.md`, this spec and plan, `hosting/sites-worker.ts`, and `tests/unit/sites-deployment.test.ts`. Commit under the configured Andrew identity, push `main` to `origin`, and verify the remote SHA with `git ls-remote origin refs/heads/main`.
