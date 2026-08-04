# Güteli Banner Redesign Design

**Date:** 2026-08-04
**Status:** Approved visual direction; implementation pending written-spec review
**Scope:** Visual simplification of the existing Güteli Bakery site and creation of a private preview; no production deployment

## Outcome

The homepage will adopt the supplied cream, chocolate, and orange Güteli artwork as its full-width banner and extend that vintage bakery-label language across the existing interface. The redesign will remove repeated content, correct the compact header logo, and preserve the current menu, cart, order-request form, and WhatsApp handoff behavior.

## Homepage structure

The current split hero will be replaced by the supplied banner artwork. The artwork will remain intact instead of being cropped or reconstructed, so its border, pretzel mark, wordmark, supporting line, stamp, and lower chocolate panel all remain visible.

The primary actions, **Ver el menú** and **Preparar mi pedido**, will sit directly below the banner in a compact action strip. This keeps the embedded banner text decorative while leaving the important navigation actions as accessible HTML controls.

The following repeated areas will be removed from the homepage:

- the existing left-side hero headline and introduction, because the banner already communicates the brand and product category;
- the existing right-side editorial illustration and duplicate Güteli wordmark;
- the four-product price preview, because the menu route already provides the complete catalog.

The homepage will retain one concise **Cómo hacer un pedido** section and one clear route into the complete menu. The ordering section will be restyled with ornamental rules, small diamond details, cream-on-chocolate type, and the same restrained packaging-label composition as the banner.

## Header and logo

The top-left brand treatment will become a clean horizontal Güteli Bakery lockup using the confirmed pretzel-loop symbol, serif wordmark treatment, and orange accent. It will remain legible at desktop and mobile sizes and will not reuse the current distorted heart-like symbol.

Navigation behavior, cart count, keyboard support, sticky positioning, and mobile menu behavior will remain unchanged. Only their visual treatment will be simplified to match the banner.

## Site-wide visual language

The existing palette will be refined around warm paper cream, deep chocolate, vivid bakery orange, and muted caramel. Decorative borders, fine rules, corner flourishes, restrained stamps, and serif display typography will carry the banner's visual identity into the menu, cart, order, contact, and footer surfaces.

The treatment will avoid repeated logos, oversized cards, unnecessary labels, gradients, invented product claims, and fake product photography. Existing category artwork may be simplified to ornamental, clearly illustrative forms that support the banner rather than compete with it.

## Responsive and accessible behavior

The banner will preserve its full aspect ratio on all screen sizes. On narrow screens it will remain uncropped, with actions placed below it at comfortable touch sizes. The image will have concise alternative text, while all essential calls to action and ordering instructions remain real text outside the image.

The redesign will preserve semantic landmarks, visible focus states, readable contrast, reduced-motion behavior, 44-pixel touch targets, keyboard navigation, and layouts without horizontal overflow at 320px, 390px, tablet, and desktop widths.

## Architecture and assets

The current Next.js static-export structure, content modules, domain utilities, cart context, and five-route customer journey will remain intact. The supplied banner will be copied into a project-relative public asset during implementation; no temporary or machine-specific absolute path will be shipped.

No backend, database, authentication, payment processing, inventory, CMS, analytics, or WhatsApp API integration will be added. Demo-safe order handoff behavior will remain unchanged.

## Validation and preview

Implementation will be checked with formatting, linting, type checking, unit tests, browser tests, and a production static build. The homepage will also be reviewed at desktop and mobile widths for banner visibility, logo correctness, removed repetition, navigation behavior, focus states, overflow, and console errors.

The deliverable for this change is a private preview for user review. The existing live Sites version will not be replaced or otherwise published until the user explicitly approves the preview.

## Explicit exclusions

- changing prices, products, business rules, or order-summary content;
- changing the cart, form, or WhatsApp workflow;
- adding unverified photography or business claims;
- publishing the redesigned version before preview approval;
- modifying the separate Phase 1 business-vault notes.
