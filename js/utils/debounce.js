// Debounce Scheduler Module
export class DebounceScheduler {
    constructor(delay = 300) {
        this.delay = delay;
        this.timeoutId = null;
        this.abortController = null;
    }
    
    schedule(fn) {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();
        
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        
        return new Promise((resolve, reject) => {
            const signal = this.abortController.signal;
            
            if (signal.aborted) {
                reject(new Error('Cancelled'));
                return;
            }
            
            signal.addEventListener('abort', () => {
                reject(new Error('Cancelled'));
            });
            
            this.timeoutId = setTimeout(() => {
                resolve(fn(signal));
            }, this.delay);
        });
    }
    
    cancel() {
        if (this.abortController) {
            this.abortController.abort();
        }
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }
    
    destroy() {
        this.cancel();
        this.abortController = null;
        this.timeoutId = null;
    }
}
