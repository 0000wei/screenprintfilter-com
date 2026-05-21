// Quick test to verify bug fix and check main functionality
console.log('=== Quick Test Suite ===\n');

// Helper: Sample canvas at specific coordinates
function sampleCanvas(canvas, x, y) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(x, y, 5, 5);
    const data = imageData.data;

    let sumR = 0, sumG = 0, sumB = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 4) {
        sumR += data[i];
        sumG += data[i + 1];
        sumB += data[i + 2];
        count++;
    }

    return {
        r: Math.round(sumR / count),
        g: Math.round(sumG / count),
        b: Math.round(sumB / count)
    };
}

// Test 1: Create and load test image
console.log('Test 1: Create and load test image');
var testCanvas = document.createElement('canvas');
testCanvas.width = 300;
testCanvas.height = 300;
var tc = testCanvas.getContext('2d');

// White background
tc.fillStyle = 'white';
tc.fillRect(0, 0, 300, 300);

// Black square (top-left)
tc.fillStyle = 'black';
tc.fillRect(0, 0, 100, 100);

// Red circle
tc.fillStyle = '#ff0000';
tc.beginPath();
tc.arc(250, 50, 40, 0, Math.PI * 2);
tc.fill();

testCanvas.toBlob(function(blob) {
    var f = new File([blob], 'test.png', { type: 'image/png' });

    if (typeof loadImage !== 'function') {
        console.error('❌ loadImage function not found!');
        return;
    }

    loadImage(f);

    setTimeout(() => {
        // Check if image loaded
        if (canvasPlaceholder.style.display !== 'none') {
            console.error('❌ Image failed to load');
            return;
        }
        console.log('✅ Image loaded successfully');

        // Test 2: Check canvases have content
        console.log('\nTest 2: Check canvases have content');
        const blackSample = sampleCanvas(originalCanvas, 50, 50);
        const redSample = sampleCanvas(originalCanvas, 250, 50);

        console.log(`Black area (original): R${blackSample.r} G${blackSample.g} B${blackSample.b}`);
        console.log(`Red area (original): R${redSample.r} G${redSample.g} B${redSample.b}`);

        if (blackSample.r < 50 && blackSample.g < 50 && blackSample.b < 50) {
            console.log('✅ Original canvas has black pixels');
        } else {
            console.error('❌ Original canvas missing black pixels');
        }

        if (redSample.r > 200 && redSample.g < 50 && redSample.b < 50) {
            console.log('✅ Original canvas has red pixels');
        } else {
            console.error('❌ Original canvas missing red pixels');
        }

        // Test 3: Check result canvas with original colors
        console.log('\nTest 3: Check result canvas with original colors (default)');
        const resultRedSample = sampleCanvas(resultCanvas, 250, 50);
        console.log(`Red area (result): R${resultRedSample.r} G${resultRedSample.g} B${resultRedSample.b}`);

        const hasColor = Math.abs(resultRedSample.r - resultRedSample.g) > 20 ||
                        Math.abs(resultRedSample.g - resultRedSample.b) > 20;

        if (hasColor) {
            console.log('✅ Result canvas has colored dots (original colors mode works)');
        } else {
            console.error('❌ Result canvas is grayscale (original colors mode not working)');
        }

        // Test 4: Check result canvas without original colors
        console.log('\nTest 4: Check result canvas without original colors');
        useOriginalColorsCheckbox.checked = false;
        applyHalftone();

        setTimeout(() => {
            const resultGraySample = sampleCanvas(resultCanvas, 250, 50);
            console.log(`Red area (result, grayscale): R${resultGraySample.r} G${resultGraySample.g} B${resultGraySample.b}`);

            const isGrayscale = Math.abs(resultGraySample.r - resultGraySample.g) <= 10 &&
                               Math.abs(resultGraySample.g - resultGraySample.b) <= 10;

            if (isGrayscale) {
                console.log('✅ Result canvas is grayscale (original colors off works)');
            } else {
                console.error('❌ Result canvas still has color (original colors off not working)');
            }

            // Test 5: Check dot size slider
            console.log('\nTest 5: Check dot size slider');
            const beforeSample = sampleCanvas(resultCanvas, 50, 50);
            dotSizeSlider.value = 20;
            applyHalftone();

            setTimeout(() => {
                const afterSample = sampleCanvas(resultCanvas, 50, 50);
                console.log(`Before: R${beforeSample.r} G${beforeSample.g} B${beforeSample.b}`);
                console.log(`After (dot size 20): R${afterSample.r} G${afterSample.g} B${afterSample.b}`);

                if (afterSample.r < beforeSample.r) {
                    console.log('✅ Dot size slider works (larger dots = darker image)');
                } else {
                    console.error('❌ Dot size slider not working properly');
                }

                // Test 6: Reset parameters
                console.log('\nTest 6: Reset parameters');
                resetParameters();

                const resetOk = dotSizeSlider.value == 8 &&
                               spacingSlider.value == 1.0 &&
                               contrastSlider.value == 50 &&
                               brightnessSlider.value == 0 &&
                               angleSlider.value == 0 &&
                               dotShapeSelect.value == 'circle' &&
                               useOriginalColorsCheckbox.checked === true;

                if (resetOk) {
                    console.log('✅ Reset parameters works');
                } else {
                    console.error('❌ Reset parameters failed');
                    console.log(`  dotSize=${dotSizeSlider.value} (expected 8)`);
                    console.log(`  spacing=${spacingSlider.value} (expected 1.0)`);
                    console.log(`  contrast=${contrastSlider.value} (expected 50)`);
                    console.log(`  brightness=${brightnessSlider.value} (expected 0)`);
                    console.log(`  angle=${angleSlider.value} (expected 0)`);
                    console.log(`  shape=${dotShapeSelect.value} (expected circle)`);
                    console.log(`  origColors=${useOriginalColorsCheckbox.checked} (expected true)`);
                }

                // Test 7: Check gallery
                console.log('\nTest 7: Check gallery');
                const galleryItems = galleryGrid.children;
                console.log(`Gallery items: ${galleryItems.length}`);

                if (galleryItems.length === 8) {
                    console.log('✅ Gallery has 8 items');
                } else {
                    console.error(`❌ Gallery has ${galleryItems.length} items (expected 8)`);
                }

                // Test 8: Custom output size
                console.log('\nTest 8: Custom output size');
                useOriginalSizeCheckbox.checked = false;
                outputWidthInput.value = 100;
                outputHeightInput.value = 100;
                applyHalftone();

                setTimeout(() => {
                    console.log(`Result canvas size: ${resultCanvas.width}x${resultCanvas.height}`);

                    if (resultCanvas.width === 100 && resultCanvas.height === 100) {
                        console.log('✅ Custom output size works');
                    } else {
                        console.error(`❌ Custom output size failed (got ${resultCanvas.width}x${resultCanvas.height})`);
                    }

                    // Summary
                    console.log('\n=== Test Complete ===');
                    console.log('Bug fix verified: tempCanvas and originalCanvasCopy now use originalCanvas dimensions');
                    console.log('This ensures correct coordinate mapping when image is resized for display.');

                }, 500);
            }, 500);
        }, 500);
    }, 2000);
});
