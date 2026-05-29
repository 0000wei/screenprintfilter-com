import { convertToHalftone } from './halftone.js';
import fs from 'fs/promises';

// Test the halftone conversion
async function test() {
  try {
    console.log('Testing halftone conversion...');

    // Check if we can access the canvas module
    const { createCanvas } = await import('canvas');
    console.log('✓ Canvas module available');

    // Create a simple test image
    const canvas = createCanvas(200, 200);
    const ctx = canvas.getContext('2d');

    // Create a gradient pattern
    const gradient = ctx.createLinearGradient(0, 0, 200, 200);
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(1, 'black');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 200, 200);

    // Save test image
    const testImagePath = './test-input.png';
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(testImagePath, buffer);
    console.log('✓ Test image created:', testImagePath);

    // Test halftone conversion
    const outputPath = './test-halftone.png';
    await convertToHalftone(testImagePath, outputPath, {
      dotSize: 4,
      spacing: 1.5,
      contrast: 50,
      brightness: 0,
      shape: 'circle',
      angle: 0,
      useOriginalColors: false,
      outputWidth: 200,
      outputHeight: 200
    });

    console.log('✓ Halftone conversion completed');
    console.log('✓ Output saved to:', outputPath);

    // Clean up
    await fs.unlink(testImagePath);
    console.log('✓ Test completed successfully!');

  } catch (error) {
    console.error('✗ Test failed:', error.message);
    process.exit(1);
  }
}

test();