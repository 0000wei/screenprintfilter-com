/**
 * Memory Manager
 * Optimizes memory usage for large image processing
 */

import { config } from '../core/config.js';

export class MemoryManager {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 50 * 1024 * 1024;
        this.currentCacheSize = 0;
    }

    get(key) {
        const item = this.cache.get(key);
        if (item) {
            item.lastAccess = Date.now();
            return item.data;
        }
        return null;
    }

    set(key, data, size = 0) {
        if (size > this.maxCacheSize) return false;

        while (this.currentCacheSize + size > this.maxCacheSize && this.cache.size > 0) {
            this.evictLRU();
        }

        this.cache.set(key, {
            data, size, lastAccess: Date.now()
        });

        this.currentCacheSize += size;
        return true;
    }

    evictLRU() {
        let oldestKey = null;
        let oldestTime = Infinity;

        this.cache.forEach((item, key) => {
            if (item.lastAccess < oldestTime) {
                oldestTime = item.lastAccess;
                oldestKey = key;
            }
        });

        if (oldestKey) {
            const item = this.cache.get(oldestKey);
            this.currentCacheSize -= item.size;
            this.cache.delete(oldestKey);

            if (item.data instanceof ImageData) {
                item.data = null;
            }
        }
    }

    clear() {
        this.cache.forEach(item => {
            if (item.data instanceof ImageData) {
                item.data = null;
            }
        });
        this.cache.clear();
        this.currentCacheSize = 0;
    }

    estimateImageMemory(width, height, channels = 4) {
        return width * height * channels * 4;
    }

    canProcessImage(width, height) {
        const memoryNeeded = this.estimateImageMemory(width, height);
        const totalNeeded = memoryNeeded + this.currentCacheSize;
        const MAX_MEMORY = 500 * 1024 * 1024;
        return totalNeeded < MAX_MEMORY;
    }

    optimizeSize(width, height) {
        const MAX_DIM = 4096;
        const maxDimension = Math.max(width, height);

        if (maxDimension > MAX_DIM) {
            const scale = MAX_DIM / maxDimension;
            return {
                width: Math.floor(width * scale),
                height: Math.floor(height * scale),
                scaled: true
            };
        }

        return { width, height, scaled: false };
    }
}

export const memoryManager = new MemoryManager();
