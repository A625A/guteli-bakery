# Accessibility Report

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
