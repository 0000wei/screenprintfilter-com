# Free Prepress Tool Kit — SPEC

## Overview

Create a set of 3 free, browser-based prepress tools as independent HTML pages. These tools serve as SEO-friendly landing pages and utility tools for screen printing / DTF / garment decoration professionals. Zero server dependency — all computation runs client-side.

## File Structure

```
tools/
├── index.html                    ← Tool kit landing page (list + links)
├── dpi-calculator.html           ← DPI / pixel / print size calculator
├── gang-sheet-calculator.html    ← Gang sheet layout optimizer
└── halftone-lpi-previewer.html   ← Halftone LPI simulation previewer
```

## Shared Conventions (ALL tools)

Each tool page must follow this template:

### HTML Structure
- `<!DOCTYPE html>` with `<html lang="en">`
- `<head>`: charset, viewport, title, description, robots, canonical, OG tags, favicon, Google Analytics (G-H72N80TEBW), AI discovery links (`llms.txt`, `mcp.txt`, `ai-plugin.json`)
- `<style>`: inline CSS using the same CSS custom properties as `index.html` (`--bg-primary`, `--bg-secondary`, `--text-primary`, `--accent`, `--border`, `--radius`, etc.)
- Dark mode: same `[data-theme="dark"]` override pattern + inline theme toggle script
- `<body>`: header (logo linking to `/`), main content, footer (Privacy Policy link + "Back to Halftone Tool")
- Closing `</body></html>`

### CSS Variables
Must include these from `index.html:162-178`:
```css
:root {
  --bg-primary: #ffffff; --bg-secondary: #f3f4f6; --bg-tertiary: #e5e7eb;
  --text-primary: #1f2937; --text-secondary: #6b7280; --text-disabled: #9ca3af;
  --accent: #FF4500; --accent-hover: #FF5722;
  --border: #e5e7eb; --radius: 8px;
  --shadow: 0 4px 12px rgba(0,0,0,0.1); --shadow-lg: 0 12px 40px rgba(0,0,0,0.15);
  --transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
}
```
Plus dark overrides matching `index.html`.

### Theme Toggle Script (inline, before `</body>`)
```html
<script>
(function(){var btn=document.getElementById('themeToggle');if(!btn)return;
var t=localStorage.getItem('spf_theme');
if(t){document.documentElement.setAttribute('data-theme',t);}
else if(window.matchMedia('(prefers-color-scheme: dark)').matches){
document.documentElement.setAttribute('data-theme','dark');localStorage.setItem('spf_theme','dark');}
btn.onclick=function(){var cur=document.documentElement.getAttribute('data-theme');
var next=cur==='dark'?'':'dark';
document.documentElement.setAttribute('data-theme',next);
localStorage.setItem('spf_theme',next||'light');};})();
</script>
```

### Footer
```
<footer><p><a href="/privacy-policy.html">Privacy Policy</a> | <a href="/">← Back to Halftone Tool</a></p></footer>
```

---

## Tool 1: DPI Calculator — `tools/dpi-calculator.html`

### Purpose
Allow users to input image pixel dimensions and target print size (inches/cm), and instantly see the resulting DPI, or vice versa.

### UI Layout
1. **Section 1: Image → Print** (compute DPI)
   - Input: Image width (px), Image height (px)
   - Input: Target print width (inches), Target print height (inches)
   - Output: Calculated DPI (both X and Y), Print quality rating ("Excellent ≥300", "Good ≥200", "Fair ≥150", "Poor <150")
   
2. **Section 2: Print → Image** (compute required pixels)
   - Input: Target print width (inches), Target print height (inches)
   - Input: Target DPI (default 300)
   - Output: Required pixel dimensions (W×H)

3. **Section 3: Common format presets**
   - Buttons: A4 (210×297mm), A3 (297×420mm), Letter (8.5×11"), 12×18", 18×24", 24×36"
   - Clicking fills Section 2 inputs

### JS Logic
- Pure arithmetic: `dpi = pixels / inches`
- No image loading, no Canvas dependency
- Real-time update on any input change (input event)
- All inputs: type=number, min=1

### Acceptance Criteria
- [ ] DPI calculation correct to 1 decimal place
- [ ] Quality rating thresholds match spec
- [ ] Common format buttons fill correct dimensions
- [ ] Dark mode toggle works
- [ ] Tool loads in <1s (no external deps)
- [ ] Canonical URL: `https://screenprintfilter.online/tools/dpi-calculator.html`

---

## Tool 2: Gang Sheet Calculator — `tools/gang-sheet-calculator.html`

### Purpose
Help DTF printers and garment decorators calculate how many designs fit on a sheet of transfer paper or film roll.

### UI Layout
1. **Panel 1: Sheet size**
   - Width (inches, default 13), Height (inches, default 19) — common DTF sheet
   
2. **Panel 2: Design size**
   - Width (inches), Height (inches)
   - Quantity needed

3. **Panel 3: Margin / spacing**
   - Margin around each design (inches, default 0.25)
   - Gap between designs (inches, default 0.25)

4. **Output**
   - "Fits N per sheet — need M sheets total"
   - Visual grid preview: an SVG/canvas showing the layout with labels
   - Utilization percentage: "Sheet used: XX%"

### JS Logic
- Greedy row-based packing algorithm (simple, no bin-packing complexity)
- `fitsPerRow = floor((sheetWidth - 2*margin + gap) / (designWidth + gap))`
- `rowsPerSheet = floor((sheetHeight - 2*margin + gap) / (designHeight + gap))`
- `perSheet = fitsPerRow * rowsPerSheet`
- `sheetsNeeded = ceil(quantity / perSheet)`
- Visual preview: draw rectangles with SVG or Canvas

### Acceptance Criteria
- [ ] Packing count matches manual calculation for standard sizes
- [ ] Visual preview renders correctly
- [ ] Edge: design larger than sheet → shows 0 per sheet with warning
- [ ] Dark mode toggle works
- [ ] Canonical URL: `https://screenprintfilter.online/tools/gang-sheet-calculator.html`

---

## Tool 3: Halftone LPI Previewer — `tools/halftone-lpi-previewer.html`

### Purpose
Show users how different LPI (Lines Per Inch) values affect the halftone appearance at different viewing distances. This is an educational/interactive tool, not a production converter.

### UI Layout
1. **Upload area**: Load a sample image (same drag-drop pattern as main tool)
2. **LPI slider**: 20-120 LPI, default 45
3. **Dot shape**: circle / square / diamond / line
4. **Preview**: Render a representative crop (max 400×400px) at the selected LPI, side-by-side with original
5. **Reference text**: "35-55 LPI: T-shirt / garment printing | 55-85 LPI: Paper / poster | 85+ LPI: Fine art / high-detail"

### JS Logic
- Reuses the core `precomputeBrightness()` + `drawShape()` + halftone rendering algorithm from `index.html`
- LPI to dotSize mapping: at 72 DPI screen resolution, `dotSize = 72 / LPI * (1/spacing)`
  - 45 LPI → ~1.6px dot at 1.0 spacing (tight)
  - 35 LPI → ~2.0px dot
  - 55 LPI → ~1.3px dot
  - 120 LPI → ~0.6px dot (fine detail)
- Crop center 400×400 region from loaded image for fast rendering
- Single synchronous render pass (no RAF/debounce needed at this size)

### Acceptance Criteria
- [ ] LPI slider produces visually distinct results at extreme values (20 vs 120)
- [ ] Side-by-side comparison renders in <500ms for 400×400 crop
- [ ] Dot shape selector changes dot geometry
- [ ] Uses existing algorithm (precomputeBrightness + drawShape) — code reuse
- [ ] Dark mode toggle works
- [ ] Canonical URL: `https://screenprintfilter.online/tools/halftone-lpi-previewer.html`

---

## Tool Index Page — `tools/index.html`

### Purpose
Landing page listing all free tools with descriptions, for SEO and as a navigation hub.

### Content
- H1: "Free Screen Printing & Prepress Tools"
- Description meta tag: "Free online tools for screen printing, DTF, and garment decoration. DPI calculator, gang sheet optimizer, halftone LPI previewer."
- Grid/list of tool cards, each with:
  - Tool name
  - 1-line description
  - Link to tool
- Footer linking back to `/`

---

## Main Site Navigation Update

In `index.html`, add a "Tools" link to the `<nav>` section (line ~1059):

```html
<nav>
    <a href="/tools/">Tools</a>
    <a href="#examples">Examples</a>
    <a href="#faq">FAQ</a>
</nav>
```

**Must**: Place "Tools" FIRST in nav (before Examples and FAQ) to establish the tool ecosystem positioning.

Also update all 7 language versions (zh, ja, de, fr, es, pt, ar) of `index.html` with the same nav change.

---

## Implementation Order

1. `tools/dpi-calculator.html` (simplest, pure math)
2. `tools/gang-sheet-calculator.html` (medium, algorithm + visual)
3. `tools/halftone-lpi-previewer.html` (hardest, reuses Canvas algorithm)
4. `tools/index.html` (tool listing)
5. Nav updates across all 8 language versions
6. Update `docs/product-specs/index.md` to reference this spec

## Files to Modify

- `index.html` — nav link
- `zh/index.html`, `ja/index.html`, `de/index.html`, `fr/index.html`, `es/index.html`, `pt/index.html`, `ar/index.html` — nav link
- `docs/product-specs/index.md` — add reference

## Files to Create

- `tools/index.html`
- `tools/dpi-calculator.html`
- `tools/gang-sheet-calculator.html`
- `tools/halftone-lpi-previewer.html`
