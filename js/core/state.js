/**
 * Application State Management
 * Centralized state for undo/redo, processing flags, and configuration
 */

export class AppState {
    constructor() {
        // Processing state
        this.isProcessing = false;
        this.processingId = 0;
        this.cancelCurrentRender = false;

        // LPI Preset Mode state
        this.metricMode = 'dot'; // 'dot' or 'lpi'
        this.lpiValue = 45;

        // Split View state
        this.splitViewActive = false;

        // Undo/Redo state
        this.MAX_HISTORY = 20;
        this.undoStack = [];
        this.redoStack = [];
        this.currentState = null;

        // Zoom and pan state
        this.currentZoom = 1;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.panX = 0;
        this.panY = 0;

        // DPI and inches state
        this.selectedDPI = 300;
        this.savedWidth = '';
        this.savedHeight = '';

        // Image data
        this.originalImage = null;
        this.currentFile = null;
    }

    // Undo/Redo management
    pushUndoState(state) {
        this.undoStack.push(state);
        if (this.undoStack.length > this.MAX_HISTORY) {
            this.undoStack.shift();
        }
        this.redoStack = []; // Clear redo stack on new action
    }

    pushRedoState(state) {
        this.redoStack.push(state);
    }

    popUndoState() {
        return this.undoStack.pop();
    }

    popRedoState() {
        return this.redoStack.pop();
    }

    canUndo() {
        return this.undoStack.length > 0;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }

    clearHistory() {
        this.undoStack = [];
        this.redoStack = [];
    }

    // Processing control
    startProcessing() {
        this.isProcessing = true;
        this.processingId++;
        return this.processingId;
    }

    endProcessing() {
        this.isProcessing = false;
    }

    isCurrentProcessing(id) {
        return this.isProcessing && this.processingId === id;
    }

    cancelProcessing() {
        this.cancelCurrentRender = true;
    }

    resetCancelFlag() {
        this.cancelCurrentRender = false;
    }

    // Zoom/Pan management
    setZoom(value) {
        this.currentZoom = Math.min(Math.max(value, 0.1), 5);
        return this.currentZoom;
    }

    setPan(x, y) {
        this.panX = x;
        this.panY = y;
    }

    resetView() {
        this.currentZoom = 1;
        this.panX = 0;
        this.panY = 0;
    }
}

// Global state instance
export const appState = new AppState();
