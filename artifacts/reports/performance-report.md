# Performance Report

## Milestone 3 runtime observations — 2026-07-21

Status: **Static runtime observations recorded; no performance score produced.**

The optimized default and explicit-live static exports compiled successfully. The final default export packages the code-rendered header mark and original SVG/CSS bakery illustrations; it does not package or preload the 192 KB photo-bearing flyer. The 59-test browser run exercised all five customer routes, responsive states, reduced-motion behavior, and artifact capture without a console-error finding in the captured journeys. The default static preview returned HTTP 200 for every customer route.

No Lighthouse, Core Web Vitals capture, bundle analyzer, network throttling, or performance budget was run. Build and test elapsed times are not user-facing performance scores.

## Milestone 2 runtime observations — 2026-07-21

Status: **Structural observations recorded; no performance score produced.**

`npm run build` completed the optimized static export successfully. The real browser journey loaded `/`, `/menu/`, `/cart/`, and `/order/` at exact 1440×1000 and 390×844 viewports, collected zero console errors, and found no horizontal overflow in any captured state. `npm run start` served the static `out/` export, and all five customer routes returned HTTP 200.

No Lighthouse, WebPageTest, browser timing profile, Core Web Vitals measurement, bundle-size budget, network throttling, or equivalent performance audit was run. The Playwright and build durations in command output are test/build elapsed times, not user-facing performance scores.

Remaining Minor performance findings: none can be responsibly assigned without a performance-audit tool. The Next.js workspace-root inference warning is a local build-environment condition, not a measured runtime regression.

## Milestone 1 evidence (preserved)

Status: **Static runtime observations recorded — 2026-07-19**

`npm run build` produced the static `out/` export successfully, and `npm run start` served it locally. Direct Playwright opened all five routes at desktop and mobile viewports without console errors or horizontal overflow.

No Lighthouse score was produced: no callable Lighthouse or equivalent performance-audit tool was verified. These observations are not a synthetic-performance score.
