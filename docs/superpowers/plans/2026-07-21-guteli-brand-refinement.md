# Güteli Brand Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the original Güteli logo and exact approved slogan, simplify mobile demo/footer chrome, and add restrained bakery-specific personality without changing the approved order-request behavior.

**Architecture:** Keep the static Next.js architecture and domain modules unchanged. Add one losslessly extracted public logo asset and one reusable presentational logo component, then refine existing content/components and CSS behind browser-observable contracts. Existing cart persistence, validation, summary generation, WhatsApp configuration, routes, and export behavior remain intact.

**Tech Stack:** Next.js 16 static export, React 19, TypeScript 5.9, CSS, Vitest, Playwright Chromium, lossless `jpegtran` asset extraction.

## Global Constraints

- Use exact slogan text: `Buenos momentos empiezan con algo recién horneado.`
- Use only original logo pixels from `assets/reference/guteli-brand-reference.jpeg`; do not redraw, trace, recolor, sharpen, simplify, or distort them.
- The logo and slogan remain separate customer-facing elements.
- Demo banner text is exactly `Sitio demo — ninguna solicitud se envía.`
- Default demo mode renders no active `wa.me` link; confirmed-live and unavailable modes remain unchanged.
- Preserve all routes, cart/order domain behavior, keyboard/focus behavior, static export, and repository portability.
- Do not overwrite Milestone 3 screenshots.
- Do not add dependencies, infrastructure, invented business facts, product photography, or public deployment.

---

### Task 1: Official logo asset and reusable rendering

**Files:**

- Create: `public/brand/guteli-logo-original.jpeg`
- Create: `src/components/shared/OfficialLogo.tsx`
- Delete: `src/components/shared/BrandMark.tsx`
- Modify: `src/components/shared/SiteHeader.tsx`
- Modify: `src/components/shared/SiteFooter.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/browser/foundation.spec.ts`

**Interfaces:**

- Consumes: `assets/reference/guteli-brand-reference.jpeg` at verified SHA-256 `4af05f831029c5d07f835c9cea51d510956f5e5beaa5e46bc1e30bf7b0a1d194`.
- Produces: `OfficialLogo({ priority?, className? })` and a public 864×240 logo-only JPEG.

- [ ] **Step 1: Write the failing official-logo browser contract**

Add assertions that each route exposes the official image in the header and footer, that its source is `/brand/guteli-logo-original.jpeg`, and that its natural dimensions and rendered ratio preserve 864:240:

```ts
const officialLogos = page.getByRole('img', { name: 'Güteli Bakery' });
await expect(officialLogos).toHaveCount(2);
await expect(officialLogos.first()).toHaveAttribute(
  'src',
  /\/brand\/guteli-logo-original\.jpeg$/,
);
const logoMetrics = await officialLogos.first().evaluate((image) => {
  const element = image as HTMLImageElement;
  const box = element.getBoundingClientRect();
  return {
    naturalHeight: element.naturalHeight,
    naturalWidth: element.naturalWidth,
    ratio: box.width / box.height,
  };
});
expect(logoMetrics).toMatchObject({ naturalHeight: 240, naturalWidth: 864 });
expect(logoMetrics.ratio).toBeCloseTo(864 / 240, 1);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx playwright test tests/browser/foundation.spec.ts --grep "final Spanish site shell"`

Expected: FAIL because no official logo image exists.

- [ ] **Step 3: Extract the exact logo region losslessly**

```bash
mkdir -p public/brand
jpegtran -copy none -perfect -crop 864x240+160+48 -outfile public/brand/guteli-logo-original.jpeg assets/reference/guteli-brand-reference.jpeg
```

Verify `sips` reports 864×240 and visually inspect the created asset before continuing.

- [ ] **Step 4: Implement the reusable official-logo component**

Replace the code-rendered mark with:

```tsx
import Image from 'next/image';

type OfficialLogoProps = {
  className?: string;
  priority?: boolean;
};

export function OfficialLogo({ className, priority }: OfficialLogoProps) {
  return (
    <Image
      className={className}
      src="/brand/guteli-logo-original.jpeg"
      width={864}
      height={240}
      sizes="(min-width: 48rem) 13rem, 10.5rem"
      priority={priority}
      alt="Güteli Bakery"
    />
  );
}
```

Use `OfficialLogo priority className="official-logo official-logo--header"` inside the existing labelled homepage link and `OfficialLogo className="official-logo official-logo--footer"` in the footer.

- [ ] **Step 5: Add proportional sizing and clear space**

```css
.official-logo {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
}

.official-logo--header {
  width: clamp(10.5rem, 20vw, 13rem);
}

.official-logo--footer {
  width: min(12rem, 100%);
}
```

Remove the obsolete `.brand-mark*` drawing rules.

- [ ] **Step 6: Run GREEN verification and commit**

Run: `npx playwright test tests/browser/foundation.spec.ts --grep "final Spanish site shell"`

Expected: PASS with two accessible, proportionally rendered official logos per route.

Commit: `feat: integrate the original guteli logo`

### Task 2: Exact slogan, concise demo banner, and lean footer

**Files:**

- Modify: `src/content/business.ts`
- Modify: `src/app/page.tsx`
- Modify: `src/components/shared/DemoBanner.tsx`
- Modify: `src/components/shared/SiteFooter.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/browser/foundation.spec.ts`
- Test: `tests/browser/menu.spec.ts`

**Interfaces:**

- Produces: `siteConfig.slogan` as the single canonical exact slogan; one homepage placement; exact demo banner copy.

- [ ] **Step 1: Write failing copy and separation contracts**

```ts
await expect(
  page.getByText('Buenos momentos empiezan con algo recién horneado.', {
    exact: true,
  }),
).toHaveCount(1);
await expect(page.getByRole('note', { name: 'Modo demostración' })).toHaveText(
  'Sitio demo — ninguna solicitud se envía.',
);
await expect(
  page.getByRole('img', { name: 'Güteli Bakery' }).first(),
).not.toHaveAttribute('alt', /Buenos momentos/);
```

Add a 390px footer check that the official footer logo, compact navigation, phone, and demo note are visible while the repeated delivery/confirmation paragraphs are absent from the footer.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npx playwright test tests/browser/foundation.spec.ts tests/browser/menu.spec.ts --grep "slogan|portfolio mode|footer"`

Expected: FAIL on missing slogan, old banner text, and dense footer content.

- [ ] **Step 3: Implement canonical copy and hero hierarchy**

Add:

```ts
slogan: 'Buenos momentos empiezan con algo recién horneado.',
```

Render the hero in this order:

```tsx
<p className="eyebrow">Güteli Bakery · Panadería por encargo</p>
<h1>Pretzels, bagels y panes por encargo</h1>
<p className="home-hero__slogan">{siteConfig.slogan}</p>
<p className="home-hero__intro">...</p>
```

- [ ] **Step 4: Implement concise banner and footer**

Render one banner sentence:

```tsx
<div className="demo-banner" role="note" aria-label="Modo demostración">
  Sitio demo — ninguna solicitud se envía.
</div>
```

Keep footer sections to official logo plus advance-order line, compact navigation, and live/demo contact state. Remove only redundant footer repetitions; do not change order-page facts.

- [ ] **Step 5: Style the slogan and reduced footer density**

Use display typography for the slogan, keep it below the headline, and reduce mobile footer gaps/padding while preserving 44px navigation targets.

- [ ] **Step 6: Run GREEN verification and commit**

Run the same focused Playwright command and `npm test`.

Expected: copy contracts and all 40 unit tests PASS.

Commit: `feat: add approved slogan and streamline brand chrome`

### Task 3: Bakery-specific canasta language and feedback

**Files:**

- Create: `src/components/shared/BasketIcon.tsx`
- Modify: `src/content/business.ts`
- Modify: `src/components/cart/CartBadge.tsx`
- Modify: `src/components/cart/CartView.tsx`
- Modify: `src/components/menu/ProductCard.tsx`
- Modify: `src/components/menu/MenuCatalog.tsx`
- Modify: `src/app/menu/page.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/order/OrderRequest.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/unit/business.test.ts`
- Test: `tests/browser/foundation.spec.ts`
- Test: `tests/browser/menu.spec.ts`
- Test: `tests/browser/order-journey.spec.ts`
- Test: `tests/browser/artifacts.spec.ts`

**Interfaces:**

- Produces: decorative `BasketIcon`, public `Canasta` terminology, product-specific accessible add controls, and warmer live-region feedback.
- Preserves: `/cart/`, `guteli-cart-v1`, `CartProvider`, cart domain types, quantities, subtotal, and order summary contents.

- [ ] **Step 1: Update unit and browser expectations first**

Require navigation `{ href: '/cart/', label: 'Canasta' }`, accessible badge names such as `Canasta, 0 productos`, page heading `Tu canasta`, add controls named `Agregar a la canasta: Originales de Pretzels`, status copy beginning `Listo en tu canasta`, summary heading `Tu selección`, and copy status `Resumen copiado. Listo para compartir.`

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
npm test -- tests/unit/business.test.ts
npx playwright test tests/browser/menu.spec.ts tests/browser/order-journey.spec.ts
```

Expected: FAIL only because the approved new wording/iconography is not implemented.

- [ ] **Step 3: Add the decorative basket icon and badge**

```tsx
export function BasketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 9h14l-1.5 10h-11L5 9Zm3.5 0L12 4l3.5 5" />
    </svg>
  );
}
```

Render it beside the visible `Canasta` label; keep the link `aria-label` explicit and quantity-aware.

- [ ] **Step 4: Implement the visible canasta vocabulary**

- Change only customer-facing wording, not identifiers or storage.
- Use `Tu canasta`, `Tu canasta espera algo recién horneado`, `Tu selección`, and `Completar mi solicitud` in the cart view.
- Use visible button text `Agregar a la canasta` with product-specific `aria-label`.
- Announce `Listo en tu canasta: ...` in the existing `role="status"` region.
- Change loading/helper text to `canasta` where it names the customer selection.

- [ ] **Step 5: Add restrained category labels and crafted order feedback**

Extend the static category content with one descriptor each:

```ts
{ id: 'pretzels', label: 'Pretzels', note: 'Nuestro sello' }
{ id: 'bagels', label: 'Bagels', note: 'Para cualquier momento' }
{ id: 'burger-buns', label: 'Burger buns', note: 'Hechos para compartir' }
{ id: 'nuditos', label: 'Nuditos', note: 'Bocados para la mesa' }
```

Render the note as a packaging-style label. Change successful clipboard copy to `Resumen copiado. Listo para compartir.`; preserve the failure message and clipboard logic.

- [ ] **Step 6: Add restrained CSS personality**

Style basket strokes, category labels, empty-state motif, success stamp, and hover/active feedback using existing tokens. Keep icons decorative, controls at least 44px, and reduced-motion behavior unchanged.

- [ ] **Step 7: Run GREEN verification and commit**

Run the focused unit/browser commands, then `npm test`.

Expected: all updated behavior and the complete unit suite PASS.

Commit: `feat: shape the order flow around a bakery canasta`

### Task 4: Responsive evidence and visual verification

**Files:**

- Modify: `tests/browser/artifacts.spec.ts`
- Modify: `src/app/globals.css`
- Create: Milestone 4 PNG files under `artifacts/screenshots/desktop/`, `artifacts/screenshots/mobile/`, and `artifacts/screenshots/interaction-states/`

**Interfaces:**

- Produces: real screenshots from the running app; leaves all Milestone 3 files byte-preserved.

- [ ] **Step 1: Write failing Milestone 4 artifact contracts**

Change artifact outputs to `milestone-4-*` filenames and add element captures:

```ts
await page.locator('.site-header .official-logo').screenshot({
  path: screenshots.desktop.headerLogo,
});
await page.getByRole('note', { name: 'Modo demostración' }).screenshot({
  path: screenshots.states.mobileDemoBanner,
});
await page.getByRole('contentinfo').screenshot({
  path: screenshots.mobile.footer,
});
```

Assert 390px and 1440px views have no horizontal overflow, logo ratios remain proportional, the mobile footer links are at least 44px tall, and console error arrays remain empty.

- [ ] **Step 2: Run the artifact suite and verify RED**

Run: `npx playwright test tests/browser/artifacts.spec.ts`

Expected: FAIL until the new screenshot map and detail captures are complete.

- [ ] **Step 3: Make the smallest responsive CSS corrections**

Adjust only the Milestone 4 selectors required by real rendering: logo max widths, hero slogan measure, mobile banner padding, footer gaps, basket control layout, and category label wrapping.

- [ ] **Step 4: Run GREEN artifact capture and inspect every required image**

Run: `npx playwright test tests/browser/artifacts.spec.ts`

Expected: PASS with zero console errors and no overflow. Inspect at original resolution:

- desktop and mobile homepage
- desktop and mobile header logo
- mobile demo banner
- mobile footer

Confirm no distortion, overlap, clipping, excessive density, or product photography.

- [ ] **Step 5: Commit the verified screenshots and tests**

Commit: `test: capture milestone 4 brand evidence`

### Task 5: Documentation, independent review, and final candidate gate

**Files:**

- Modify: `AI/AI-EOS/CAPABILITY_TABLE.md`
- Modify: `AI/AI-EOS/CURRENT_TASK.md`
- Append: `AI/AI-EOS/19_DECISION_LOG.md`
- Modify: `artifacts/README.md`
- Modify: `artifacts/reports/accessibility-report.md`
- Modify: `artifacts/reports/build-report.md`
- Modify: `artifacts/reports/test-report.md`
- Modify: `artifacts/reports/visual-review.md`
- Modify: `artifacts/release/release-summary.md`
- Modify: external Phase 2 Obsidian `Current State.md`, `Decisions.md`, `Testing.md`, and `Session Log.md`

**Interfaces:**

- Produces: evidence-backed Milestone 4 candidate records and Superpowers capability record.

- [ ] **Step 1: Update evidence records from actual outputs only**

Record the verified source/crop policy, exact slogan/banner, UI changes, screenshot paths, and command results. Preserve Obsidian frontmatter/wikilinks and keep Phase 1 notes read-only.

- [ ] **Step 2: Run the complete required gate**

```bash
npm install
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run test:e2e:live
npm run test:e2e:unavailable
npm run build
npm run start
```

While `npm run start` serves `out/`, verify `/`, `/menu/`, `/cart/`, `/order/`, and `/contact/` return HTTP 200 and inspect the default export for no active `wa.me` destination.

- [ ] **Step 3: Invoke requesting-code-review**

Request an independent whole-branch review for correctness, original-logo fidelity, slogan exactness/separation, accessibility, responsive behavior, demo safety, screenshot truthfulness, and scope. Apply `receiving-code-review` before any review-driven change; use `systematic-debugging` and a failing test for confirmed defects.

- [ ] **Step 4: Re-run verification-before-completion after review changes**

Freshly run every affected focused check and the complete required gate. Do not reuse earlier output for the final claim.

- [ ] **Step 5: Commit the final candidate records**

Commit: `docs: record milestone 4 verification and review`

- [ ] **Step 6: Stop at the visual-approval gate**

Report branch/worktree, commits, verification, screenshots, logo provenance, UI personality changes, review findings, and clean Git status. Do not merge, tag, push, deploy, or begin another milestone.
