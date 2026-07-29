# AGENTS.md — ScreenPrintFilter

This file is the entry point for AI agents working with this repository.

## Quick Navigation

| Topic | Document |
|-------|----------|
| Project Overview | `CLAUDE.md` |
| Design Decisions | `docs/design-docs/index.md` |
| Product Specs | `docs/product-specs/index.md` |
| Active Plans | `docs/exec-plans/active/index.md` |
| Completed Work | `docs/exec-plans/completed/index.md` |
| Tech Debt | `docs/exec-plans/tech-debt-tracker.md` |
| Generated Artifacts | `docs/generated/index.md` |

## Repository Structure

```
screenprintfilter/
├── AGENTS.md             ← You are here (entry point)
├── CLAUDE.md             ← Project overview + commands
├── index.html            ← Main single-page application
├── server.js             ← Dev HTTP server
├── scripts/              ← Test + benchmark scripts
├── docs/                 ← All documentation (specs, plans, designs)
├── guides/               ← Multilingual usage guides
├── images/               ← Static images (favicons, OG)
├── .well-known/          ← AI plugin metadata
├── sitemap.xml           ← SEO
├── robots.txt            ← SEO
├── privacy-policy.html   ← Compliance
├── zh/ ja/ de/ fr/ es/ pt/ ar/  ← Localized landing pages
└── mcp-server/           ← Local MCP Server (Node Canvas)
```

## Workflow Rules

1. Always read `docs/design-docs/core-beliefs.md` before making design decisions.
2. Spec changes MUST update the corresponding spec in `docs/product-specs/`.
3. Move completed execution plans to `docs/exec-plans/completed/`.
4. Tech debt must be tracked in `docs/exec-plans/tech-debt-tracker.md`.
5. Regenerate `docs/generated/` artifacts when the source changes.
6. Clean up root-level files — scripts go to `scripts/`, specs go to `docs/`.
