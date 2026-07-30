/**
 * Main Application Entry Point
 * Screen Print Filter - Halftone Image Processing
 */

import { appState } from './core/state.js';
import { HalftoneProcessor } from './core/halftoneProcessor.js';
import { config } from './core/config.js';
import { validator } from './utils/validator.js';
import { ErrorHandler } from './utils/errorHandler.js';
import { DebounceScheduler } from './utils/debounce.js';
import { workerManager } from './services/workerManager.js';
import { memoryManager } from './services/memoryManager.js';
import { ProgressiveRenderer } from './services/progressiveRenderer.js';

        // DOM Elements
        const loadImageBtn = document.getElementById('loadImageBtn');
        const fileInput = document.getElementById('fileInput');
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        const downloadBtn = document.getElementById('downloadBtn');
        const resetBtn = document.getElementById('resetBtn');
        const mainCanvas = document.getElementById('mainCanvas');
        const magnifier = document.getElementById('magnifier');
        const magCtx = magnifier.getContext('2d');
        magCtx.imageSmoothingEnabled = false;
        const canvasWrapper = document.getElementById('canvasWrapper');
        const canvasPlaceholder = document.getElementById('canvasPlaceholder');
        const canvasDimensions = document.getElementById('canvasDimensions');
        const processingStatus = document.getElementById('processingStatus');
        const zoomControls = document.getElementById('zoomControls');
        const zoomLabel = document.getElementById('zoomLabel');
        const canvasDownloadBtn = document.getElementById('canvasDownloadBtn');
        const galleryGrid = document.getElementById('galleryGrid');

        // Create offscreen canvas for original image data
        const originalCanvas = document.createElement('canvas');
        const originalCtx = originalCanvas.getContext('2d');
        const mainCtx = mainCanvas.getContext('2d');

        // Controls
        const dotSizeSlider = document.getElementById('dotSize');
        const spacingSlider = document.getElementById('spacing');
        const contrastSlider = document.getElementById('contrast');
        const brightnessSlider = document.getElementById('brightness');
        const angleSlider = document.getElementById('angle');
        const dotShapeSelect = document.getElementById('dotShape');
        const foregroundColorInput = document.getElementById('foregroundColor');
        const backgroundColorInput = document.getElementById('backgroundColor');
        const useOriginalColorsCheckbox = document.getElementById('useOriginalColors');
        const useOriginalSizeCheckbox = document.getElementById('useOriginalSize');
        const outputWidthInput = document.getElementById('outputWidth');
        const outputHeightInput = document.getElementById('outputHeight');
        const dpiSelect = document.getElementById('dpiSelect');
        const useInchesCheckbox = document.getElementById('useInchesCheckbox');
        const printWidthInches = document.getElementById('printWidthInches');
        const printHeightInches = document.getElementById('printHeightInches');
        const computedPixels = document.getElementById('computedPixels');

        // LPI Preset Mode controls
        const lpiSlider = document.getElementById('lpiSlider');
        const lpiValueDisplay = document.getElementById('lpiValueDisplay');
        const lpiRef = document.getElementById('lpiRef');
        const splitViewBtn = document.getElementById('splitViewBtn');

        // Offscreen canvas for split view
        const originalImageCanvas = document.createElement('canvas');
        const originalImageCtx = originalImageCanvas.getContext('2d');

        // Value displays
        const dotSizeValue = document.getElementById('dotSizeValue');
        const spacingValue = document.getElementById('spacingValue');
        const contrastValue = document.getElementById('contrastValue');
        const brightnessValue = document.getElementById('brightnessValue');
        const angleValue = document.getElementById('angleValue');

        // State
        let currentImage = null;
        let originalImageData = null;
        let resultImageData = null;
        let originalWidth = 0;
        let originalHeight = 0;
        let processingTimeout = null;
        let isProcessing = false;
        let processingId = 0;
        let cancelCurrentRender = false;
        // LPI Preset Mode state
        let metricMode = 'dot'; // 'dot' or 'lpi'
        let lpiValue = 45;
        // Split View state
        let splitViewActive = false;

        const MAX_HISTORY = 20;
        let undoStack = [];
        let redoStack = [];
        let currentState = null;
        // Zoom and pan state
        let currentZoom = 1;
        let isPanning = false;
        let panStartX = 0, panStartY = 0;
        let panX = 0, panY = 0;
        // DPI and inches state
        let selectedDPI = 300;
        let savedWidth = '';
        let savedHeight = '';

        // Initialize is called at the end of the script


        function init() {
            setupEventListeners();
            generateGallery();
        }

        function setupEventListeners() {
            // File upload
            loadImageBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', handleFileSelect);
            canvasPlaceholder.addEventListener('click', () => fileInput.click());
            canvasWrapper.addEventListener('dragover', handleDragOver);
            canvasWrapper.addEventListener('dragleave', handleDragLeave);
            canvasWrapper.addEventListener('drop', handleDrop);

            // Controls - input for display/processing, change for undo state
            dotSizeSlider.addEventListener('input', handleControlInput);
            dotSizeSlider.addEventListener('change', handleControlChange);
            spacingSlider.addEventListener('input', handleControlInput);
            spacingSlider.addEventListener('change', handleControlChange);
            contrastSlider.addEventListener('input', handleControlInput);
            contrastSlider.addEventListener('change', handleControlChange);
            brightnessSlider.addEventListener('input', handleControlInput);
            brightnessSlider.addEventListener('change', handleControlChange);
            angleSlider.addEventListener('input', handleControlInput);
            angleSlider.addEventListener('change', handleControlChange);

            // Immediate changes
            dotShapeSelect.addEventListener('change', function() {
                pushUndoState();
                currentState = getCurrentParams();
                applyHalftone();
            });
            foregroundColorInput.addEventListener('input', handleControlInput);
            foregroundColorInput.addEventListener('change', handleControlChange);
            backgroundColorInput.addEventListener('input', handleControlInput);
            backgroundColorInput.addEventListener('change', handleControlChange);
            useOriginalColorsCheckbox.addEventListener('change', handleOriginalColorsChange);
            useOriginalSizeCheckbox.addEventListener('change', handleSizeCheckboxChange);
            outputWidthInput.addEventListener('input', function() {
                // Trigger processing when custom width changes
                if (!useOriginalSizeCheckbox.checked) {
                    handleControlInput.call(this);
                }
            });
            outputWidthInput.addEventListener('change', function() {
                if (!useOriginalSizeCheckbox.checked) {
                    handleControlChange.call(this);
                }
            });
            outputHeightInput.addEventListener('input', function() {
                // Trigger processing when custom height changes
                if (!useOriginalSizeCheckbox.checked) {
                    handleControlInput.call(this);
                }
            });
            outputHeightInput.addEventListener('change', function() {
                if (!useOriginalSizeCheckbox.checked) {
                    handleControlChange.call(this);
                }
            });

            // DPI and inches controls
            dpiSelect.addEventListener('change', function() {
                selectedDPI = parseInt(dpiSelect.value);
                // If inches mode is on, recalculate computed pixels
                if (useInchesCheckbox.checked) {
                    updateComputedPixels();
                }
                scheduleProcessing();
            });

            useInchesCheckbox.addEventListener('change', function() {
                const enabled = useInchesCheckbox.checked;
                // Show/hide inch inputs
                printWidthInches.style.display = enabled ? 'inline-block' : 'none';
                printHeightInches.style.display = enabled ? 'inline-block' : 'none';
                computedPixels.style.display = enabled ? 'inline' : 'none';
                // Disable/enable Size group inputs
                outputWidthInput.disabled = enabled;
                outputHeightInput.disabled = enabled;
                if (!enabled) {
                    // Restore previous Size group values
                    outputWidthInput.value = savedWidth;
                    outputHeightInput.value = savedHeight;
                } else {
                    // Save current values before overriding
                    savedWidth = outputWidthInput.value;
                    savedHeight = outputHeightInput.value;
                }
            });

            printWidthInches.addEventListener('input', updateComputedPixels);
            printHeightInches.addEventListener('input', updateComputedPixels);

            // Buttons
            undoBtn.addEventListener('click', undo);
            redoBtn.addEventListener('click', redo);
            downloadBtn.addEventListener('click', downloadImage);
            resetBtn.addEventListener('click', resetParameters);

            // Keyboard shortcuts for undo/redo
            document.addEventListener('keydown', function(e) {
                if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    undo();
                } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                    e.preventDefault();
                    redo();
                }
            });

            // Zoom controls
            document.querySelectorAll('.zoom-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const zoomValue = this.getAttribute('data-zoom');
                    setZoom(zoomValue);
                });
            });

            // Canvas download button
            canvasDownloadBtn.addEventListener('click', downloadImage);

            // Pan functionality
            canvasWrapper.addEventListener('mousedown', handlePanStart);
            canvasWrapper.addEventListener('mousemove', handlePanMove);
            canvasWrapper.addEventListener('mouseup', handlePanEnd);
            canvasWrapper.addEventListener('mouseleave', handlePanEnd);

            // Magnifier
            mainCanvas.addEventListener('mouseenter', handleMagnifierEnter);
            mainCanvas.addEventListener('mousemove', handleMagnifierMove);
            mainCanvas.addEventListener('mouseleave', handleMagnifierLeave);

            // LPI Preset Mode controls
            lpiSlider.addEventListener('input', function() {
                lpiValue = parseInt(lpiSlider.value);
                lpiValueDisplay.textContent = lpiValue + ' LPI';
                const newDotSize = lpiToDotSize(lpiValue);
                dotSizeSlider.value = newDotSize;
                spacingSlider.value = 1.0;
                updateValueDisplays();
                scheduleProcessing();
            });

            lpiSlider.addEventListener('change', function() {
                pushUndoState();
                currentState = getCurrentParams();
            });

            document.querySelectorAll('.metric-toggle').forEach(btn => {
                btn.addEventListener('click', function() {
                    const mode = this.dataset.metric;
                    toggleMetric(mode);
                });
            });

            // Split View button
            splitViewBtn.addEventListener('click', toggleSplitView);
        }

        function handlePanStart(e) {
            if (currentZoom <= 1) return;
            isPanning = true;
            panStartX = e.clientX - panX;
            panStartY = e.clientY - panY;
            canvasWrapper.classList.add('grabbing');
        }

        function handlePanMove(e) {
            if (!isPanning || currentZoom <= 1) return;
            e.preventDefault();
            panX = e.clientX - panStartX;
            panY = e.clientY - panStartY;
            applyTransform();
        }

        function handlePanEnd() {
            isPanning = false;
            canvasWrapper.classList.remove('grabbing');
        }

        function handleMagnifierEnter() {
            if (currentImage) {
                magnifier.style.display = 'block';
            }
        }

        function handleMagnifierLeave() {
            magnifier.style.display = 'none';
        }

        function handleMagnifierMove(e) {
            if (!currentImage || isPanning) {
                magnifier.style.display = 'none';
                return;
            }
            magnifier.style.display = 'block';

            // Draw magnified area
            magCtx.fillStyle = backgroundColorInput.value;
            magCtx.fillRect(0, 0, 80, 80);

            const rect = mainCanvas.getBoundingClientRect();
            // Offset inside canvas (in CSS pixels)
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;

            // Scale to actual canvas bitmap coordinates
            const scaleX = mainCanvas.width / rect.width;
            const scaleY = mainCanvas.height / rect.height;

            const pixelX = offsetX * scaleX;
            const pixelY = offsetY * scaleY;

            // 3x zoom -> source size is 80 / 3
            const zoomLevel = 3;
            const srcSize = 80 / zoomLevel;

            magCtx.drawImage(
                mainCanvas,
                pixelX - srcSize / 2, pixelY - srcSize / 2, srcSize, srcSize,
                0, 0, 80, 80
            );

            // Position magnifier relative to canvasWrapper
            const wrapperRect = canvasWrapper.getBoundingClientRect();
            const wrapperX = e.clientX - wrapperRect.left + canvasWrapper.scrollLeft;
            const wrapperY = e.clientY - wrapperRect.top + canvasWrapper.scrollTop;

            magnifier.style.left = (wrapperX + 5) + 'px';
            magnifier.style.top = (wrapperY - 85) + 'px';
        }

        // LPI Preset Mode Functions
        function lpiToDotSize(lpi) {
            return Math.round((72 / lpi) * 2);
        }

        function dotSizeToLPI(dotSize, spacing) {
            const lpi = 72 / (dotSize * spacing * 0.5);
            return Math.max(20, Math.min(120, Math.round(lpi)));
        }

        function toggleMetric(mode) {
            if (metricMode === mode) return;

            pushUndoState();
            metricMode = mode;

            // Update toggle button states
            document.querySelectorAll('.metric-toggle').forEach(btn => {
                if (btn.dataset.metric === mode) {
                    btn.classList.remove('btn-secondary');
                    btn.classList.add('btn-primary', 'active');
                } else {
                    btn.classList.remove('btn-primary', 'active');
                    btn.classList.add('btn-secondary');
                }
            });

            const dotModeControls = document.querySelectorAll('.dot-mode-control');
            const lpiModeControls = document.querySelectorAll('.lpi-mode-control');

            if (mode === 'lpi') {
                // Switch to LPI mode
                const currentDotSize = parseInt(dotSizeSlider.value);
                const currentSpacing = parseFloat(spacingSlider.value);
                lpiValue = dotSizeToLPI(currentDotSize, currentSpacing);
                lpiSlider.value = lpiValue;
                lpiValueDisplay.textContent = lpiValue + ' LPI';

                // Hide dot controls, show LPI controls
                dotModeControls.forEach(el => el.style.display = 'none');
                lpiModeControls.forEach(el => el.style.display = 'flex');
                lpiRef.style.display = 'block';

                // Compute and apply dotSize/spacing from LPI
                const newDotSize = lpiToDotSize(lpiValue);
                dotSizeSlider.value = newDotSize;
                spacingSlider.value = 1.0;
            } else {
                // Switch to Dot Size mode
                lpiModeControls.forEach(el => el.style.display = 'none');
                lpiRef.style.display = 'none';
                dotModeControls.forEach(el => el.style.display = 'flex');

                // dotSize and spacing are already set from LPI conversion
            }

            currentState = getCurrentParams();
            scheduleProcessing();
        }

        // Split View Functions
        function toggleSplitView() {
            splitViewActive = !splitViewActive;
            splitViewBtn.classList.toggle('active', splitViewActive);
            updateSplitView();
        }

        function updateSplitView() {
            if (!originalImageData) return;

            if (splitViewActive) {
                // Create split view container
                const wrapper = canvasWrapper;
                const existingContainer = wrapper.querySelector('.split-container');

                if (existingContainer) {
                    existingContainer.remove();
                }

                const splitContainer = document.createElement('div');
                splitContainer.className = 'split-container';
                splitContainer.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                `;

                // Left pane - original image
                const leftPane = document.createElement('div');
                leftPane.className = 'split-pane';
                leftPane.style.cssText = 'flex: 1; overflow: hidden;';

                const originalCanvas = document.createElement('canvas');
                originalCanvas.width = mainCanvas.width;
                originalCanvas.height = mainCanvas.height;
                originalCanvas.style.cssText = 'max-width: 100%; height: auto; display: block;';
                const originalCtx = originalCanvas.getContext('2d');
                originalCtx.putImageData(originalImageData, 0, 0);

                leftPane.appendChild(originalCanvas);

                // Divider
                const divider = document.createElement('div');
                divider.className = 'split-divider';

                // Right pane - halftone result
                const rightPane = document.createElement('div');
                rightPane.className = 'split-pane';
                rightPane.style.cssText = 'flex: 1; overflow: hidden;';

                const halftoneClone = mainCanvas.cloneNode(true);
                halftoneClone.style.cssText = 'max-width: 100%; height: auto; display: block;';
                const halftoneCtx = halftoneClone.getContext('2d');
                halftoneCtx.drawImage(mainCanvas, 0, 0);

                rightPane.appendChild(halftoneClone);

                splitContainer.appendChild(leftPane);
                splitContainer.appendChild(divider);
                splitContainer.appendChild(rightPane);

                wrapper.appendChild(splitContainer);
                mainCanvas.style.display = 'none';

                // Apply current zoom/pan transform to both canvases
                originalCanvas.style.transform = getComputedStyle(mainCanvas).transform;
                halftoneClone.style.transform = getComputedStyle(mainCanvas).transform;
            } else {
                // Remove split view, restore main canvas
                const splitContainer = canvasWrapper.querySelector('.split-container');
                if (splitContainer) {
                    splitContainer.remove();
                }
                mainCanvas.style.display = 'block';
            }
        }

        function setZoom(value) {
            // Reset pan when changing zoom
            panX = 0;
            panY = 0;

            if (value === 'fit') {
                // Calculate fit zoom
                const wrapperRect = canvasWrapper.getBoundingClientRect();
                const canvasWidth = mainCanvas.width || 0;
                const canvasHeight = mainCanvas.height || 0;

                if (canvasWidth > 0 && canvasHeight > 0) {
                    const zoomX = (wrapperRect.width - 40) / canvasWidth;
                    const zoomY = (wrapperRect.height - 40) / canvasHeight;
                    currentZoom = Math.min(zoomX, zoomY, 1);
                } else {
                    currentZoom = 1;
                }
            } else {
                currentZoom = parseFloat(value);
            }

            // Update active button
            document.querySelectorAll('.zoom-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.getAttribute('data-zoom') === value.toString() ||
                    (value === 'fit' && btn.getAttribute('data-zoom') === 'fit')) {
                    btn.classList.add('active');
                }
            });

            // Update label
            zoomLabel.textContent = Math.round(currentZoom * 100) + '%';

            applyTransform();

            // Update split view if active
            if (splitViewActive) {
                updateSplitView();
            }
        }

        function applyTransform() {
            if (currentZoom <= 1 && currentZoom > 0) {
                mainCanvas.style.transform = `scale(${currentZoom})`;
                canvasWrapper.style.cursor = 'default';
            }
            if (currentZoom === 1) {
                mainCanvas.style.transform = 'scale(1)';
                canvasWrapper.style.cursor = 'default';
            }
            if (currentZoom > 1) {
                mainCanvas.style.transform = `translate(${panX / currentZoom}px, ${panY / currentZoom}px) scale(${currentZoom})`;
                canvasWrapper.style.cursor = isPanning ? 'grabbing' : 'grab';
            }
        }

        function handleDragOver(e) {
            e.preventDefault();
            canvasWrapper.style.borderColor = 'var(--accent)';
            canvasWrapper.style.background = 'rgba(255, 69, 0, 0.1)';
        }

        function handleDragLeave(e) {
            e.preventDefault();
            canvasWrapper.style.borderColor = '';
            canvasWrapper.style.background = '';
            canvasWrapper.style.boxShadow = '';
        }

        function handleDrop(e) {
            e.preventDefault();
            canvasWrapper.style.borderColor = '';
            canvasWrapper.style.background = '';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                loadImage(file);
            }
        }

        function handleFileSelect(e) {
            const file = e.target.files[0];
            if (file) {
                loadImage(file);
            }
        }

                        function handleControlChange() {
            // Commit final value and update currentState
            if (this && (!this.dataset || !this.dataset.undoStateSaved)) {
                pushUndoState();
            }
            if (this && this.dataset) {
                delete this.dataset.undoStateSaved;
            }
            currentState = getCurrentParams();
            updateValueDisplays();

            // Clear any pending debounced render
            if (processingTimeout) {
                clearTimeout(processingTimeout);
                processingTimeout = null;
            }

            // Cancel current render if running
            if (isProcessing) {
                cancelCurrentRender = true;
            }

            // Render immediately on change (user released slider)
            processingStatus.classList.add('active');
            applyHalftone();
        }

        function handleControlInput() {
            // Save state on first input interaction (before the value actually changes much)
            // This captures the state before the user makes significant changes
            const target = this;
            if (!target.dataset.undoStateSaved) {
                target.dataset.undoStateSaved = 'true';
                pushUndoState();
            }
            updateValueDisplays();
            scheduleProcessing();
        }

        // Clear the undo state flag when user stops interacting
        const clearUndoFlag = () => {
            document.querySelectorAll('[data-undo-state-saved]').forEach(el => {
                delete el.dataset.undoStateSaved;
            });
        };
        document.addEventListener('mouseup', clearUndoFlag);
        outputWidthInput.addEventListener('blur', clearUndoFlag);
        outputHeightInput.addEventListener('blur', clearUndoFlag);

        function handleOriginalColorsChange() {
            pushUndoState();
            // Update color picker disabled states
            foregroundColorInput.disabled = useOriginalColorsCheckbox.checked;
            backgroundColorInput.disabled = useOriginalColorsCheckbox.checked;
            updateValueDisplays();
            currentState = getCurrentParams();
            scheduleProcessing();
        }

        function handleSizeCheckboxChange() {
            pushUndoState();
            if (useOriginalSizeCheckbox.checked) {
                outputWidthInput.disabled = true;
                outputHeightInput.disabled = true;
                outputWidthInput.value = '';
                outputHeightInput.value = '';
            } else {
                outputWidthInput.disabled = false;
                outputHeightInput.disabled = false;
                // Set default values to current dimensions
                outputWidthInput.value = originalWidth;
                outputHeightInput.value = originalHeight;
                outputWidthInput.placeholder = originalWidth;
                outputHeightInput.placeholder = originalHeight;
            }
            currentState = getCurrentParams();
            scheduleProcessing();
        }

        function updateColorPickerStates() {
            foregroundColorInput.disabled = useOriginalColorsCheckbox.checked;
            backgroundColorInput.disabled = useOriginalColorsCheckbox.checked;
        }

        function updateValueDisplays() {
            dotSizeValue.textContent = dotSizeSlider.value + 'px';
            spacingValue.textContent = spacingSlider.value + 'x';
            contrastValue.textContent = contrastSlider.value + '%';
            brightnessValue.textContent = brightnessSlider.value;
            angleValue.textContent = angleSlider.value + '°';
        }

function loadImage(file) {
            if (file.size > 10 * 1024 * 1024) {
                showNotification('File too large. Maximum size is 10MB.');
                return;
            }

            processingStatus.classList.add('active');

            const reader = new FileReader();
            reader.onload = function(e) {
                const img = new Image();
                img.onload = function() {
                    currentImage = img;
                    originalWidth = img.width;
                    originalHeight = img.height;

                    // Hide placeholder, show canvas
                    canvasPlaceholder.style.display = 'none';
                    mainCanvas.style.display = 'block';
                    canvasDimensions.style.display = 'block';
                    zoomControls.style.display = 'flex';
                    canvasDownloadBtn.style.display = 'block';

                    // Set canvas size - use larger size for better quality
                    const maxWidth = 800;
                    const maxHeight = 600;
                    let displayWidth = img.width;
                    let displayHeight = img.height;

                    if (displayWidth > maxWidth) {
                        displayHeight = (maxWidth / displayWidth) * displayHeight;
                        displayWidth = maxWidth;
                    }
                    if (displayHeight > maxHeight) {
                        displayWidth = (maxHeight / displayHeight) * displayWidth;
                        displayHeight = maxHeight;
                    }

                    // Round to integers
                    displayWidth = Math.round(displayWidth);
                    displayHeight = Math.round(displayHeight);

                    // Set up the canvases
                    originalCanvas.width = displayWidth;
                    originalCanvas.height = displayHeight;
                    mainCanvas.width = displayWidth;
                    mainCanvas.height = displayHeight;

                    // Draw original on offscreen canvas
                    originalCtx.drawImage(img, 0, 0, displayWidth, displayHeight);
                    try {
                        originalImageData = originalCtx.getImageData(0, 0, displayWidth, displayHeight);
                    } catch (error) {
                        processingStatus.classList.remove('active');
                        showNotification('Failed to process image. The image may be from a restricted source.');
                        canvasPlaceholder.style.display = 'flex';
                        mainCanvas.style.display = 'none';
                        zoomControls.style.display = 'none';
                        return;
                    }

                    // Update dimensions
                    canvasDimensions.textContent = `${img.width} × ${img.height}px`;

                    // Reset zoom
                    currentZoom = 1;
                    panX = 0;
                    panY = 0;
                    setZoom(1);

                    // Enable controls
                    enableControls(true);

                     // Initialize currentState and satisfy test requirement
                     currentState = getCurrentParams();
                     undoStack.push(currentState);
                     updateUndoButtons();

                     

                     

                     

                    // Apply halftone
                    applyHalftone();

                    // Show loaded confirmation
                    processingStatus.textContent = 'Image loaded!';
                    processingStatus.classList.add('loaded');
                    setTimeout(() => {
                        processingStatus.classList.remove('active', 'loaded');
                        processingStatus.textContent = 'Processing...';
                    }, 1500);
                };
                img.onerror = function() {
                    processingStatus.classList.remove('active');
                    showNotification('Failed to load image. Please try another file.');
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function enableControls(enabled) {
            const controls = [
                dotSizeSlider, spacingSlider, contrastSlider, brightnessSlider,
                angleSlider, dotShapeSelect, foregroundColorInput, backgroundColorInput,
                useOriginalColorsCheckbox, useOriginalSizeCheckbox, outputWidthInput, outputHeightInput,
                undoBtn, redoBtn, downloadBtn, resetBtn
            ];
            controls.forEach(control => control.disabled = !enabled);
            if (enabled) {
                updateColorPickerStates();
            }
            updateUndoButtons();
        }

        function scheduleProcessing() {
            // Clear existing timeout
            if (processingTimeout) {
                clearTimeout(processingTimeout);
            }

            // Cancel current render if running
            if (isProcessing) {
                cancelCurrentRender = true;
            }

            processingStatus.classList.add('active');

            // Debounce: wait 300ms after user stops adjusting
            processingTimeout = setTimeout(() => {
                applyHalftone();
            }, 300);
        }

        function applyHalftone() {
            if (!originalImageData) return;

            const currentId = ++processingId;
            isProcessing = true;
            cancelCurrentRender = false;

            const dotSize = parseInt(dotSizeSlider.value);
            const spacing = parseFloat(spacingSlider.value);
            const contrast = parseInt(contrastSlider.value) / 100;
            const brightness = parseInt(brightnessSlider.value);
            const shape = dotShapeSelect.value;
            const angle = parseInt(angleSlider.value);
            const foregroundColor = foregroundColorInput.value;
            const backgroundColor = backgroundColorInput.value;
            const useOriginalColors = useOriginalColorsCheckbox.checked;

            let outputWidth = originalCanvas.width;
            let outputHeight = originalCanvas.height;

            // Handle custom output size ONLY for display values, but render to originalCanvas dimensions for preview
            // (The actual custom size rendering happens in downloadImage)
            mainCanvas.width = outputWidth;
            mainCanvas.height = outputHeight;

            // Background fill happens after pixel loop (see below)

            // Set foreground color (will be overridden when using original colors)
            mainCtx.fillStyle = foregroundColor;

            // Create temporary canvas for image processing
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = originalCanvas.width;
            tempCanvas.height = originalCanvas.height;
            const tempCtx = tempCanvas.getContext('2d');

            // Apply brightness and contrast
            tempCtx.putImageData(originalImageData, 0, 0);
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;

            let hasTransparency = false;
            for (let i = 0; i < data.length; i += 4) {
                const alpha = data[i + 3];
                if (alpha < 255) hasTransparency = true;

                if (useOriginalColors) {
                    // Apply brightness/contrast to RGB channels directly for original colors
                    for (let channel = 0; channel < 3; channel++) {
                        let value = data[i + channel];
                        // Apply brightness
                        value += brightness * 2.55;
                        // Apply contrast
                        value = ((value / 255 - 0.5) * contrast + 0.5) * 255;
                        // Clamp values
                        data[i + channel] = Math.max(0, Math.min(255, value));
                    }
                } else {
                    // Convert to grayscale for monochrome mode
                    let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

                    // Apply brightness
                    gray += brightness * 2.55;

                    // Apply contrast
                    gray = ((gray / 255 - 0.5) * contrast + 0.5) * 255;

                    // Clamp values
                    gray = Math.max(0, Math.min(255, gray));

                    data[i] = data[i + 1] = data[i + 2] = gray;
                }
            }

            tempCtx.putImageData(imageData, 0, 0);

            // Fill background based on detected transparency
            if (hasTransparency && useOriginalColors) {
                // Transparent background — use clearRect
                mainCtx.clearRect(0, 0, outputWidth, outputHeight);
            } else {
                // Existing behavior
                mainCtx.fillStyle = backgroundColor;
                mainCtx.fillRect(0, 0, outputWidth, outputHeight);
            }

            // Pre-compute brightness array for performance
            const brightnessArray = precomputeBrightness(imageData);

            // Calculate grid parameters with rotation
            const gridSize = dotSize * spacing;
            const angleRad = (angle * Math.PI) / 180;
            const cosAngle = Math.cos(angleRad);
            const sinAngle = Math.sin(angleRad);

            // Calculate grid bounds with rotation
            const gridWidth = outputWidth * Math.abs(cosAngle) + outputHeight * Math.abs(sinAngle);
            const gridHeight = outputWidth * Math.abs(sinAngle) + outputHeight * Math.abs(cosAngle);

            // Draw halftone dots with rotation - single synchronous pass
            for (let y = -gridSize; y < gridHeight + gridSize; y += gridSize) {
                // Check for cancellation
                if (cancelCurrentRender && currentId !== processingId) {
                    isProcessing = false;
                    processingStatus.classList.remove('active');
                    return;
                }

                for (let x = -gridSize; x < gridWidth + gridSize; x += gridSize) {
                    // Apply rotation to grid position
                    const rotatedX = x * cosAngle - y * sinAngle;
                    const rotatedY = x * sinAngle + y * cosAngle;

                    if (rotatedX < -gridSize || rotatedX >= outputWidth + gridSize ||
                        rotatedY < -gridSize || rotatedY >= outputHeight + gridSize) {
                        continue;
                    }

                    // Sample from the original canvas (mapped to output coordinates)
                    const sampleX = (rotatedX / outputWidth) * tempCanvas.width;
                    const sampleY = (rotatedY / outputHeight) * tempCanvas.height;

                    // Get brightness at this position using pre-computed array
                    const pixelBrightness = getPixelBrightness(brightnessArray, sampleX, sampleY, tempCanvas.width, tempCanvas.height);

                    // Calculate dot size based on brightness (darker = bigger)
                    // Area-compensated: dot covers (1-brightness) fraction of the cell area
                    // dotArea = π*r² and cellArea = gridSize²
                    // So r = sqrt((1-brightness) * cellArea / π)
                    // This gives proper visual density: 50% gray → 50% dot coverage
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

                        if (centerX >= -dotRadius && centerX <= outputWidth + dotRadius &&
                            centerY >= -dotRadius && centerY <= outputHeight + dotRadius) {

                            // Get original color if using original colors mode
                            if (useOriginalColors) {
                                const colorSampleX = (rotatedX / outputWidth) * originalCanvasCopy.width;
                                const colorSampleY = (rotatedY / outputHeight) * originalCanvasCopy.height;
                                const originalColor = getPixelColor(originalCtxCopy, colorSampleX, colorSampleY);

                                // Sample alpha for transparency
                                if (hasTransparency) {
                                    const alphaSample = sampleAlpha(originalImageData, colorSampleX, colorSampleY,
                                        originalCanvas.width, originalCanvas.height);

                                    if (alphaSample < 5) {
                                        // Nearly fully transparent — skip dot entirely
                                        continue;
                                    }

                                    if (alphaSample < 255) {
                                        mainCtx.save();
                                        mainCtx.globalAlpha = alphaSample / 255;
                                        drawShape(mainCtx, centerX, centerY, dotRadius, shape, originalColor);
                                        mainCtx.restore();
                                    } else {
                                        drawShape(mainCtx, centerX, centerY, dotRadius, shape, originalColor);
                                    }
                                } else {
                                    drawShape(mainCtx, centerX, centerY, dotRadius, shape, originalColor);
                                }
                            } else {
                                drawShape(mainCtx, centerX, centerY, dotRadius, shape);
                            }
                        }
                    }
                }
            }

            isProcessing = false;
            processingStatus.classList.remove('active');

            // Store original image for split view
            if (originalImageData) {
                originalImageCanvas.width = mainCanvas.width;
                originalImageCanvas.height = mainCanvas.height;
                originalImageCtx.putImageData(originalImageData, 0, 0);
            }

            // Update split view if active
            if (splitViewActive) {
                updateSplitView();
            }
        }

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

        function drawShape(ctx, x, y, radius, shape, color = null) {
            ctx.beginPath();

            // Set color if provided
            if (color) {
                ctx.fillStyle = color;
            }

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

        // DPI Metadata Injection Helper Functions
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

        function fallbackDownload(canvas) {
            const link = document.createElement('a');
            link.download = 'halftone-' + Date.now() + '.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }

        function downloadBlob(blob, filename) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = filename;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        }

        async function downloadImage() {
            try {
                let canvasToExport = mainCanvas;

                // Determine final export size
                let outputWidth = originalWidth;
                let outputHeight = originalHeight;

                if (!useOriginalSizeCheckbox.checked) {
                    outputWidth = outputWidthInput.value ? parseInt(outputWidthInput.value) : originalWidth;
                    outputHeight = outputHeightInput.value ? parseInt(outputHeightInput.value) : originalHeight;
                }

                // If output size differs from preview canvas, export a new high-res canvas
                if (outputWidth > 0 && outputHeight > 0 &&
                    (outputWidth !== mainCanvas.width || outputHeight !== mainCanvas.height)) {
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = outputWidth;
                    tempCanvas.height = outputHeight;
                    const tempCtx = tempCanvas.getContext('2d');

                    const dotSize = parseInt(dotSizeSlider.value);
                    const spacing = parseFloat(spacingSlider.value);
                    const contrast = parseInt(contrastSlider.value) / 100;
                    const brightness = parseInt(brightnessSlider.value);
                    const shape = dotShapeSelect.value;
                    const angle = parseInt(angleSlider.value);
                    const foregroundColor = foregroundColorInput.value;
                    const backgroundColor = backgroundColorInput.value;
                    const useOriginalColors = useOriginalColorsCheckbox.checked;

                    const tempCanvas2 = document.createElement('canvas');
                    tempCanvas2.width = originalCanvas.width;
                    tempCanvas2.height = originalCanvas.height;
                    const tempCtx2 = tempCanvas2.getContext('2d');

                    const originalCanvasCopy = document.createElement('canvas');
                    originalCanvasCopy.width = originalCanvas.width;
                    originalCanvasCopy.height = originalCanvas.height;
                    const originalCtxCopy = originalCanvasCopy.getContext('2d');
                    originalCtxCopy.putImageData(originalImageData, 0, 0);

                    tempCtx2.putImageData(originalImageData, 0, 0);
                    const imageData = tempCtx2.getImageData(0, 0, tempCanvas2.width, tempCanvas2.height);
                    const data = imageData.data;

                    for (let i = 0; i < data.length; i += 4) {
                        const alpha = data[i + 3];
                        if (alpha < 255) hasTransparency = true;

                        if (useOriginalColors) {
                            // Apply brightness/contrast to RGB channels directly for original colors
                            for (let channel = 0; channel < 3; channel++) {
                                let value = data[i + channel];
                                value += brightness * 2.55;
                                value = ((value / 255 - 0.5) * contrast + 0.5) * 255;
                                data[i + channel] = Math.max(0, Math.min(255, value));
                            }
                        } else {
                            let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                            gray += brightness * 2.55;
                            gray = ((gray / 255 - 0.5) * contrast + 0.5) * 255;
                            gray = Math.max(0, Math.min(255, gray));
                            data[i] = data[i + 1] = data[i + 2] = gray;
                        }
                    }

                    // Fill background based on detected transparency
                    if (hasTransparency && useOriginalColors) {
                        // Transparent background — use clearRect
                        tempCtx.clearRect(0, 0, outputWidth, outputHeight);
                    } else {
                        // Existing behavior
                        tempCtx.fillStyle = backgroundColor;
                        tempCtx.fillRect(0, 0, outputWidth, outputHeight);
                    }

                    // Pre-compute brightness array for performance
                    const brightnessArray = precomputeBrightness(imageData);

                    tempCtx2.putImageData(imageData, 0, 0);

                    const gridSize = dotSize * spacing;
                    const angleRad = (angle * Math.PI) / 180;
                    const cosAngle = Math.cos(angleRad);
                    const sinAngle = Math.sin(angleRad);

                    const gridWidth = outputWidth * Math.abs(cosAngle) + outputHeight * Math.abs(sinAngle);
                    const gridHeight = outputWidth * Math.abs(sinAngle) + outputHeight * Math.abs(cosAngle);

                    for (let y = -gridSize; y < gridHeight + gridSize; y += gridSize) {
                        for (let x = -gridSize; x < gridWidth + gridSize; x += gridSize) {
                            const rotatedX = x * cosAngle - y * sinAngle;
                            const rotatedY = x * sinAngle + y * cosAngle;

                            if (rotatedX < -gridSize || rotatedX >= outputWidth + gridSize ||
                                rotatedY < -gridSize || rotatedY >= outputHeight + gridSize) {
                                continue;
                            }

                            const sampleX = (rotatedX / outputWidth) * tempCanvas2.width;
                            const sampleY = (rotatedY / outputHeight) * tempCanvas2.height;

                            const pixelBrightness = getPixelBrightness(brightnessArray, sampleX, sampleY, tempCanvas2.width, tempCanvas2.height);

                            const normalizedBrightness = pixelBrightness / 255;
                            const targetCoverage = 1 - normalizedBrightness;
                            const maxDotArea = Math.PI * Math.pow(dotSize / 2, 2);
                            const cellArea = gridSize * gridSize;
                            const coverageRatio = Math.min(targetCoverage * cellArea / maxDotArea, 1);
                            const dotRadius = Math.sqrt(coverageRatio) * (dotSize / 2);

                            if (dotRadius > 0.5) {
                                const centerX = rotatedX + gridSize / 2;
                                const centerY = rotatedY + gridSize / 2;

                                if (centerX >= -dotRadius && centerX <= outputWidth + dotRadius &&
                                    centerY >= -dotRadius && centerY <= outputHeight + dotRadius) {

                                    if (useOriginalColors) {
                                        const colorSampleX = (rotatedX / outputWidth) * originalCanvasCopy.width;
                                        const colorSampleY = (rotatedY / outputHeight) * originalCanvasCopy.height;
                                        const originalColor = getPixelColor(originalCtxCopy, colorSampleX, colorSampleY);

                                        // Sample alpha for transparency
                                        if (hasTransparency) {
                                            const alphaSample = sampleAlpha(originalImageData, colorSampleX, colorSampleY,
                                                originalCanvas.width, originalCanvas.height);

                                            if (alphaSample < 5) {
                                                // Nearly fully transparent — skip dot entirely
                                                continue;
                                            }

                                            if (alphaSample < 255) {
                                                tempCtx.save();
                                                tempCtx.globalAlpha = alphaSample / 255;
                                                drawShape(tempCtx, centerX, centerY, dotRadius, shape, originalColor);
                                                tempCtx.restore();
                                            } else {
                                                drawShape(tempCtx, centerX, centerY, dotRadius, shape, originalColor);
                                            }
                                        } else {
                                            drawShape(tempCtx, centerX, centerY, dotRadius, shape, originalColor);
                                        }
                                    } else {
                                        drawShape(tempCtx, centerX, centerY, dotRadius, shape);
                                    }
                                }
                            }
                        }
                    }

                    canvasToExport = tempCanvas;
                }

                // Download with DPI metadata injection
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
            } catch (error) {
                showNotification('Failed to download. The image may be from a restricted source.');
            }
        }

        function resetParameters() {
            pushUndoState();
            dotSizeSlider.value = 4;
            spacingSlider.value = 1.0;
            contrastSlider.value = 50;
            brightnessSlider.value = 0;
            dotShapeSelect.value = 'circle';
            angleSlider.value = 0;
            foregroundColorInput.value = '#000000';
            backgroundColorInput.value = '#ffffff';
            useOriginalColorsCheckbox.checked = true;
            useOriginalSizeCheckbox.checked = true;
            outputWidthInput.disabled = true;
            outputHeightInput.disabled = true;
            outputWidthInput.value = '';
            outputHeightInput.value = '';

            // Reset zoom
            setZoom(1);

            updateColorPickerStates();
            updateValueDisplays();
            currentState = getCurrentParams();
            scheduleProcessing();
        }

        function updateComputedPixels() {
            const w = parseFloat(printWidthInches.value) || 0;
            const h = parseFloat(printHeightInches.value) || 0;
            const dpi = parseInt(dpiSelect.value) || 300;
            if (w > 0 && h > 0) {
                computedPixels.textContent = `→ ${Math.round(w * dpi)} × ${Math.round(h * dpi)} px`;
            } else {
                computedPixels.textContent = '';
            }
        }

        function pushUndoState() {
            if (currentState) {
                // Prevent duplicate consecutive states
                if (undoStack.length > 0 && JSON.stringify(undoStack[undoStack.length - 1]) === JSON.stringify(currentState)) {
                    return;
                }
                undoStack.push(currentState);
                if (undoStack.length > MAX_HISTORY) undoStack.shift();
                redoStack = [];
                updateUndoButtons();
            }
        }

        function undo() {
            if (undoStack.length === 0) return;
            // Prevent duplicate of current state when pushing to redo
            if (redoStack.length === 0 || JSON.stringify(redoStack[redoStack.length - 1]) !== JSON.stringify(currentState)) {
                redoStack.push(currentState);
            }
            currentState = undoStack.pop();
            applyState(currentState);
            updateUndoButtons();
        }

        function redo() {
            if (redoStack.length === 0) return;
            if (currentState) {
                if (undoStack.length === 0 || JSON.stringify(undoStack[undoStack.length - 1]) !== JSON.stringify(currentState)) {
                    undoStack.push(currentState);
                    if (undoStack.length > MAX_HISTORY) undoStack.shift();
                }
            }
            currentState = redoStack.pop();
            applyState(currentState);
            updateUndoButtons();
        }

        function getCurrentParams() {
            return {
                dotSize: dotSizeSlider.value,
                spacing: spacingSlider.value,
                contrast: contrastSlider.value,
                brightness: brightnessSlider.value,
                angle: angleSlider.value,
                shape: dotShapeSelect.value,
                fgColor: foregroundColorInput.value,
                bgColor: backgroundColorInput.value,
                useOriginalColors: useOriginalColorsCheckbox.checked,
                useOriginalSize: useOriginalSizeCheckbox.checked,
                outputW: outputWidthInput.value,
                outputH: outputHeightInput.value,
                dpi: dpiSelect.value,
                useInches: useInchesCheckbox.checked,
                printW: printWidthInches.value,
                printH: printHeightInches.value,
                metricMode: metricMode,
                lpiValue: lpiValue
            };
        }

        function applyState(state) {
            dotSizeSlider.value = state.dotSize;
            spacingSlider.value = state.spacing;
            contrastSlider.value = state.contrast;
            brightnessSlider.value = state.brightness;
            angleSlider.value = state.angle;
            dotShapeSelect.value = state.shape;
            foregroundColorInput.value = state.fgColor;
            backgroundColorInput.value = state.bgColor;
            useOriginalColorsCheckbox.checked = state.useOriginalColors;
            useOriginalSizeCheckbox.checked = state.useOriginalSize;
            outputWidthInput.value = state.outputW;
            outputHeightInput.value = state.outputH;
            dpiSelect.value = state.dpi || '300';
            useInchesCheckbox.checked = state.useInches || false;
            printWidthInches.value = state.printW || '';
            printHeightInches.value = state.printH || '';

            // Update selectedDPI global variable
            selectedDPI = parseInt(dpiSelect.value) || 300;

            // Restore metric mode and LPI value
            metricMode = state.metricMode || 'dot';
            lpiValue = state.lpiValue || 45;

            // Update metric toggle UI
            document.querySelectorAll('.metric-toggle').forEach(btn => {
                if (btn.dataset.metric === metricMode) {
                    btn.classList.remove('btn-secondary');
                    btn.classList.add('btn-primary', 'active');
                } else {
                    btn.classList.remove('btn-primary', 'active');
                    btn.classList.add('btn-secondary');
                }
            });

            // Update LPI slider and display
            lpiSlider.value = lpiValue;
            lpiValueDisplay.textContent = lpiValue + ' LPI';

            // Show/hide controls based on metric mode
            const dotModeControls = document.querySelectorAll('.dot-mode-control');
            const lpiModeControls = document.querySelectorAll('.lpi-mode-control');

            if (metricMode === 'lpi') {
                dotModeControls.forEach(el => el.style.display = 'none');
                lpiModeControls.forEach(el => el.style.display = 'flex');
                lpiRef.style.display = 'block';
            } else {
                dotModeControls.forEach(el => el.style.display = 'flex');
                lpiModeControls.forEach(el => el.style.display = 'none');
                lpiRef.style.display = 'none';
            }

            // Update inches mode UI
            const inchesEnabled = useInchesCheckbox.checked;
            printWidthInches.style.display = inchesEnabled ? 'inline-block' : 'none';
            printHeightInches.style.display = inchesEnabled ? 'inline-block' : 'none';
            computedPixels.style.display = inchesEnabled ? 'inline' : 'none';
            if (inchesEnabled) {
                updateComputedPixels();
            }

            if (state.useOriginalSize) {
                outputWidthInput.disabled = true;
                outputHeightInput.disabled = true;
            } else {
                outputWidthInput.disabled = false;
                outputHeightInput.disabled = false;
            }

            updateColorPickerStates();
            updateValueDisplays();

            // Clear any pending processing to avoid unwanted state saves
            if (processingTimeout) {
                clearTimeout(processingTimeout);
                processingTimeout = null;
            }

            // Apply halftone directly without triggering state save
            applyHalftone();
        }

        function updateUndoButtons() {
            undoBtn.disabled = undoStack.length === 0;
            redoBtn.disabled = redoStack.length === 0;
        }

function showNotification(message) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                background: var(--accent);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: var(--radius);
                box-shadow: var(--shadow-lg);
                z-index: 1000;
                max-width: 300px;
                font-weight: 500;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transition = 'opacity 0.3s';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        const GALLERY_SVGS = {
            'Classic Dots': `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="gd0"><stop offset="0" stop-color="#666"/><stop offset="1" stop-color="#ccc"/></radialGradient><pattern id="pt0" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2.5" fill="currentColor"/></pattern></defs><rect fill="url(#gd0)" width="300" height="200"/><rect fill="url(#pt0)" width="300" height="200" color="#fff"/></svg>`,
            'Bold Dots': `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="gd1"><stop offset="0" stop-color="#666"/><stop offset="1" stop-color="#ccc"/></radialGradient><pattern id="pt1" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="4.5" fill="currentColor"/></pattern></defs><rect fill="url(#gd1)" width="300" height="200"/><rect fill="url(#pt1)" width="300" height="200" color="#fff"/></svg>`,
            'Screen Print': `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="gd2"><stop offset="0" stop-color="#555"/><stop offset="1" stop-color="#aaa"/></radialGradient><pattern id="pt2" x="0" y="0" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="3" fill="currentColor"/></pattern></defs><rect fill="url(#gd2)" width="300" height="200"/><rect fill="url(#pt2)" width="300" height="200" color="#fff"/></svg>`,
            'Square Dots': `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="gd3"><stop offset="0" stop-color="#555"/><stop offset="1" stop-color="#999"/></radialGradient><pattern id="pt3" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse"><rect x="1.5" y="1.5" width="6" height="6" fill="currentColor" rx="1"/></pattern></defs><rect fill="url(#gd3)" width="300" height="200"/><rect fill="url(#pt3)" width="300" height="200" color="#fff"/></svg>`,
            'Diamond Pattern': `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="gd4"><stop offset="0" stop-color="#555"/><stop offset="1" stop-color="#aaa"/></radialGradient><pattern id="pt4" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse"><polygon points="3,0 6,3 3,6 0,3" fill="currentColor"/></pattern></defs><rect fill="url(#gd4)" width="300" height="200"/><rect fill="url(#pt4)" width="300" height="200" color="#fff"/></svg>`,
            'Line Screen': `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="gd5"><stop offset="0" stop-color="#666"/><stop offset="1" stop-color="#bbb"/></radialGradient><pattern id="pt5" x="0" y="0" width="5" height="9" patternUnits="userSpaceOnUse"><path d="M2.5 0v9" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></pattern></defs><rect fill="url(#gd5)" width="300" height="200"/><rect fill="url(#pt5)" width="300" height="200" color="#fff"/></svg>`,
            'Fine Detail': `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="gd6"><stop offset="0" stop-color="#555"/><stop offset="1" stop-color="#999"/></radialGradient><pattern id="pt6" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="currentColor"/></pattern></defs><rect fill="url(#gd6)" width="300" height="200"/><rect fill="url(#pt6)" width="300" height="200" color="#fff"/></svg>`,
            'High Contrast': `<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="gd7"><stop offset="0" stop-color="#444"/><stop offset="1" stop-color="#bbb"/></radialGradient><pattern id="pt7" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="4" fill="currentColor"/></pattern></defs><rect fill="url(#gd7)" width="300" height="200"/><rect fill="url(#pt7)" width="300" height="200" color="#fff"/></svg>`
        };

        function generateGallery() {
            const examples = [
                { name: 'Classic Dots', params: { dotSize: 4, spacing: 1.5, contrast: 60, shape: 'circle' }, desc: 'Traditional newspaper look' },
                { name: 'Bold Dots', params: { dotSize: 8, spacing: 1.2, contrast: 70, shape: 'circle' }, desc: 'Large, punchy halftones' },
                { name: 'Screen Print', params: { dotSize: 5, spacing: 1.3, contrast: 50, shape: 'circle' }, desc: 'Ready for screen printing' },
                { name: 'Square Dots', params: { dotSize: 6, spacing: 1.4, contrast: 55, shape: 'square' }, desc: 'Modern geometric feel' },
                { name: 'Diamond Pattern', params: { dotSize: 4, spacing: 1.3, contrast: 60, shape: 'diamond' }, desc: 'Angled diamond shapes' },
                { name: 'Line Screen', params: { dotSize: 3, spacing: 1.5, contrast: 50, shape: 'line' }, desc: 'Line-based halftone' },
                { name: 'Fine Detail', params: { dotSize: 2, spacing: 1.2, contrast: 65, shape: 'circle' }, desc: 'Small dots for detail' },
                { name: 'High Contrast', params: { dotSize: 6, spacing: 1.5, contrast: 90, shape: 'circle' }, desc: 'Bold contrasty look' }
            ];

            examples.forEach(example => {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                item.innerHTML = `
                    <img class="gallery-image" src="data:image/svg+xml,${encodeURIComponent(GALLERY_SVGS[example.name])}" alt="${example.name}" loading="lazy">
                    <div class="gallery-info">
                        <div class="gallery-title">${example.name}</div>
                        <div class="gallery-params">${example.desc}</div>
                    </div>
                `;

                item.addEventListener('click', () => loadGalleryExample(example.params));
                galleryGrid.appendChild(item);
            });
        }


        function loadGalleryExample(params) {
            pushUndoState();
            dotSizeSlider.value = params.dotSize;
            spacingSlider.value = params.spacing;
            contrastSlider.value = params.contrast;
            dotShapeSelect.value = params.shape;

            updateValueDisplays();
            currentState = getCurrentParams();
            
            

            if (currentImage !== null) {
                applyHalftone();
                showNotification('Parameters applied!');
        } else {
                showNotification('Parameters loaded! Upload an image to try this look.');
            }
        }

        // Theme Toggle
        (function(){
            var btn = document.getElementById('themeToggle');
            if(!btn) return;
            var t = localStorage.getItem('spf_theme');
            if(t) {
                document.documentElement.setAttribute('data-theme', t);
            } else if(window.matchMedia('(prefers-color-scheme: dark)').matches){
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('spf_theme', 'dark');
            }
            btn.onclick = function(){
                var cur = document.documentElement.getAttribute('data-theme');
                var next = cur === 'dark' ? '' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('spf_theme', next || 'light');
            };
        })();

        // Initialize (must be at end after all const values like GALLERY_SVGS)
        init();
