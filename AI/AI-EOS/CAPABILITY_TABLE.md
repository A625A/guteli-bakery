# Verified Capability Table

Audit date: 2026-07-19

Availability is session-specific and must be rechecked before use.

| Capability | Verified tool or skill | Available | Intended use | Fallback |
|---|---|---:|---|---|
| Browser automation and local web testing | `browser:control-in-app-browser` was invoked; no callable runtime browser binding was exposed in this milestone | Skill verified; runtime binding unavailable | Navigate the running app, inspect DOM and visible states, interact with forms, and capture real screenshots | Installed Playwright Chromium was directly verified against the local app and used for runtime checks and screenshots |
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
| `superpowers:test-driven-development` | Yes | Yes | Drive foundation contracts and browser shell | RED and GREEN evidence recorded for the foundation. |
| `superpowers:verification-before-completion` | Yes | No | Require fresh full-suite evidence | Scheduled for Task 5. |
| `superpowers:requesting-code-review` | Yes | No | Independent specification and quality review | Scheduled for Task 5. |
| `accessibility-basic-check` | Yes | Yes | Perform the basic semantic and keyboard checklist | Route semantics and skip-link behavior recorded in the accessibility report. |
| `superpowers:systematic-debugging` | Yes | Yes | Investigate unexpected local runtime failures before retrying | Sandbox loopback and Chromium permissions were traced before escalated local verification. |
