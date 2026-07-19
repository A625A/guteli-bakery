# Exact Proposed Frontend File Structure

Status: approved architecture, pending Milestone 1 initialization.

This is the exact target structure proposed for the Phase 1 demo. Milestone 0 files already exist; frontend, test, and runtime configuration files remain proposals and must not be created before Milestone 1 approval.

```text
Guteli Bakery/
├── AI/
│   ├── AI-EOS/
│   │   ├── 00_START_HERE.md
│   │   ├── 01_PROJECT_CONTEXT.md
│   │   ├── 02_BUSINESS_CONTEXT.md
│   │   ├── 03_MASTER_RULES.md
│   │   ├── 04_ARCHITECTURE_STANDARDS.md
│   │   ├── 05_UI_UX_STANDARDS.md
│   │   ├── 06_CODING_STANDARDS.md
│   │   ├── 07_DOCUMENTATION_RULES.md
│   │   ├── 08_TESTING_RULES.md
│   │   ├── 09_GIT_WORKFLOW.md
│   │   ├── 10_PROJECT_MEMORY.md
│   │   ├── 11_SKILLS_POLICY.md
│   │   ├── 12_MCP_POLICY.md
│   │   ├── 13_SECURITY.md
│   │   ├── 14_PERFORMANCE.md
│   │   ├── 15_ACCESSIBILITY.md
│   │   ├── 16_DEPLOYMENT.md
│   │   ├── 17_CODE_REVIEW.md
│   │   ├── 18_FUTURE_PHASES.md
│   │   ├── 19_DECISION_LOG.md
│   │   ├── AI-EOS_Bootstrap_Prompt.md
│   │   ├── CAPABILITY_TABLE.md
│   │   └── CURRENT_TASK.md
│   └── MASTER_PROMPT.md
├── artifacts/
│   ├── previews/
│   │   └── preview-information.md
│   ├── release/
│   │   └── release-summary.md
│   ├── reports/
│   │   ├── accessibility-report.md
│   │   ├── build-report.md
│   │   ├── performance-report.md
│   │   ├── test-report.md
│   │   └── visual-review.md
│   ├── screenshots/
│   │   ├── desktop/
│   │   │   └── README.md
│   │   ├── interaction-states/
│   │   │   └── README.md
│   │   └── mobile/
│   │       └── README.md
│   └── README.md
├── assets/
│   └── reference/
│       ├── README.md
│       └── guteli-brand-reference.jpeg
├── docs/
│   ├── MILESTONES.md
│   └── PROPOSED_FILE_STRUCTURE.md
├── public/
│   └── images/
│       └── brand/
│           └── guteli-brand-reference.jpeg
├── src/
│   ├── app/
│   │   ├── cart/
│   │   │   └── page.tsx
│   │   ├── contact/
│   │   │   └── page.tsx
│   │   ├── menu/
│   │   │   └── page.tsx
│   │   ├── order/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── not-found.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── brand/
│   │   │   ├── BrandMark.tsx
│   │   │   ├── SiteFooter.tsx
│   │   │   └── SiteHeader.tsx
│   │   ├── cart/
│   │   │   ├── CartButton.tsx
│   │   │   ├── CartLineItem.tsx
│   │   │   ├── CartProvider.tsx
│   │   │   ├── CartSummary.tsx
│   │   │   └── EmptyCart.tsx
│   │   ├── menu/
│   │   │   ├── MenuSection.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   └── ProductQuantityNote.tsx
│   │   ├── order/
│   │   │   ├── CopySummaryButton.tsx
│   │   │   ├── OrderForm.tsx
│   │   │   ├── OrderSummary.tsx
│   │   │   └── WhatsAppHandoff.tsx
│   │   └── shared/
│   │       ├── Button.tsx
│   │       └── FormField.tsx
│   ├── content/
│   │   ├── business.ts
│   │   └── menu.ts
│   ├── domain/
│   │   ├── cart.ts
│   │   └── order.ts
│   ├── lib/
│   │   ├── dates.ts
│   │   ├── money.ts
│   │   ├── order-summary.ts
│   │   ├── storage.ts
│   │   └── whatsapp.ts
│   ├── styles/
│   │   └── tokens.css
│   └── test/
│       └── setup.ts
├── tests/
│   ├── browser/
│   │   ├── keyboard-navigation.spec.ts
│   │   ├── order-journey.spec.ts
│   │   └── responsive-layout.spec.ts
│   ├── component/
│   │   ├── cart.test.tsx
│   │   ├── menu.test.tsx
│   │   ├── order-form.test.tsx
│   │   └── order-summary.test.tsx
│   └── unit/
│       ├── cart.test.ts
│       ├── dates.test.ts
│       ├── money.test.ts
│       ├── order-summary.test.ts
│       ├── storage.test.ts
│       └── whatsapp.test.ts
├── .gitignore
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── playwright.config.ts
├── prettier.config.mjs
├── README.md
├── tsconfig.json
└── vitest.config.ts
```

## Boundary rules

- `src/content/menu.ts` is the single menu source; unconfirmed quantities remain optional fields.
- `src/domain` contains framework-independent cart and order types.
- `src/lib` contains pure formatting, validation, summary, browser-storage, and WhatsApp URL functions.
- Browser state may persist cart lines, but must not persist customer personal information.
- `public/images/brand/guteli-brand-reference.jpeg` is the only proposed runtime image until additional product assets are supplied and approved.
- The Phase 1 frontend has no server endpoint, database, payment integration, CMS, analytics account, admin portal, authentication, inventory system, API bot, or multi-tenant layer.
- The external Obsidian vault is documentation only and is never imported by the application.
