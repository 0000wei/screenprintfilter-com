/**
 * Progressive Renderer
 * Renders large images in chunks to avoid blocking UI
 */

import { config } from '../core/config.js';

export class ProgressiveRenderer {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.chunkSize = 512;
        this.cancelled = false;
    }

    async renderImage(imageData, processorFn, onProgress = null) {
        this.cancelled = false;

        const { width, height } = imageData;
        const chunks = this.calculateChunks(width, height);
        const totalChunks = chunks.length;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = 0; i < chunks.length; i++) {
            if (this.cancelled) {
                throw new Error('Rendering cancelled');
            }

            const chunk = chunks[i];
            const chunkData = this.extractChunk(imageData, chunk);
            const processedChunk = await processorFn(chunkData, chunk);
            this.renderChunk(processedChunk, chunk);

            if (onProgress) {
                onProgress({
                    stage: 'processing',
                    percent: Math.round(((i + 1) / totalChunks) * 100)
                });
            }

            await this.yield();
        }

        return this.canvas;
    }

    calculateChunks(width, height) {
        const chunks = [];

        for (let y = 0; y < height; y += this.chunkSize) {
            for (let x = 0; x < width; x += this.chunkSize) {
                chunks.push({
                    x: Math.min(x, width),
                    y: Math.min(y, height),
                    width: Math.min(this.chunkSize, width - x),
                    height: Math.min(this.chunkSize, height - y)
                });
            }
        }

        return chunks;
    }

    extractChunk(imageData, chunk) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = chunk.width;
        tempCanvas.height = chunk.height;
        const tempCtx = tempCanvas.getContext('2d');

        tempCtx.putImageData(
            imageData,
            chunk.x, chunk.y,
            0, 0, chunk.width, chunk.height
        );

        return tempCtx.getImageData(0, 0, chunk.width, chunk.height);
    }

    renderChunk(chunkData, chunk) {
        this.ctx.putImageData(
            chunkData,
            chunk.x, chunk.y
        );
    }

    async yield() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    cancel() {
        this.cancelled = true;
    }

    static getOptimalChunkSize(width, height) {
        const totalPixels = width * height;

        if (totalPixels < 1024 * 1024) {
            return 512;
        } else if (totalPixels < 4096 * 4096) {
            return 256;
        } else {
            return 128;
        }
    }
}
