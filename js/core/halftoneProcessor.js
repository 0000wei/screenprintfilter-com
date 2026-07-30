/**
 * Halftone Image Processing
 * Core algorithm for converting images to halftone dot patterns
 */

import { config } from './config.js';

export class HalftoneProcessor {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
    }

    /**
     * Apply halftone effect to image
     */
    processImage(source, params, progressCallback = null, cancelSignal = null) {
        const {
            dotSize = config.DEFAULT_PARAMS.dotSize,
            spacing = config.DEFAULT_PARAMS.spacing,
            contrast = config.DEFAULT_PARAMS.contrast,
            brightness = config.DEFAULT_PARAMS.brightness,
            angle = config.DEFAULT_PARAMS.angle,
            shape = config.DEFAULT_PARAMS.shape,
            fgColor = config.DEFAULT_PARAMS.fgColor,
            bgColor = config.DEFAULT_PARAMS.bgColor,
            useOriginalColors = config.DEFAULT_PARAMS.useOriginalColors
        } = params;

        const width = source.width || source.naturalWidth;
        const height = source.height || source.naturalHeight;

        this.canvas.width = width;
        this.canvas.height = height;

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(source, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, width, height);

        this.adjustBrightnessContrast(imageData, brightness, contrast);

        const dots = this.generateHalftoneDots(imageData, {
            dotSize, spacing, angle, shape, useOriginalColors
        }, cancelSignal);

        if (cancelSignal?.aborted) {
            throw new Error('Processing cancelled');
        }

        this.renderDots(dots, width, height, fgColor, bgColor, useOriginalColors);

        if (progressCallback) {
            progressCallback({ stage: 'complete', percent: 100 });
        }

        return this.canvas;
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

    generateHalftoneDots(imageData, params, cancelSignal) {
        const { dotSize, spacing, angle, shape, useOriginalColors } = params;
        const { width, height, data } = imageData;

        const dots = [];
        const step = dotSize * spacing;
        const angleRad = (angle * Math.PI) / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        const maxSize = Math.max(width, height) * 1.5;
        const startX = -maxSize / 2;
        const startY = -maxSize / 2;

        for (let y = startY; y < maxSize / 2; y += step) {
            for (let x = startX; x < maxSize / 2; x += step) {
                if (cancelSignal?.aborted) return dots;

                const rx = x * cos - y * sin + width / 2;
                const ry = x * sin + y * cos + height / 2;

                if (rx < 0 || rx >= width || ry < 0 || ry >= height) continue;

                const pixelX = Math.floor(rx);
                const pixelY = Math.floor(ry);
                const idx = (pixelY * width + pixelX) * 4;

                const brightness = (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
                const dotRadius = (dotSize / 2) * brightness;

                if (dotRadius > 0.5) {
                    dots.push({
                        x: rx, y: ry, radius: dotRadius,
                        color: useOriginalColors ? `rgb(${data[idx]}, ${data[idx + 1]}, ${data[idx + 2]})` : null
                    });
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

    static lpiToDotSize(lpi, dpi = 300) {
        return dpi / lpi;
    }

    static dotSizeToLPI(dotSize, dpi = 300) {
        return dpi / dotSize;
    }
}
