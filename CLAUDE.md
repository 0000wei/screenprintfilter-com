# ScreenPrintFilter — CLAUDE.md

## Project Overview

A single-page HTML application for transforming images into halftone dot patterns for screen printing. Runs entirely client-side in the browser with Canvas API — no upload required.

Live at: https://screenprintfilter.online/

## Key Features

- Real-time halftone dot filter with adjustable dot size, spacing, contrast, and angle
- Multiple dot shapes (round, diamond, line, square)
- Color separation support (CMYK channel preview)
- Canvas-based image processing (no server upload)
- Dark/light theme toggle
- Multilingual landing pages (EN, ZH, JA, DE, FR, ES, PT, AR)

## Commands

```sh
# Development server
node server.js              # HTTP server on port 3000

# Tests
node scripts/test_comprehensive.js    # Full user-flow test
node scripts/test_quick.js            # Quick smoke test
node scripts/run-systematic-tests.mjs # Systematic test suite

# Benchmarks
node scripts/perf-benchmark-puppeteer.mjs
node scripts/perf-benchmark.js
```

## Document Structure

- `docs/product-specs/` — User-facing behavior specs (the single source of truth for features)
- `docs/design-docs/` — Architecture decisions and design rationale
- `docs/exec-plans/active/` — Current execution plans
- `docs/exec-plans/completed/` — Archived completed plans
- `docs/generated/` — Auto-generated artifacts (schema, etc.)

## Architecture

- **Single-file SPA**: All HTML, CSS, and JS in `index.html`
- **Canvas 2D API**: Halftone rendering pipeline in browser
- **Node.js server** (`server.js`): Dev HTTP server with MIME type support
- **MCP Server** (`mcp-server/`): Local Node Canvas halftone via MCP protocol
- **No build step**: Pure vanilla JS, no framework

## Key Patterns

- No build tools — pure HTML/CSS/JS single file
- Canvas rendering pipeline: Image → Grayscale → Halftone grid → Dot rendering
- Performance-sensitive: worker-like chunked rendering for responsive sliders
- Multilingual: localized `guides/` and per-language index pages
- SEO-first: sitemap.xml, robots.txt, canonical URLs, hreflang tags, Open Graph
