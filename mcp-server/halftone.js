import { createCanvas, loadImage } from 'canvas';
import fs from 'fs/promises';

/**
 * Precompute brightness array for performance
 * @param {Object} imageData - Canvas imageData object
 * @returns {Uint8Array} Brightness array
 */
function precomputeBrightness(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const brightness = new Uint8Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            // Use grayscale value for brightness
            brightness[y * width + x] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        }
    }

    return brightness;
}

/**
 * Get pixel brightness from precomputed array
 * @param {Uint8Array} brightnessArray - Precomputed brightness array
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {number} Brightness value
 */
function getPixelBrightness(brightnessArray, x, y, width, height) {
    // Sample a small area around the point for more stable results
    const sampleSize = 3;
    const sx = Math.max(0, Math.min(Math.floor(x - sampleSize/2), width - sampleSize));
    const sy = Math.max(0, Math.min(Math.floor(y - sampleSize/2), height - sampleSize));
    const sw = Math.min(sampleSize, width - sx);
    const sh = Math.min(sampleSize, height - sy);

    let sum = 0;
    let count = 0;
    for (let dy = 0; dy < sh; dy++) {
        for (let dx = 0; dx < sw; dx++) {
            const idx = (sy + dy) * width + (sx + dx);
            sum += brightnessArray[idx];
            count++;
        }
    }
    return count > 0 ? sum / count : 128;
}

/**
 * Get pixel color from context
 * @param {Object} ctx - Canvas context
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {string} RGB color string
 */
function getPixelColor(ctx, x, y) {
    // Sample a small area around the point for more stable results
    const sampleSize = 3;
    const sx = Math.max(0, Math.min(Math.floor(x - sampleSize/2), ctx.canvas.width - sampleSize));
    const sy = Math.max(0, Math.min(Math.floor(y - sampleSize/2), ctx.canvas.height - sampleSize));
    const sw = Math.min(sampleSize, ctx.canvas.width - sx);
    const sh = Math.min(sampleSize, ctx.canvas.height - sy);

    const imageData = ctx.getImageData(sx, sy, sw, sh);
    const data = imageData.data;
    let sumR = 0, sumG = 0, sumB = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
        sumR += data[i];
        sumG += data[i + 1];
        sumB += data[i + 2];
        count++;
    }

    return count > 0 ?
        `rgb(${Math.round(sumR / count)}, ${Math.round(sumG / count)}, ${Math.round(sumB / count)})` :
        'rgb(128, 128, 128)';
}

/**
 * Draw a shape on the canvas
 * @param {Object} ctx - Canvas context
 * @param {number} x - Center X coordinate
 * @param {number} y - Center Y coordinate
 * @param {number} radius - Radius/size of the shape
 * @param {string} shape - Shape type (circle, square, diamond, line)
 * @param {string} color - Fill color
 */
function drawShape(ctx, x, y, radius, shape, color) {
    ctx.beginPath();
    ctx.fillStyle = color;

    switch (shape) {
        case 'circle':
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            break;

        case 'square':
            ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
            break;

        case 'diamond':
            ctx.moveTo(x, y - radius);
            ctx.lineTo(x + radius, y);
            ctx.lineTo(x, y + radius);
            ctx.lineTo(x - radius, y);
            ctx.closePath();
            break;

        case 'line':
            ctx.rect(x - radius * 2, y - radius / 2, radius * 4, radius);
            break;
    }

    ctx.fill();
}

/**
 * Convert image to halftone
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to output PNG
 * @param {Object} params - Halftone parameters
 * @returns {Promise<void>}
 */
export async function convertToHalftone(inputPath, outputPath, params = {}) {
    // Default parameters
    const {
        dotSize = 4,
        spacing = 1.0,
        contrast = 50,
        brightness = 0,
        shape = 'circle',
        angle = 0,
        fgColor = '#000000',
        bgColor = '#FFFFFF',
        useOriginalColors = true,
        outputWidth = null,
        outputHeight = null
    } = params;

    // Validate parameters
    if (dotSize < 2 || dotSize > 30) {
        throw new Error('dotSize must be between 2 and 30');
    }
    if (spacing < 1.0 || spacing > 2.0) {
        throw new Error('spacing must be between 1.0 and 2.0');
    }
    if (contrast < 0 || contrast > 100) {
        throw new Error('contrast must be between 0 and 100');
    }
    if (brightness < -50 || brightness > 50) {
        throw new Error('brightness must be between -50 and 50');
    }
    if (angle < 0 || angle > 360) {
        throw new Error('angle must be between 0 and 360');
    }
    if (!['circle', 'square', 'diamond', 'line'].includes(shape)) {
        throw new Error('shape must be one of: circle, square, diamond, line');
    }

    // Load image
    const image = await loadImage(inputPath);

    // Determine output dimensions
    const outWidth = outputWidth || image.width;
    const outHeight = outputHeight || image.height;

    // Create canvas
    const canvas = createCanvas(outWidth, outHeight);
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, outWidth, outHeight);

    // Create temporary canvas for image processing
    const tempCanvas = createCanvas(image.width, image.height);
    const tempCtx = tempCanvas.getContext('2d');

    // Draw original image
    tempCtx.drawImage(image, 0, 0);

    // Store original color data
    const originalCanvas = createCanvas(image.width, image.height);
    const originalCtx = originalCanvas.getContext('2d');
    originalCtx.drawImage(image, 0, 0);

    // Apply brightness and contrast
    let imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    const contrastFactor = contrast / 100;

    for (let i = 0; i < data.length; i += 4) {
        if (useOriginalColors) {
            // Apply brightness/contrast to RGB channels directly for original colors
            for (let channel = 0; channel < 3; channel++) {
                let value = data[i + channel];
                // Apply brightness
                value += brightness * 2.55;
                // Apply contrast
                value = ((value / 255 - 0.5) * contrastFactor + 0.5) * 255;
                // Clamp values
                data[i + channel] = Math.max(0, Math.min(255, value));
            }
        } else {
            // Convert to grayscale for monochrome mode
            let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

            // Apply brightness
            gray += brightness * 2.55;

            // Apply contrast
            gray = ((gray / 255 - 0.5) * contrastFactor + 0.5) * 255;

            // Clamp values
            gray = Math.max(0, Math.min(255, gray));

            data[i] = data[i + 1] = data[i + 2] = gray;
        }
    }

    tempCtx.putImageData(imageData, 0, 0);

    // Pre-compute brightness array for performance
    const brightnessArray = precomputeBrightness(imageData);

    // Calculate grid parameters with rotation
    const gridSize = dotSize * spacing;
    const angleRad = (angle * Math.PI) / 180;
    const cosAngle = Math.cos(angleRad);
    const sinAngle = Math.sin(angleRad);

    // Calculate grid bounds with rotation
    const gridWidth = outWidth * Math.abs(cosAngle) + outHeight * Math.abs(sinAngle);
    const gridHeight = outWidth * Math.abs(sinAngle) + outHeight * Math.abs(cosAngle);

    // Draw halftone dots with rotation
    for (let y = -gridSize; y < gridHeight + gridSize; y += gridSize) {
        for (let x = -gridSize; x < gridWidth + gridSize; x += gridSize) {
            // Apply rotation to grid position
            const rotatedX = x * cosAngle - y * sinAngle;
            const rotatedY = x * sinAngle + y * cosAngle;

            if (rotatedX < -gridSize || rotatedX >= outWidth + gridSize ||
                rotatedY < -gridSize || rotatedY >= outHeight + gridSize) {
                continue;
            }

            // Sample from the original canvas (mapped to output coordinates)
            const sampleX = (rotatedX / outWidth) * tempCanvas.width;
            const sampleY = (rotatedY / outHeight) * tempCanvas.height;

            // Get brightness at this position using pre-computed array
            const pixelBrightness = getPixelBrightness(brightnessArray, sampleX, sampleY, tempCanvas.width, tempCanvas.height);

            // Calculate dot size based on brightness (darker = bigger)
            // Area-compensated: dot covers (1-brightness) fraction of the cell area
            const normalizedBrightness = pixelBrightness / 255;
            const targetCoverage = 1 - normalizedBrightness;
            const maxDotArea = Math.PI * Math.pow(dotSize / 2, 2);
            const cellArea = gridSize * gridSize;
            // Scale coverage to dot size, capping at full cell coverage
            const coverageRatio = Math.min(targetCoverage * cellArea / maxDotArea, 1);
            const dotRadius = Math.sqrt(coverageRatio) * (dotSize / 2);

            if (dotRadius > 0.5) {
                const centerX = rotatedX + gridSize / 2;
                const centerY = rotatedY + gridSize / 2;

                if (centerX >= -dotRadius && centerX <= outWidth + dotRadius &&
                    centerY >= -dotRadius && centerY <= outHeight + dotRadius) {

                    // Get original color if using original colors mode
                    if (useOriginalColors) {
                        const colorSampleX = (rotatedX / outWidth) * originalCanvas.width;
                        const colorSampleY = (rotatedY / outHeight) * originalCanvas.height;
                        const originalColor = getPixelColor(originalCtx, colorSampleX, colorSampleY);
                        drawShape(ctx, centerX, centerY, dotRadius, shape, originalColor);
                    } else {
                        drawShape(ctx, centerX, centerY, dotRadius, shape, fgColor);
                    }
                }
            }
        }
    }

    // Save output
    const pngData = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, pngData);
}