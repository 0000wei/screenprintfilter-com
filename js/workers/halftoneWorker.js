/**
 * Halftone Processing Web Worker
 * Offloads image processing to background thread
 */

// Inline halftone processing logic for Worker (ES6 modules incompatible with importScripts)
class HalftoneProcessor {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    }

    processImage(source, params) {
        const { dotSize = 4, spacing = 1.0, contrast = 50, brightness = 0, angle = 0,
                shape = 'circle', fgColor = '#000000', bgColor = '#ffffff', useOriginalColors = false } = params;

        const width = source.width || source.naturalWidth;
        const height = source.height || source.naturalHeight;
        this.canvas.width = width;
        this.canvas.height = height;

        const tempCanvas = new OffscreenCanvas(width, height);
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(source, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, width, height);

        this.adjustBrightnessContrast(imageData, brightness, contrast);
        const dots = this.generateHalftoneDots(imageData, { dotSize, spacing, angle, shape, useOriginalColors });
        this.renderDots(dots, width, height, fgColor, bgColor, useOriginalColors);

        return this.ctx.getImageData(0, 0, width, height);
    }

    adjustBrightnessContrast(imageData, brightness, contrast) {
        const data = imageData.data;
        const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
        for (let i = 0; i < data.length; i += 4) {
            for (let j = 0; j < 3; j++) {
                let value = data[i + j];
                value = factor * (value - 128) + 128 + brightness;
                data[i + j] = Math.max(0, Math.min(255, value));
            }
        }
    }

    generateHalftoneDots(imageData, params) {
        const { dotSize, spacing, angle, shape, useOriginalColors } = params;
        const { width, height, data } = imageData;
        const dots = [];
        const step = dotSize * spacing;
        const angleRad = (angle * Math.PI) / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const maxSize = Math.max(width, height) * 1.5;

        for (let y = -maxSize / 2; y < maxSize / 2; y += step) {
            for (let x = -maxSize / 2; x < maxSize / 2; x += step) {
                const rx = x * cos - y * sin + width / 2;
                const ry = x * sin + y * cos + height / 2;
                if (rx < 0 || rx >= width || ry < 0 || ry >= height) continue;

                const pixelX = Math.floor(rx);
                const pixelY = Math.floor(ry);
                const idx = (pixelY * width + pixelX) * 4;
                const brightness = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
                const dotRadius = (dotSize / 2) * brightness;
                if (dotRadius > 0.5) {
                    dots.push({ x: rx, y: ry, radius: dotRadius,
                        color: useOriginalColors ? `rgb(${data[idx]}, ${data[idx + 1]}, ${data[idx + 2]})` : null });
                }
            }
        }
        return dots;
    }

    renderDots(dots, width, height, fgColor, bgColor, useOriginalColors) {
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, width, height);
        dots.forEach(dot => {
            this.ctx.fillStyle = useOriginalColors ? dot.color : fgColor;
            this.ctx.beginPath();
            this.ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
}

self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'PROCESS_IMAGE':
            processImage(payload);
            break;
        case 'CANCEL':
            // Handle cancellation
            break;
        default:
            self.postMessage({ type: 'ERROR', payload: 'Unknown message type' });
    }
};

function processImage({ imageData, params, transferables = [] }) {
    try {
        // Create offscreen canvas in worker
        const canvas = new OffscreenCanvas(imageData.width, imageData.height);
        const ctx = canvas.getContext('2d');

        // Put image data
        ctx.putImageData(imageData, 0, 0);

        // Create processor instance
        const processor = new HalftoneProcessor(canvas, ctx);

        // Process with progress callback
        processor.processImage(canvas, params, (progress) => {
            self.postMessage({
                type: 'PROGRESS',
                payload: progress
            });
        }, null);

        // Get result
        const resultData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Send result back
        self.postMessage({
            type: 'COMPLETE',
            payload: {
                imageData: resultData,
                width: canvas.width,
                height: canvas.height
            }
        }, [resultData.data.buffer]);

    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            payload: error.message
        });
    }
}
