# Güteli Logo-Led Brand Pass Design

Date: 2026-07-21
Status: Authorized refinement of the existing Milestone 4 visual candidate

## Goal

Make the customer interface feel unmistakably Güteli-led without repeating the same logo mechanically. The official logo becomes the dominant hero anchor, while selected secondary moments use an exact symbol crop, packaging labels, line motifs, and restrained bakery-specific accents. Business behavior, static export, accessibility, routes, and demo-safe handoff remain unchanged.

## Approaches considered

1. **Full-logo packaging panel with restrained symbol seals — selected.** The hero becomes a premium label-like panel led by the complete official logo. A lossless original-symbol crop appears only in a few supporting contexts. This gives the strongest recognition while preserving hierarchy.
2. **Symbol-led abstract hero.** This would refine the existing heart composition but still make the heart symbol, rather than the complete Güteli identity, the dominant visual. It does not fully satisfy the requested change.
3. **Repeated full-logo labels.** Full logos on many cards would maximize recognition but create flyer-like repetition and weaken the portfolio presentation. This is rejected.

## Logo assets and integrity

- Continue using `public/brand/guteli-logo-original.jpeg`, the verified lossless crop of the supplied source, for every full-logo placement.
- Create `public/brand/guteli-symbol-original.jpeg` only as a lossless crop from the verified logo asset. It must retain the original orange symbol, proportions, pixels, and dark field.
- Do not redraw, trace, recolor, sharpen, simplify, stretch, or add wording inside either asset.
- Full-logo placements remain limited to the header, hero, and footer.
- Symbol-only placements are decorative supporting marks, not alternate logos. They use empty alternative text when adjacent text already names the brand or section.

## Hero composition

- Remove the large standalone bakery-heart illustration from the hero.
- Replace it with a responsive dark packaging-style panel whose main element is the complete official logo at a materially larger scale than the header/footer versions.
- Support the logo with thin label rules, a small `Panadería por encargo · Guatemala` stamp, category copy, and subtle CSS line motifs. These elements remain outside the logo image.
- Keep the descriptive headline, exact approved slogan, ordering explanation, and both calls to action in the existing readable content column.
- The exact slogan remains customer-facing text and is never composited into the logo asset.

## Secondary brand moments

- Add one reusable decorative original-symbol seal component.
- Use it selectively in the menu introduction, empty Canasta state, order summary, and contact panel. Each route should have at most one secondary symbol seal in main content.
- Reduce basket dominance by replacing the empty-Canasta basket illustration with the Güteli symbol seal. Keep the familiar basket icon in the navigation where it communicates cart function.
- Refine category headers with packaging-style rules and tags rather than inserting another full logo.
- Add subtle stamp/label treatments to summary and contact surfaces without changing their wording or actions.

## Accessibility and responsiveness

- The hero full logo uses the accessible name `Güteli Bakery` and preserves its intrinsic aspect ratio.
- Decorative symbol seals use `alt=""` and cannot enter the accessibility tree as redundant brand announcements.
- No meaningful text is embedded in new decorative CSS motifs.
- Existing focus, keyboard, reduced-motion, target-size, and semantic structures remain intact.
- The hero panel and secondary seals must fit at 320px through desktop widths without clipping or horizontal overflow.

## Testing and evidence

- Start with a browser contract that fails against the current candidate: the hero must contain the official logo and no `.bakery-illustration`.
- Assert the logo/slogan remain separate and the hero logo stays proportional.
- Add focused assertions for tasteful secondary placement and the branded empty Canasta state without altering cart behavior.
- Preserve the complete order journey, copy fallback, demo fail-closed checks, all routes, and existing unit coverage.
- Capture a new, separately named refinement evidence set rather than overwriting the previously approved-candidate chronology: desktop/mobile homepages, hero panels, footer, cart state, and representative secondary brand moments.

## Stop gate

Keep `milestone-4-brand-refinement` and its worktree. Do not merge, tag, push, deploy, or remove the worktree. Present the refreshed local candidate for explicit visual approval.
