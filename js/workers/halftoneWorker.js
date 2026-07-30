/**
 * Halftone Processing Web Worker
 * Offloads image processing to background thread
 */

// Import halftone processor (will be cloned in worker)
importScripts('../core/halftoneProcessor.js');

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
