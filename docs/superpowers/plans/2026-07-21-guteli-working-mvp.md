# Güteli Working MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete Spanish-first Güteli menu-to-WhatsApp order-request journey as a statically exportable frontend with real evidence.

**Architecture:** Keep confirmed business content in typed modules, framework-independent cart/order behavior in pure domain and utility modules, and browser state inside one cart provider that persists product IDs and quantities only. Route pages compose focused server and client components; Playwright verifies the full journey and captures running-application evidence.

**Tech Stack:** Next.js 16.2.10, React 19.2.7, TypeScript 5.9, CSS, Vitest 3.2, Playwright 1.61, static export

## Global Constraints

- Customer copy is Spanish-first with `es-GT` document language and `GTQ` prices.
- Use only the eight menu variants and prices confirmed in `docs/superpowers/specs/2026-07-21-guteli-working-mvp-design.md`.
- Preserve exactly: “Cantidad por confirmar”, “Costo de envío por confirmar según ubicación”, “El pedido queda sujeto a confirmación por WhatsApp”, and “Solicita información de recogida por WhatsApp”.
- Pretzels are “Bolsa de 5”; nuditos are “Bolsa de 15”; unconfirmed bagel and burger-bun units use the approved unknown wording.
- Store only `{ productId, quantity }[]` in browser storage; never persist customer personal information.
- The earliest request date is two `America/Guatemala` local calendar days after the current local date.
- WhatsApp is an explicit user-controlled click-to-chat link; never auto-send or claim order confirmation.
- Do not add a backend, server action, API route, secret, payment, CMS, authentication, inventory, analytics platform, multi-tenant infrastructure, or public deployment.
- Use the supplied brand reference only; do not fabricate product photography, testimonials, ratings, guarantees, or business claims.
- Every route must remain statically exportable with project-relative paths and no runtime Obsidian dependency.

---

## File map

### Content and pure behavior

- `src/content/menu.ts`: the typed eight-product source of truth.
- `src/content/business.ts`: site metadata, navigation, contact, and approved operational copy.
- `src/domain/cart.ts`: immutable cart operations, saved-state recovery, lines, count, and subtotal.
- `src/domain/order.ts`: form values, validation errors, and fulfillment validation.
- `src/lib/money.ts`: GTQ formatting.
- `src/lib/date.ts`: Guatemala-local calendar operations.
- `src/lib/order-summary.ts`: deterministic Spanish request summary.
- `src/lib/whatsapp.ts`: deterministic click-to-chat URL.

### Browser state and UI

- `src/components/cart/CartProvider.tsx`: local-only cart state and storage synchronization.
- `src/components/cart/CartBadge.tsx`: hydration-safe cart count.
- `src/components/cart/CartView.tsx`: empty and filled cart interaction.
- `src/components/menu/ProductCard.tsx`: quantity selection and add feedback.
- `src/components/menu/MenuCatalog.tsx`: category composition.
- `src/components/order/OrderRequest.tsx`: form, errors, summary, copy, and WhatsApp handoff.
- `src/components/shared/BrandMark.tsx`: non-destructive crop of the supplied reference wordmark.
- `src/components/shared/SiteHeader.tsx`: desktop and mobile navigation.
- `src/components/shared/SiteFooter.tsx`: factual contact and order caveats.
- `src/app/layout.tsx`, `src/app/page.tsx`, and route pages: static route composition and metadata.
- `src/app/globals.css` and `src/styles/tokens.css`: complete responsive visual system.

### Verification and evidence

- `tests/unit/menu-and-money.test.ts`: exact content and currency.
- `tests/unit/cart.test.ts`: cart behavior and persistence recovery.
- `tests/unit/order.test.ts`: dates, validation, summary, and WhatsApp encoding.
- `tests/browser/foundation.spec.ts`: shell, focus, overflow, console, and missing route.
- `tests/browser/order-journey.spec.ts`: user-visible cart and order behavior.
- `tests/browser/artifacts.spec.ts`: deterministic desktop/mobile evidence capture.
- `artifacts/**`: screenshots and honest verification reports.
- `AI/AI-EOS/18_CAPABILITY_AUDIT.md`: verified/used Superpowers capability record.
- `AI/AI-EOS/CURRENT_TASK.md` and approved Phase 2 project-memory notes: completion state.

---

### Task 1: Confirmed menu and GTQ formatting

**Files:**

- Create: `src/content/menu.ts`
- Create: `src/lib/money.ts`
- Modify: `src/content/business.ts`
- Create: `tests/unit/menu-and-money.test.ts`

**Interfaces:**

- Produces: `MenuProduct`, `MenuProductId`, `menuProducts`, `menuCategories`, `getMenuProduct(id)`, and `formatGTQ(amount)`.
- Produces: `siteConfig.whatsappNumber`, `siteConfig.whatsappDigits`, `siteConfig.advanceDays`, and `operationalCopy`.

- [ ] **Step 1: Write the exact-content test**

```ts
import { describe, expect, it } from 'vitest';
import { menuProducts } from '@/content/menu';
import { formatGTQ } from '@/lib/money';

describe('confirmed menu', () => {
  it('contains the eight flyer variants without invented quantities', () => {
    expect(
      menuProducts.map(({ id, price, saleUnit }) => ({ id, price, saleUnit })),
    ).toEqual([
      { id: 'pretzel-original', price: 60, saleUnit: 'Bolsa de 5' },
      { id: 'pretzel-jalapeno', price: 75, saleUnit: 'Bolsa de 5' },
      { id: 'pretzel-pepperoni', price: 75, saleUnit: 'Bolsa de 5' },
      { id: 'bagel-original', price: 60, saleUnit: null },
      { id: 'bagel-jalapeno', price: 75, saleUnit: null },
      { id: 'bagel-pepperoni', price: 75, saleUnit: null },
      { id: 'burger-buns', price: 55, saleUnit: null },
      { id: 'nuditos', price: 60, saleUnit: 'Bolsa de 15' },
    ]);
  });

  it('formats whole quetzal prices for Guatemala', () => {
    expect(formatGTQ(135)).toBe('Q135');
  });
});
```

- [ ] **Step 2: Run the focused test and observe RED**

Run: `npm test -- tests/unit/menu-and-money.test.ts`  
Expected: FAIL because `@/content/menu` and `@/lib/money` do not exist.

- [ ] **Step 3: Implement the typed content and formatter**

```ts
export const menuProductIds = [
  'pretzel-original',
  'pretzel-jalapeno',
  'pretzel-pepperoni',
  'bagel-original',
  'bagel-jalapeno',
  'bagel-pepperoni',
  'burger-buns',
  'nuditos',
] as const;
export type MenuProductId = (typeof menuProductIds)[number];
export type MenuProduct = {
  id: MenuProductId;
  category: 'pretzels' | 'bagels' | 'burger-buns' | 'nuditos';
  categoryLabel: string;
  name: string;
  price: number;
  saleUnit: string | null;
};
```

Define all eight values in flyer order, export grouped category metadata, and make `getMenuProduct` return the matching value or `undefined`. Implement `formatGTQ` with one reusable `Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 0, maximumFractionDigits: 0 })`, normalizing its output to `Q` plus the digits so tests and UI are stable.

- [ ] **Step 4: Run GREEN and the existing business tests**

Run: `npm test -- tests/unit/menu-and-money.test.ts tests/unit/business.test.ts`  
Expected: PASS with the exact eight menu rows and `Q135`.

- [ ] **Step 5: Commit the slice**

```bash
git add src/content/menu.ts src/content/business.ts src/lib/money.ts tests/unit/menu-and-money.test.ts
git commit -m "feat(menu): add confirmed Guteli catalog"
```

### Task 2: Cart domain and persistence recovery

**Files:**

- Create: `src/domain/cart.ts`
- Create: `tests/unit/cart.test.ts`

**Interfaces:**

- Consumes: `MenuProductId`, `menuProductIds`, `menuProducts`.
- Produces: `CartItem`, `CartLine`, `addCartItem`, `updateCartItem`, `removeCartItem`, `parseStoredCart`, `getCartLines`, `getCartCount`, and `getCartSubtotal`.

- [ ] **Step 1: Write cart behavior and recovery tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  addCartItem,
  getCartCount,
  getCartLines,
  getCartSubtotal,
  parseStoredCart,
  removeCartItem,
  updateCartItem,
} from '@/domain/cart';

describe('cart', () => {
  it('merges additions and calculates subtotal', () => {
    let cart = addCartItem([], 'pretzel-original', 2);
    cart = addCartItem(cart, 'pretzel-original', 1);
    cart = addCartItem(cart, 'nuditos', 2);
    expect(getCartCount(cart)).toBe(5);
    expect(getCartSubtotal(getCartLines(cart))).toBe(300);
  });

  it('updates and removes products immutably', () => {
    const cart = addCartItem([], 'bagel-original', 1);
    expect(updateCartItem(cart, 'bagel-original', 3)[0]?.quantity).toBe(3);
    expect(removeCartItem(cart, 'bagel-original')).toEqual([]);
  });

  it.each([
    null,
    '',
    '{',
    '{}',
    '[{"productId":"unknown","quantity":1}]',
    '[{"productId":"nuditos","quantity":0}]',
    '[{"productId":"nuditos","quantity":1.5}]',
    '[{"productId":"nuditos","quantity":100}]',
  ])('recovers unsafe saved data as an empty cart: %s', (value) => {
    expect(parseStoredCart(value)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/unit/cart.test.ts`  
Expected: FAIL because `@/domain/cart` does not exist.

- [ ] **Step 3: Implement immutable cart functions**

```ts
export type CartItem = { productId: MenuProductId; quantity: number };
export type CartLine = CartItem & { product: MenuProduct; lineTotal: number };
const isQuantity = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 99;
```

All operations return new arrays. `addCartItem` merges an existing row and clamps the result at 99; `updateCartItem` rejects invalid values; `removeCartItem` filters by ID. `parseStoredCart` must catch JSON errors and reject the complete payload if any row is malformed, duplicated, unknown, non-integer, below 1, or above 99. `getCartLines` joins the typed menu; subtotal is the sum of `price * quantity`.

- [ ] **Step 4: Run GREEN and full unit tests**

Run: `npm test -- tests/unit/cart.test.ts`  
Expected: PASS for merge, update, removal, subtotal, and all unsafe payloads.

- [ ] **Step 5: Commit the slice**

```bash
git add src/domain/cart.ts tests/unit/cart.test.ts
git commit -m "feat(cart): add tested cart domain"
```

### Task 3: Guatemala date, order validation, summary, and WhatsApp URL

**Files:**

- Create: `src/lib/date.ts`
- Create: `src/domain/order.ts`
- Create: `src/lib/order-summary.ts`
- Create: `src/lib/whatsapp.ts`
- Create: `tests/unit/order.test.ts`

**Interfaces:**

- Consumes: `CartLine`, `formatGTQ`, `siteConfig.advanceDays`, and `siteConfig.whatsappDigits`.
- Produces: `OrderFormValues`, `OrderErrors`, `getGuatemalaDate`, `addCalendarDays`, `getMinimumOrderDate`, `validateOrder`, `buildOrderSummary`, and `buildWhatsAppUrl`.

- [ ] **Step 1: Write date, validation, summary, and encoding tests**

```ts
import { describe, expect, it } from 'vitest';
import { getCartLines } from '@/domain/cart';
import { validateOrder } from '@/domain/order';
import { getMinimumOrderDate } from '@/lib/date';
import { buildOrderSummary } from '@/lib/order-summary';
import { buildWhatsAppUrl } from '@/lib/whatsapp';

it('uses the Guatemala calendar before adding two days', () => {
  expect(getMinimumOrderDate(new Date('2026-07-21T05:30:00.000Z'), 2)).toBe(
    '2026-07-22',
  );
  expect(getMinimumOrderDate(new Date('2026-07-21T06:30:00.000Z'), 2)).toBe(
    '2026-07-23',
  );
});

it('requires location only for delivery and rejects early dates', () => {
  expect(
    validateOrder(
      {
        name: 'Ana',
        phone: '5555 5555',
        fulfillment: 'delivery',
        requestedDate: '2026-07-22',
        location: '',
        notes: '',
      },
      '2026-07-23',
    ),
  ).toMatchObject({
    requestedDate: expect.any(String),
    location: expect.any(String),
  });
  expect(
    validateOrder(
      {
        name: 'Ana',
        phone: '5555 5555',
        fulfillment: 'pickup',
        requestedDate: '2026-07-23',
        location: '',
        notes: '',
      },
      '2026-07-23',
    ),
  ).toEqual({});
});

it('builds a readable encoded user-controlled handoff', () => {
  const lines = getCartLines([{ productId: 'pretzel-original', quantity: 2 }]);
  const summary = buildOrderSummary(lines, {
    name: 'Ana',
    phone: '5555 5555',
    fulfillment: 'pickup',
    requestedDate: '2026-07-23',
    location: '',
    notes: 'Sin picante',
  });
  expect(summary).toContain('2 × Pretzels — Originales');
  expect(summary).toContain('Subtotal estimado: Q120');
  expect(summary).toContain(
    'El pedido queda sujeto a confirmación por WhatsApp',
  );
  expect(buildWhatsAppUrl('502 4256-9861', summary)).toBe(
    `https://wa.me/50242569861?text=${encodeURIComponent(summary)}`,
  );
});
```

- [ ] **Step 2: Run RED**

Run: `npm test -- tests/unit/order.test.ts`  
Expected: FAIL because the four order modules do not exist.

- [ ] **Step 3: Implement pure order behavior**

Use `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)` to obtain the local ISO date. Add days with UTC calendar arithmetic on the parsed `YYYY-MM-DD` parts. Validation trims values and returns keys only for actual failures. Summary generation lists category and product, sale unit or approved unknown wording, quantity, line total, fulfillment, requested date, delivery location when applicable, notes when present, subtotal, and the exact request disclaimer.

```ts
export type OrderFormValues = {
  name: string;
  phone: string;
  fulfillment: 'pickup' | 'delivery';
  requestedDate: string;
  location: string;
  notes: string;
};
export type OrderErrors = Partial<Record<keyof OrderFormValues, string>>;
```

- [ ] **Step 4: Run GREEN and full unit tests**

Run: `npm test`  
Expected: PASS including both UTC instants around Guatemala midnight, conditional delivery validation, summary content, and encoded WhatsApp link.

- [ ] **Step 5: Commit the slice**

```bash
git add src/lib/date.ts src/domain/order.ts src/lib/order-summary.ts src/lib/whatsapp.ts tests/unit/order.test.ts
git commit -m "feat(order): add request validation and handoff utilities"
```

### Task 4: Cart provider and responsive global shell

**Files:**

- Create: `src/components/cart/CartProvider.tsx`
- Create: `src/components/cart/CartBadge.tsx`
- Create: `src/components/shared/BrandMark.tsx`
- Create: `src/components/shared/SiteHeader.tsx`
- Create: `src/components/shared/SiteFooter.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/styles/tokens.css`
- Modify: `tests/browser/foundation.spec.ts`

**Interfaces:**

- Consumes: all Task 1–2 content/cart exports.
- Produces: `CartProvider`, `useCart()`, hydration-safe `CartBadge`, and the final site shell used by every route.

- [ ] **Step 1: Replace foundation browser expectations with final-shell expectations**

Add assertions for an accessible “Navegación principal” landmark, “Güteli Bakery, inicio” brand link, “Carrito, 0 productos” link after hydration, footer phone `4256-9861`, skip-link focus, no horizontal overflow, no browser console errors, and a working `main#main-content` on `/ruta-inexistente/`.

```ts
await page.goto('/');
await expect(
  page.getByRole('navigation', { name: 'Navegación principal' }),
).toBeVisible();
await expect(
  page.getByRole('link', { name: 'Carrito, 0 productos' }),
).toBeVisible();
await expect(page.getByText('4256-9861')).toBeVisible();
expect(
  await page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  ),
).toBe(true);
```

- [ ] **Step 2: Run the focused shell tests and observe RED**

Run: `npx playwright test tests/browser/foundation.spec.ts`  
Expected: FAIL on the new final header, cart badge, footer, and route-copy expectations.

- [ ] **Step 3: Implement storage-safe cart context and shell**

`CartProvider` initializes empty, reads `guteli-cart-v1` after mount using `parseStoredCart`, sets `hydrated`, and writes only `CartItem[]` after hydration. Expose `{ items, lines, itemCount, subtotal, hydrated, addItem, updateQuantity, removeItem, clearCart }`. The header uses semantic desktop navigation plus a mobile `<details>` summary named “Abrir menú”; both contain the same five destinations and the cart link uses the live accessible count. `BrandMark` clips the top of `/assets/reference/guteli-brand-reference.jpeg` without creating a derivative file.

```tsx
<CartProvider>
  <SiteHeader />
  {children}
  <SiteFooter />
</CartProvider>
```

Refine tokens to chocolate `#2f1b15`, cream `#fff6e5`, caramel `#a24d1c`, orange `#ff6b0b`, contrast-safe focus blue, responsive content widths, system type stacks, and reduced-motion rules.

- [ ] **Step 4: Run GREEN plus lint and typecheck**

Run: `npx playwright test tests/browser/foundation.spec.ts && npm run lint && npm run typecheck`  
Expected: PASS with hydration-safe count, accessible landmarks, focus transfer, missing route, and no overflow.

- [ ] **Step 5: Commit the slice**

```bash
git add src/components/cart src/components/shared src/app/layout.tsx src/app/globals.css src/styles/tokens.css tests/browser/foundation.spec.ts
git commit -m "feat(shell): add responsive branded navigation"
```

### Task 5: Homepage and complete menu

**Files:**

- Create: `src/components/menu/ProductCard.tsx`
- Create: `src/components/menu/MenuCatalog.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/menu/page.tsx`
- Modify: `src/app/globals.css`
- Create: `tests/browser/menu.spec.ts`

**Interfaces:**

- Consumes: `menuProducts`, `menuCategories`, `formatGTQ`, `useCart`, `BrandMark`.
- Produces: final homepage and menu; each add action announces status and updates the global badge.

- [ ] **Step 1: Write menu interaction tests**

```ts
test('shows all confirmed products and adds a selected quantity', async ({
  page,
}) => {
  await page.goto('/menu/');
  await expect(
    page.getByRole('heading', { name: 'Nuestro menú' }),
  ).toBeVisible();
  await expect(page.getByTestId('product-card')).toHaveCount(8);
  await page.getByLabel('Cantidad de Originales, Pretzels').fill('2');
  await page
    .getByRole('button', { name: 'Agregar Originales de Pretzels' })
    .click();
  await expect(page.getByRole('status')).toContainText('2 bolsas agregadas');
  await expect(
    page.getByRole('link', { name: 'Carrito, 2 productos' }),
  ).toBeVisible();
});
```

Also assert the homepage heading, authentic brand image alternative text, real featured prices, and route actions.

- [ ] **Step 2: Run RED**

Run: `npx playwright test tests/browser/menu.spec.ts`  
Expected: FAIL because the pages still render foundation placeholders.

- [ ] **Step 3: Implement the editorial homepage and typed catalog**

`ProductCard` owns a local numeric quantity from 1 to 99 and calls `addItem(product.id, quantity)`. It renders `Cantidad por confirmar` when `saleUnit` is null and generates grammar-safe feedback without claiming availability. `MenuCatalog` maps category metadata, never redefines product facts. The homepage uses `BrandMark`, two primary routes, real price previews, three factual ordering steps, the two-day reminder, and the human-confirmation disclaimer.

```tsx
<article className="product-card" data-testid="product-card">
  <p>{product.categoryLabel}</p>
  <h3>{product.name}</h3>
  <p>{product.saleUnit ?? operationalCopy.quantityUnknown}</p>
  <strong>{formatGTQ(product.price)}</strong>
  <label>
    ...
    <input type="number" min="1" max="99" />
  </label>
  <button type="button">
    Agregar {product.name} de {product.categoryLabel}
  </button>
</article>
```

- [ ] **Step 4: Run GREEN at desktop and mobile**

Run: `npx playwright test tests/browser/menu.spec.ts`  
Expected: PASS for eight products, factual content, quantity add, status announcement, and cart count.

- [ ] **Step 5: Commit the slice**

```bash
git add src/components/menu src/app/page.tsx src/app/menu/page.tsx src/app/globals.css tests/browser/menu.spec.ts
git commit -m "feat(menu): build homepage and shopping catalog"
```

### Task 6: Interactive cart and order-request journey

**Files:**

- Create: `src/components/cart/CartView.tsx`
- Create: `src/components/order/OrderRequest.tsx`
- Modify: `src/app/cart/page.tsx`
- Modify: `src/app/order/page.tsx`
- Modify: `src/app/globals.css`
- Create: `tests/browser/order-journey.spec.ts`

**Interfaces:**

- Consumes: `useCart`, `formatGTQ`, `getMinimumOrderDate`, `validateOrder`, `buildOrderSummary`, `buildWhatsAppUrl`, `operationalCopy`.
- Produces: complete empty/filled cart, pickup/delivery form, errors, summary, copy state, and explicit WhatsApp link.

- [ ] **Step 1: Write the complete browser journey and recovery tests**

```ts
test('completes a delivery request without sending it', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/menu/');
  await page
    .getByRole('button', { name: 'Agregar Originales de Pretzels' })
    .click();
  await page.goto('/cart/');
  await page
    .getByLabel('Cantidad de Originales, Pretzels en el carrito')
    .fill('2');
  await expect(page.getByText('Q120')).toBeVisible();
  await page.getByRole('link', { name: 'Completar datos del pedido' }).click();
  await page.getByRole('button', { name: 'Revisar solicitud' }).click();
  await expect(page.getByRole('alert')).toContainText('Revisa los campos');
  await page.getByLabel('Nombre completo').fill('Ana López');
  await page.getByLabel('Teléfono').fill('5555 5555');
  await page.getByLabel('Envío').check();
  await page.getByLabel('Ubicación o dirección').fill('Zona 10, Guatemala');
  await page
    .getByLabel('Fecha solicitada')
    .fill(
      (await page.getByLabel('Fecha solicitada').getAttribute('min')) ?? '',
    );
  await page.getByRole('button', { name: 'Revisar solicitud' }).click();
  await expect(
    page.getByRole('heading', { name: 'Tu solicitud está lista para revisar' }),
  ).toBeVisible();
  await expect(
    page.getByText('El pedido queda sujeto a confirmación por WhatsApp'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Copiar resumen' }).click();
  await expect(page.getByRole('status')).toHaveText('Resumen copiado.');
  await expect(
    page.getByRole('link', { name: 'Abrir WhatsApp con mi solicitud' }),
  ).toHaveAttribute('href', /wa\.me\/50242569861\?text=/);
});
```

Add separate tests for empty-cart recovery, pickup copy, persisted-cart reload, malformed local storage recovery, remove action, and clipboard rejection leaving the summary and manual-copy message visible.

- [ ] **Step 2: Run RED**

Run: `npx playwright test tests/browser/order-journey.spec.ts`  
Expected: FAIL because cart and order routes are still foundation placeholders.

- [ ] **Step 3: Implement the cart and order UI**

`CartView` waits for hydration, then renders an intentional empty state or lines with labelled numeric inputs, remove buttons, line totals, request subtotal, disclaimer, and order link. `OrderRequest` keeps all PII in React state only. On submit, compute errors against `getMinimumOrderDate(new Date(), 2)`; focus an `alert` summary on error. On success, compute one immutable summary snapshot and render it in a read-only textarea, with copy and WhatsApp controls.

```ts
async function copySummary() {
  try {
    await navigator.clipboard.writeText(summary);
    setCopyStatus('Resumen copiado.');
  } catch {
    setCopyStatus(
      'No se pudo copiar automáticamente. Selecciona y copia el resumen manualmente.',
    );
  }
}
```

Do not clear the cart, navigate, open a popup, or claim success when the form is submitted. The WhatsApp anchor alone controls external navigation.

- [ ] **Step 4: Run GREEN and unit regression**

Run: `npm test && npx playwright test tests/browser/order-journey.spec.ts`  
Expected: PASS for cart CRUD, storage recovery, validation, summary, copy success/fallback, and encoded WhatsApp link.

- [ ] **Step 5: Commit the slice**

```bash
git add src/components/cart/CartView.tsx src/components/order src/app/cart/page.tsx src/app/order/page.tsx src/app/globals.css tests/browser/order-journey.spec.ts
git commit -m "feat(order): complete cart and WhatsApp request journey"
```

### Task 7: Contact, responsive polish, and semantic review

**Files:**

- Modify: `src/app/contact/page.tsx`
- Modify: `src/app/not-found.tsx`
- Modify: `src/app/globals.css`
- Modify: `tests/browser/foundation.spec.ts`
- Modify: `tests/browser/order-journey.spec.ts`

**Interfaces:**

- Consumes: `siteConfig`, `operationalCopy`, and `buildWhatsAppUrl`.
- Produces: factual contact route, finished missing-route recovery, and polished desktop/mobile states.

- [ ] **Step 1: Add mobile navigation, contact, keyboard, and overflow assertions**

At 390×844, assert “Abrir menú” exposes navigation, all buttons and links have non-zero boxes of at least 44 pixels in their smallest interactive dimension where the design controls the target, order fields follow logical tab order, and every route has `scrollWidth <= clientWidth`. At 1440×1000, assert the desktop nav is present and the footer reaches the document bottom on short routes.

- [ ] **Step 2: Run the focused assertions and observe any RED**

Run: `npx playwright test tests/browser/foundation.spec.ts tests/browser/order-journey.spec.ts`  
Expected: any incomplete contact/mobile/keyboard requirement fails with a specific assertion.

- [ ] **Step 3: Complete factual content and responsive CSS**

The contact route exposes `4256-9861`, two-day notice, delivery-cost caveat, pickup-information caveat, request disclaimer, and a neutral prefilled WhatsApp question. The missing route keeps `main#main-content` focusable. CSS uses mobile-first single-column flow, a two-column editorial hero and catalog layout above 48rem, no horizontal clipping, clear disabled/loading treatment, visible `:focus-visible`, and `prefers-reduced-motion` overrides.

- [ ] **Step 4: Run the full browser suite**

Run: `npm run test:e2e`  
Expected: PASS at both target viewports with zero captured console errors and no horizontal overflow.

- [ ] **Step 5: Commit the slice**

```bash
git add src/app/contact/page.tsx src/app/not-found.tsx src/app/globals.css tests/browser
git commit -m "feat(site): finish contact and responsive states"
```

### Task 8: Real screenshots and verification artifacts

**Files:**

- Create: `tests/browser/artifacts.spec.ts`
- Replace: `artifacts/screenshots/desktop/milestone-1-foundation.png` only by adding new Milestone 2 files; preserve Milestone 1 evidence.
- Create: `artifacts/screenshots/desktop/milestone-2-homepage.png`
- Create: `artifacts/screenshots/desktop/milestone-2-cart.png`
- Create: `artifacts/screenshots/desktop/milestone-2-summary.png`
- Create: `artifacts/screenshots/mobile/milestone-2-homepage.png`
- Create: `artifacts/screenshots/mobile/milestone-2-cart.png`
- Create: `artifacts/screenshots/mobile/milestone-2-summary.png`
- Create or update: `artifacts/screenshots/interaction-states/milestone-2-validation.png`
- Modify: all report files under `artifacts/reports/`
- Modify: `artifacts/previews/preview-information.md`
- Modify: `artifacts/release/release-summary.md`
- Modify: `artifacts/README.md`

**Interfaces:**

- Consumes: the final running app and its accessible selectors.
- Produces: reproducible screenshots and honest evidence paths used by final review.

- [ ] **Step 1: Write the evidence-capture browser test**

Create a serial Playwright spec that visits the real app, sets exact 1440×1000 and 390×844 viewports, captures the homepage, creates a two-item cart, captures the cart, completes a pickup request using the current `min` date, captures the summary, and captures one field-error state. Use `animations: 'disabled'` and full-page screenshots at explicit repository paths.

- [ ] **Step 2: Run capture against the real app**

Run: `npx playwright test tests/browser/artifacts.spec.ts`  
Expected: PASS and seven non-empty Milestone 2 PNG files under the approved artifact directories.

- [ ] **Step 3: Inspect every screenshot visually**

Open each PNG at original detail. Check crop quality, food-focused hierarchy, real content, typography, spacing, controls, focus/error presentation, summary readability, footer completion, and absence of clipping or placeholder copy. Any Critical or Important visual defect returns to the relevant UI task and is fixed before reports are written.

- [ ] **Step 4: Write evidence reports from actual command output**

Record command, date, result counts, tested routes/viewports, accessibility observations, console/overflow result, local preview address, remaining Minor findings, and exact screenshot paths. Do not claim Lighthouse or another unavailable score. Preserve prior Milestone 1 evidence and label it separately.

- [ ] **Step 5: Commit the evidence**

```bash
git add tests/browser/artifacts.spec.ts artifacts
git commit -m "test(artifacts): capture Milestone 2 customer journey"
```

### Task 9: Project memory, capability record, independent review, and final gate

**Files:**

- Modify: `AI/AI-EOS/18_CAPABILITY_AUDIT.md`
- Modify: `AI/AI-EOS/CURRENT_TASK.md`
- Modify externally: `/Users/andrewarana/Desktop/Empresita/Phase 2 - Guteli Demo/Current State.md`
- Modify externally: `/Users/andrewarana/Desktop/Empresita/Phase 2 - Guteli Demo/Decisions.md`
- Modify externally: `/Users/andrewarana/Desktop/Empresita/Phase 2 - Guteli Demo/Testing.md`
- Modify externally: `/Users/andrewarana/Desktop/Empresita/Phase 2 - Guteli Demo/Session Log.md`
- Modify as warranted by its subject: `artifacts/release/release-summary.md` and `artifacts/README.md`

**Interfaces:**

- Consumes: actual Git history, reports, tests, preview response, visual review, and Superpowers invocation evidence.
- Produces: final auditable Milestone 2 state with no Critical or Important review findings.

- [ ] **Step 1: Update the capability record honestly**

For each inspected or used skill, record this exact table shape:

```md
| Skill                                 | Verified | Used in milestone | Purpose                               | Result                                                     |
| ------------------------------------- | -------: | ----------------: | ------------------------------------- | ---------------------------------------------------------- |
| `superpowers:test-driven-development` |      Yes |               Yes | RED/GREEN domain and journey behavior | Expected failures observed; focused and full suites passed |
```

Include only skills actually opened and followed. At minimum reconcile `using-superpowers`, `brainstorming`, `writing-plans`, `using-git-worktrees`, `executing-plans`, `test-driven-development`, `verification-before-completion`, and `requesting-code-review`; add `systematic-debugging` or `receiving-code-review` only if actually used.

- [ ] **Step 2: Invoke verification-before-completion and run a fresh full gate**

Run each command separately and retain its actual result:

```bash
npm install
npm run format
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run start
curl -I http://127.0.0.1:3000/
```

Expected: all commands exit 0; the final response is HTTP 200. Stop the preview cleanly after the check.

- [ ] **Step 3: Invoke requesting-code-review for the complete branch**

Review the diff from the branch base through HEAD against the written spec. Classify findings as Critical, Important, or Minor and cite exact files/lines. If feedback is received, invoke `receiving-code-review` before applying it. Any unexpected failure or disputed defect invokes `systematic-debugging` before a fix. Repeat focused and full verification after changes.

- [ ] **Step 4: Reconcile project memory from verified evidence**

Update only the authorized routine records plus artifact subjects that actually changed. Record the implemented journey, exact unit/browser counts, HTTP 200, screenshot paths, review verdict, remaining non-blocking follow-ups, and the public-deployment gate. Validate all Phase 2 frontmatter and wikilinks after the external note edits.

- [ ] **Step 5: Commit the final verified state**

```bash
git add AI/AI-EOS/18_CAPABILITY_AUDIT.md AI/AI-EOS/CURRENT_TASK.md artifacts
git commit -m "docs(ai-eos): record verified Milestone 2 MVP"
git status --short
```

Expected: commit succeeds and the feature worktree is clean. Do not merge, tag, push, deploy, delete the branch, or begin another milestone without explicit user authorization.
