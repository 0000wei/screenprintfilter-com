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
When downloading, write the PNG `pHYs` chunk with the correct physical pixel dimensions. Default to 300 DPI. The DPI value is **metadata only** — it does not resize the image pixels. It tells the printer/RIP software "this image should be printed at X dots per inch".

### Implementation

**Chosen approach**: Use `canvas.toBlob()` + manual PNG binary manipulation with a browser-side PNG helper function. No server, no external library dependency.

#### PNG Chunk Structure Reference

Every PNG chunk has this format:

```
[4 bytes: length of data field (big-endian)]
[4 bytes: chunk type (ASCII, e.g. "pHYs")]
[N bytes: chunk data (length determined above)]
[4 bytes: CRC-32 checksum over chunk type + data]
```

The file begins with an 8-byte PNG signature (`0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A`), followed by an IHDR chunk. The pHYs chunk (if present) must appear **after IHDR but before IDAT** (the first image data chunk).

#### pHYs Chunk Data (9 bytes)

```
Byte 0-3: Pixels per unit, X axis (32-bit big-endian unsigned integer)
Byte 4-7: Pixels per unit, Y axis (32-bit big-endian unsigned integer)
Byte 8:   Unit specifier (1 = meter, 0 = unknown)
```

**DPI → pixels/meter conversion**:
```
11811 = Math.round(300 / 0.0254)   // 300 DPI in pixels/meter
```

#### Algorithm: injectDPI(blob, dpi) → Blob

```javascript
async function injectDPI(blob, dpi) {
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  
  // Validate PNG signature
  const pngSig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== pngSig[i]) throw new Error('Not a valid PNG');
  }
  
  // Read chunk length and type at position 8 (after signature)
  let offset = 8;
  const ihdrLength = readUint32BE(bytes, offset);
  const ihdrType = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
  if (ihdrType !== 'IHDR') throw new Error('Expected IHDR chunk');
  
  // Skip IHDR: length(4) + type(4) + data(ihdrLength) + CRC(4)
  offset += 4 + 4 + ihdrLength + 4;
  
  // Check if pHYs already exists at this position
  const existingType = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
  if (existingType === 'pHYs') {
    // Overwrite existing pHYs data (skip type, write data at offset+8)
    const ppm = Math.round(dpi / 0.0254);
    writeUint32BE(bytes, offset + 8, ppm);
    writeUint32BE(bytes, offset + 12, ppm);
    bytes[offset + 16] = 1; // meter
    // Recalculate CRC for modified pHYs
    const crc = crc32(bytes.slice(offset + 4, offset + 17)); // type(4) + data(9)
    writeUint32BE(bytes, offset + 17, crc);
    return new Blob([bytes], { type: 'image/png' });
  }
  
  // Insert new pHYs chunk before the next chunk
  const ppm = Math.round(dpi / 0.0254);
  const physData = new Uint8Array(17); // length(4) + type(4) + data(9)
  writeUint32BE(physData, 0, 9); // 9 bytes of data
  physData[4] = 0x70; physData[5] = 0x48; // p H
  physData[6] = 0x59; physData[7] = 0x73; // Y s
  writeUint32BE(physData, 8, ppm);
  writeUint32BE(physData, 12, ppm);
  physData[16] = 1; // meter
  
  // Calculate CRC over type(4) + data(9)
  const crc = crc32(physData.slice(4, 17)); // "pHYs" + 9 data bytes
  const physWithCrc = new Uint8Array(21); // length(4) + type(4) + data(9) + CRC(4)
  physWithCrc.set(physData, 0);
  writeUint32BE(physWithCrc, 17, crc);
  
  // Insert between IHDR and the next chunk
  const result = new Uint8Array(bytes.length + physWithCrc.length);
  result.set(bytes.slice(0, offset), 0);
  result.set(physWithCrc, offset);
  result.set(bytes.slice(offset), offset + physWithCrc.length);
  
  return new Blob([result], { type: 'image/png' });
}

function readUint32BE(view, offset) {
  return (view[offset] << 24) | (view[offset + 1] << 16) |
         (view[offset + 2] << 8) | view[offset + 3];
}

function writeUint32BE(view, offset, value) {
  view[offset] = (value >> 24) & 0xFF;
  view[offset + 1] = (value >> 16) & 0xFF;
  view[offset + 2] = (value >> 8) & 0xFF;
  view[offset + 3] = value & 0xFF;
}

// CRC-32 implementation (PNG-specific, uses polynomial 0xEDB88320)
function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}
```

#### Error Handling & Fallback

Wrap the DPI injection in try/catch inside `downloadImage()`:

```javascript
async function downloadImage() {
  // ... existing rendering logic ...
  
  try {
    if (typeof canvasToExport.toBlob === 'function') {
      const blob = await new Promise(resolve => canvasToExport.toBlob(resolve, 'image/png'));
      const dpiBlob = await injectDPI(blob, selectedDPI);
      downloadBlob(dpiBlob, 'halftone-' + Date.now() + '.png');
    } else {
      // Fallback for browsers without toBlob (old Safari)
      fallbackDownload(canvasToExport);
    }
  } catch (e) {
    console.warn('DPI injection failed, falling back to default PNG:', e);
    fallbackDownload(canvasToExport);
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
```

#### UI Addition

**Precedence rules** (CRITICAL — disambiguates the control interaction):

1. **Default state**: "Use inches" is OFF. DPI dropdown sets metadata only. Size group controls pixel dimensions as before.
2. **"Use inches" ON**: The inch inputs + DPI dropdown OVERRIDE the Size group width/height. The Size group inputs become disabled/read-only.
3. **"Original" checkbox + "Use inches" both ON**: "Original" takes precedence — output matches original image dimensions. "Use inches" controls are ignored. A tooltip explains: "Original size overrides custom dimensions."
4. **Toggle "Use inches" ON→OFF**: Restore the Size group inputs to their values before inches mode was entered.

**Controls** (append to Size group, after `useOriginalSize` checkbox):

```
[DPI: 300 ▼]  [☐ Use inches]
```
- DPI dropdown: 72, 150, 200, 300, 400, 600 (default 300)
- "Use inches" checkbox: when checked, reveals two inline number inputs:
  - Width (inches), Height (inches)
  - The Size group width/height inputs become disabled
  - Calculated pixel dimensions shown as read-only text: "→ 2400 × 3600 px"

### Acceptance Criteria
- [ ] Downloaded PNG has correct DPI metadata (verify with `identify -verbose` or browser-based test)
- [ ] DPI metadata survives re-download (round-trip test)
- [ ] Default download is 300 DPI
- [ ] Changing DPI dropdown updates the metadata
- [ ] "Use inches" mode correctly computes pixel dimensions and overrides Size group
- [ ] Toggling "Use inches" on/off preserves/resets Size group values correctly
- [ ] DPI injection failure falls back gracefully to normal download (no broken file)
- [ ] PNG with existing pHYs chunk is overwritten, not duplicated

---

## Part 2: Alpha Channel Protection

### Current Behavior
`applyHalftone()` (line ~1855) fills the entire canvas with `backgroundColor`, then renders halftone dots on top. Any transparent areas of the original image are filled with the background color — removing transparency.

### Required Behavior
When `useOriginalColors` is enabled AND the original image has an alpha channel with transparent pixels:
1. Detect transparency during the existing pixel loop (no separate scan).
2. Fill canvas with transparent background using `clearRect()` instead of `fillRect()`.
3. For each dot position, sample the source alpha: set dot opacity proportional to source alpha instead of skipping dots entirely.
4. Result PNG has correct alpha channel preserving original transparency with smooth edges.

### Implementation

#### Merge alpha detection into existing pixel loop

The current `applyHalftone()` already iterates all pixels at line ~1905:

```javascript
for (let i = 0; i < data.length; i += 4) {
    // ... brightness/contrast processing ...
}
```

Add alpha detection **inside this existing loop**:

```javascript
let hasTransparency = false;

for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 255) hasTransparency = true;
    
    // Existing brightness/contrast logic (unchanged)
    if (useOriginalColors) {
        for (let channel = 0; channel < 3; channel++) {
            let value = data[i + channel];
            value += brightness * 2.55;
            value = ((value / 255 - 0.5) * contrast + 0.5) * 255;
            data[i + channel] = Math.max(0, Math.min(255, value));
        }
    } else {
        // grayscale conversion... (unchanged)
    }
}
```

**Result**: Zero additional passes. The flag `hasTransparency` is set after a single pass over the pixel data.

#### Background fill

```javascript
if (hasTransparency && useOriginalColors) {
    // Transparent background — use clearRect
    mainCtx.clearRect(0, 0, outputWidth, outputHeight);
} else {
    // Existing behavior
    mainCtx.fillStyle = backgroundColor;
    mainCtx.fillRect(0, 0, outputWidth, outputHeight);
}
```

#### Dot rendering with proportional opacity

In the dot rendering loop, when `useOriginalColors` is true and `hasTransparency`:

```javascript
// Sample source alpha at this position
const alphaSample = sampleAlpha(originalImageData, sampleX, sampleY,
    originalCanvas.width, originalCanvas.height);

if (alphaSample < 5) {
    // Nearly fully transparent — skip dot entirely
    continue;
}

// Set globalAlpha for semi-transparent dots
if (alphaSample < 255) {
    mainCtx.globalAlpha = alphaSample / 255;
} else {
    mainCtx.globalAlpha = 1;
}

// ... draw dot with current globalAlpha ...
drawShape(mainCtx, centerX, centerY, dotRadius, shape, originalColor);

// Reset globalAlpha for next dot
mainCtx.globalAlpha = 1;
```

Helper function:
```javascript
function sampleAlpha(imageData, x, y, width, height) {
    const sampleSize = 3;
    const sx = Math.max(0, Math.min(Math.floor(x - sampleSize/2), width - sampleSize));
    const sy = Math.max(0, Math.min(Math.floor(y - sampleSize/2), height - sampleSize));
    const sw = Math.min(sampleSize, width - sx);
    const sh = Math.min(sampleSize, height - sy);

    let sum = 0, count = 0;
    const data = imageData.data;
    for (let dy = 0; dy < sh; dy++) {
        for (let dx = 0; dx < sw; dx++) {
            const idx = ((sy + dy) * width + (sx + dx)) * 4 + 3;
            sum += data[idx];
            count++;
        }
    }
    return count > 0 ? sum / count : 0;
}
```

### Edge Cases
- **Image with no alpha channel** → `hasTransparency` stays false → existing behavior unchanged
- **Image with partial transparency** → proportional opacity preserves anti-aliased edges
- **Fully transparent image** → all dots skipped → output is fully transparent canvas
- **Toggling "Original Colors" off** → `clearRect` not used, dots always opaque (correct for monochrome)
- **`globalAlpha` state cleanup** → always reset to 1 after each dot to avoid state leakage across shapes

### Acceptance Criteria
- [ ] Transparent PNG input → output preserves transparency with smooth edges
- [ ] Solid image (no alpha) → output matches current behavior (zero regression)
- [ ] Feathered edges (alpha gradient) → output retains smooth transition, not hard cut
- [ ] "Use original colors" off → transparency is filled with background (existing behavior)
- [ ] Performance: no separate scan — alpha detection merged into existing pixel loop

---

## Files to Modify

- `index.html`
  - `applyHalftone()` — merge alpha detection + proportional opacity rendering
  - `downloadImage()` — DPI metadata injection with error handling
  - Toolbar HTML — DPI dropdown + inches UI (new controls in Size group)
  - CSS — styles for new controls
  - JS — `injectDPI()`, `crc32()`, `sampleAlpha()` helper functions; state variables `selectedDPI`, `useInches`, `printWidthInches`, `printHeightInches`

## Files to Create

- None (all changes in `index.html`)

## Backward Compatibility

- Existing downloads (no alpha, default DPI) identical to current output — zero regression
- Existing toolbar layout unchanged — new controls are appended to Size group
- Undo/redo state captures new DPI/inch parameters
- Error fallback ensures downloads never fail even if DPI injection errors

## Verification

```sh
# DPI check (requires ImageMagick or pngcheck)
identify -verbose downloaded.png | grep Resolution
# Expected: Resolution: 300x300 pixels/inch
# Also verify no-DPI fallback produces valid PNG

# Alpha check
# Load transparent PNG → download → verify in image viewer
# Verify feathered edges preserve smooth alpha gradient
```
