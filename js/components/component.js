/**
 * Base Component Class
 * Foundation for all UI components with lifecycle management
 */

import { eventBus, Events } from '../core/eventBus.js';

export class Component {
    constructor(options = {}) {
        this.id = options.id || `component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        this.element = null;
        this.state = {};
        this.eventSubscriptions = [];
        this.isActive = false;
    }

    init() {
        this.isActive = true;
        this.createElement();
        this.bindEvents();
        this.render();
    }

    createElement() {
        throw new Error('createElement must be implemented by subclass');
    }

    bindEvents() {
    }

    render() {
        if (!this.element) {
            this.createElement();
        }
        return this.element;
    }

    setState(newState) {
        const oldState = { ...this.state };
        this.state = { ...this.state, ...newState };
        this.onStateChange(oldState, this.state);
    }

    onStateChange(oldState, newState) {
    }

    subscribe(eventName, callback, priority = 0) {
        const unsubscribe = eventBus.on(eventName, callback, priority);
        this.eventSubscriptions.push(unsubscribe);
        return unsubscribe;
    }

    emit(eventName, data) {
        return eventBus.emit(eventName, data);
    }

    mount(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }

        if (!container) {
            throw new Error(`Container not found: ${container}`);
        }

        container.appendChild(this.render());
        this.onMount();
        return this;
    }

    onMount() {
    }

    unmount() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }

        this.cleanup();
        this.onUnmount();
    }

    onUnmount() {
    }

    cleanup() {
        this.eventSubscriptions.forEach(unsubscribe => unsubscribe());
        this.eventSubscriptions = [];
        this.isActive = false;
    }

    destroy() {
        this.unmount();
        this.element = null;
        this.state = {};
    }
}
