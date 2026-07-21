# Verified Capability Table

Audit date: 2026-07-21

Availability is session-specific and must be rechecked before use.

| Capability | Verified tool or skill | Available | Intended use | Fallback |
|---|---|---:|---|---|
| Browser automation and local web testing | `browser:control-in-app-browser` and installed Playwright Chromium | Yes | Navigate the running app, inspect DOM and visible states, interact with forms, and capture real screenshots | In-app Browser inspected the live desktop/mobile app; Playwright supplied deterministic journey checks and artifact capture |
| macOS application control and screenshots | `computer-use:computer-use` | Yes | Inspect non-browser app state when browser tooling cannot reach it | Browser tooling for website work |
| Local image inspection | `view_image` | Yes | Inspect supplied assets and captured screenshots | Browser or computer-use screenshots |
| Basic accessibility review | `accessibility-basic-check` | Yes, guidance | Check contrast, text alternatives, labels, keyboard flow, focus order, and semantic structure | Manual checklist plus browser accessibility tree; no callable axe or Lighthouse tool verified |
| Visual design review | `visualize:visualize`, browser screenshots, and `view_image` | Yes | Review hierarchy, spacing, responsiveness, clipping, typography, and interaction states | Apply `05_UI_UX_STANDARDS.md` manually |
| Raster image generation or editing | `imagegen` and `image_gen__imagegen` | Yes | Create or edit approved visual assets when requested | Use supplied client assets; never use generated mockups as implementation screenshots |
| MCP resource discovery | `list_mcp_resources`, `list_mcp_resource_templates`, `read_mcp_resource` | Yes | Verify configured MCP resources and plugin-provided capabilities | Direct callable tools and local skills |
| Verified MCP/plugin resources | `codex_apps`, `dataAnalyticsWidgets`, and Notion HTTP MCP metadata | Metadata only for this milestone; no Node REPL browser binding | Use only when relevant and authorized | Local deterministic tools and direct installed Playwright |
| Deployment tooling | Sites skills and callable Sites MCP tools | Yes, prohibited for now | Potential future deployment only after explicit public-deployment approval | Local static build and local preview |
| Obsidian-aware authoring | `obsidian-markdown` | Yes | Create valid frontmatter and wikilinked Phase 2 notes | Direct Markdown file operations |
| Obsidian CLI | `obsidian-cli` skill exists; `obsidian` binary not found | No | None in this environment | Direct filesystem Markdown operations with verification |
| Taste | Exact installed-skill scan | No | Not used | AI-EOS UI/UX standards and verified browser review |
| UI Pro Max | Exact installed-skill scan | No | Not used | AI-EOS UI/UX standards and verified browser review |
| Magic MCP | Exact installed-skill/MCP scan | No | Not used | Verified MCP discovery and available browser tooling |
| Impeccable | Exact installed-skill scan | No | Not used | Accessibility checklist and visual review workflow |
| Emil Kowalski-related design guidance | Exact installed-skill scan | No | Not used | Approved architecture, restrained motion, and AI-EOS standards |

## Restrictions

- No fake screenshots or generated mockups may be used as implementation evidence.
- No public deployment is authorized.
- Specialized capabilities must be re-verified in the milestone that uses them.

## Milestone 1 Superpowers record

| Skill | Verified | Used in milestone | Purpose | Result |
|---|---:|---:|---|---|
| `superpowers:using-superpowers` | Yes | Yes | Select and enforce applicable workflows | Invoked before the repository evidence pass. |
| `superpowers:writing-plans` | Yes | Yes | Create the executable Milestone 1 plan | Plan saved and self-reviewed. |
| `superpowers:using-git-worktrees` | Yes | Yes | Isolate Milestone 1 from approved `main` | Worktree created on `milestone-1-foundation`. |
| `superpowers:executing-plans` | Yes | Yes | Select the supported execution workflow | Delegated task execution with review gates. |
| `superpowers:subagent-driven-development` | Yes | Yes | Execute task work with independent review gates | Milestone tasks used the supported subagent workflow. |
| `superpowers:test-driven-development` | Yes | Yes | Drive foundation contracts, browser shell, and merge portability fixes | Foundation RED/GREEN evidence passed; the main-checkout ESLint worktree regression also failed first and passed after the minimal ignore fix. |
| `superpowers:verification-before-completion` | Yes | Yes | Require fresh full-suite evidence | Pre-merge and merged-main gates ran; install, format, lint, typecheck, 3 unit tests, 9 E2E tests, build, HTTP preview, artifacts, and Git checks passed on 2026-07-19. |
| `superpowers:requesting-code-review` | Yes | Yes | Independent specification and quality review | Final independent whole-branch review completed: Ready to merge, with no Critical or Important findings. One Minor follow-up recommends guaranteed-missing-route regression coverage for the exported 404 main. |
| `superpowers:receiving-code-review` | Yes | Yes | Evaluate and resolve confirmed review findings | Skip-link focus, evidence synchronization, and short-route footer findings were verified and fixed. |
| `superpowers:finishing-a-development-branch` | Yes | Yes | Verify and integrate the completed branch safely | The user selected local merge; `main` fast-forwarded with full history preserved. No push or deployment was performed, and cleanup remained gated on merged-main verification. |
| `codebase-orientation` | Yes | Yes | Inspect repository structure and project conventions before implementation | Existing governance, architecture, and milestone constraints were mapped into the implementation plan. |
| `git-basic-helper` | Yes | Yes | Create approved checkpoints and use safe Git operations | Milestone 0 was committed and tagged; Milestone 1 was isolated, verified, and fast-forwarded into `main` without squashing. |
| `dependency-install-helper` | Yes | Yes | Install and verify the approved frontend dependency set | The locked npm dependency graph was installed and validated with the required commands. |
| `dependency-risk-audit` | Yes | Yes | Inventory direct dependencies, licenses, and registry advisories | One moderate PostCSS advisory remains through `next@16.2.10`; see the build report for scope and mitigation. |
| `browser:control-in-app-browser` | Yes | Yes | Attempt the preferred interactive browser workflow | The skill was followed, but no callable runtime binding was exposed; installed Playwright Chromium was used as the documented fallback. |
| `accessibility-basic-check` | Yes | Yes | Perform the basic semantic and keyboard checklist | Route semantics and skip-link behavior recorded in the accessibility report. |
| `obsidian-markdown` | Yes | Yes | Maintain the approved Phase 2 knowledge base using valid Obsidian Markdown | Current State, Decisions, Session Log, and Testing were synchronized with the formal Milestone 1 approval and merge evidence. |
| `superpowers:systematic-debugging` | Yes | Yes | Investigate unexpected verification behavior before fixes | Sandbox permissions, ESLint worktree traversal, Next's generated declaration toggle, and the stale empty root `app/` precedence were traced to root causes before correction. |
| `github:yeet` | Yes | Yes | Publish the approved repository history to GitHub | Created private repository `A625A/guteli-bakery`, configured `origin`, pushed `main` and both milestone tags, and verified local/remote SHA parity. |

## Milestone 2 capability record

| Skill | Verified | Used in milestone | Purpose | Result |
|---|---:|---:|---|---|
| `superpowers:using-superpowers` | Yes | Yes | Route every meaningful task through applicable workflows | Skill selection and invocation were recorded throughout implementation, review, debugging, and verification. |
| `superpowers:brainstorming` | Yes | Yes | Convert the authorized roadmap into a cohesive product design | Produced the approved working-MVP design without reopening the already approved architecture. |
| `superpowers:writing-plans` | Yes | Yes | Create the executable Milestone 2 plan | Saved the task-by-task implementation plan and later corrected its capability-record path to canonical `CAPABILITY_TABLE.md`. |
| `superpowers:using-git-worktrees` | Yes | Yes | Isolate implementation from approved `main` | Created and verified `milestone-2-working-mvp` under the repository-owned `.worktrees/` directory. |
| `superpowers:executing-plans` | Yes | Yes | Select and govern plan execution | Reviewed the written plan and selected the supported subagent-driven workflow. |
| `superpowers:subagent-driven-development` | Yes | Yes | Implement bounded slices with independent review gates | Tasks 1–8 used fresh implementer and task-reviewer gates; confirmed findings were fixed before progression. |
| `superpowers:test-driven-development` | Yes | Yes | Drive domain, UI, and review-fix behavior through RED/GREEN | Fail-first coverage proved cart, order, navigation, stale-handoff, hydration, and Guatemala-midnight behavior before minimal fixes. |
| `superpowers:systematic-debugging` | Yes | Yes | Diagnose unexpected verification and interaction failures | Traced sandbox port denial, artifact locator state, pre-hydration cart loss, and review regressions to their root causes before fixes. |
| `superpowers:receiving-code-review` | Yes | Yes | Evaluate external findings against the actual codebase | Verified four Important findings; three behavior defects received focused RED/GREEN fixes and the evidence records were reconciled. |
| `superpowers:verification-before-completion` | Yes | Yes | Require fresh evidence before completion claims | Final gate passed install, formatting, lint, typecheck, 27 unit tests, 49 browser tests, static build, and HTTP 200 on all five customer routes. |
| `superpowers:requesting-code-review` | Yes | Yes | Obtain independent whole-branch assessment | Initial review found four Important issues; the follow-up review confirmed every blocker resolved, with no Critical or Important finding remaining. |
| `superpowers:finishing-a-development-branch` | Yes | Yes | Integrate the formally approved branch | Option 1 fast-forwarded `main` with all 15 Milestone 2 commits preserved; merged-main verification and private GitHub SHA parity passed before clean worktree/branch cleanup. |
| `codebase-orientation` | Yes | Yes | Map the approved foundation before implementation | Confirmed repository layout, scripts, governance, artifact conventions, and existing route shell before changes. |
| `browser:control-in-app-browser` | Yes | Yes | Inspect the live app at real desktop and mobile viewports | Navigated the localhost app, inspected DOM and screenshots, and reset the viewport; deterministic capture remained in Playwright. |
| `accessibility-basic-check` | Yes | Yes | Apply the proportional accessibility checklist | Guided semantic, label, focus, keyboard, target-size, overflow, and contrast-evidence checks recorded in the accessibility report. |
| `obsidian-markdown` | Yes | Yes | Maintain the authorized Phase 2 project memory | Preserved frontmatter and wikilinks while synchronizing Current State, Decisions, Testing, and Session Log. |

## Milestone 3 capability record

| Skill | Verified | Used in milestone | Purpose | Result |
|---|---:|---:|---|---|
| `superpowers:using-superpowers` | Yes | Yes | Route meaningful Milestone 3 tasks through applicable workflows | Selected and sequenced brainstorming, planning, isolated-worktree, implementation, review, and verification workflows before production changes. |
| `superpowers:brainstorming` | Yes | Yes | Define a focused portfolio-polish direction without reopening the approved architecture | Audited the working MVP and evidence, confirmed the user-selected graphic-only direction, and committed the self-reviewed design specification as `b466f3d`. |
| `superpowers:writing-plans` | Yes | Yes | Convert the approved direction into an executable implementation plan | Created the task-by-task Milestone 3 plan with fail-first behavior checks, exact file boundaries, evidence capture, and a clean coverage/placeholder/type self-review. |
| `superpowers:using-git-worktrees` | Yes | Yes | Isolate Milestone 3 from the approved `main` baseline | Created branch `milestone-3-portfolio-polish` in ignored worktree `.worktrees/milestone-3-portfolio-polish`; `main` remained unchanged. |
| `superpowers:executing-plans` | Yes | Yes | Execute the committed Milestone 3 plan inline with task verification gates | Reviewed the committed plan for blocking concerns, selected inline execution under the collaboration constraints, and started task-by-task execution in the isolated worktree. |
| `superpowers:test-driven-development` | Yes | Yes | Drive new configuration and observable interaction behavior fail-first | RED/GREEN checks covered the config resolver, demo banner and unsafe links, reduced motion, graphic-only homepage, menu artwork slots, selected fulfillment, contact fallback, clipboard success, reviewer-reported destination authorization, and flyer-bundle removal. The final unit and browser gates pass. |
| `superpowers:systematic-debugging` | Yes | Yes | Diagnose unexpected local tool, browser, and evidence failures before changing code | Traced dependency resolution, sandbox port denial, clipboard permissions, concurrent Next dev-server locking, and the 56px artifact scroll race to root causes. Minimal environment/test-harness corrections passed focused and complete reruns. |
| `superpowers:requesting-code-review` | Yes | Yes | Obtain independent whole-branch and focused follow-up assessments | Initial review found three Important issues. After commit `7c78b70`, focused re-review found no Critical or Important issue and returned Ready for visual approval; its one Minor final-gate documentation omission was corrected. |
| `superpowers:receiving-code-review` | Yes | Yes | Verify reviewer findings against the approved policy and actual code before changes | Confirmed the flyer bundle, destination-identity mismatch, and stale browser assertion; implemented each correction with focused evidence and recorded the follow-up verdict. |
| `superpowers:verification-before-completion` | Yes | Yes | Require fresh commands and runtime evidence before completion claims | Verified install, formatting, lint, typecheck, 40 unit tests, 59 default Chromium tests, one live test, one unavailable test, default/live static builds, restored-default bundle policy, 10 screenshots, and HTTP 200 on all five customer routes. |
| `superpowers:finishing-a-development-branch` | Yes | Yes | Preserve the verified candidate at the user’s visual-approval gate | Detected the named repository-owned worktree and `main` base. The branch and worktree are retained; no merge, push, tag, cleanup, or deployment is performed before approval. |
| `accessibility-basic-check` | Yes | Yes | Apply the proportional accessibility workflow to the changed customer UI | Checked text alternatives, keyboard/focus behavior, form labels/errors, target sizes, reduced motion, overflow, and key token contrast pairs. No high-risk issue was found; no WCAG conformance claim is made. |
| `obsidian-markdown` | Yes | Yes | Synchronize authorized Phase 2 project memory without breaking Obsidian structure | Updated Current State, Decisions, Session Log, Testing, and project home while preserving frontmatter, callouts, and existing wikilinks. |

## Milestone 4 capability record

| Skill or capability                          | Verified | Used in milestone | Purpose                                                                                                       | Result                                                                                                                                                                                       |
| -------------------------------------------- | -------: | ----------------: | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `superpowers:using-superpowers`              |      Yes |               Yes | Route Milestone 4 through the applicable design, planning, implementation, review, and verification workflows | Selected and sequenced the required workflows before implementation and at each gate.                                                                                                        |
| `superpowers:brainstorming`                  |      Yes |               Yes | Refine the approved brand direction without reopening architecture or business scope                          | Produced the authorized official-logo, exact-slogan, lean-chrome, and canasta-language design.                                                                                               |
| `superpowers:using-git-worktrees`            |      Yes |               Yes | Isolate Milestone 4 from approved `main`                                                                      | Created and verified `milestone-4-brand-refinement` in the repository-owned worktree.                                                                                                        |
| `superpowers:writing-plans`                  |      Yes |               Yes | Convert the authorized design into bounded implementation tasks                                               | Created the executable five-task Milestone 4 plan with evidence and stop gates.                                                                                                              |
| `superpowers:executing-plans`                |      Yes |               Yes | Review the plan and select the supported execution mode                                                       | Reviewed the plan and selected same-session subagent-driven development.                                                                                                                     |
| `superpowers:subagent-driven-development`    |      Yes |               Yes | Execute bounded tasks with independent task review                                                            | Tasks 1–5 were dispatched with scoped briefs, implementation reports, review feedback, and controller verification.                                                                          |
| `superpowers:test-driven-development`        |      Yes |               Yes | Prove logo, copy, canasta, artifact, and review-fix behavior through RED/GREEN                                | Focused failures preceded the minimal implementation and the unofficial-wordmark correction; final focused and complete suites pass.                                                         |
| `superpowers:systematic-debugging`           |      Yes |               Yes | Diagnose verification failures before changing product code                                                   | Identified sandbox loopback-port denial as an environment constraint and separated it from real browser RED evidence.                                                                        |
| `superpowers:requesting-code-review`         |      Yes |               Yes | Obtain independent whole-branch review                                                                        | Initial review found one Important unofficial hero wordmark; follow-up found no Critical, Important, or Minor finding and returned Ready for visual approval.                                |
| `superpowers:receiving-code-review`          |      Yes |               Yes | Validate and resolve the confirmed review finding                                                             | Verified the duplicate simplified identity, removed it with RED/GREEN coverage in `7e33af8`, and refreshed only the affected homepage evidence.                                              |
| `superpowers:verification-before-completion` |      Yes |               Yes | Require fresh final evidence after the review fix                                                             | Final controller gate passed install, formatting, lint, typecheck, 40 unit tests, 60 default browser tests, live/unavailable tests, build, preview, export inspection, and artifact checks.  |
| `superpowers:finishing-a-development-branch` |      Yes |               Yes | Preserve the completed candidate at the user’s visual-approval gate                                           | Reverified 40 unit tests, detected the named repository-owned worktree and `main` base, and selected the authorized keep-as-is outcome. No merge, push, tag, cleanup, or deployment occurred. |
| `accessibility-basic-check`                  |      Yes |               Yes | Review the changed official-logo, basket, copy, focus, target, motion, and responsive behavior                | Official logos have text alternatives and a labelled home link; basket SVGs are decorative; checked text token pairs remain at least 5.11:1; browser coverage passed. No WCAG claim is made. |
| `obsidian-markdown`                          |      Yes |               Yes | Synchronize the four authorized external Phase 2 records                                                      | Preserved frontmatter and wikilinks while updating Current State, Decisions, Testing, and Session Log.                                                                                       |
| Local image inspection with `view_image`     |      Yes |               Yes | Inspect the supplied logo source/crop and the required runtime screenshots at original resolution             | Confirmed logo fidelity and no overflow, clipping, distortion, excessive density, or product photography in the required evidence.                                                           |

Playwright Chromium was used directly for deterministic browser behavior and evidence capture. The in-app Browser skill was not invoked in Milestone 4. The branch-finishing workflow selected its keep-as-is outcome because the visual-approval gate explicitly requires the branch and worktree to remain available without integration.
