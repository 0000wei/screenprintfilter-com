# Fix: Canvas not centered after uploading image

## Problem
After uploading an image, the canvas is not centered in the canvas-wrapper area. The `display: flex; align-items: center; justify-content: center` on `.canvas-wrapper` should center it, but something is preventing it.

## Expected behavior
1. When no image loaded: placeholder text/icons centered in wrapper (already works)
2. After loading image: canvas centered in wrapper horizontally AND vertically
3. Zoom buttons (25%-200%, Fit): canvas should zoom FROM center, not from top-left corner
4. When zoomed > 100%: scrollbars should appear for overflow, canvas stays visually anchored

## Root cause
The flexbox is being overridden or the canvas element is not being treated as a flex item correctly. Also, `transform-origin: 0 0` + CSS `scale()` from flexbox causes visual offset because flexbox centers the CSS box but transform scales from the top-left of that box, creating a visual shift.

## Fix approach

### Option A: Change transform-origin
Change `#mainCanvas { transform-origin: 0 0 }` to `#mainCanvas { transform-origin: center center }`. This makes zoom scale FROM the center of the canvas, which stays visually centered even when zoomed. For zoom > 100% panning, recalculate panX/panY to work from center origin.

### Option B: Wrapper keeps flexbox, use JS to center
Keep the flexbox. After loading image, ensure canvas is a proper flex item. The canvas already has `display: block` style set which shouldn't break flexbox.

### Option C: Remove flexbox, use JS positioning
Remove flexbox from wrapper, use JS to calculate and set canvas position dynamically based on wrapper dimensions and zoom level.

## Files to modify
- `index.html` only

## Whatever approach you choose, make sure:
1. Placeholder (before image loaded) stays centered
2. Canvas is centered immediately after image loads
3. Zoom buttons work correctly at all levels
4. Scrollbars appear when zoomed > 100%
5. Test by opening the HTML file in browser and uploading an image
