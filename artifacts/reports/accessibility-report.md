# Accessibility Report

Status: **Basic checklist PASS — 2026-07-19**

| Check                           | Result                                                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language and landmark semantics | PASS: all verified routes expose `lang="es-GT"`, a named `Principal` navigation landmark, one page heading, and `main#main-content`.                                                  |
| Keyboard and skip link          | PASS: the first Tab on the mobile root route visibly focused `Saltar al contenido` at 12px from the viewport top; Enter set the URL fragment to `#main-content`, whose target exists. |
| Focus indicator                 | PASS: links use a visible `:focus-visible` outline; the skip link becomes visible on focus.                                                                                           |
| Text alternatives               | Not applicable: this foundation shell contains no informative raster images.                                                                                                          |
| Form-control labels             | Not applicable: this foundation shell contains no form controls.                                                                                                                      |
| Contrast                        | Not measured: no callable axe or Lighthouse checker was verified; this report is not a WCAG conformance claim.                                                                        |

Direct production Playwright also found no console errors and no horizontal overflow on the five routes at 1440×1000 and 390×844. No high-risk issue was found in this basic scope.
