# ScreenPrintFilter Performance Optimization Spec

> **Note:** This spec was written for the previous single-file architecture. The application has since been refactored to modular ES modules (see commit 152b4d1), but the performance optimization principles described here remain relevant.

## Overview
Optimize the halftone rendering pipeline to achieve ~4x speedup.
Current code has performance issues that make it feel sluggish when adjusting sliders.

## Benchmark Results (Baseline)

Baseline was measured using `perf-benchmark-puppeteer.mjs` in Chromium.

| Size    | Params          | Old(ms) | New(ms) | Speedup |
|---------|----------------|---------|---------|---------|
| 800x600 | Fine (4px,1.0x)| 140     | 18      | 7.7x    |
| 800x600 | Medium(8px)    | 43      | 11      | 3.7x    |
| 800x600 | Bold(12px)     | 16      | 7       | 2.2x    |
| 600x450 | Fine (4px,1.0x)| 91      | 15      | 6.2x    |
| 400x300 | Fine (4px,1.0x)| 50      | 5       | 9.7x    |
| **TOTAL** |              | **379** | **88**  | **4.3x** |

"Old" = per-cell `ctx.getImageData()` call (current code).
"New" = pre-computed brightness Uint8Array lookup.

## Performance Issues & Required Changes

### P1: Pre-compute brightness array (BIGGEST WIN)
**Problem**: `getPixelBrightness()` calls `ctx.getImageData()` and creates a temporary canvas EVERY time a dot is drawn. For 800x600 @ 4px dots, that's 30,000+ calls, each doing a GPU readback.

**Solution**: Add `precomputeBrightness(ctx, w, h) -> Uint8Array` function called once before the dot loop. Then replace `getPixelBrightness(ctx, x, y, ...)` with array lookup.

**Affected functions**:
- `applyHalftone()` — main render path (lines ~1419-1593)
- `downloadImage()` — full-size export (lines ~1672-1784) — same algorithm copy-pasted

### P2: Eliminate RAF chunking overhead
**Problem**: `processChunk()` uses `requestAnimationFrame` to split rendering into rows of 20, but this adds scheduling overhead without real benefit — the algorithm isn't complex enough to cause frame drops.

**Solution**: Replace the chunked `processChunk`/`requestAnimationFrame` pattern with a single synchronous render pass. The render is already fast enough with the pre-computed array. Keep the `processingId` cancellation mechanism but apply it simply as a "cancel current render" flag rather than interleaving with RAF.

### P3: Fix scheduleProcessing debounce
**Problem**: The chain is: `handleControlInput -> scheduleProcessing -> requestAnimationFrame -> setTimeout(50ms) -> applyHalftone`. When dragging a slider, every input event triggers this, causing the `isProcessing` flag to block rendering while the user is still dragging.

**Solution**: Use a proper debounce (300ms on input, not change) so the render only starts after the user stops dragging. On `change` event, render immediately without debounce. This matches typical UX pattern for real-time sliders.

### P4: Download optimization (nice to have)
**Problem**: `downloadImage()` re-runs the full halftone algorithm for full-size export even though the preview canvas already has the result.

**Solution**: If the output size equals the preview size, just export the existing canvas directly instead of re-rendering. Only re-render when output size differs from preview.

### P5: Remove unused code 
- `debounce()` function (line 1210) — never used, roll-your-own debounce in the code
- `resultCanvas`/`resultCtx` aliases (line 1058-1060) — just use `mainCanvas`/`mainCtx` directly

## Test Plan
After changes, verify:
1. Visually identical output for same params
2. Slider dragging feels smooth (no 50ms+ delay on release)
3. Run `node perf-benchmark-puppeteer.mjs` — total should be ~80-100ms
4. Download produces correct full-size PNG
5. Undo/redo still works
6. Reset returns to defaults

## Files to Modify
- `js/core/halftoneProcessor.js` — Core halftone rendering logic
- `js/services/progressiveRenderer.js` — Chunked rendering service
- `js/utils/debounce.js` — Debounce utility

## Files to Create
- None. Optimizations are applied within the existing modular structure.

## Implementation Order
1. P1: Pre-compute brightness → biggest perf win
2. P2 + P3: Simplify render pipeline + proper debounce
3. P4: Download optimization
4. P5: Cleanup
