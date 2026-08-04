# Güteli Banner Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the repetitive split homepage hero with the approved Güteli banner, correct the header logo, extend the banner's visual language through the shell, and deliver a verified private preview without changing the live Sites version.

**Architecture:** Preserve the existing Next.js static-export application and all customer-flow components. Add one project-relative banner asset, simplify the homepage markup, replace the header's SVG-like heart symbol with a CSS pretzel-loop mark, and update the existing stylesheet and focused Playwright coverage without changing domain or WhatsApp behavior.

**Tech Stack:** Next.js 16.2.10, React 19.2.7, TypeScript 5.9.3, CSS, Playwright 1.61.1, Vitest 3.2.7

## Global Constraints

- Keep the supplied banner intact and uncropped at every viewport.
- Keep the existing five routes, menu facts, prices, cart, order form, and demo-safe WhatsApp behavior unchanged.
- Remove the split hero copy/art, duplicate wordmark, and four-product homepage preview.
- Use project-relative assets only; do not ship temporary or machine-specific absolute paths.
- Do not add dependencies, remote fonts, photography, claims, backend services, storage, authentication, payment processing, inventory, CMS, analytics, or WhatsApp API integration.
- Preserve semantic landmarks, visible focus, readable contrast, reduced motion, 44-pixel touch targets, keyboard navigation, and no horizontal overflow at 320px, 390px, 768px, 1024px, and 1440px.
- Produce a private local preview only. Do not save or deploy a new Sites production version before explicit preview approval.

---

## File map

- Create `public/images/guteli-banner.png`: project-local copy of the approved banner artwork.
- Create `tests/browser/banner-redesign.spec.ts`: focused structure, accessibility, navigation, and responsive regression coverage.
- Modify `src/app/page.tsx`: simplified banner-led homepage structure.
- Modify `src/components/shared/BrandMark.tsx`: semantic-free CSS pretzel-loop mark plus compact wordmark.
- Modify `src/app/globals.css`: banner, action strip, ornamental ordering panel, header, navigation, footer, and responsive styling.
- Modify `src/styles/tokens.css`: serif display stack and refined brand tokens only where required.
- Create `artifacts/screenshots/preview/banner-redesign-desktop.png`: approved-direction desktop evidence.
- Create `artifacts/screenshots/preview/banner-redesign-mobile.png`: uncropped mobile evidence.
- Modify `artifacts/previews/preview-information.md`: record the private preview and verification state.

---

### Task 1: Lock the approved homepage contract with browser tests

**Files:**

- Create: `tests/browser/banner-redesign.spec.ts`

**Interfaces:**

- Consumes: existing routes and accessible names from `src/app/page.tsx` and `src/components/shared/SiteHeader.tsx`
- Produces: browser-level contract for `.home-banner`, `.home-action-strip`, `.ordering-guide`, and `.brand-mark__symbol`

- [ ] **Step 1: Write the failing structure test**

```ts
import { expect, test } from '@playwright/test';

test('homepage uses the approved banner-led structure', async ({ page }) => {
  await page.goto('/');

  const banner = page.getByRole('img', {
    name: 'Güteli Bakery: pretzels, bagels y panes por encargo',
  });
  await expect(banner).toBeVisible();
  await expect(banner).toHaveAttribute('src', /\/images\/guteli-banner\.png$/);
  await expect(page.locator('.home-hero__art')).toHaveCount(0);
  await expect(page.locator('.home-menu-preview')).toHaveCount(0);
  await expect(page.locator('.home-action-strip')).toContainText(
    'Pedidos con 2 días de anticipación.',
  );
  await expect(page.getByRole('link', { name: 'Ver el menú' })).toHaveAttribute(
    'href',
    '/menu/',
  );
  await expect(
    page.getByRole('link', { name: 'Preparar mi pedido' }),
  ).toHaveAttribute('href', '/order/');
});
```

- [ ] **Step 2: Write the responsive and logo test**

```ts
for (const viewport of [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 900 },
  { width: 1440, height: 1000 },
]) {
  test(`banner remains intact at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');

    const banner = page.locator('.home-banner img');
    await expect(banner).toHaveCSS('object-fit', 'contain');
    await expect(page.locator('.brand-mark__symbol')).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
}
```

- [ ] **Step 3: Run the focused test and confirm it fails for the missing banner**

Run: `npx playwright test tests/browser/banner-redesign.spec.ts`

Expected: FAIL because the current homepage has no accessible banner image or `.home-action-strip`.

- [ ] **Step 4: Commit the fail-first regression**

```bash
git add tests/browser/banner-redesign.spec.ts
git commit -m "test: define banner redesign contract"
```

---

### Task 2: Add the banner and simplify the homepage

**Files:**

- Create: `public/images/guteli-banner.png`
- Modify: `src/app/page.tsx`

**Interfaces:**

- Consumes: `siteConfig.advanceDays` from `src/content/business.ts` and the supplied PNG source
- Produces: `.home-banner`, `.home-action-strip`, and the existing `.ordering-guide` landmark used by CSS and Playwright

- [ ] **Step 1: Copy the approved artwork into the project**

Run:

```bash
mkdir -p public/images
cp /var/folders/72/d9vl95rn3vs9dh1_zq28msv00000gn/T/codex-clipboard-d320d148-a716-4529-9e3a-a3ddf7939264.png public/images/guteli-banner.png
```

Expected: `file public/images/guteli-banner.png` reports a valid PNG, and the source remains unchanged.

- [ ] **Step 2: Replace the split hero and menu preview with the approved structure**

Use this page shape in `src/app/page.tsx`:

```tsx
import Image from 'next/image';
import Link from 'next/link';

import { operationalCopy, siteConfig } from '@/content/business';

export default function HomePage() {
  return (
    <main id="main-content" className="home-page" tabIndex={-1}>
      <h1 className="visually-hidden">Pretzels, bagels y panes por encargo</h1>

      <section
        className="home-banner"
        aria-label="Presentación de Güteli Bakery"
      >
        <Image
          src="/images/guteli-banner.png"
          alt="Güteli Bakery: pretzels, bagels y panes por encargo"
          width={1733}
          height={909}
          priority
          sizes="100vw"
        />
      </section>

      <section className="home-action-strip" aria-label="Acciones principales">
        <div className="home-actions">
          <Link className="button-link button-link--primary" href="/menu/">
            Ver el menú
          </Link>
          <Link className="button-link button-link--secondary" href="/order/">
            Preparar mi pedido
          </Link>
        </div>
        <p>Pedidos con {siteConfig.advanceDays} días de anticipación.</p>
      </section>

      <section className="ordering-guide">
        <div className="section-heading ordering-guide__heading">
          <p className="eyebrow">Tu solicitud, paso a paso</p>
          <h2>Cómo hacer un pedido</h2>
        </div>
        <ol className="ordering-guide__steps" aria-label="Cómo hacer un pedido">
          <li>
            <span>01</span>
            <div>
              <h3>Elige del menú</h3>
              <p>Agrega productos y cantidades al carrito.</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>Completa los datos</h3>
              <p>Indica fecha y si deseas recogida o envío.</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>Confirma por WhatsApp</h3>
              <p>Envía el resumen para coordinar los detalles.</p>
            </div>
          </li>
        </ol>

        <aside className="ordering-guide__notice" aria-label="Antes de pedir">
          <p>
            Haz tu pedido con {siteConfig.advanceDays} días de anticipación.
          </p>
          <p>{operationalCopy.confirmation}</p>
        </aside>
      </section>
    </main>
  );
}
```

Remove the unused `BakeryIllustration`, menu category/product, and money-format imports.

- [ ] **Step 3: Run type checking to catch stale imports or JSX errors**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 4: Commit the asset and simplified page**

```bash
git add public/images/guteli-banner.png src/app/page.tsx
git commit -m "feat: lead homepage with approved banner"
```

---

### Task 3: Correct the header mark and extend the visual language

**Files:**

- Modify: `src/components/shared/BrandMark.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/styles/tokens.css`

**Interfaces:**

- Consumes: existing `BrandMark` component contract and all current shell class names
- Produces: a CSS-only `.brand-mark__symbol` with two `.brand-mark__loop` children; responsive banner and ornamental shell styles

- [ ] **Step 1: Replace the heart-like path with a CSS pretzel-loop mark**

Update `BrandMark.tsx` to keep the existing component API:

```tsx
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span className="brand-mark__symbol">
        <span className="brand-mark__loop brand-mark__loop--left" />
        <span className="brand-mark__loop brand-mark__loop--right" />
      </span>
      <span className="brand-mark__copy">
        <strong className="brand-mark__name">Güteli</strong>
        <span className="brand-mark__bakery">Bakery</span>
      </span>
    </span>
  );
}
```

- [ ] **Step 2: Refine the tokens to match the approved artwork**

Set the display stack to local serif fonts and keep the existing body stack:

```css
--font-display: Georgia, 'Times New Roman', serif;
--color-background: #fff3d7;
--color-surface: #fff8e8;
--color-text: #2a1b12;
--color-brand: #2a1b12;
--color-brand-contrast: #fff3d7;
--color-accent: #f26500;
--color-caramel: #bd7d47;
```

Do not change focus blue or semantic success, warning, and error colors.

- [ ] **Step 3: Implement the approved homepage and shell styling**

In `src/app/globals.css`:

- add `.visually-hidden` using the standard absolute 1px clipping pattern;
- make `.home-page` a centered column on the paper background;
- make `.home-banner img` `display: block; width: 100%; height: auto; object-fit: contain`;
- place `.home-action-strip` in a responsive flex layout with both buttons and the advance-days fact;
- remove obsolete `.home-hero*` and `.home-menu-preview*` rules;
- style `.ordering-guide` as one chocolate panel with thin orange ornamental rules, cream text, and three clean columns above 48rem;
- restyle `.site-header`, `.brand-mark`, navigation hover/focus states, buttons, and `.site-footer` with the same cream/chocolate/orange language;
- create the pretzel-loop mark with bordered rounded loops rotated toward each other and short crossing tails, without SVG or external assets;
- keep mobile navigation touch targets and existing native `<details>` behavior;
- preserve `prefers-reduced-motion: reduce` behavior and remove obsolete animation selectors only if no longer used anywhere.

The banner must never use `object-fit: cover`, fixed pixel height, or background-image cropping.

- [ ] **Step 4: Run the focused browser test**

Run: `npx playwright test tests/browser/banner-redesign.spec.ts`

Expected: PASS at every configured viewport.

- [ ] **Step 5: Run shell and menu regression tests**

Run: `npx playwright test tests/browser/foundation.spec.ts tests/browser/menu.spec.ts`

Expected: PASS, including mobile navigation, five destinations, menu behavior, no active demo WhatsApp destination, and no horizontal overflow.

- [ ] **Step 6: Commit the corrected visual system**

```bash
git add src/components/shared/BrandMark.tsx src/app/globals.css src/styles/tokens.css
git commit -m "feat: align bakery shell with banner artwork"
```

---

### Task 4: Validate and capture the private preview

**Files:**

- Create: `artifacts/screenshots/preview/banner-redesign-desktop.png`
- Create: `artifacts/screenshots/preview/banner-redesign-mobile.png`
- Modify: `artifacts/previews/preview-information.md`

**Interfaces:**

- Consumes: production static export from `npm run build`
- Produces: two reviewable screenshots and a verification record; no Sites deployment

- [ ] **Step 1: Run the complete quality gate**

Run in order:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npx playwright test
npm run build
```

Expected: every command passes with zero warnings promoted by project configuration.

- [ ] **Step 2: Start the private local preview**

Run: `npm run start`

Expected: the static export is served at `http://127.0.0.1:3000` or the exact URL printed by the existing script.

- [ ] **Step 3: Capture desktop and mobile evidence**

Use Playwright against the running local preview to capture the full homepage at 1440×1000 and 390×844. Before each capture, assert:

```ts
await expect(
  page.getByRole('img', {
    name: 'Güteli Bakery: pretzels, bagels y panes por encargo',
  }),
).toBeVisible();
expect(
  await page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  ),
).toBe(true);
```

Save the screenshots at the two preview paths listed above without overwriting Milestone 3 evidence.

- [ ] **Step 4: Inspect both screenshots**

Confirm visually that the complete banner is visible, the header logo reads correctly, the old right-side art and product strip are gone, actions are readable, the ordering section has three clear steps, the footer is complete, and no text or controls clip.

- [ ] **Step 5: Record the preview state**

Add a dated section to `artifacts/previews/preview-information.md` containing:

```markdown
## Banner redesign private preview — 2026-08-04

Status: **Verified locally; awaiting user approval; not deployed.**

The approved banner-led homepage was checked at 1440×1000 and 390×844. The banner remains uncropped, the compact header mark is corrected, repeated hero and menu-preview areas are absent, and the existing menu-to-order journey remains intact. The current live Sites version was not replaced.
```

- [ ] **Step 6: Commit the verified preview evidence**

```bash
git add artifacts/screenshots/preview/banner-redesign-desktop.png artifacts/screenshots/preview/banner-redesign-mobile.png artifacts/previews/preview-information.md
git commit -m "docs: capture banner redesign preview"
```

- [ ] **Step 7: Stop the local preview after review handoff**

Stop only the retained `npm run start` process used for this task. Do not modify or deploy the existing Sites version.
