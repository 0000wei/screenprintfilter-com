# DPI Metadata & Alpha Channel Protection — SPEC

## Overview

Two export-side enhancements to `index.html` that make the output files production-ready for screen printing and DTF workflows:

1. **DPI metadata writing**: When downloading, the output PNG will include real 300 DPI metadata in the file header, so RIP software and printers recognize the intended print resolution.
2. **Alpha channel protection**: When rendering with original colors, preserve the original image's transparency — don't fill transparent pixels with background color.

---

## Part 1: DPI Metadata Writing

### Current Behavior
`downloadImage()` (line ~2127) calls `canvas.toDataURL('image/png')` and triggers a browser download. The generated PNG has no DPI metadata — defaulting to 72 DPI.

### Required Behavior
When downloading, write the PNG `pHYs` chunk with the correct physical pixel dimensions. Default to 300 DPI. If the user has entered custom output dimensions in inches (via a new optional UI), use those.

### Implementation

**Option A (recommended): Use existing `canvas.toBlob()` + manual pHYs injection**
1. After rendering to `canvasToExport`, convert to Blob via `canvas.toBlob(callback, 'image/png')`
2. Read the blob as ArrayBuffer
3. PNG pHYs chunk structure: 9 bytes after IHDR chunk
   - `pHYs` chunk signature: `0x70 0x48 0x59 0x73`
   - 4 bytes: pixels per unit X axis (big-endian)
   - 4 bytes: pixels per unit Y axis (big-endian)
   - 1 byte: unit specifier (1 = meter)
   - 300 DPI = 300 pixels/inch = 300/0.0254 ≈ 11811 pixels/meter
4. Write the modified buffer back as the download blob

**Option B (simpler): Use `pngjs` or `sharp` on server side** — but this breaks the zero-server principle. Prefer Option A.

### UI Addition
In the Size group of the toolbar (after the "Original" checkbox), add:

```
[DPI: 300 ▼]  [ ] Use inches
```

- Dropdown: 72, 150, 200, 300, 400, 600 DPI (default 300)
- Checkbox "Use inches": when checked, two number inputs appear for print width/height in inches
- When "Use inches" is checked and values provided, the DPI dropdown + inch inputs determine the final pixel dimensions (override the existing Size inputs)

### Acceptance Criteria
- [ ] Downloaded PNG has correct DPI metadata (verify with `pngcheck` or `identify -verbose`)
- [ ] Default download is 300 DPI
- [ ] Changing DPI dropdown updates the metadata in output
- [ ] "Use inches" mode correctly computes pixel dimensions
- [ ] Existing Size group still works when inches mode is off

---

## Part 2: Alpha Channel Protection

### Current Behavior
`applyHalftone()` (line ~1855) fills the entire canvas with `backgroundColor`, then renders halftone dots on top. Any transparent areas of the original image are filled with the background color — removing transparency.

### Required Behavior
When `useOriginalColors` is enabled AND the original image has an alpha channel with transparent pixels:
1. Fill canvas with transparent background (not `backgroundColor`)
2. Skip rendering halftone dots at positions where the original image pixel is transparent (< 50% opacity)
3. Result PNG has correct alpha channel preserving original transparency

### Implementation

In `applyHalftone()`, modify:

1. **Detect transparency**: After loading `originalImageData`, scan alpha channel. If any pixel has `alpha < 255`, flag `hasTransparency = true`.
2. **Background fill**:
   - If `hasTransparency && useOriginalColors`: use `clearRect()` instead of `fillRect()` to leave canvas transparent
   - Else: existing behavior (`fillRect` with `backgroundColor`)
3. **Dot rendering**:
   - In the dot loop, when `useOriginalColors` is true and `hasTransparency`:
     - Sample alpha value from `originalImageData` at the dot position
     - If `alpha < 128` (semitransparent threshold), skip this dot
   - When not using original colors: existing behavior (always render dots)

### Edge Cases
- Image with no alpha channel → existing behavior unchanged
- Image with partial transparency (e.g., PNG with smooth edges) → skip semitransparent dots, preserve feathered edges
- Grayscale image (no alpha) → unchanged
- User toggles "Original Colors" on/off → works correctly in both modes

### Acceptance Criteria
- [ ] Transparent PNG input → output preserves transparency
- [ ] Solid image (no alpha) → output matches current behavior
- [ ] Partially transparent input → transparent areas stay transparent, opaque areas get halftone
- [ ] "Use original colors" off → transparency is filled with background color (existing behavior, correct for monochrome)
- [ ] Performance: scanning alpha channel adds <10ms overhead

---

## Files to Modify

- `index.html`
  - `applyHalftone()` — transparency detection + dot-skip logic
  - `downloadImage()` — DPI metadata injection
  - Toolbar HTML — DPI dropdown + inches UI (new controls in Size group)
  - CSS — styles for new controls
  - JS state variables — `selectedDPI`, `printWidthInches`, `printHeightInches`

## Files to Create

- None (all changes in `index.html`)

## Backward Compatibility

- Existing downloads (no alpha, default DPI) identical to current output
- Existing toolbar layout unchanged — new controls are appended to Size group
- Undo/redo state captures new DPI/inch parameters

## Verification

```sh
# DPI check (requires ImageMagick or pngcheck)
identify -verbose downloaded.png | grep Resolution
# Expected: Resolution: 300x300 pixels/inch

# Alpha check
# Load transparent PNG → download → verify transparency preserved
# Visually inspect in image viewer with checkerboard background
```
