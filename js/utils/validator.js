// Input Validation Module
import { config } from '../core/config.js';

export const validator = {
    validateFile(file) {
        const errors = [];
        
        if (file.size > config.MAX_FILE_SIZE) {
            errors.push(`文件过大（最大${config.MAX_FILE_SIZE / 1024 / 1024}MB）`);
        }
        
        if (!config.SUPPORTED_FORMATS.includes(file.type)) {
            errors.push(`不支持的文件类型: ${file.type}`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    },
    
    validateDimensions(width, height) {
        const max = 16384;
        if (width <= 0 || height <= 0) {
            return { valid: false, errors: ['尺寸必须大于0'] };
        }
        if (width > max || height > max) {
            return { valid: false, errors: [`尺寸超过最大值${max}`] };
        }
        return { valid: true, errors: [] };
    }
};
