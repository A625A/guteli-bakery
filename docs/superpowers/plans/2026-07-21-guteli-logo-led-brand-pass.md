# Güteli Logo-Led Brand Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the heart-led hero with a premium official-logo packaging panel and add restrained original-symbol brand moments without changing customer behavior.

**Architecture:** Keep the existing Next.js static site and data flow unchanged. Reuse `OfficialLogo` for full-logo placements, add one decorative `BrandSymbol` component backed by a lossless original-symbol crop, and express the remaining brand language through CSS-only packaging rules, labels, and spacing. Browser contracts define the visual hierarchy and artifact capture while existing journey tests guard behavior.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS, Vitest, Playwright Chromium, `jpegtran`, npm.

## Global Constraints

- Work only on `milestone-4-brand-refinement` in `/Users/andrewarana/Desktop/Guteli Bakery/.worktrees/milestone-4-brand-refinement`.
- Never modify `main`, merge, tag, push, deploy, or remove the worktree.
- Preserve the exact slogan `Buenos momentos empiezan con algo recién horneado.` as text outside the logo asset.
- Preserve original logo and symbol proportions, pixels, typography, and colors; do not redraw, trace, recolor, sharpen, simplify, or stretch them.
- Keep full-logo placements limited to header, hero, and footer; use at most one decorative symbol seal per route main content.
- Do not add product photography, dependencies, routes, backend behavior, or active demo-mode WhatsApp links.
- Preserve static export, accessibility behavior, complete customer journey, and existing tests unless a visual contract legitimately changes.
- Use separately named refinement screenshots; do not overwrite prior Milestone 3 or Milestone 4 evidence.

---

### Task 1: Official-logo hero panel

**Files:**

- Modify: `tests/browser/foundation.spec.ts`
- Modify: `src/components/shared/OfficialLogo.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Create: `public/brand/guteli-symbol-original.jpeg`

**Interfaces:**

- Consumes: `OfficialLogo({ className?: string, priority?: boolean, sizes?: string })` and the verified `public/brand/guteli-logo-original.jpeg` asset.
- Produces: `.home-hero__brand-panel`, `.home-hero__logo`, and the lossless `guteli-symbol-original.jpeg` asset used by Task 2.

- [ ] **Step 1: Write the failing hero contract**

Replace the obsolete illustration expectations in `tests/browser/foundation.spec.ts` with:

```ts
test('homepage hero is anchored by the official logo', async ({ page }) => {
  await page.goto('/');

  const hero = page.locator('.home-hero');
  const heroLogo = hero.getByRole('img', { name: 'Güteli Bakery' });

  await expect(heroLogo).toHaveCount(1);
  await expect(hero.locator('.bakery-illustration')).toHaveCount(0);
  await expect(hero.locator('.home-hero__brand-panel')).toBeVisible();

  const ratioDifference = await heroLogo.evaluate((element) => {
    const image = element as HTMLImageElement;
    return Math.abs(
      image.getBoundingClientRect().width /
        image.getBoundingClientRect().height -
        image.naturalWidth / image.naturalHeight,
    );
  });

  expect(ratioDifference).toBeLessThan(0.02);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx playwright test tests/browser/foundation.spec.ts --project=chromium --grep "homepage hero is anchored"
```

Expected: FAIL because the current hero contains no official-logo image and still renders `.bakery-illustration`.

- [ ] **Step 3: Create the exact symbol crop**

Use the installed lossless JPEG utility against the already verified full-logo crop:

```bash
jpegtran -copy all -perfect -crop 224x224+560+16 -outfile public/brand/guteli-symbol-original.jpeg public/brand/guteli-logo-original.jpeg
sips -g pixelWidth -g pixelHeight public/brand/guteli-symbol-original.jpeg
```

Expected: `pixelWidth: 224` and `pixelHeight: 224`. The `y=16` boundary is required by the source JPEG's 16px lossless iMCU grid; `y=8` would silently produce a 224×232 output. Inspect the result at original resolution before using it.

- [ ] **Step 4: Extend the logo component without changing defaults**

Update `OfficialLogo` so the new hero can supply a responsive size hint:

```tsx
type OfficialLogoProps = {
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export function OfficialLogo({
  className,
  priority,
  sizes = '(min-width: 48rem) 13rem, 10.5rem',
}: OfficialLogoProps) {
  return (
    <Image
      className={className}
      src="/brand/guteli-logo-original.jpeg"
      width={864}
      height={240}
      sizes={sizes}
      priority={priority}
      alt="Güteli Bakery"
    />
  );
}
```

- [ ] **Step 5: Replace the illustration with the packaging panel**

In `src/app/page.tsx`, remove the `BakeryIllustration` import and replace `.home-hero__art` with:

```tsx
<div className="home-hero__brand-panel">
  <div className="home-hero__panel-topline">
    <span>Panadería por encargo</span>
    <span>Guatemala</span>
  </div>
  <div className="home-hero__logo-stage">
    <OfficialLogo
      className="official-logo home-hero__logo"
      priority
      sizes="(min-width: 68rem) 27rem, 82vw"
    />
    <p>Buenos momentos, preparados por encargo.</p>
  </div>
  <div className="home-hero__panel-label">
    <span>Menú de panadería</span>
    <ul aria-label="Categorías del menú">
      {menuCategories.map((category) => (
        <li key={category.id}>{category.label}</li>
      ))}
    </ul>
  </div>
</div>
```

Import `OfficialLogo` and add CSS for a responsive dark label panel, unaltered proportional logo, thin cream/orange rules, and quiet packaging motifs. Do not embed the slogan in the panel or introduce another heart illustration.

- [ ] **Step 6: Run focused GREEN and the full foundation file**

Run:

```bash
npx playwright test tests/browser/foundation.spec.ts --project=chromium --grep "homepage hero is anchored"
npx playwright test tests/browser/foundation.spec.ts --project=chromium
```

Expected: focused test PASS; complete foundation file PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add tests/browser/foundation.spec.ts src/components/shared/OfficialLogo.tsx src/app/page.tsx src/app/globals.css public/brand/guteli-symbol-original.jpeg
git diff --cached --check
git commit -m "feat: anchor the hero in the official guteli logo"
```

---

### Task 2: Restrained secondary brand system

**Files:**

- Create: `src/components/shared/BrandSymbol.tsx`
- Modify: `src/app/menu/page.tsx`
- Modify: `src/components/menu/MenuCatalog.tsx`
- Modify: `src/components/cart/CartView.tsx`
- Modify: `src/components/order/OrderRequest.tsx`
- Modify: `src/app/contact/page.tsx`
- Modify: `src/components/shared/SiteFooter.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/browser/foundation.spec.ts`
- Modify: `tests/browser/order-journey.spec.ts`

**Interfaces:**

- Consumes: `public/brand/guteli-symbol-original.jpeg` from Task 1.
- Produces: `BrandSymbol({ className?: string })`, a decorative exact-pixel symbol seal with `alt=""`.

- [ ] **Step 1: Write failing placement and behavior contracts**

Add focused browser assertions:

```ts
test('secondary brand seals are restrained and decorative', async ({
  page,
}) => {
  for (const path of ['/menu/', '/cart/', '/contact/']) {
    await page.goto(path);
    const symbols = page.locator('main img[src*="guteli-symbol-original"]');
    await expect(symbols).toHaveCount(1);
    await expect(symbols.first()).toHaveAttribute('alt', '');
  }
});
```

Extend the empty-cart test in `tests/browser/order-journey.spec.ts` to require `.request-empty__brand-seal` and continue asserting the same heading, link, and `Canasta, 0 productos` behavior.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
npx playwright test tests/browser/foundation.spec.ts tests/browser/order-journey.spec.ts --project=chromium --grep "secondary brand seals|removing the final item"
```

Expected: FAIL because `BrandSymbol` and the new placements do not exist.

- [ ] **Step 3: Create the decorative symbol component**

Create `src/components/shared/BrandSymbol.tsx`:

```tsx
import Image from 'next/image';

export function BrandSymbol({ className = '' }: { className?: string }) {
  return (
    <span className={`brand-symbol ${className}`} aria-hidden="true">
      <Image
        src="/brand/guteli-symbol-original.jpeg"
        width={224}
        height={224}
        sizes="4rem"
        alt=""
      />
    </span>
  );
}
```

- [ ] **Step 4: Add one selected seal per supporting route**

- Add `BrandSymbol` beside the menu introduction, inside the empty Canasta state in place of `BasketIcon`, in the order-summary header, and at the top of the dark contact card.
- The order route renders its seal only when the summary exists; its empty state keeps the existing `00` marker so each state has one clear visual anchor.
- Keep `BasketIcon` in the navigation badge because it communicates cart function.
- Add packaging-style rules to category headers and a subtle footer top rule; do not insert full logos into cards or category loops.

For the order summary, group its heading without changing its accessible association:

```tsx
<div className="order-summary__brand-heading">
  <div>
    <p className="eyebrow">Todavía no se ha enviado</p>
    <h2 id="summary-title">Tu solicitud está lista para revisar</h2>
  </div>
  <BrandSymbol className="brand-symbol--summary" />
</div>
```

- [ ] **Step 5: Run focused GREEN and regression tests**

Run:

```bash
npx playwright test tests/browser/foundation.spec.ts tests/browser/order-journey.spec.ts --project=chromium
npm test
```

Expected: browser files PASS and 40 unit tests PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/components/shared/BrandSymbol.tsx src/app/menu/page.tsx src/components/menu/MenuCatalog.tsx src/components/cart/CartView.tsx src/components/order/OrderRequest.tsx src/app/contact/page.tsx src/components/shared/SiteFooter.tsx src/app/globals.css tests/browser/foundation.spec.ts tests/browser/order-journey.spec.ts
git diff --cached --check
git commit -m "feat: extend the guteli brand language across the journey"
```

---

### Task 3: Refreshed runtime evidence

**Files:**

- Modify: `tests/browser/artifacts.spec.ts`
- Create: `artifacts/screenshots/desktop/milestone-4-refined-homepage.png`
- Create: `artifacts/screenshots/desktop/milestone-4-refined-hero.png`
- Create: `artifacts/screenshots/desktop/milestone-4-refined-canasta-empty.png`
- Create: `artifacts/screenshots/desktop/milestone-4-refined-menu-brand.png`
- Create: `artifacts/screenshots/desktop/milestone-4-refined-summary.png`
- Create: `artifacts/screenshots/mobile/milestone-4-refined-homepage.png`
- Create: `artifacts/screenshots/mobile/milestone-4-refined-hero.png`
- Create: `artifacts/screenshots/mobile/milestone-4-refined-footer.png`

**Interfaces:**

- Consumes: `.home-hero__brand-panel`, `.menu-page__brand-seal`, `.request-empty`, `.order-summary`, and `.site-footer`.
- Produces: eight separately named real-browser PNGs and artifact contracts that guarantee zero horizontal overflow and zero captured console errors.

- [ ] **Step 1: Add the new artifact paths and captures**

Extend the screenshot map in `tests/browser/artifacts.spec.ts` with `refinedHomepage`, `refinedHero`, `refinedCanastaEmpty`, `refinedMenuBrand`, `refinedSummary`, and `refinedFooter`. Capture the full desktop/mobile homepage, the hero panel element at both viewports, the empty Canasta state, menu intro brand moment, completed summary, and mobile footer.

Use the existing `capture()` helper for full-page images and element screenshots only after asserting visibility, logo proportionality, zero overflow, and no console errors.

- [ ] **Step 2: Run the artifact test**

Run:

```bash
npx playwright test tests/browser/artifacts.spec.ts --project=chromium
```

Expected: PASS and all eight new PNGs exist with non-zero size.

- [ ] **Step 3: Inspect every new image at original resolution**

Confirm visually:

- full official logo dominates the hero panel without distortion;
- the previous giant heart illustration is absent;
- slogan and logo remain separate;
- symbol seals are secondary and never repeated within one route state;
- footer and 390px layouts remain uncluttered;
- no clipping, horizontal overflow, fake photography, or flyer-like repetition appears.

- [ ] **Step 4: Commit Task 3**

```bash
git add tests/browser/artifacts.spec.ts artifacts/screenshots/desktop/milestone-4-refined-*.png artifacts/screenshots/mobile/milestone-4-refined-*.png
git diff --cached --check
git commit -m "test: capture the logo-led guteli candidate"
```

---

### Task 4: Final verification, review, and candidate records

**Files:**

- Modify: `AI/AI-EOS/CAPABILITY_TABLE.md`
- Modify: `AI/AI-EOS/CURRENT_TASK.md`
- Modify: `AI/AI-EOS/19_DECISION_LOG.md`
- Modify: `artifacts/README.md`
- Modify: `artifacts/reports/accessibility-report.md`
- Modify: `artifacts/reports/build-report.md`
- Modify: `artifacts/reports/test-report.md`
- Modify: `artifacts/reports/visual-review.md`
- Modify: `artifacts/release/release-summary.md`

**Interfaces:**

- Consumes: exact command output, route responses, browser evidence, screenshot inspection, and independent review findings.
- Produces: truthful candidate-only records; no approval or integration claim.

- [ ] **Step 1: Run the complete required gate**

Run each command independently and preserve its output:

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

While the preview runs, request `/`, `/menu/`, `/cart/`, `/order/`, and `/contact/` and require HTTP 200. Stop the server cleanly.

- [ ] **Step 2: Inspect the default export and runtime policy**

Confirm exact slogan and demo banner text, no active default-demo `wa.me` link, no unapproved destination, no flyer reference, no `.bakery-illustration` in the hero, and no removed customer-facing caption.

- [ ] **Step 3: Run accessibility and visual checks**

Apply the `accessibility-basic-check` workflow to the changed logo, decorative seals, responsive layout, semantics, target sizes, focus behavior, contrast, motion, and overflow. Do not claim WCAG conformance without the corresponding audit.

- [ ] **Step 4: Request independent review**

Invoke `superpowers:requesting-code-review` and review the complete diff from `84187f8` to the candidate HEAD. Resolve only verified findings through `superpowers:receiving-code-review`; invoke `superpowers:systematic-debugging` before any unexpected failure.

- [ ] **Step 5: Update candidate records and commit**

Record only verified evidence, the exact skill usage, asset provenance, review outcome, screenshot paths, and the visual-approval gate. Keep the status explicitly unmerged, untagged, unpushed, and undeployed.

```bash
git add AI/AI-EOS/CAPABILITY_TABLE.md AI/AI-EOS/CURRENT_TASK.md AI/AI-EOS/19_DECISION_LOG.md artifacts/README.md artifacts/reports/accessibility-report.md artifacts/reports/build-report.md artifacts/reports/test-report.md artifacts/reports/visual-review.md artifacts/release/release-summary.md
git diff --cached --check
git commit -m "docs: record the logo-led visual candidate"
```

- [ ] **Step 6: Preserve the approval candidate**

Invoke `superpowers:verification-before-completion` and `superpowers:finishing-a-development-branch`. Select the already-authorized keep-as-is outcome. Confirm the feature worktree and `main` are clean, retain the branch/worktree, and do not merge, tag, push, deploy, or clean up.
