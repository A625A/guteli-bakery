# Güteli Portfolio Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the accepted five-route Güteli MVP into a distinctive graphic-only portfolio demonstration with a fail-closed, configurable WhatsApp demo mode and verified desktop/mobile evidence.

**Architecture:** Preserve the static Next.js application, typed business content, cart context, pure order utilities, and existing customer journey. Add one pure public-configuration boundary, pass its resolved handoff state into interactive components, and refine the existing component/CSS system with local vector/CSS editorial artwork and stable future media slots.

**Tech Stack:** Next.js 16.2.10, React 19.2.7, TypeScript 5.9, CSS, Vitest 3.2, Playwright 1.61, static export

## Global Constraints

- Keep the five routes `/`, `/menu/`, `/cart/`, `/order/`, and `/contact/`.
- Preserve the eight confirmed menu variants, prices, units, two-day rule, GTQ formatting, cart behavior, validation behavior, summary, and copy fallback.
- Use only the Güteli logo, name, confirmed menu information, confirmed contact number, and approved operational copy as source material.
- Do not crop or reuse product photographs from `Guteli.jpeg`.
- Do not generate or simulate product photography or imply that illustrations show Güteli's actual products.
- Remove “Referencia original de la marca” from the customer-facing interface.
- Keep a stable product media slot so verified high-resolution photography can replace the graphic treatment without a layout redesign.
- Missing, malformed, or non-`false` `NEXT_PUBLIC_DEMO_MODE` values must resolve to demo mode.
- `NEXT_PUBLIC_WHATSAPP_DESTINATION` is the only allowed click-to-chat destination; never infer it from the displayed business number.
- Demo mode must never render an active `wa.me` link and must keep message review and copy behavior working.
- Explicit live mode without a valid destination must fail closed.
- Use restrained transitions and disable non-essential motion under `prefers-reduced-motion: reduce`.
- Do not add a backend, API route, database, CMS, authentication, payment system, WhatsApp API/bot/webhook, analytics service, remote font, or deployment configuration.
- Keep the static build portable and repository-relative.

---

## File map

### Public configuration and demo state

- Create `src/config/public-site.ts`: pure parser and serializable demo/live/unavailable handoff state.
- Create `tests/unit/public-site-config.test.ts`: fail-closed configuration contract.
- Create `.env.example`: documented safe defaults and explicit live opt-in.
- Create `src/components/shared/DemoBanner.tsx`: persistent customer-facing demo identification.
- Modify `src/app/layout.tsx`: resolve public config once for the shared shell.
- Modify `src/app/order/page.tsx`: pass the resolved handoff state to the client order flow.
- Modify `src/components/order/OrderRequest.tsx`: render copy-only demo handoff or configured live link.
- Modify `src/app/contact/page.tsx` and `src/components/shared/SiteFooter.tsx`: remove active WhatsApp links unless live configuration is valid.

### Graphic-only presentation

- Create `src/components/shared/BakeryIllustration.tsx`: reusable decorative pretzel/dough vector composition with no product claim.
- Create `src/components/menu/ProductArtwork.tsx`: stable category artwork/media slot for product cards.
- Modify `src/components/shared/BrandMark.tsx`: retain only the confirmed wordmark crop for compact shell use.
- Modify `src/components/shared/SiteHeader.tsx` and `SiteFooter.tsx`: polished shell and interaction copy.
- Modify `src/app/page.tsx`: original editorial hero and refined category/journey composition.
- Modify `src/app/menu/page.tsx`, `src/components/menu/MenuCatalog.tsx`, and `ProductCard.tsx`: graphic-only comparable menu presentation.
- Modify `src/components/cart/CartView.tsx`, `src/components/order/OrderRequest.tsx`, and `src/app/contact/page.tsx`: refined customer states.
- Modify `src/styles/tokens.css` and `src/app/globals.css`: flat brand palette, typography, spacing, responsive layout, focus, transition, and reduced-motion foundation.

### Verification and evidence

- Modify `tests/browser/foundation.spec.ts`: default demo banner, absence of unsafe links, intermediate widths, reduced motion, overflow, and shell checks.
- Modify `tests/browser/order-journey.spec.ts`: copy-only demo handoff and preserved full journey.
- Modify `tests/browser/artifacts.spec.ts`: Milestone 3 homepage, menu, cart, validation, summary, copy, and demo-handoff screenshots.
- Create `artifacts/portfolio/guteli-bakery-case-study.md`: concise implementation case study with real screenshots.
- Update `artifacts/README.md`, screenshot indexes, reports, release summary, `AI/AI-EOS/CAPABILITY_TABLE.md`, and approved Phase 2 memory notes with real results only.

---

### Task 1: Fail-closed public demo configuration

**Files:**

- Create: `src/config/public-site.ts`
- Create: `tests/unit/public-site-config.test.ts`
- Create: `.env.example`

**Interfaces:**

- Produces: `PublicSiteEnvironment`, `WhatsAppHandoff`, `resolvePublicSiteConfig(environment): { isDemoMode: boolean; handoff: WhatsAppHandoff }`, and `publicSiteConfig`.
- Consumes: direct public environment values only; no browser globals.

- [ ] **Step 1: Write the failing configuration contract**

```ts
import { describe, expect, it } from 'vitest';

import { resolvePublicSiteConfig } from '@/config/public-site';

describe('public site configuration', () => {
  it.each([undefined, '', 'true', 'TRUE', '0', 'yes'])(
    'fails safely into demo mode for %s',
    (demoMode) => {
      expect(
        resolvePublicSiteConfig({
          demoMode,
          whatsappDestination: '50255555555',
        }),
      ).toEqual({ isDemoMode: true, handoff: { kind: 'demo' } });
    },
  );

  it('enables a configured live destination only with explicit false', () => {
    expect(
      resolvePublicSiteConfig({
        demoMode: 'false',
        whatsappDestination: '50255555555',
      }),
    ).toEqual({
      isDemoMode: false,
      handoff: { kind: 'live', destination: '50255555555' },
    });
  });

  it.each([undefined, '', '502 5555-5555', '+50255555555', '1234567'])(
    'fails closed when a live destination is invalid: %s',
    (whatsappDestination) => {
      expect(
        resolvePublicSiteConfig({ demoMode: 'false', whatsappDestination }),
      ).toEqual({ isDemoMode: false, handoff: { kind: 'unavailable' } });
    },
  );
});
```

- [ ] **Step 2: Run the focused test and observe RED**

Run: `npm test -- tests/unit/public-site-config.test.ts`
Expected: FAIL because `@/config/public-site` does not exist.

- [ ] **Step 3: Implement the smallest pure resolver**

```ts
export type PublicSiteEnvironment = {
  demoMode?: string;
  whatsappDestination?: string;
};

export type WhatsAppHandoff =
  | { kind: 'demo' }
  | { kind: 'live'; destination: string }
  | { kind: 'unavailable' };

const whatsappDestinationPattern = /^\d{8,15}$/;

export function resolvePublicSiteConfig(environment: PublicSiteEnvironment): {
  isDemoMode: boolean;
  handoff: WhatsAppHandoff;
} {
  const isDemoMode = environment.demoMode !== 'false';

  if (isDemoMode) {
    return { isDemoMode, handoff: { kind: 'demo' } };
  }

  if (
    environment.whatsappDestination &&
    whatsappDestinationPattern.test(environment.whatsappDestination)
  ) {
    return {
      isDemoMode,
      handoff: {
        kind: 'live',
        destination: environment.whatsappDestination,
      },
    };
  }

  return { isDemoMode, handoff: { kind: 'unavailable' } };
}

export const publicSiteConfig = resolvePublicSiteConfig({
  demoMode: process.env.NEXT_PUBLIC_DEMO_MODE,
  whatsappDestination: process.env.NEXT_PUBLIC_WHATSAPP_DESTINATION,
});
```

- [ ] **Step 4: Document the safe environment defaults**

```dotenv
# Public portfolio safety: anything except the exact value "false" stays in demo mode.
NEXT_PUBLIC_DEMO_MODE=true

# Live handoff is opt-in and must contain 8-15 digits with country code.
# NEXT_PUBLIC_WHATSAPP_DESTINATION=50255555555
```

- [ ] **Step 5: Verify GREEN and the full unit suite**

Run: `npm test -- tests/unit/public-site-config.test.ts && npm test`
Expected: configuration tests pass and the full existing unit suite remains green.

- [ ] **Step 6: Commit the behavior boundary**

```bash
git add .env.example src/config/public-site.ts tests/unit/public-site-config.test.ts
git commit -m "feat: add fail-closed portfolio demo configuration"
```

---

### Task 2: Demo-safe handoff across the shared shell and order journey

**Files:**

- Create: `src/components/shared/DemoBanner.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/order/page.tsx`
- Modify: `src/components/order/OrderRequest.tsx`
- Modify: `src/app/contact/page.tsx`
- Modify: `src/components/shared/SiteFooter.tsx`
- Modify: `tests/browser/foundation.spec.ts`
- Modify: `tests/browser/order-journey.spec.ts`

**Interfaces:**

- Consumes: `publicSiteConfig.isDemoMode`, `publicSiteConfig.handoff`, `WhatsAppHandoff`, `buildWhatsAppUrl(phone, message)`.
- Produces: `DemoBanner({ enabled }: { enabled: boolean })` and zero active `wa.me` links in the default demo build.

- [ ] **Step 1: Replace unsafe browser expectations with failing demo contracts**

Add these assertions before changing components:

```ts
test('default portfolio mode is identified and exposes no WhatsApp destination', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('status', { name: 'Modo demostración' }),
  ).toContainText('Sitio de demostración');
  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);

  await page.goto('/contact/');
  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
  await expect(
    page.getByText('Las solicitudes no se envían desde esta demostración.'),
  ).toBeVisible();
});
```

Replace the final handoff assertions in the complete order test with:

```ts
await expect(
  page.getByText('Modo demostración: copia el resumen para probar el flujo.'),
).toBeVisible();
await expect(
  page.getByRole('link', { name: 'Abrir WhatsApp con mi solicitud' }),
).toHaveCount(0);
await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);
```

- [ ] **Step 2: Run the two browser files and observe RED**

Run: `npm run test:e2e -- tests/browser/foundation.spec.ts tests/browser/order-journey.spec.ts`
Expected: FAIL because the banner is absent and current contact, footer, and order components render `wa.me` links.

- [ ] **Step 3: Add the shared demo banner and pass configuration through server routes**

```tsx
export function DemoBanner({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <div className="demo-banner" role="status" aria-label="Modo demostración">
      <strong>Sitio de demostración</strong>
      <span>Explora el flujo completo; ninguna solicitud se envía.</span>
    </div>
  );
}
```

In `layout.tsx`, render `<DemoBanner enabled={publicSiteConfig.isDemoMode} />` before the header. In `order/page.tsx`, render `<OrderRequest handoff={publicSiteConfig.handoff} />`.

- [ ] **Step 4: Render handoff states explicitly and keep copy available**

Change the component signature and summary action:

```tsx
export function OrderRequest({ handoff }: { handoff: WhatsAppHandoff }) {
  // existing state and behavior stay unchanged
}
```

```tsx
{
  handoff.kind === 'live' ? (
    <a
      className="button-link button-link--primary"
      href={buildWhatsAppUrl(handoff.destination, summary)}
      target="_blank"
      rel="noreferrer"
    >
      Abrir WhatsApp con mi solicitud
    </a>
  ) : (
    <p className="order-summary__handoff-note">
      {handoff.kind === 'demo'
        ? 'Modo demostración: copia el resumen para probar el flujo.'
        : 'El envío por WhatsApp no está configurado. Copia el resumen para conservarlo.'}
    </p>
  );
}
```

In contact and footer, branch on `publicSiteConfig.handoff.kind`; render a link only for `live`, and otherwise render factual number plus “Las solicitudes no se envían desde esta demostración.” or the unavailable-state copy.

- [ ] **Step 5: Verify GREEN and preserve copy fallback**

Run: `npm test && npm run test:e2e -- tests/browser/foundation.spec.ts tests/browser/order-journey.spec.ts`
Expected: unit suite passes; both browser files pass; default pages contain no active `wa.me` link; summary copy success and rejection paths still pass.

- [ ] **Step 6: Commit demo-safe integration**

```bash
git add src/app/layout.tsx src/app/order/page.tsx src/app/contact/page.tsx src/components/order/OrderRequest.tsx src/components/shared/DemoBanner.tsx src/components/shared/SiteFooter.tsx tests/browser/foundation.spec.ts tests/browser/order-journey.spec.ts
git commit -m "feat: make portfolio handoff demo-safe"
```

---

### Task 3: Flat editorial design system and responsive shell

**Files:**

- Create: `src/components/shared/BakeryIllustration.tsx`
- Modify: `src/components/shared/BrandMark.tsx`
- Modify: `src/components/shared/SiteHeader.tsx`
- Modify: `src/components/shared/SiteFooter.tsx`
- Modify: `src/styles/tokens.css`
- Modify: `src/app/globals.css`
- Modify: `tests/browser/foundation.spec.ts`

**Interfaces:**

- Produces: `BakeryIllustration({ variant, className? })` where `variant` is `'hero' | 'section'`, decorative SVG is `aria-hidden="true"`, and no photograph is referenced.
- Consumes: the existing `BrandMark`, navigation, cart badge, demo state, and semantic shell.

- [ ] **Step 1: Extend proportional browser checks before styling**

Add viewports and reduced-motion checks:

```ts
for (const viewport of [
  { name: 'compact', width: 320, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 900 },
  { name: 'intermediate', width: 1024, height: 900 },
  { name: 'desktop', width: 1440, height: 1000 },
]) {
  test(`${viewport.name} shell has no horizontal overflow`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });
}

test('reduced motion disables smooth scrolling and decorative animation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
  await expect(page.locator('.bakery-illustration')).toHaveCSS(
    'animation-name',
    'none',
  );
});
```

- [ ] **Step 2: Add local decorative vector artwork**

```tsx
type BakeryIllustrationProps = {
  variant: 'hero' | 'section';
  className?: string;
};

export function BakeryIllustration({
  variant,
  className = '',
}: BakeryIllustrationProps) {
  return (
    <svg
      aria-hidden="true"
      className={`bakery-illustration bakery-illustration--${variant} ${className}`}
      viewBox="0 0 640 520"
      focusable="false"
    >
      <path
        className="bakery-illustration__loop"
        d="M172 278C88 152 158 78 252 175L320 246L388 175C482 78 552 152 468 278L320 430Z"
      />
      <circle className="bakery-illustration__dot" cx="514" cy="104" r="34" />
      <path
        className="bakery-illustration__grain"
        d="M94 404c76-80 120-161 132-244M110 360l70-16M142 300l66-20M170 240l58-24"
      />
    </svg>
  );
}
```

- [ ] **Step 3: Refine tokens and remove decorative gradients**

Use flat tokens and responsive primitives:

```css
:root {
  --color-background: #fff5df;
  --color-surface: #fffaf0;
  --color-surface-strong: #efcf9e;
  --color-text: #2d1711;
  --color-text-muted: #6d493d;
  --color-brand: #2d1711;
  --color-caramel: #a94e1d;
  --color-accent: #ff6a00;
  --space-section: clamp(4.5rem, 9vw, 8.5rem);
  --transition-fast: 160ms ease;
}

body {
  background: var(--color-background);
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  .bakery-illustration {
    animation-name: none;
  }
}
```

- [ ] **Step 4: Polish banner, header, navigation, footer, focus, and interaction states**

Implement the shell with flat surfaces, visible active/hover/focus states, minimum 44px targets, a contained mobile menu, and `clamp()`-based gutters. Keep semantic elements and accessible names unchanged unless tests are deliberately updated.

```css
.site-nav a,
.mobile-navigation summary,
.button-link,
button {
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

@media (hover: hover) {
  .button-link:hover,
  button:hover {
    transform: translateY(-2px);
  }
}
```

- [ ] **Step 5: Verify the shell at all target widths**

Run: `npm run format:check && npm run lint && npm run typecheck && npm run test:e2e -- tests/browser/foundation.spec.ts`
Expected: all commands pass, no target width overflows, reduced motion reports no decorative animation, and shell semantics remain intact.

- [ ] **Step 6: Commit the editorial foundation**

```bash
git add src/components/shared/BakeryIllustration.tsx src/components/shared/BrandMark.tsx src/components/shared/SiteHeader.tsx src/components/shared/SiteFooter.tsx src/styles/tokens.css src/app/globals.css tests/browser/foundation.spec.ts
git commit -m "feat: establish editorial bakery visual system"
```

---

### Task 4: Original graphic-only homepage

**Files:**

- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/browser/foundation.spec.ts`

**Interfaces:**

- Consumes: `BakeryIllustration`, `menuCategories`, `menuProducts`, `formatGTQ`, and existing factual operational copy.
- Produces: an editorial hero with no flyer image, no product photograph, and no “Referencia original de la marca” caption.

- [ ] **Step 1: Add source-policy and primary-action browser assertions**

```ts
test('homepage uses the approved graphic-only editorial treatment', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Referencia original de la marca')).toHaveCount(
    0,
  );
  await expect(page.locator('.home-hero img')).toHaveCount(0);
  await expect(page.locator('.home-hero .bakery-illustration')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver el menú' })).toHaveAttribute(
    'href',
    '/menu/',
  );
});
```

- [ ] **Step 2: Run the focused test and observe RED**

Run: `npm run test:e2e -- tests/browser/foundation.spec.ts -g "graphic-only"`
Expected: FAIL because the current hero includes the cropped reference image and caption.

- [ ] **Step 3: Replace the hero with the editorial composition**

Use this composition contract:

```tsx
<section className="home-hero">
  <div className="home-hero__copy">
    {/* existing factual promise and actions */}
  </div>
  <div
    className="home-hero__art"
    aria-label="Composición gráfica inspirada en panadería"
  >
    <p className="home-hero__wordmark" aria-label="Güteli Bakery">
      GÜTELI <span>Bakery</span>
    </p>
    <BakeryIllustration variant="hero" />
    <p className="home-hero__stamp">Hecho por encargo · Guatemala</p>
    <ul aria-label="Categorías del menú">
      {menuCategories.map((category) => (
        <li key={category.id}>{category.label}</li>
      ))}
    </ul>
  </div>
</section>
```

Keep the confirmed four-category price preview and three-step request explanation, but style them as editorial rows and numbered bands rather than generic boxes.

- [ ] **Step 4: Implement mobile, tablet, and desktop layout rules**

```css
.home-hero {
  display: grid;
  gap: clamp(2.5rem, 6vw, 6rem);
}
.home-hero__art {
  position: relative;
  overflow: hidden;
  min-height: 24rem;
  background: var(--color-brand);
  color: var(--color-brand-contrast);
}

@media (min-width: 48rem) {
  .home-menu-preview__list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 64rem) {
  .home-hero {
    grid-template-columns: minmax(0, 1.08fr) minmax(22rem, 0.92fr);
  }
  .home-menu-preview__list {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
```

- [ ] **Step 5: Verify behavior and inspect real screenshots**

Run: `npm run test:e2e -- tests/browser/foundation.spec.ts`
Expected: homepage policy and shell tests pass at every target width. Capture temporary 390px and 1440px screenshots and inspect that the hero reads as graphic illustration, text does not collide, and primary action remains obvious.

- [ ] **Step 6: Commit the homepage polish**

```bash
git add src/app/page.tsx src/app/globals.css tests/browser/foundation.spec.ts
git commit -m "feat: create graphic-only editorial homepage"
```

---

### Task 5: Comparable graphic menu and refined cart

**Files:**

- Create: `src/components/menu/ProductArtwork.tsx`
- Modify: `src/app/menu/page.tsx`
- Modify: `src/components/menu/MenuCatalog.tsx`
- Modify: `src/components/menu/ProductCard.tsx`
- Modify: `src/components/cart/CartView.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/browser/foundation.spec.ts`
- Modify: `tests/browser/order-journey.spec.ts`

**Interfaces:**

- Produces: `ProductArtwork({ category, label })`, a stable `.product-card__media` region with decorative non-photographic artwork.
- Consumes: existing `MenuProduct`, cart commands, success announcements, product facts, quantity cap, and subtotal behavior.

- [ ] **Step 1: Add a browser contract for honest artwork and comparable cards**

```ts
test('menu exposes graphic media slots without product photography', async ({
  page,
}) => {
  await page.goto('/menu/');
  await expect(page.getByTestId('product-card')).toHaveCount(8);
  await expect(page.locator('.product-card__media')).toHaveCount(8);
  await expect(page.locator('.product-card img')).toHaveCount(0);
  await expect(page.locator('.product-card__art-note').first()).toHaveText(
    'Ilustración de categoría',
  );
});
```

- [ ] **Step 2: Run the focused test and observe RED**

Run: `npm run test:e2e -- tests/browser/foundation.spec.ts -g "graphic media"`
Expected: FAIL because product media slots are absent.

- [ ] **Step 3: Create the stable artwork slot**

```tsx
type ProductArtworkProps = {
  category: MenuProduct['category'];
  label: string;
};

export function ProductArtwork({ category, label }: ProductArtworkProps) {
  return (
    <div className={`product-card__media product-card__media--${category}`}>
      <span className="product-card__art-symbol" aria-hidden="true">
        {label.slice(0, 1)}
      </span>
      <span className="product-card__art-note">Ilustración de categoría</span>
    </div>
  );
}
```

Render it before product facts. Keep the slot's aspect ratio, content boundary, and accessible note stable so verified photography can replace only the inner media implementation.

- [ ] **Step 4: Refine menu and cart layout without changing behavior**

Use one category heading per group, consistent product field order, two cards per row at wide widths, and strong quantity/action grouping. On cart, group identity, quantity, line total, and remove action into a compact row above 768px and preserve a clear stacked order on mobile.

```css
.product-card {
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
}
.product-card__media {
  aspect-ratio: 16 / 10;
  position: relative;
  background: var(--color-surface-strong);
}

@media (min-width: 48rem) {
  .menu-category__products {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .cart-line {
    grid-template-columns: minmax(0, 1fr) 8rem 8rem auto;
    align-items: end;
  }
}
```

- [ ] **Step 5: Verify preserved menu-to-cart behavior**

Run: `npm test && npm run test:e2e -- tests/browser/foundation.spec.ts tests/browser/order-journey.spec.ts`
Expected: all existing cart behavior passes, eight honest media slots render, added-item announcements remain accessible, and no viewport overflows.

- [ ] **Step 6: Commit menu and cart polish**

```bash
git add src/app/menu/page.tsx src/components/menu/MenuCatalog.tsx src/components/menu/ProductArtwork.tsx src/components/menu/ProductCard.tsx src/components/cart/CartView.tsx src/app/globals.css tests/browser/foundation.spec.ts tests/browser/order-journey.spec.ts
git commit -m "feat: polish graphic menu and cart presentation"
```

---

### Task 6: Order, contact, and interaction-state polish

**Files:**

- Modify: `src/components/order/OrderRequest.tsx`
- Modify: `src/app/contact/page.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/browser/foundation.spec.ts`
- Modify: `tests/browser/order-journey.spec.ts`

**Interfaces:**

- Consumes: existing validation, order summary, copy status, `WhatsAppHandoff`, operational copy, and confirmed display number.
- Produces: clearer form sections, selected fulfillment state, error hierarchy, summary actions, and demo-safe contact guidance.

- [ ] **Step 1: Add observable state assertions before visual changes**

```ts
test('selected fulfillment and copy feedback expose clear state', async ({
  page,
}) => {
  await openOrderWithSavedCart(page);
  const pickup = page.getByLabel('Recogida');
  await expect(pickup).toBeChecked();
  await expect(pickup.locator('..')).toHaveAttribute('data-selected', 'true');
  await completeRequiredOrderFields(page, 'Recogida');
  await page.getByRole('button', { name: 'Revisar solicitud' }).click();
  await page.getByRole('button', { name: 'Copiar resumen' }).click();
  await expect(page.getByRole('status')).toHaveText('Resumen copiado.');
});
```

- [ ] **Step 2: Run the focused test and observe RED**

Run: `npm run test:e2e -- tests/browser/order-journey.spec.ts -g "selected fulfillment"`
Expected: FAIL because the selected label lacks the explicit data state.

- [ ] **Step 3: Add explicit selected state and preserve semantics**

```tsx
<label data-selected={values.fulfillment === 'pickup'}>
  <input
    type="radio"
    name="fulfillment"
    value="pickup"
    checked={values.fulfillment === 'pickup'}
    onChange={() => changeFulfillment('pickup')}
    required
  />
  <span>Recogida</span>
</label>
```

Apply the corresponding delivery state, retain the current keyboard order, and keep all existing labels and error connections.

- [ ] **Step 4: Refine order, summary, contact, and state CSS**

```css
.fulfillment-options label[data-selected='true'] {
  border-color: var(--color-accent);
  background: var(--color-surface-strong);
}
.form-field :is(input, textarea)[aria-invalid='true'] {
  border-color: var(--color-error);
}
.order-summary {
  position: relative;
  border-top: 0.4rem solid var(--color-accent);
}
.order-summary__status {
  min-height: 2.75rem;
  display: flex;
  align-items: center;
}
```

Use a single-column order layout below 64rem, allow the summary to sit alongside the form only where both have comfortable width, and keep action buttons full-width on narrow screens. Refine contact into factual coordination guidance with the confirmed number as display text in demo mode.

- [ ] **Step 5: Run complete behavior and accessibility regression files**

Run: `npm run test:e2e -- tests/browser/foundation.spec.ts tests/browser/order-journey.spec.ts`
Expected: all keyboard, validation, date, copy, demo-handoff, target-size, overflow, and no-console-error checks pass.

- [ ] **Step 6: Commit customer-state polish**

```bash
git add src/components/order/OrderRequest.tsx src/app/contact/page.tsx src/app/globals.css tests/browser/foundation.spec.ts tests/browser/order-journey.spec.ts
git commit -m "feat: refine order and contact interaction states"
```

---

### Task 7: Real evidence, portfolio case study, capability record, review, and final gate

**Files:**

- Modify: `tests/browser/artifacts.spec.ts`
- Create: `artifacts/screenshots/desktop/milestone-3-homepage.png`
- Create: `artifacts/screenshots/desktop/milestone-3-menu.png`
- Create: `artifacts/screenshots/desktop/milestone-3-cart.png`
- Create: `artifacts/screenshots/desktop/milestone-3-summary.png`
- Create: `artifacts/screenshots/mobile/milestone-3-homepage.png`
- Create: `artifacts/screenshots/mobile/milestone-3-menu.png`
- Create: `artifacts/screenshots/mobile/milestone-3-cart.png`
- Create: `artifacts/screenshots/mobile/milestone-3-summary.png`
- Create: `artifacts/screenshots/interaction-states/milestone-3-validation.png`
- Create: `artifacts/screenshots/interaction-states/milestone-3-demo-handoff.png`
- Create: `artifacts/portfolio/guteli-bakery-case-study.md`
- Modify: `artifacts/README.md`
- Modify: `artifacts/screenshots/desktop/README.md`
- Modify: `artifacts/screenshots/mobile/README.md`
- Modify: `artifacts/screenshots/interaction-states/README.md`
- Modify: `artifacts/reports/accessibility-report.md`
- Modify: `artifacts/reports/build-report.md`
- Modify: `artifacts/reports/test-report.md`
- Modify: `artifacts/reports/visual-review.md`
- Modify: `artifacts/previews/preview-information.md`
- Modify: `artifacts/release/release-summary.md`
- Modify: `AI/AI-EOS/CAPABILITY_TABLE.md`
- Modify: `AI/AI-EOS/CURRENT_TASK.md`
- Modify: `/Users/andrewarana/Desktop/Empresita/Phase 2 - Guteli Demo/Current State.md`.
- Modify: `/Users/andrewarana/Desktop/Empresita/Phase 2 - Guteli Demo/Decisions.md`.
- Modify: `/Users/andrewarana/Desktop/Empresita/Phase 2 - Guteli Demo/Session Log.md`.
- Modify: `/Users/andrewarana/Desktop/Empresita/Phase 2 - Guteli Demo/Testing.md`.
- Modify: `/Users/andrewarana/Desktop/Empresita/Phase 2 - Guteli Demo/Guteli Demo Home.md`.

**Interfaces:**

- Consumes: the running default demo build, verified scripts, screenshots, Git history, and actual Superpowers invocation evidence.
- Produces: reproducible Milestone 3 evidence, concise case study, honest capability table, and a clean review-ready branch.

- [ ] **Step 1: Expand deterministic artifact capture**

Use Milestone 3 paths and add homepage/menu captures at 1440×1000 and 390×844. Preserve the filled cart, validation, summary, and copy flows; add a screenshot in which the demo handoff note and copy action are both visible.

```ts
const screenshots = {
  desktop: {
    homepage: artifactPath('desktop', 'milestone-3-homepage.png'),
    menu: artifactPath('desktop', 'milestone-3-menu.png'),
    cart: artifactPath('desktop', 'milestone-3-cart.png'),
    summary: artifactPath('desktop', 'milestone-3-summary.png'),
  },
  mobile: {
    homepage: artifactPath('mobile', 'milestone-3-homepage.png'),
    menu: artifactPath('mobile', 'milestone-3-menu.png'),
    cart: artifactPath('mobile', 'milestone-3-cart.png'),
    summary: artifactPath('mobile', 'milestone-3-summary.png'),
  },
  states: {
    validation: artifactPath(
      'interaction-states',
      'milestone-3-validation.png',
    ),
    demoHandoff: artifactPath(
      'interaction-states',
      'milestone-3-demo-handoff.png',
    ),
  },
} as const;
```

- [ ] **Step 2: Capture and visually inspect the real application**

Run: `npm run test:e2e -- tests/browser/artifacts.spec.ts`
Expected: artifact tests pass and all ten Milestone 3 PNG files exist. Inspect every image for clipping, awkward empty space, misleading illustration, weak hierarchy, inconsistent controls, text collisions, and accidental active WhatsApp links; fix confirmed issues and rerun the affected tests.

- [ ] **Step 3: Write the standalone portfolio case study**

Use these exact sections and only verified claims:

```markdown
# Güteli Bakery — Frontend Order-Request Experience

## Problem

## Solution

## Customer journey

## Implemented functionality

## Mobile-first and accessibility decisions

## Technical approach

## Demo-safe WhatsApp handoff

## Selected screenshots

## Future integration path

## Current limitations
```

Embed repository-relative links to the final homepage, menu, cart, summary, and demo-handoff screenshots. State that authentic photography, backend order capture, payments, live WhatsApp integration, and deployment remain future work.

- [ ] **Step 4: Invoke and follow `superpowers:requesting-code-review`**

Request an independent whole-branch review against the approved Milestone 3 design and implementation plan. If findings are returned, invoke `superpowers:receiving-code-review`, validate each finding against the code, and use `superpowers:systematic-debugging` before changing unexpected behavior. Do not mark the review complete until no Critical or Important finding remains.

- [ ] **Step 5: Invoke and follow `superpowers:verification-before-completion`**

Run fresh from the Milestone 3 worktree:

```bash
npm install
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run start
```

While the preview runs, request `/`, `/menu/`, `/cart/`, `/order/`, and `/contact/`; each must return HTTP 200. Confirm no console errors, horizontal overflow, unsafe demo links, keyboard regressions, or reduced-motion violations.

- [ ] **Step 6: Update evidence and capability records with real results**

Append a table under `## Milestone 3 capability record` using this schema:

```markdown
| Skill | Verified | Used in milestone | Purpose | Result |
| ----- | -------: | ----------------: | ------- | ------ |
```

Add one row only after that skill has actually been invoked and followed. State the concrete output or verification in `Result`; do not infer usage from availability. Update report timestamps, counts, routes, screenshot indexes, release summary, current state, decisions, session log, and testing evidence consistently.

- [ ] **Step 7: Commit the verified evidence set**

```bash
git add tests/browser/artifacts.spec.ts artifacts AI/AI-EOS/CAPABILITY_TABLE.md AI/AI-EOS/CURRENT_TASK.md
git commit -m "docs: record milestone 3 portfolio evidence"
```

The five Phase 2 vault notes listed in this task live outside the repository and are not staged. Verify their final contents separately after updating them.

- [ ] **Step 8: Confirm clean handoff state without integrating or deploying**

Run: `git status --short --branch && git log --oneline --decorate -8`
Expected: branch `milestone-3-portfolio-polish` is clean, commit history is preserved, no deployment occurred, and the branch is ready for visual approval.

Stop and report the before/after summary, screenshot paths, design and interaction changes, demo behavior, verification results, limitations, Git status, and recommended deployment path. Do not merge, push, deploy, or begin another milestone without approval.
