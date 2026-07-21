# Güteli Working MVP Design

**Date:** 2026-07-21  
**Status:** Approved implementation design derived from the authorized Milestone 2 brief  
**Scope:** Complete frontend-only customer journey; no public deployment

## Outcome

Milestone 2 turns the verified Next.js foundation into a complete Spanish-first order-request website. A customer can discover Güteli, browse the confirmed menu, maintain a cart, choose pickup or delivery, enter the minimum order details, review a structured summary, copy it, and open a user-controlled prefilled WhatsApp conversation.

The website does not place or confirm orders. Güteli remains responsible for availability, delivery cost, pickup details, payment instructions, and final confirmation.

## Source of truth

The implementation uses only facts confirmed by the supplied flyer and approved project notes:

| Category    | Product           | Sale unit              | Price |
| ----------- | ----------------- | ---------------------- | ----: |
| Pretzels    | Originales        | Bolsa de 5             |   Q60 |
| Pretzels    | Queso y jalapeño  | Bolsa de 5             |   Q75 |
| Pretzels    | Queso y pepperoni | Bolsa de 5             |   Q75 |
| Bagels      | Originales        | Cantidad por confirmar |   Q60 |
| Bagels      | Queso y jalapeño  | Cantidad por confirmar |   Q75 |
| Bagels      | Queso y pepperoni | Cantidad por confirmar |   Q75 |
| Burger buns | Burger buns       | Cantidad por confirmar |   Q55 |
| Nuditos     | Nuditos           | Bolsa de 15            |   Q60 |

The confirmed contact number is `4256-9861`. WhatsApp click-to-chat uses Guatemala's country code to construct `50242569861`; the visible contact copy remains the flyer number. Orders require two local calendar days of advance notice. Delivery costs extra based on location.

Unknown pickup address, operating hours, delivery zones, product quantities, payment methods, and price finality are not invented. The interface uses these approved phrases where relevant:

- “Cantidad por confirmar”
- “Costo de envío por confirmar según ubicación”
- “El pedido queda sujeto a confirmación por WhatsApp”
- “Solicita información de recogida por WhatsApp”

## Experience design

### Visual direction

The site is warm, handcrafted, modern, and approachable. It uses the flyer as brand inspiration rather than reproducing its layout:

- dark chocolate anchors the header, hero, and footer;
- warm cream provides the primary reading surface;
- toasted caramel creates section contrast;
- bright bakery orange is reserved for primary actions and small emphasis;
- bold geometric display type provides personality while a clean system sans serif keeps longer text readable;
- generous editorial spacing and rounded pretzel-like details create rhythm without novelty styling.

There are no fabricated product photographs. The supplied reference image is used as the factual brand artwork, cropped non-destructively in the browser to expose its real Güteli wordmark. Product presentation is typographic and content-led.

### Global shell

The shell contains:

- a skip link that moves focus to `main#main-content`;
- an accessible responsive header with the brand, primary navigation, and live cart count;
- a compact mobile navigation control with a clear accessible name;
- a footer with contact number, advance-order reminder, request disclaimer, and navigation;
- visible focus, strong contrast, touch targets of at least 44 CSS pixels, and reduced-motion support.

### Homepage

The homepage is the brand and journey entry point:

1. A dark hero uses the authentic cropped wordmark, a concise bakery promise, and two actions: view the menu and start an order.
2. A featured-menu strip previews real products and prices without photography.
3. A three-step explanation makes the request model explicit: choose products, complete details, confirm through WhatsApp.
4. A trust section states the two-day notice and human confirmation model without unsupported marketing claims.
5. A closing call to action routes to the full menu.

### Menu

The menu groups all eight purchasable variants by category. Each product exposes its name, category, sale unit or safe unknown wording, GTQ price, quantity input, and add action. Adding gives an announced success state and updates the global cart count. No availability claim is made.

### Cart

The empty state explains that no products have been chosen and provides one clear route back to the menu. The filled state provides item names, sale units, unit prices, quantity controls, remove actions, and a GTQ subtotal. The subtotal is labelled as a request estimate, not a final charge. A primary action continues to order details.

### Order request

The order page prevents progress when the cart is empty. With a cart, it shows a compact item review and a form containing:

- full name, required;
- phone number, required;
- fulfillment choice, pickup or delivery, required;
- requested date, required and no earlier than two Guatemala-local calendar days from today;
- location/address, required only for delivery;
- notes, optional.

Pickup displays “Solicita información de recogida por WhatsApp.” Delivery displays “Costo de envío por confirmar según ubicación.” Field-specific errors preserve the active non-persisted form state and move focus to the error summary.

Successful validation creates a visible, read-only Spanish summary. The page provides a copy button and a normal WhatsApp link that opens only when the customer activates it. It never auto-sends, records an order, or claims confirmation. If navigation or clipboard access is unavailable, the summary and flyer contact number remain visible for manual use.

### Contact

The contact page shows the flyer number, the two-day notice, delivery and pickup caveats, and a neutral link to WhatsApp. It does not invent an address, hours, delivery zone, or payment method.

## Architecture

### Content

`src/content/menu.ts` owns typed product facts. `src/content/business.ts` owns site metadata, navigation, contact, and approved operational copy. Components consume these modules; no menu facts are duplicated in pages.

### Domain and utilities

Framework-independent modules provide deterministic behavior:

- `src/domain/cart.ts`: cart types, add/update/remove, line expansion, subtotal, and saved-cart validation;
- `src/domain/order.ts`: fulfillment and form types plus validation errors;
- `src/lib/money.ts`: Spanish Guatemala GTQ formatting;
- `src/lib/date.ts`: Guatemala-local current date, calendar addition, minimum date, and validation;
- `src/lib/order-summary.ts`: readable Spanish summary generation;
- `src/lib/whatsapp.ts`: encoded click-to-chat URL generation.

The functions accept explicit inputs and return values without reading browser globals. Unit tests cover meaningful business behavior.

### Browser state

`CartProvider` owns cart state using a reducer and exposes narrow commands. It reads and writes only `{ productId, quantity }[]` under a versioned local-storage key after client hydration. Invalid, unknown, fractional, negative, excessive, or malformed saved values recover to an empty cart. Customer name, phone, location, date, and notes are never persisted.

### Components and routes

Server route pages compose mostly presentational components. Client components are limited to the interactive header/cart count, menu purchase controls, cart controls, and order form. The existing static export and route set remain:

- `/`
- `/menu/`
- `/cart/`
- `/order/`
- `/contact/`

No API route, server action, secret, remote database, CMS, authentication, payment integration, inventory service, or WhatsApp API is added.

## Failure handling

- Invalid saved cart data resets safely without a runtime error.
- Unknown product IDs are discarded during hydration.
- Quantity controls reject values outside `1..99`.
- An empty cart receives an intentional recovery route.
- Invalid order fields receive Spanish field errors plus a focusable summary.
- Clipboard failure reports a manual-copy instruction while keeping the read-only summary.
- WhatsApp is a normal explicit link; if a device cannot open it, the phone and summary remain available.
- Hydration does not display a false cart count before storage is read.

## Testing and evidence

### Unit tests

- exact menu content and GTQ formatting;
- cart add, merge, update, remove, line expansion, subtotal, and invalid persistence recovery;
- Guatemala-local two-day minimum across time-zone boundaries;
- field validation for pickup and delivery;
- exact Spanish summary sections;
- percent-encoded WhatsApp URL.

### Browser tests

- all five routes render in Spanish with the shared shell;
- responsive navigation and cart count work;
- complete menu-to-cart-to-order-to-summary journey works;
- empty cart, validation errors, pickup copy, delivery copy, copy success/fallback, and WhatsApp URL are verified;
- keyboard focus, skip link, visible focus, console errors, and horizontal overflow are checked at 1440×1000 and 390×844;
- a guaranteed missing route keeps the accessible focus target.

### Artifacts

The running application produces:

- desktop and mobile homepage screenshots;
- desktop and mobile complete-journey screenshots, including cart and summary;
- build, test, accessibility, visual, preview, and release reports;
- an updated artifact index and Superpowers capability record.

Milestone 2 is complete only when installation, formatting, lint, typecheck, unit tests, browser tests, static build, and local HTTP preview pass; visual and accessibility review finds no Critical or Important issue; and all evidence is real rather than described as pending.

## Explicit exclusions

- public deployment or hosting configuration;
- backend order storage or notifications;
- payments or payment-method claims;
- WhatsApp Business API, bot, webhook, or auto-send;
- CMS, authentication, inventory, analytics platform, or multi-tenancy;
- fabricated photography, testimonials, ratings, guarantees, or business claims.
