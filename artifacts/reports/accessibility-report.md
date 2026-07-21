# Accessibility Report

## Milestone 4 basic accessibility review — 2026-07-21

Status: **Basic checklist PASS; not a WCAG conformance claim.**

| Check                           | Observed result                                                                                                                                                                                                |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Official brand access           | PASS: both original-logo images expose `Güteli Bakery` alternative text; the header image remains inside the labelled `Güteli Bakery, inicio` home link, and responsive rendering preserves the 864:240 ratio. |
| Decorative treatment            | PASS: basket SVGs and bakery motifs are hidden from assistive technology; product-specific add-control names and quantity-aware Canasta link names remain explicit.                                            |
| Keyboard and focus              | PASS within the 60-test Chromium suite: skip-link focus, mobile route selection, menu addition, order-form sequence, validation recovery, summary, copy success/fallback, and handoff states remain covered.   |
| Forms and errors                | PASS: visible labels, required-state errors, linked error text, and focused error-summary recovery remain unchanged and covered.                                                                               |
| Targets and responsive overflow | PASS: site-controlled targets retain the tested 44px minimum; the artifact suite confirms five expected mobile footer links and no horizontal overflow at 390px or 1440px.                                     |
| Reduced motion                  | PASS: the existing reduced-motion contract remains in the complete default browser suite.                                                                                                                      |
| Contrast spot-check             | PASS: unchanged verified token pairs remain at least 5.11:1 for the checked text combinations. This is a token spot-check, not a complete rendered-page audit.                                                 |

The exact slogan and concise demo notice remain visible text, and the slogan is separate from the logo alternative text. No axe, Lighthouse, screen-reader session, or comprehensive WCAG audit was run.

## Milestone 3 basic accessibility review — 2026-07-21

Status: **Basic checklist PASS; not a WCAG conformance claim.**

| Check                           | Observed result                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Semantics and text alternatives | PASS: the five customer routes retain named navigation, one main landmark, headings, and labelled controls. Decorative bakery vectors and the code-rendered header mark are hidden from assistive technology; the header link supplies the brand name, and each illustrative menu slot has an explicit category-illustration label. No customer-facing raster product image remains. |
| Keyboard and focus              | PASS: the 59-test Chromium suite covers skip-link focus transfer at desktop and mobile widths, the five-link mobile menu and route-close behavior, logical order-form keyboard sequence, focused validation recovery, and keyboard addition of all eight menu variants.                                                                                                              |
| Form labels and errors          | PASS: every order field is associated with a visible label; required fields expose `aria-invalid` and linked error text; the error summary receives focus and links to the invalid field.                                                                                                                                                                                            |
| Target size and overflow        | PASS: site-controlled interactive targets meet the tested 44px minimum on all five routes at 390px; route checks at 320, 768, 1024, and 1440px found no horizontal overflow on the homepage.                                                                                                                                                                                         |
| Reduced motion                  | PASS: the browser regression verifies smooth scrolling and decorative illustration animation are disabled when reduced motion is requested.                                                                                                                                                                                                                                          |
| Contrast spot-check             | PASS for the checked design-token pairs: body text/background 15.60:1, muted text/background 7.26:1, brand contrast 15.60:1, accent on brand 5.89:1, caramel on background 5.11:1, error text/surface 6.91:1, and focus colors 5.52:1 or better. This is a targeted token calculation, not a full rendered-page contrast audit.                                                      |

No high-risk violation was found in this checklist. No axe, Lighthouse, screen-reader session, or comprehensive WCAG audit was run.

## Milestone 2 basic browser observations — 2026-07-21

Status: **Basic browser checklist PASS; not a WCAG conformance claim.**

| Check                        | Observed result                                                                                                                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Customer-journey semantics   | PASS: accessible roles and labels drove the real `/` → `/menu/` → `/cart/` → `/order/` journey; two distinct cart lines, pickup controls, the requested-date field, summary, and WhatsApp action were located by their accessible names.   |
| Validation and focus         | PASS: leaving only `Nombre completo` blank produced one linked error, moved focus to the `role="alert"` summary, exposed the field error in the full-page capture, and preserved the entered phone, pickup mode, and current minimum date. |
| Keyboard and targets         | PASS in the full 49-test Chromium suite: the skip link transfers focus at 1440×1000 and 390×844; site-controlled mobile links, buttons, menu controls, error recovery links, and footer links meet the tested 44px minimum geometry.       |
| Mobile navigation            | PASS: selecting a destination from the open mobile menu closes the persistent `<details>` control on the destination route.                                                                                                                |
| Review integrity             | PASS: changing a summarized field or fulfillment mode removes the stale WhatsApp handoff until the customer reviews again.                                                                                                                 |
| Overflow and console         | PASS: every artifact capture asserted `scrollWidth <= clientWidth`; the full suite passed mobile overflow coverage on `/`, `/menu/`, `/cart/`, `/order/`, and `/contact/`. The artifact journey collected zero browser console errors.     |
| Summary readability          | PASS: the labelled read-only summary remains visible with pickup mode, both products, subtotal content, copy control, and explicit WhatsApp handoff; the complete text is available in its scrollable textarea.                            |
| Contrast and automated audit | Not measured: no axe, Lighthouse, or contrast checker was run.                                                                                                                                                                             |

Remaining Minor accessibility findings from the inspected evidence: none observed. This is limited to the implemented browser checks and visual inspection, not a comprehensive assistive-technology audit.

## Milestone 1 evidence (preserved)

Status: **Basic checklist PASS; Milestone 1 formally approved — 2026-07-19**

| Check                           | Result                                                                                                                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language and landmark semantics | PASS: all verified routes expose `lang="es-GT"`, a named `Principal` navigation landmark, one page heading, and `main#main-content`.                                        |
| Keyboard and skip link          | PASS: at 1440×1000 and 390×844, the first Tab focused `Saltar al contenido`; Enter moved DOM focus to `main#main-content` (`document.activeElement.id === "main-content"`). |
| Focus indicator                 | PASS: links use a visible `:focus-visible` outline; the skip link becomes visible on focus.                                                                                 |
| Text alternatives               | Not applicable: this foundation shell contains no informative raster images.                                                                                                |
| Form-control labels             | Not applicable: this foundation shell contains no form controls.                                                                                                            |
| Contrast                        | Not measured: no callable axe or Lighthouse checker was verified; this report is not a WCAG conformance claim.                                                              |

The independent review found that the prior check only proved fragment navigation, not focus transfer. Playwright regression tests reproduced that failure at desktop and mobile before `tabIndex={-1}` was added to both main landmarks; all four new focus/layout cases then passed.

Direct production Playwright also found no console errors and no horizontal overflow. No high-risk violation remains within this basic checklist scope. The final independent review had no Critical or Important findings; its only Minor follow-up is guaranteed-missing-route regression coverage for the separately implemented exported 404 main at the next test update.
