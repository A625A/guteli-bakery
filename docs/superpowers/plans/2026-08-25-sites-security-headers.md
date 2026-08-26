# Sites Security Headers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add compatible security response headers to every Sites response without altering application behavior.

**Architecture:** Apply the policy in `public/_headers` for Cloudflare static assets and in the Worker for responses that execute `hosting/sites-worker.ts`. The Worker fetches the asset once, constructs a new response with the original stream and metadata, then sets the same fixed, audited headers.

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

### Task 2: Cover static asset responses

**Files:**

- Create: `public/_headers`
- Modify: `tests/unit/sites-deployment.test.ts`
- Modify: `docs/superpowers/specs/2026-08-25-sites-security-headers-design.md`

**Interfaces:**

- Consumes: Cloudflare Workers Static Assets `_headers` rules
- Produces: the same security policy on existing static files that bypass the Worker fetch handler

- [x] **Step 1: Write and run a failing static-header contract**

Parse `public/_headers` as a `/*` rule and assert the exact CSP, HSTS, nosniff, referrer, permissions, frame, and legacy XSS-filter values. Run `npm test -- tests/unit/sites-deployment.test.ts` and verify failure because the file is absent.

- [x] **Step 2: Add the static asset rule and verify GREEN**

Create `public/_headers` with the exact Worker policy under `/*`, then rerun the focused test and require all five Sites deployment contract tests to pass.

- [ ] **Step 3: Verify build output and production**

Run the complete verification suite, confirm `out/_headers` matches `public/_headers`, publish the exact validated commit, deploy privately, and verify the expected security headers on the production URL.
