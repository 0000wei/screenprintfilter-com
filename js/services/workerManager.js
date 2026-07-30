/**
 * Worker Manager
 * Manages Web Workers for parallel image processing
 */

import { config } from '../core/config.js';

export class WorkerManager {
    constructor() {
        this.workers = [];
        this.activeJobs = new Map();
        this.maxWorkers = Math.min(navigator.hardwareConcurrency || 2, 4);
    }

    async processImage(imageData, params, onProgress = null) {
        return new Promise((resolve, reject) => {
            const worker = this.getWorker();
            const jobId = Date.now() + Math.random();

            const timeout = setTimeout(() => {
                this.terminateJob(jobId);
                reject(new Error('Processing timeout'));
            }, config.MAX_FILE_SIZE / 1024 / 1024 * 1000);

            this.activeJobs.set(jobId, { worker, timeout, resolve, reject, onProgress });

            worker.onmessage = (e) => {
                const { type, payload } = e.data;

                switch (type) {
                    case 'COMPLETE':
                        this.completeJob(jobId);
                        resolve(payload);
                        break;
                    case 'PROGRESS':
                        if (onProgress) onProgress(payload);
                        break;
                    case 'ERROR':
                        this.terminateJob(jobId);
                        reject(new Error(payload));
                        break;
                }
            };

            worker.onerror = (error) => {
                this.terminateJob(jobId);
                reject(error);
            };

            worker.postMessage({
                type: 'PROCESS_IMAGE',
                payload: { imageData, params }
            }, [imageData.data.buffer]);
        });
    }

    getWorker() {
        if (this.workers.length < this.maxWorkers) {
            const worker = new Worker('../workers/halftoneWorker.js', { type: 'module' });
            this.workers.push(worker);
            return worker;
        }
        return this.workers[0];
    }

    completeJob(jobId) {
        const job = this.activeJobs.get(jobId);
        if (job) {
            clearTimeout(job.timeout);
            this.activeJobs.delete(jobId);
        }
    }

    terminateJob(jobId) {
        const job = this.activeJobs.get(jobId);
        if (job) {
            clearTimeout(job.timeout);
            this.activeJobs.delete(jobId);
        }
    }

    cancelAll() {
        this.activeJobs.forEach((job, jobId) => {
            this.terminateJob(jobId);
        });
    }

    destroy() {
        this.cancelAll();
        this.workers.forEach(worker => worker.terminate());
        this.workers = [];
    }
}

export const workerManager = new WorkerManager();
