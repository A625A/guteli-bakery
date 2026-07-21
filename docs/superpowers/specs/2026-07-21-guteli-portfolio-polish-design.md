# Güteli Portfolio Polish Design

**Date:** 2026-07-21
**Status:** Approved direction derived from the authorized Milestone 3 brief and the user's graphic-only decision
**Scope:** Visual and interaction refinement of the existing frontend-only MVP; no public deployment

## Outcome

Milestone 3 turns the accepted working MVP into a polished portfolio demonstration without changing its architecture or customer journey. The result should feel like a warm, handcrafted bakery storefront rather than a generic starter site or SaaS interface. It keeps the five existing routes and the complete menu-to-summary flow while improving hierarchy, rhythm, responsiveness, interaction feedback, and demo safety.

The customer-facing experience remains Spanish-first. The project continues to use only the Güteli name, logo, confirmed menu, confirmed contact information, and approved operational copy as business source material.

## Direction considered

Three approaches were evaluated against the brief:

1. **Editorial bakery storefront — selected.** Strong type, asymmetrical composition, packaging-style labels, abstract dough and pretzel forms, and selective chocolate/orange fields. This is distinctive, food-focused, and works without unverified photography.
2. **Catalog-first card grid.** Familiar and highly scannable, but too dependent on repeated cards and less memorable as a portfolio piece.
3. **Minimal luxury typography.** Refined and restrained, but risks feeling austere and less approachable for a neighborhood bakery.

The selected direction combines editorial hierarchy with a practical menu system. It preserves clarity and conversion while making the brand presentation feel intentionally designed.

## Source and image policy

- Do not crop, extract, or reuse product photographs from `Guteli.jpeg`.
- Do not generate or simulate product photography.
- Do not imply that any illustration depicts Güteli's actual products.
- Use the Güteli wordmark and pretzel mark only as confirmed brand material.
- Remove “Referencia original de la marca” from every customer-facing surface.
- Decorative visuals may use original typography, abstract bakery shapes, pretzel-inspired line work, packaging-style graphics, or clearly illustrative product silhouettes.
- Decorative graphics must be CSS or original vector markup, accessible as decorative content, and free of unsupported product claims.

Product presentation will expose a stable media slot in the component structure. For Milestone 3 it contains a category-specific illustrative treatment with non-photographic styling and appropriate accessible semantics. A later authentic image can replace the visual source without changing the card layout, hierarchy, or purchasing controls.

## Visual system

### Palette

- Dark chocolate anchors the shell and major contrast fields.
- Warm cream remains the primary reading surface.
- Caramel separates editorial sections and supports secondary emphasis.
- Bright orange is reserved for active controls, small highlights, and key graphic marks.
- Flat color replaces the current decorative gradient so the site stays aligned with the approved no-gradient direction.

### Typography

- Preserve the current local/system-font portability and avoid remote font dependencies.
- Use a bold, rounded display stack for short headings and prices.
- Use a clean system sans serif for instructions, form labels, and summaries.
- Tight display leading and controlled line lengths create confidence; body copy remains relaxed and readable.
- Labels use restrained uppercase tracking only where they clarify section or packaging hierarchy.

### Shape language

- Rounded arches and looping line details reference pretzel and bread forms without depicting real products.
- Packaging-label frames and small stamped numerals provide a handcrafted editorial rhythm.
- Borders are purposeful dividers, not default boxes around every section.
- Shadows are subtle and limited to elevated interactive or summary surfaces.

### Motion

- Use short CSS transitions for links, buttons, mobile navigation, quantities, and success states.
- Decorative hero elements may use one restrained entrance or hover response.
- `prefers-reduced-motion: reduce` disables non-essential animation and smooth scrolling.
- No scroll-jacking, parallax, auto-rotating content, or persistent motion.

## Customer experience

### Global shell

- Add a slim, persistent demo banner when demo mode is enabled. It clearly says the site is a portfolio demonstration and that requests are not sent.
- Refine the header into a compact brand/navigation bar with clearer active, hover, focus, and cart states.
- Keep the mobile navigation native and keyboard-operable while improving its open treatment and label.
- Refine the footer into a concise brand, navigation, and ordering-information composition. In demo mode it must not expose an active WhatsApp send target.
- Preserve the skip link, semantic landmarks, visible focus, minimum touch targets, and hydration-safe cart count.

### Homepage

- Replace the cropped-flyer hero with an original branded editorial composition.
- The composition combines the Güteli wordmark, an oversized pretzel-line motif, packaging-style category labels, and flat abstract bakery shapes.
- Its visible copy identifies the visual as an illustration where needed; decorative SVG/CSS shapes remain hidden from assistive technology.
- Retain one primary menu action and one secondary order action with clearer hierarchy.
- Turn the four-category preview into a more expressive editorial menu strip while preserving confirmed names, units, and prices.
- Refine the three-step request explanation and operational notice into a tighter narrative that works at mobile, tablet, and desktop widths.

### Menu

- Preserve all eight products and existing purchase behavior.
- Product cards use a repeatable media-slot-plus-content layout. The graphic-only placeholder varies by category through color, category initials, line shapes, or silhouettes, but never suggests authentic photography.
- Group categories clearly and keep products comparable: name, unit status, price, quantity, and action appear in a consistent order.
- Use cards only for purchasable products; avoid wrapping headings and guidance in redundant containers.
- Improve add-success feedback and quantity affordances without changing the `1..99` business rule.

### Cart, order, and summary

- Preserve cart and form behavior, data minimization, validation, and the readable request summary.
- Improve the cart's visual grouping, quantity controls, subtotal hierarchy, empty state, and route-forward action.
- Improve form section rhythm, radio selection, input states, error summary, inline errors, and review panel hierarchy.
- Keep copy fallback available at all times after summary generation.
- Make the final handoff behavior unmistakable in both demo and live configuration.

### Contact

- Preserve only confirmed contact and operational information.
- Present the page as a concise coordination guide rather than a generic contact card.
- In demo mode, show the confirmed number as business reference text only and provide no active click-to-chat destination.

## Demo-safe WhatsApp configuration

Demo behavior is fail-safe by default.

- `NEXT_PUBLIC_DEMO_MODE` controls the public experience. Missing, malformed, or non-`false` values resolve to demo mode.
- `NEXT_PUBLIC_WHATSAPP_DESTINATION` is the only allowed click-to-chat destination and accepts digits only.
- The confirmed display number remains business content, separate from the configurable send destination.
- Demo mode never renders an active `wa.me` link in the order summary, contact page, or footer.
- Demo mode keeps the generated message, review flow, and copy fallback fully functional.
- The order handoff area clearly states that the demo does not send requests and offers copy-only behavior.
- Live handoff appears only when demo mode is explicitly disabled and a valid configured destination exists.
- If live mode lacks a valid destination, the UI fails closed: it explains that WhatsApp handoff is unavailable and retains manual copy.
- No destination is silently inferred from the displayed business number.
- `.env.example` documents safe demo defaults and the opt-in live configuration.

The configuration parser and handoff-state resolver remain framework-independent and receive focused unit coverage. Browser tests prove that the default build contains no accidental `wa.me` links while the opt-in live state produces the correct encoded link.

## Responsive strategy

- Design mobile-first at the existing 390px evidence viewport.
- Add deliberate intermediate behavior around compact tablet and narrow desktop widths so layouts do not jump directly from one column to wide desktop.
- Hero, product cards, cart, and order summary progressively move from stacked to split layouts only when content has room.
- Buttons wrap or become full width before their text compresses.
- No horizontal overflow is accepted at 320px, 390px, intermediate tablet widths, or 1440px.
- Important controls and summary actions remain visible without overlap at zoomed text sizes.

## Architecture boundaries

- Keep Next.js static export, React context cart state, pure domain utilities, five routes, and current source directories.
- Add a small typed public configuration module and focused presentation components only where separation improves reuse.
- Keep menu facts in `src/content/menu.ts` and business facts in `src/content/business.ts`.
- Keep visual artwork local and portable. No runtime asset service, image CDN, CMS, backend, API route, database, analytics service, or external font is introduced.
- Do not change the order-request model, persistence policy, date rule, or summary contract except where demo-safe handoff requires presentation changes.

## Testing and review

Behavior changes follow fail-first TDD where practical:

- demo-mode parsing and fail-closed handoff resolution;
- default absence of active WhatsApp links;
- explicit live configuration and encoded handoff link;
- persistent demo identification;
- preserved copy fallback and full order journey;
- improved interaction states where they add observable behavior.

Visual-only CSS refinements are verified through real browser screenshots and proportional accessibility review rather than meaningless unit tests. The final gate covers format, lint, typecheck, unit tests, Chromium tests, static build, local preview, HTTP 200 for all routes, console errors, horizontal overflow, keyboard use, reduced motion, intermediate widths, and the full demo-safe journey.

## Evidence and portfolio case study

Capture real screenshots from the running application for:

- desktop and mobile homepage;
- desktop and mobile menu;
- filled cart;
- completed order form and summary;
- demo-safe handoff and copy state;
- validation and important interaction states.

Create a concise standalone case study under `artifacts/portfolio/` covering the problem, frontend-only solution, customer journey, implemented functionality, mobile-first decisions, technical stack, demo-safety model, future integration path, and selected screenshots. It must distinguish completed functionality from future backend, authentic photography, deployment, payment, and WhatsApp Business integration.

## Explicit exclusions

- public deployment;
- authentic product photography until verified assets are supplied;
- extracted flyer photography;
- generated or stock product photography;
- invented descriptions, ingredients, testimonials, ratings, guarantees, or business claims;
- backend order storage, inventory, payments, authentication, CMS, WhatsApp API, bot, webhook, analytics platform, or multi-tenant infrastructure;
- architecture rewrite or new customer route.
