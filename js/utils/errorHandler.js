// Error Handler Module
export class ErrorHandler {
    static showError(message, error = null) {
        console.error('[ScreenPrintFilter]', message, error);
        this.showNotification(message, 'error');
    }
    
    static showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 3000);
    }
    
    static handleImageError(error) {
        const messages = {
            'SecurityError': '无法处理此图片（跨域限制）',
            'InvalidStateError': '图片数据无效',
            'TypeError': '图片格式不支持'
        };
        return messages[error.name] || '图片处理失败';
    }
}
