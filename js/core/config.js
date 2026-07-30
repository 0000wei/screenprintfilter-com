// Core Configuration
export const config = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MAX_UNDO_HISTORY: 50,
    DEBOUNCE_DELAY: 300,
    PREVIEW_MAX_WIDTH: 800,
    PREVIEW_MAX_HEIGHT: 600,
    DEFAULT_DPI: 300,
    SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'],
    DEFAULT_PARAMS: {
        dotSize: 4,
        spacing: 1.0,
        contrast: 50,
        brightness: 0,
        angle: 0,
        shape: 'circle',
        fgColor: '#000000',
        bgColor: '#ffffff',
        useOriginalColors: true,
        useOriginalSize: true
    }
};
