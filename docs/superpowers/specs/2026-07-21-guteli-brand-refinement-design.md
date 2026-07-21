# Güteli Brand Refinement Design

Status: authorized by the 2026-07-21 Milestone 4 request. This specification refines the approved frontend without reopening its architecture or business scope.

## Goal

Anchor the customer experience in the original supplied Güteli logo and exact approved slogan, reduce demo/footer density on mobile, and make the existing order-request journey feel more bakery-specific without changing its underlying behavior.

## Considered approaches

### 1. Official brand anchor plus bakery basket vocabulary — selected

Use the untouched official logo pixels in the header and footer, add the slogan once in the homepage hierarchy, and introduce a restrained canasta metaphor through navigation, add controls, empty states, feedback, category labels, and small line motifs. This best satisfies the brief while preserving familiar interaction patterns and the approved editorial system.

### 2. Logo and slogan replacement only

This has the smallest change surface, but it leaves the generic cart and feedback language unchanged and does not meet the requested UI-personality goal.

### 3. Full editorial recomposition

This could create a more dramatic visual shift, but it would add unnecessary visual and regression risk immediately before deployment. It is outside the requested small refinement.

## Official logo asset

- Canonical source: `assets/reference/guteli-brand-reference.jpeg`.
- Verified source: 1131×1600 progressive JPEG, SHA-256 `4af05f831029c5d07f835c9cea51d510956f5e5beaa5e46bc1e30bf7b0a1d194`, visually undamaged.
- The source contains a clean horizontal official logo region at substantially higher resolution than its intended rendered size.
- Create `public/brand/guteli-logo-original.jpeg` with a lossless JPEG crop of `864x240+160+48`. The crop contains only the original GÜTELI BAKERY wordmark, pretzel-heart symbol, original colors, and surrounding dark field. It contains no flyer product photography, menu copy, phone number, or slogan.
- Do not redraw, trace, recolor, sharpen, simplify, or change the logo proportions. Responsive CSS may only scale the complete crop proportionally with `height: auto` and `object-fit: contain`.
- Render the same asset through one `OfficialLogo` component in both the header and footer. The header link keeps the accessible name `Güteli Bakery, inicio`; the image exposes `Güteli Bakery` alternative text.
- Keep clear space through the existing header/footer layout. Nothing overlays or enters the image bounds.

## Homepage hierarchy

The homepage copy order is:

1. `Güteli Bakery · Panadería por encargo` as brand identification.
2. Existing factual heading `Pretzels, bagels y panes por encargo`.
3. Exact approved slogan: `Buenos momentos empiezan con algo recién horneado.`
4. Existing concise explanation of the request and WhatsApp-confirmation flow.
5. Primary menu and secondary order-request actions.

The slogan appears once, outside the logo asset. The editorial bakery illustration remains clearly illustrative and never stands in for the official logo.

## Branded interaction language

- Customer-facing `Carrito` becomes the familiar but more bakery-specific `Canasta`; internal cart types, storage keys, routes, and domain behavior remain unchanged.
- The navigation badge includes a simple basket line icon plus a visible `Canasta` label and the existing quantity count.
- Menu actions use `Agregar a la canasta` while retaining product-specific accessible names.
- Success feedback uses `Listo en tu canasta` and remains a polite live region.
- The cart heading becomes `Tu canasta`; the empty state remains explicit and gains a basket illustration plus warm recovery copy.
- Cart totals use `Tu selección`; the order form and summary keep clear request language.
- Category headings gain one short packaging-style descriptor each. These are editorial labels, not claims about product appearance or availability.
- Copy confirmation becomes `Resumen copiado. Listo para compartir.` while preserving the same clipboard behavior and fallback.

## Demo banner and footer

- Demo mode displays exactly `Sitio demo — ninguna solicitud se envía.` at every viewport, satisfying the mobile requirement without maintaining two copies.
- The footer uses the official logo, one concise advance-order sentence, compact navigation, and the existing phone/demo or live-handoff state.
- Delivery and confirmation facts remain available in the order journey and no longer need to be repeated in the mobile footer.
- Mobile spacing and line lengths are reduced without shrinking links below 44px targets.

## Visual treatment

- Keep the existing warm cream, dark chocolate, orange, caramel, and editorial typography system.
- Add only lightweight CSS/SVG basket, knot, stitch, label, and stamp details.
- Preserve reduced-motion behavior; no new autoplaying or continuous animation.
- Preserve existing illustration slots for future approved photography.
- No new dependency, backend, data source, route, or runtime configuration.

## Accessibility and behavior boundaries

- Logo rendering has accessible text and never relies on the raster image alone to identify the homepage link.
- Decorative icons and motifs are hidden from assistive technology.
- Visible copy remains clear; `Canasta` is not used without enough context to understand the selection flow.
- Existing focus management, form labels, keyboard order, validation, cart persistence, WhatsApp safety, and static export stay unchanged.
- Default demo mode continues to render no active `wa.me` link. Only the confirmed existing live configuration remains valid.

## Verification and evidence

Use fail-first browser contracts for the official asset, exact slogan, separate logo/slogan, concise banner, header/footer placement, canasta language, accessible labels, feedback, and mobile density. Run the complete unit/browser/build/preview gate and confirm all five customer routes return HTTP 200, no console errors, no horizontal overflow, and no active WhatsApp link in demo mode.

Create fresh Milestone 4 screenshots without overwriting Milestone 3 evidence:

- `artifacts/screenshots/desktop/milestone-4-homepage.png`
- `artifacts/screenshots/mobile/milestone-4-homepage.png`
- `artifacts/screenshots/desktop/milestone-4-header-logo.png`
- `artifacts/screenshots/mobile/milestone-4-header-logo.png`
- `artifacts/screenshots/interaction-states/milestone-4-mobile-demo-banner.png`
- `artifacts/screenshots/mobile/milestone-4-footer.png`

The existing journey evidence may also be refreshed under Milestone 4 filenames when the artifact suite exercises menu, canasta, validation, summary, and demo handoff.

## Out of scope

No public deployment, fake photography, logo recreation, new product claims, backend, bot, payment, CMS, inventory, authentication, analytics, or architectural migration.
