# Halftone Rendering Architecture

## Overview

ScreenPrintFilter uses the HTML Canvas 2D API to render halftone dot patterns entirely in the browser. No image data is sent to any server.

## Pipeline

```
User Image → Canvas (loaded) → Grayscale conversion → Halftone grid generation → Dot rendering → Output display
```

### 1. Image Loading
- User uploads via `<input type="file">` or drag-and-drop
- Image decoded via `Image` object → drawn to an offscreen canvas
- Original dimensions preserved for output at native resolution

### 2. Grayscale Conversion
- Per-pixel luminance: `0.299*R + 0.587*G + 0.114*B`
- Threshold-based or continuous-tone mapping depending on dot mode

### 3. Halftone Grid
- Grid cells computed from dot size + spacing parameters
- Each cell evaluates average luminance → determines dot radius/scale
- Angle rotation applied to grid (typical screen angles: 45° for B&W, 0/15/45/75° for CMYK)

### 4. Dot Rendering
- Shapes: round (default), diamond, line, square
- Dot radius proportional to darkness (darker = larger)
- Anti-aliased via Canvas `arc()` / `fillRect()` with sub-pixel positioning

### 5. Output
- Scaled to match original image dimensions
- Rendered to visible canvas for display
- Download via `canvas.toBlob()` as PNG

## Performance Strategy

- **Chunked rendering**: Process grid in batches (~50ms chunks) via `requestAnimationFrame`
- **Offscreen canvas**: Pre-compute grayscale data for reuse
- **Slider responsiveness**: Debounce (150ms) on parameter changes, abort in-flight render
- **Web Worker fallback**: Consider `OffscreenCanvas` transfer for large images (>4MP)

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Canvas 2D API (not WebGL) | Simpler, sufficient for 2D dot patterns; no shader complexity |
| Modular ES modules | Separated concerns, maintainable architecture, zero build step |
| Client-side only | No upload latency, privacy-friendly, works offline after first load |
| Web Worker processing | Prevents UI freeze on large images; slider stays responsive |
| Chunked rendering | Additional progressive rendering for responsive feedback |
