# LPI Preset Mode & Split View — SPEC

## Overview

Add two user-facing enhancements to the main `index.html` halftone tool:

1. **LPI Preset Mode**: Replace the raw `dotSize`/`spacing` sliders with a combined LPI (Lines Per Inch) control, plus expose the underlying sliders for advanced users. This makes the tool more accessible to screen printers who think in LPI rather than pixel values.
2. **Split View Comparison**: Add a side-by-side or overlay comparison between the original image and the halftone result, so users can instantly evaluate the effect.

---

## Part 1: LPI Preset Mode

### Current Behavior
The toolbar has two separate controls:
- `dotSize` slider (2-30, default 4) — maximum dot diameter in pixels
- `spacing` slider (1.0-2.0, default 1.0) — dot spacing multiplier

### Required Behavior
Add a "Mode" toggle to the Dot group:

```
[Metric: ○ Dot Size ● LPI]
```

When in **LPI Mode**:
- A single `LPI` slider appears (range 20-120, default 45)
- `dotSize` and `spacing` sliders are hidden (but their values are derived from LPI)
- The LPI value maps to dotSize+spacing via the formula:
  - Assumes 72 DPI screen resolution (standard CSS pixel density)
  - `dotSize = Math.round((72 / LPI) * 2)` (×2 factor because dotSize is max diameter in pixels, and at minimum spacing 1.0, dot should fill roughly half the cell area for mid-gray)
  - `spacing = 1.0` (fixed at tight spacing for LPI mode)
  - Example: 45 LPI → dotSize=3, spacing=1.0
  - Example: 35 LPI → dotSize=4, spacing=1.0  
  - Example: 55 LPI → dotSize=2, spacing=1.0
  - Example: 20 LPI → dotSize=7, spacing=1.0
  - Example: 120 LPI → dotSize=1, spacing=1.0

When in **Dot Size Mode**:
- Existing `dotSize` + `spacing` sliders are visible
- LPI slider is hidden
- This is the default mode (backward compatible)

### UI Details
- Toggle: two `btn-sm` buttons styled as a segmented control (one active at a time)
- LPI slider: `<input type="range" min="20" max="120" step="1" value="45">`
- Reference text below the slider: "35-55 LPI: Garment | 55-85: Paper | 85+: Fine art"
- When toggling from LPI to Dot mode, the current derived dotSize/spacing values carry over to the sliders
- When toggling from Dot to LPI mode, compute approximate LPI: `lpi = Math.round(72 / (dotSize * spacing * 0.5))`, clamped to 20-120

### Value Displays
- LPI mode: show "45 LPI" next to the slider
- Dot mode: existing "4px" and "1.0x" displays remain

### Acceptance Criteria
- [ ] LPI mode produces visually similar results to manually tuned dotSize/spacing at equivalent values
- [ ] Toggle between modes preserves current render (no reset)
- [ ] LPI reference text correctly labels ranges
- [ ] Undo/redo captures the mode state (LPI vs Dot) and the active LPI value
- [ ] All 8 language versions updated

---

## Part 2: Split View Comparison

### Current Behavior
The canvas shows the halftone result. To compare with the original, the user must toggle "Original Colors" or use the magnifier.

### Required Behavior
Add a "Split View" toggle button next to the zoom controls. When activated, the canvas splits into two views:

**Mode A — Side-by-Side (default)**
- Left half: original image (as loaded, before halftone)
- Right half: halftone result (current rendering)
- A vertical divider line at the midpoint with a drag handle

**Mode B — Overlay Slider (bonus, if feasible)**
- A single canvas with the original on the left and halftone on the right
- A draggable vertical slider that reveals more of one side

### Implementation

1. **Data source**: The original image is already stored in `originalImageData` (an `ImageData` object). Use this for the original side.
2. **Rendering approach**:
   - During `applyHalftone()`, after rendering the halftone result to `mainCanvas`, draw the original image on an offscreen canvas at the same dimensions.
   - When split view is active, display both canvases using CSS clip / positioning.
3. **Toggle**:
   - Add a button in the zoom controls row: `[🔲 Split View]`
   - Default: off (shows halftone result only)
   - When on: shows split view
   - When off: shows full halftone result

### UI

In the zoom controls area (after the zoom buttons), add:
```
<button class="zoom-btn" id="splitViewBtn" title="Split View">⊞ Split</button>
```

When active, the button is highlighted (same styling as active zoom button).

### Acceptance Criteria
- [ ] Split view shows original vs halftone accurately (same scale, same region)
- [ ] Toggle on/off works without re-render (just re-clipping)
- [ ] Zoom/pan works correctly in split view mode
- [ ] Works for all image sizes and aspect ratios
- [ ] Performance: no additional render cost when split view is off

---

## Files to Modify

- `index.html`
  - Toolbar Dot group — add LPI mode toggle + LPI slider
  - Zoom controls — add Split View button
  - `applyHalftone()` — add original-image offscreen canvas render
  - New JS functions: `toggleMetric()`, `toggleSplitView()`, `updateSplitView()`
  - CSS — split view styling (clip, divider, handle)
  - CSS — segmented toggle button style
  - State variables — `metricMode`, `lpiValue`, `splitViewActive`

- All 7 language versions of `index.html` — same toolbar and zoom controls changes

## Files to Create

- None (all changes in `index.html`)

## Backward Compatibility

- Default mode = Dot Size mode + Split View off → no visible change to existing users
- All existing features (undo/redo, download, zoom, pan, magnifier) continue working in both modes
- When Split View is active, Downloads continue to export full halftone result (not the split view)

## Open Questions

1. Split View rendering — should the original side show the original image (before any brightness/contrast adjustment) or the brightness/contrast-adjusted version without halftone? **Decision**: Show original unmodified image. The user wants to compare "before" vs "after halftone".
2. Should the LPI mode be saved in localStorage as a user preference? **Decision**: No, default to Dot Size mode each session for backward compatibility. Save in undo/redo state only.
