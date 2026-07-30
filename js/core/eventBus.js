/**
 * Event Bus
 * Centralized event system for decoupled component communication
 */

export class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
    }

    on(eventName, callback, priority = 0) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        const listeners = this.events.get(eventName);
        listeners.push({ callback, priority });
        listeners.sort((a, b) => b.priority - a.priority);

        return () => this.off(eventName, callback);
    }

    once(eventName, callback, priority = 0) {
        if (!this.onceEvents.has(eventName)) {
            this.onceEvents.set(eventName, []);
        }

        const listeners = this.onceEvents.get(eventName);
        listeners.push({ callback, priority });
        listeners.sort((a, b) => b.priority - a.priority);

        return () => this.off(eventName, callback, true);
    }

    off(eventName, callback, once = false) {
        const events = once ? this.onceEvents : this.events;

        if (!events.has(eventName)) {
            return false;
        }

        const listeners = events.get(eventName);
        const index = listeners.findIndex(listener => listener.callback === callback);

        if (index !== -1) {
            listeners.splice(index, 1);
            return true;
        }

        return false;
    }

    emit(eventName, data = null) {
        if (this.events.has(eventName)) {
            const listeners = this.events.get(eventName);
            const results = [];

            for (const listener of listeners) {
                try {
                    const result = listener.callback(data);
                    results.push(result);
                } catch (error) {
                    console.error(`Error in event listener for "${eventName}":`, error);
                    results.push({ error: error.message });
                }
            }

            return results;
        }

        return [];
    }

    emitOnce(eventName, data = null) {
        const results = this.emit(eventName, data);

        if (this.onceEvents.has(eventName)) {
            this.onceEvents.delete(eventName);
        }

        return results;
    }

    listenerCount(eventName) {
        let count = 0;

        if (this.events.has(eventName)) {
            count += this.events.get(eventName).length;
        }

        if (this.onceEvents.has(eventName)) {
            count += this.onceEvents.get(eventName).length;
        }

        return count;
    }

    clear(eventName) {
        if (eventName) {
            this.events.delete(eventName);
            this.onceEvents.delete(eventName);
        } else {
            this.events.clear();
            this.onceEvents.clear();
        }
    }

    eventNames() {
        const names = new Set([
            ...this.events.keys(),
            ...this.onceEvents.keys()
        ]);
        return Array.from(names);
    }
}

export const eventBus = new EventBus();

export const Events = {
    IMAGE_LOADED: 'image:loaded',
    IMAGE_PROCESSED: 'image:processed',
    IMAGE_ERROR: 'image:error',
    PROCESS_START: 'process:start',
    PROCESS_PROGRESS: 'process:progress',
    PROCESS_COMPLETE: 'process:complete',
    PROCESS_CANCEL: 'process:cancel',
    PROCESS_ERROR: 'process:error',
    STATE_CHANGE: 'state:change',
    UNDO_STATE_CHANGE: 'undo:change',
    REDO_STATE_CHANGE: 'redo:change',
    UI_UPDATE: 'ui:update',
    PARAM_CHANGE: 'param:change',
    ZOOM_CHANGE: 'zoom:change',
    FILE_SELECT: 'file:select',
    FILE_DROP: 'file:drop',
    FILE_ERROR: 'file:error',
    MEMORY_WARNING: 'memory:warning',
    CACHE_CLEAR: 'cache:clear'
};
