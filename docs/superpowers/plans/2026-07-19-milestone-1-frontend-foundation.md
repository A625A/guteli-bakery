# Milestone 1 Frontend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish and verify a portable, statically exportable Next.js and TypeScript foundation without implementing the finished customer experience.

**Architecture:** Next.js App Router renders static Spanish-first route shells. Shared site constants live in typed content, design tokens live in a dedicated stylesheet, Vitest verifies the foundation contract, and Playwright verifies the real route shell in Chromium. Static output is served locally by the pinned `serve` package.

**Tech Stack:** Next.js 16.2.10, React 19.2.7, TypeScript 5.9.3, TypeScript ESLint 8.55.0, Vite 6.4.1, ESLint 9.39.5, Prettier 3.9.5, Vitest 3.2.7, Playwright 1.61.1, serve 14.2.6, npm lockfile.

## Global Constraints

- Customer-facing copy is Spanish-first and the document locale is exactly `es-GT`.
- Currency configuration is exactly `GTQ`.
- The application is statically exportable and contains no backend, database, authentication, CMS, payment, inventory, analytics account, or WhatsApp API.
- The application has no runtime dependency on the Empresita vault or machine-specific path.
- Milestone 1 contains only the foundation shell and route placeholders; the finished homepage, menu, cart, order flow, and WhatsApp experience remain unimplemented.
- Runtime dependency versions are Next.js 16.2.10, React 19.2.7, and React DOM 19.2.7.
- Development dependency versions are TypeScript 5.9.3, TypeScript ESLint 8.55.0, Vite 6.4.1, ESLint 9.39.5, Prettier 3.9.5, Vitest 3.2.7, Playwright 1.61.1, and serve 14.2.6.
- Supported Node.js runtime is `>=20.9.0`; npm is the package manager and `package-lock.json` is authoritative.
- Public deployment is prohibited.

---

### Task 1: Portable framework and toolchain configuration

**Files:**
- Modify: `.gitignore`
- Create: `package.json`
- Create: `package-lock.json` through `npm install`
- Create: `next-env.d.ts`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `eslint.config.mjs`
- Create: `prettier.config.mjs`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`

**Interfaces:**
- Consumes: Node.js `>=20.9.0`, npm, the approved static-export architecture.
- Produces: verified scripts `dev`, `format`, `format:check`, `lint`, `typecheck`, `test`, `test:watch`, `test:e2e`, `test:e2e:install`, `build`, and `start`; alias `@/*` mapped to `src/*`.

- [ ] **Step 1: Create the package manifest**

```json
{
  "name": "guteli-bakery",
  "version": "0.1.0",
  "private": true,
  "engines": {
    "node": ">=20.9.0",
    "npm": ">=10.0.0"
  },
  "scripts": {
    "dev": "next dev",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:install": "playwright install chromium",
    "build": "next build",
    "start": "serve out -l 3000"
  },
  "dependencies": {
    "next": "16.2.10",
    "react": "19.2.7",
    "react-dom": "19.2.7"
  },
  "devDependencies": {
    "@playwright/test": "1.61.1",
    "@types/node": "^24.0.0",
    "@types/react": "19.2.17",
    "@types/react-dom": "19.2.3",
    "eslint": "9.39.5",
    "eslint-config-next": "16.2.10",
    "prettier": "3.9.5",
    "serve": "14.2.6",
    "typescript": "5.9.3",
    "typescript-eslint": "8.55.0",
    "vite": "6.4.1",
    "vitest": "3.2.7"
  }
}
```

- [ ] **Step 2: Create framework and quality configuration**

`next.config.ts`:

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next-env.d.ts`:

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

`eslint.config.mjs`:

```js
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores(['.next/**', 'out/**', 'coverage/**', 'next-env.d.ts']),
]);
```

`prettier.config.mjs`:

```js
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
};
```

`vitest.config.ts`:

```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'node', setupFiles: ['./src/test/setup.ts'] },
});
```

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 3: Install exact dependencies and browser runtime**

Run: `npm install`

Expected: exit 0 and a new `package-lock.json` matching `package.json`.

Run: `npm run test:e2e:install`

Expected: exit 0 and Chromium available to Playwright.

- [ ] **Step 4: Verify installed tool versions**

Run: `npm exec next -- --version`

Expected: `Next.js v16.2.10`.

Run: `npm exec vitest -- --version`

Expected: Vitest 3.2.7 on the active Node runtime.

Run: `npm exec playwright -- --version`

Expected: Playwright 1.61.1.

- [ ] **Step 5: Commit the toolchain foundation**

```bash
git add .gitignore package.json package-lock.json next-env.d.ts next.config.ts tsconfig.json eslint.config.mjs prettier.config.mjs vitest.config.ts playwright.config.ts docs/superpowers/plans/2026-07-19-milestone-1-frontend-foundation.md
git commit -m "chore: initialize frontend toolchain"
```

---

### Task 2: Typed site foundation contract

**Files:**
- Create: `tests/unit/business.test.ts`
- Create: `src/content/business.ts`
- Create: `src/test/setup.ts`
- Modify: `docs/PROPOSED_FILE_STRUCTURE.md`

**Interfaces:**
- Consumes: Vitest configuration and `@/*` alias from Task 1.
- Produces: `siteConfig` with `name`, `locale`, and `currency`; `primaryNavigation` with the five approved foundation routes.

- [ ] **Step 1: Write the failing site-contract test**

```ts
import { describe, expect, it } from 'vitest';

import { primaryNavigation, siteConfig } from '@/content/business';

describe('site foundation contract', () => {
  it('uses the approved Guatemala locale and currency', () => {
    expect(siteConfig).toEqual({
      name: 'Güteli Bakery',
      locale: 'es-GT',
      currency: 'GTQ',
    });
  });

  it('exposes each foundation route once with Spanish labels', () => {
    expect(primaryNavigation).toEqual([
      { href: '/', label: 'Inicio' },
      { href: '/menu/', label: 'Menú' },
      { href: '/cart/', label: 'Carrito' },
      { href: '/order/', label: 'Pedido' },
      { href: '/contact/', label: 'Contacto' },
    ]);
    expect(new Set(primaryNavigation.map(({ href }) => href)).size).toBe(
      primaryNavigation.length,
    );
  });
});
```

- [ ] **Step 2: Run the test to verify RED**

Run: `npm test -- tests/unit/business.test.ts`

Expected: FAIL because `@/content/business` does not exist.

- [ ] **Step 3: Implement the smallest typed contract**

`src/content/business.ts`:

```ts
export const siteConfig = {
  name: 'Güteli Bakery',
  locale: 'es-GT',
  currency: 'GTQ',
} as const;

export const primaryNavigation = [
  { href: '/', label: 'Inicio' },
  { href: '/menu/', label: 'Menú' },
  { href: '/cart/', label: 'Carrito' },
  { href: '/order/', label: 'Pedido' },
  { href: '/contact/', label: 'Contacto' },
] as const;
```

`src/test/setup.ts`:

```ts
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
});
```

- [ ] **Step 4: Run the test to verify GREEN**

Run: `npm test -- tests/unit/business.test.ts`

Expected: 2 tests pass.

- [ ] **Step 5: Update the approved structure document**

Add `tests/unit/business.test.ts` to the exact test tree. No other architecture boundary changes.

- [ ] **Step 6: Commit the site contract**

```bash
git add src/content/business.ts src/test/setup.ts tests/unit/business.test.ts docs/PROPOSED_FILE_STRUCTURE.md
git commit -m "test: define frontend foundation contract"
```

---

### Task 3: Static global shell and route placeholders

**Files:**
- Create: `tests/browser/foundation.spec.ts`
- Create: `src/components/shared/FoundationPage.tsx`
- Create: `src/styles/tokens.css`
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/menu/page.tsx`
- Create: `src/app/cart/page.tsx`
- Create: `src/app/order/page.tsx`
- Create: `src/app/contact/page.tsx`
- Create: `src/app/not-found.tsx`
- Modify: `docs/PROPOSED_FILE_STRUCTURE.md`

**Interfaces:**
- Consumes: `siteConfig`, `primaryNavigation`, design-system direction, Next.js App Router.
- Produces: accessible Spanish shell, skip link, five static route placeholders, static export, desktop and mobile test target.

- [ ] **Step 1: Write the failing browser verification**

```ts
import { expect, test } from '@playwright/test';

const routes = [
  { path: '/', heading: 'Fundación frontend lista' },
  { path: '/menu/', heading: 'Menú' },
  { path: '/cart/', heading: 'Carrito' },
  { path: '/order/', heading: 'Pedido' },
  { path: '/contact/', heading: 'Contacto' },
] as const;

for (const route of routes) {
  test(`${route.path} renders the Spanish foundation shell`, async ({ page }) => {
    await page.goto(route.path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-GT');
    await expect(
      page.getByRole('heading', { level: 1, name: route.heading }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeAttached();
    await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
  });
}
```

- [ ] **Step 2: Run the browser test to verify RED**

Run: `npm run test:e2e -- tests/browser/foundation.spec.ts`

Expected: FAIL because the Next.js app entry points do not exist.

- [ ] **Step 3: Create semantic design tokens**

```css
:root {
  --color-background: #fff7e8;
  --color-surface: #f3dfc2;
  --color-surface-strong: #d9ad78;
  --color-text: #2b160f;
  --color-text-muted: #6d4f40;
  --color-brand: #3a1f17;
  --color-brand-contrast: #fff7e8;
  --color-accent: #c84f0a;
  --color-accent-hover: #9f3d06;
  --color-border: #b98d67;
  --color-focus: #075985;
  --color-success: #24613b;
  --color-warning: #8a4b08;
  --color-error: #a1261c;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 4rem;
  --radius-small: 0.5rem;
  --radius-medium: 1rem;
  --radius-pill: 999px;
  --shadow-soft: 0 1rem 2.5rem rgb(58 31 23 / 12%);
  --font-body: Arial, Helvetica, sans-serif;
  --font-display: Arial Black, Arial, Helvetica, sans-serif;
  --content-wide: 72rem;
  --content-reading: 44rem;
}
```

- [ ] **Step 4: Create the shared placeholder component**

```tsx
type FoundationPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function FoundationPage({
  eyebrow,
  title,
  description,
}: FoundationPageProps) {
  return (
    <main id="main-content" className="foundation-page">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="foundation-copy">{description}</p>
      <p className="foundation-status" role="status">
        Base técnica verificada. La experiencia final se construirá en los
        siguientes hitos.
      </p>
    </main>
  );
}
```

- [ ] **Step 5: Create layout and route entries**

`src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { primaryNavigation, siteConfig } from '@/content/business';

import '@/styles/tokens.css';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} | Fundación`,
    template: `%s | ${siteConfig.name}`,
  },
  description: 'Fundación técnica del sitio de Güteli Bakery.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang={siteConfig.locale}>
      <body>
        <a className="skip-link" href="#main-content">
          Saltar al contenido
        </a>
        <header className="site-header">
          <div className="site-header__inner">
            <Link className="wordmark" href="/" aria-label="Güteli Bakery, inicio">
              {siteConfig.name}
            </Link>
            <nav aria-label="Principal">
              <ul className="site-nav">
                {primaryNavigation.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <p>Fundación del sitio · Milestone 1</p>
        </footer>
      </body>
    </html>
  );
}
```

`src/app/page.tsx`:

```tsx
import { FoundationPage } from '@/components/shared/FoundationPage';

export default function HomePage() {
  return (
    <FoundationPage
      eyebrow="Milestone 1"
      title="Fundación frontend lista"
      description="Esta pantalla confirma la base técnica del sitio. El contenido final de inicio se construirá en el siguiente hito."
    />
  );
}
```

`src/app/menu/page.tsx`:

```tsx
import { FoundationPage } from '@/components/shared/FoundationPage';

export default function MenuPage() {
  return (
    <FoundationPage
      eyebrow="Ruta reservada"
      title="Menú"
      description="El menú completo y sus productos se implementarán en Milestone 2."
    />
  );
}
```

`src/app/cart/page.tsx`:

```tsx
import { FoundationPage } from '@/components/shared/FoundationPage';

export default function CartPage() {
  return (
    <FoundationPage
      eyebrow="Ruta reservada"
      title="Carrito"
      description="La selección de productos y el carrito se implementarán en Milestone 3."
    />
  );
}
```

`src/app/order/page.tsx`:

```tsx
import { FoundationPage } from '@/components/shared/FoundationPage';

export default function OrderPage() {
  return (
    <FoundationPage
      eyebrow="Ruta reservada"
      title="Pedido"
      description="El formulario, el resumen y la entrega por WhatsApp se implementarán en Milestone 4."
    />
  );
}
```

`src/app/contact/page.tsx`:

```tsx
import { FoundationPage } from '@/components/shared/FoundationPage';

export default function ContactPage() {
  return (
    <FoundationPage
      eyebrow="Ruta reservada"
      title="Contacto"
      description="La experiencia final de contacto se incorporará después de verificar esta base."
    />
  );
}
```

`src/app/not-found.tsx`:

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <main id="main-content" className="foundation-page">
      <p className="eyebrow">Error 404</p>
      <h1>Página no encontrada</h1>
      <p className="foundation-copy">La ruta solicitada no forma parte del sitio.</p>
      <Link className="text-link" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}
```

Each route page renders `FoundationPage` with exactly these headings: `Fundación frontend lista`, `Menú`, `Carrito`, `Pedido`, and `Contacto`. Descriptions state that the route is reserved for a later milestone and do not claim finished functionality.

- [ ] **Step 6: Create mobile-first global CSS**

```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  background: var(--color-background);
  color: var(--color-text);
}

body {
  min-height: 100vh;
  margin: 0;
  background:
    radial-gradient(circle at top right, rgb(217 173 120 / 28%), transparent 30rem),
    var(--color-background);
  color: var(--color-text);
  font-family: var(--font-body);
  line-height: 1.6;
}

a {
  color: inherit;
}

a:focus-visible {
  border-radius: var(--radius-small);
  outline: 0.2rem solid var(--color-focus);
  outline-offset: 0.2rem;
}

.skip-link {
  position: fixed;
  z-index: 10;
  top: var(--space-3);
  left: var(--space-3);
  padding: var(--space-3) var(--space-4);
  transform: translateY(-200%);
  border-radius: var(--radius-small);
  background: var(--color-brand);
  color: var(--color-brand-contrast);
}

.skip-link:focus {
  transform: translateY(0);
}

.site-header {
  border-bottom: 1px solid var(--color-border);
  background: rgb(255 247 232 / 92%);
}

.site-header__inner {
  display: flex;
  max-width: var(--content-wide);
  flex-direction: column;
  gap: var(--space-4);
  margin: 0 auto;
  padding: var(--space-4);
}

.wordmark {
  width: fit-content;
  font-family: var(--font-display);
  font-size: 1.25rem;
  text-decoration: none;
}

.site-nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.site-nav a {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  font-weight: 700;
  text-decoration-thickness: 0.1rem;
  text-underline-offset: 0.25rem;
}

.foundation-page {
  width: min(calc(100% - 2rem), var(--content-reading));
  min-height: 62vh;
  margin: 0 auto;
  padding: var(--space-8) 0;
}

.eyebrow {
  margin: 0 0 var(--space-3);
  color: var(--color-accent-hover);
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  max-width: 15ch;
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(2.25rem, 9vw, 4.75rem);
  letter-spacing: -0.04em;
  line-height: 0.98;
}

.foundation-copy {
  max-width: 36rem;
  margin: var(--space-5) 0;
  color: var(--color-text-muted);
  font-size: 1.1rem;
}

.foundation-status {
  max-width: 36rem;
  margin: var(--space-6) 0 0;
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-medium);
  background: var(--color-surface);
  box-shadow: var(--shadow-soft);
}

.text-link {
  color: var(--color-accent-hover);
  font-weight: 800;
}

.site-footer {
  padding: var(--space-5) var(--space-4);
  background: var(--color-brand);
  color: var(--color-brand-contrast);
  text-align: center;
}

.site-footer p {
  margin: 0;
}

@media (min-width: 48rem) {
  .site-header__inner {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-5) var(--space-6);
  }

  .foundation-page {
    padding: 7rem 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 7: Run browser and static checks to verify GREEN**

Run: `npm run test:e2e -- tests/browser/foundation.spec.ts`

Expected: 5 tests pass in Chromium.

Run: `npm run typecheck`

Expected: exit 0.

Run: `npm run build`

Expected: exit 0 and static routes exported under `out/`.

- [ ] **Step 8: Update the exact structure and commit**

Add `FoundationPage.tsx`, `business.test.ts`, and `foundation.spec.ts` to `docs/PROPOSED_FILE_STRUCTURE.md`.

```bash
git add src tests docs/PROPOSED_FILE_STRUCTURE.md
git commit -m "feat: establish static frontend shell"
```

---

### Task 4: Portable documentation and real runtime evidence

**Files:**
- Modify: `README.md`
- Modify: `AI/AI-EOS/CAPABILITY_TABLE.md`
- Modify: `AI/AI-EOS/CURRENT_TASK.md`
- Modify: `artifacts/README.md`
- Modify: `artifacts/previews/preview-information.md`
- Modify: `artifacts/reports/build-report.md`
- Modify: `artifacts/reports/test-report.md`
- Modify: `artifacts/reports/accessibility-report.md`
- Modify: `artifacts/reports/performance-report.md`
- Modify: `artifacts/reports/visual-review.md`
- Modify: `artifacts/release/release-summary.md`
- Create: `artifacts/screenshots/desktop/milestone-1-foundation.png`
- Create: `artifacts/screenshots/mobile/milestone-1-foundation.png`
- Modify externally: `Phase 2 - Guteli Demo/Current State.md`
- Modify externally: `Phase 2 - Guteli Demo/Session Log.md`
- Modify externally: `Phase 2 - Guteli Demo/Testing.md`

**Interfaces:**
- Consumes: verified scripts, running development server, static production output, browser tooling, Superpowers usage evidence.
- Produces: portable runbook, real screenshots, exact report results, milestone skill record, current project memory.

- [ ] **Step 1: Document portable commands**

`README.md` documents Node `>=20.9.0`, npm `>=10`, `npm install`, `npm run dev`, `npm run format`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e:install`, `npm run test:e2e`, `npm run build`, and `npm run start`. It explains that `npm run start` serves the previously built static `out/` directory.

- [ ] **Step 2: Run the local development server**

Run: `npm run dev -- --hostname 127.0.0.1`

Expected: the server reports ready at `http://127.0.0.1:3000`.

- [ ] **Step 3: Inspect the actual application and capture evidence**

Use verified browser automation to inspect all five routes, desktop at 1440 by 1000, mobile at 390 by 844, keyboard focus, horizontal overflow, console errors, and the skip link.

Capture the actual running root route to:

- `artifacts/screenshots/desktop/milestone-1-foundation.png`
- `artifacts/screenshots/mobile/milestone-1-foundation.png`

- [ ] **Step 4: Verify static production start**

Run: `npm run build`

Expected: exit 0 with five static routes plus the not-found route.

Run: `npm run start`

Expected: static output available at `http://127.0.0.1:3000`.

- [ ] **Step 5: Record evidence and skill usage**

Write exact dated PASS results and command names to the build, test, accessibility, performance, visual-review, preview, release, and artifact-index documents. Performance must state that no Lighthouse score was produced because no callable Lighthouse tool was verified; it may record static export and browser-console observations only.

Add this table to `AI/AI-EOS/CAPABILITY_TABLE.md`, with rows changed from verified to used only after each workflow actually runs:

```markdown
| Skill | Verified | Used in milestone | Purpose | Result |
|---|---:|---:|---|---|
| `superpowers:using-superpowers` | Yes | Yes | Select and enforce applicable workflows | Workflow gate applied before Milestone 1 actions |
| `superpowers:writing-plans` | Yes | Yes | Create the executable Milestone 1 plan | Plan saved and self-reviewed |
| `superpowers:using-git-worktrees` | Yes | Yes | Isolate Milestone 1 from approved `main` | Worktree created on `milestone-1-foundation` |
| `superpowers:executing-plans` | Yes | Yes | Select the supported execution workflow | Yielded to subagent-driven development because Codex subagents are available |
| `superpowers:subagent-driven-development` | Yes | Yes | Execute each task with an implementer and independent task review | Tasks completed with per-task review gates |
| `superpowers:test-driven-development` | Yes | Yes | Drive foundation contracts and browser shell | RED and GREEN evidence recorded |
| `superpowers:verification-before-completion` | Yes | Yes | Require fresh full-suite evidence | Completion gate passed |
| `superpowers:requesting-code-review` | Yes | Yes | Independent specification and quality review | Reviewer verdict recorded |
```

- [ ] **Step 6: Update Phase 2 knowledge state**

Record Milestone 1 results, commands, screenshots, Superpowers workflows, and the Milestone 2 approval gate in `Current State.md`, `Session Log.md`, and `Testing.md`, preserving their frontmatter and wikilinks.

- [ ] **Step 7: Commit evidence documentation**

```bash
git add README.md AI/AI-EOS/CAPABILITY_TABLE.md AI/AI-EOS/CURRENT_TASK.md artifacts
git commit -m "docs: record frontend foundation evidence"
```

---

### Task 5: Full verification and independent review

**Files:**
- Modify only files required by verified review findings.

**Interfaces:**
- Consumes: all Milestone 1 code, tests, documentation, and artifacts.
- Produces: fresh command evidence, clean Git state, reviewer verdict, integration decision.

- [ ] **Step 1: Run the complete quality gate**

Run each command separately:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
git diff --check milestone-0-approved..HEAD
git status --short
```

Expected: every npm command and Git diff check exits 0; Git status is clean before review.

- [ ] **Step 2: Request independent code review**

Invoke `superpowers:requesting-code-review` and provide the base `milestone-0-approved`, branch head, complete milestone requirements, exact commands, and artifact paths.

- [ ] **Step 3: Process review results**

If findings exist, invoke `superpowers:receiving-code-review`, verify each finding technically, apply only confirmed changes, rerun the full quality gate, and commit fixes with a conventional commit message.

- [ ] **Step 4: Re-run completion verification**

Invoke `superpowers:verification-before-completion`, rerun all quality commands with fresh output, verify screenshots are real PNG files, verify reports match the outputs, and confirm there is no backend, finished customer flow, or public deployment.

- [ ] **Step 5: Finish the isolated branch workflow**

Invoke `superpowers:finishing-a-development-branch`, present the verified branch state and integration options, and do not merge or deploy without the user’s direction.
