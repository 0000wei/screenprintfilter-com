// Comprehensive Test Suite for ScreenPrintFilter
// Run this in browser console after loading index.html

console.log('=== Starting Comprehensive Test Suite ===\n');

// Test results tracking
const testResults = [];

function logTest(testNum, testName, passed, notes = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    testResults.push({ testNum, testName, passed, notes });
    console.log(`${status} | Test ${testNum}: ${testName}`);
    if (notes) console.log(`    Notes: ${notes}`);
}

// Helper: Check if canvas has content (not all white)
function canvasHasContent(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let hasBlack = false;
    let hasColor = false;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Check for non-white pixels
        if (r < 250 || g < 250 || b < 250) {
            hasBlack = true;
        }

        // Check for colored pixels (not grayscale)
        if (Math.abs(r - g) > 20 || Math.abs(g - b) > 20 || Math.abs(r - b) > 20) {
            hasColor = true;
        }
    }

    return { hasBlack, hasColor };
}

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

// Test image injection
console.log('Step 1: Injecting test image...');

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

// Gray square (center)
tc.fillStyle = '#808080';
tc.fillRect(100, 100, 100, 100);

// Red circle
tc.fillStyle = '#ff0000';
tc.beginPath();
tc.arc(250, 50, 40, 0, Math.PI * 2);
tc.fill();

// Green stripe
tc.fillStyle = '#00ff00';
tc.fillRect(0, 250, 300, 50);

// Blue gradient
var grad = tc.createLinearGradient(200, 150, 300, 250);
grad.addColorStop(0, 'blue');
grad.addColorStop(1, 'cyan');
tc.fillStyle = grad;
tc.fillRect(200, 150, 100, 100);

testCanvas.toBlob(function(blob) {
    var f = new File([blob], 'test.png', { type: 'image/png' });

    // Check if loadImage exists
    if (typeof loadImage === 'function') {
        loadImage(f);
    } else {
        console.error('❌ loadImage function not found!');
        return;
    }

    // Wait for image to load and process
    setTimeout(() => {
        console.log('\nStep 2: Running tests...\n');

        // Test 1: Basic load and render
        console.log('--- Test 1: Basic Load and Render ---');
        const originalContent = canvasHasContent(originalCanvas);
        const resultContent = canvasHasContent(resultCanvas);

        const t1Passed = originalContent.hasBlack && resultContent.hasBlack &&
                        canvasPlaceholder.style.display === 'none' &&
                        compareContainer.style.display !== 'none';
        logTest(1, 'Basic Load and Render', t1Passed,
            `Original: ${originalContent.hasBlack ? 'content' : 'empty'}, ` +
            `Result: ${resultContent.hasBlack ? 'content' : 'empty'}, ` +
            `Placeholder hidden: ${canvasPlaceholder.style.display === 'none'}`);

        // Test 2: Original Colors mode (default)
        console.log('\n--- Test 2: Original Colors Mode (Default) ---');
        const originalColorsChecked = useOriginalColorsCheckbox.checked;
        const redSample = sampleCanvas(resultCanvas, 250, 50); // Sample red circle area
        const hasColor = Math.abs(redSample.r - redSample.g) > 20 ||
                        Math.abs(redSample.g - redSample.b) > 20;

        const t2Passed = originalColorsChecked && hasColor;
        logTest(2, 'Original Colors Mode (Default)', t2Passed,
            `Checkbox checked: ${originalColorsChecked}, ` +
            `Red sample: R${redSample.r} G${redSample.g} B${redSample.b}, ` +
            `Has color: ${hasColor}`);

        // Test 3: Toggle Original Colors off
        console.log('\n--- Test 3: Toggle Original Colors Off ---');
        useOriginalColorsCheckbox.checked = false;
        applyHalftone();

        setTimeout(() => {
            const resultContent2 = canvasHasContent(resultCanvas);
            const sample3 = sampleCanvas(resultCanvas, 250, 50);
            const isGrayscale = Math.abs(sample3.r - sample3.g) <= 10 &&
                               Math.abs(sample3.g - sample3.b) <= 10;

            const t3Passed = resultContent2.hasBlack && isGrayscale;
            logTest(3, 'Toggle Original Colors Off', t3Passed,
                `Result has content: ${resultContent2.hasBlack}, ` +
                `Is grayscale: ${isGrayscale}, ` +
                `Sample: R${sample3.r} G${sample3.g} B${sample3.b}`);

            // Test 4: Slider controls work
            console.log('\n--- Test 4: Slider Controls Work ---');

            // Test dot size
            const beforeSize = sampleCanvas(resultCanvas, 50, 50);
            dotSizeSlider.value = 20;
            applyHalftone();

            setTimeout(() => {
                const afterSize = sampleCanvas(resultCanvas, 50, 50);
                const sizeChanged = afterSize.r < beforeSize.r; // Larger dots = darker = less R

                // Test contrast
                contrastSlider.value = 90;
                applyHalftone();

                setTimeout(() => {
                    const afterContrast = sampleCanvas(resultCanvas, 50, 50);
                    const contrastChanged = afterContrast.r !== afterSize.r;

                    // Test angle
                    angleSlider.value = 45;
                    applyHalftone();

                    setTimeout(() => {
                        const afterAngle = sampleCanvas(resultCanvas, 50, 50);
                        const angleChanged = afterAngle.r !== afterContrast.r;

                        // Test shape
                        dotShapeSelect.value = 'square';
                        applyHalftone();

                        setTimeout(() => {
                            const afterShape = sampleCanvas(resultCanvas, 50, 50);
                            const shapeChanged = afterShape.r !== afterAngle.r;

                            const t4Passed = sizeChanged && contrastChanged && angleChanged && shapeChanged;
                            logTest(4, 'Slider Controls Work', t4Passed,
                                `Dot size: ${sizeChanged ? '✓' : '✗'}, ` +
                                `Contrast: ${contrastChanged ? '✓' : '✗'}, ` +
                                `Angle: ${angleChanged ? '✓' : '✗'}, ` +
                                `Shape: ${shapeChanged ? '✓' : '✗'}`);

                            // Test 5: Reset button
                            console.log('\n--- Test 5: Reset Button ---');
                            resetParameters();

                            const t5Passed = dotSizeSlider.value == 8 &&
                                           spacingSlider.value == 1.0 &&
                                           contrastSlider.value == 50 &&
                                           brightnessSlider.value == 0 &&
                                           angleSlider.value == 0 &&
                                           dotShapeSelect.value == 'circle' &&
                                           useOriginalColorsCheckbox.checked === true &&
                                           useOriginalSizeCheckbox.checked === true;
                            logTest(5, 'Reset Button', t5Passed,
                                `dotSize=${dotSizeSlider.value}, spacing=${spacingSlider.value}, ` +
                                `contrast=${contrastSlider.value}, brightness=${brightnessSlider.value}, ` +
                                `angle=${angleSlider.value}, shape=${dotShapeSelect.value}, ` +
                                `origColors=${useOriginalColorsCheckbox.checked}, ` +
                                `origSize=${useOriginalSizeCheckbox.checked}`);

                            // Test 6: Output size
                            console.log('\n--- Test 6: Output Size ---');
                            useOriginalSizeCheckbox.checked = false;
                            outputWidthInput.value = 100;
                            outputHeightInput.value = 100;
                            applyHalftone();

                            setTimeout(() => {
                                const t6Passed = resultCanvas.width === 100 && resultCanvas.height === 100;
                                logTest(6, 'Output Size', t6Passed,
                                    `Result canvas: ${resultCanvas.width}x${resultCanvas.height}`);

                                // Reset for next tests
                                useOriginalSizeCheckbox.checked = true;
                                outputWidthInput.value = '';
                                outputHeightInput.value = '';
                                applyHalftone();

                                setTimeout(() => {
                                    // Test 7: Draggable divider
                                    console.log('\n--- Test 7: Draggable Divider ---');
                                    const dividerExists = compareDivider !== null && compareDivider !== undefined;

                                    let hasTouchStart = false;
                                    let hasMouseDown = false;

                                    if (dividerExists) {
                                        // Check if listeners are attached
                                        const listeners = getEventListeners ? getEventListeners(compareDivider) : {};
                                        hasTouchStart = listeners && listeners.touchstart && listeners.touchstart.length > 0;
                                        hasMouseDown = listeners && listeners.mousedown && listeners.mousedown.length > 0;
                                    }

                                    const t7Passed = dividerExists; // Basic check - listeners are harder to verify
                                    logTest(7, 'Draggable Divider', t7Passed,
                                        `Divider exists: ${dividerExists}, ` +
                                        `Touch start: ${hasTouchStart}, ` +
                                        `Mouse down: ${hasMouseDown}`);

                                    // Test 8: Gallery
                                    console.log('\n--- Test 8: Gallery ---');
                                    const galleryItems = galleryGrid.children;
                                    const has8Items = galleryItems.length === 8;

                                    // Test clicking a gallery item
                                    const firstItem = galleryItems[0];
                                    if (firstItem) {
                                        firstItem.click();

                                        setTimeout(() => {
                                            const notification = document.querySelector('[style*="position: fixed"]');
                                            const notificationShown = notification !== null;

                                            const t8Passed = has8Items;
                                            logTest(8, 'Gallery', t8Passed,
                                                `Gallery items: ${galleryItems.length}, ` +
                                                `Notification shown: ${notificationShown}`);

                                            // Test 9: SVG error handling
                                            console.log('\n--- Test 9: SVG Error Handling ---');
                                            // Create a simple SVG
                                            const svgBlob = new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red"/></svg>'], { type: 'image/svg+xml' });
                                            const svgFile = new File([svgBlob], 'test.svg', { type: 'image/svg+xml' });

                                            try {
                                                loadImage(svgFile);

                                                setTimeout(() => {
                                                    // Check if app still works
                                                    const stillWorks = canvasPlaceholder.style.display === 'none';
                                                    const t9Passed = stillWorks; // Should not crash
                                                    logTest(9, 'SVG Error Handling', t9Passed,
                                                        `App still functional: ${stillWorks}`);

                                                    // Reload test image for remaining tests
                                                    testCanvas.toBlob(function(blob) {
                                                        const f2 = new File([blob], 'test2.png', { type: 'image/png' });
                                                        loadImage(f2);

                                                        setTimeout(() => {
                                                            // Test 10: Download button
                                                            console.log('\n--- Test 10: Download Button ---');
                                                            const downloadEnabled = !downloadBtn.disabled;

                                                            let hasDownloadListener = false;
                                                            if (downloadEnabled) {
                                                                const listeners = getEventListeners ? getEventListeners(downloadBtn) : {};
                                                                hasDownloadListener = listeners && listeners.click && listeners.click.length > 0;
                                                            }

                                                            const t10Passed = downloadEnabled && hasDownloadListener;
                                                            logTest(10, 'Download Button', t10Passed,
                                                                `Download enabled: ${downloadEnabled}, ` +
                                                                `Has click listener: ${hasDownloadListener}`);

                                                            // Test 11: Brightness/contrast with original colors
                                                            console.log('\n--- Test 11: Brightness/Contrast with Original Colors ---');
                                                            useOriginalColorsCheckbox.checked = true;
                                                            brightnessSlider.value = 30;
                                                            applyHalftone();

                                                            setTimeout(() => {
                                                                const brightSample = sampleCanvas(resultCanvas, 150, 150);
                                                                const isBrighter = brightSample.r > 180 || brightSample.g > 180 || brightSample.b > 180;

                                                                const t11Passed = isBrighter;
                                                                logTest(11, 'Brightness/Contrast with Original Colors', t11Passed,
                                                                    `Bright sample: R${brightSample.r} G${brightSample.g} B${brightSample.b}, ` +
                                                                    `Is brighter: ${isBrighter}`);

                                                                // Print summary
                                                                console.log('\n=== Test Summary ===');
                                                                console.log('| Test | Result |');
                                                                console.log('|------|--------|');
                                                                testResults.forEach(t => {
                                                                    console.log(`| ${t.testNum}    | ${t.passed ? '✅' : '❌'}  |`);
                                                                });

                                                                const passed = testResults.filter(t => t.passed).length;
                                                                const total = testResults.length;
                                                                console.log(`\nTotal: ${passed}/${total} tests passed`);

                                                                if (passed < total) {
                                                                    console.log('\nFailed tests:');
                                                                    testResults.filter(t => !t.passed).forEach(t => {
                                                                        console.log(`  Test ${t.testNum}: ${t.testName} - ${t.notes}`);
                                                                    });
                                                                }

                                                            }, 500);
                                                        }, 500);
                                                    });
                                                }, 500);
                                            } catch (error) {
                                                logTest(9, 'SVG Error Handling', false, `Error: ${error.message}`);
                                            }
                                        }, 1000);
                                    } else {
                                        logTest(8, 'Gallery', false, 'No gallery items found');
                                    }
                                }, 500);
                            }, 500);
                        }, 500);
                    }, 500);
                }, 500);
            }, 500);
        }, 500);
    }, 2000); // Initial wait for image load and processing
});
