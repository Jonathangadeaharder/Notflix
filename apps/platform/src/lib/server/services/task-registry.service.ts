import { logger } from '$lib/logger';

class TaskRegistry {
    private tasks = new Set<Promise<unknown>>();

    /**
     * Registers a background task. 
     * In a long-running Node.js process (Docker), this ensures we can at least 
     * log the outcome of fire-and-forget operations.
     */
    register(name: string, promise: Promise<unknown>) {
        const taskId = Math.random().toString(36).substring(7);
        const context = { task: name, taskId };
        
        logger.info(context, 'Background task registered');
        this.tasks.add(promise);
        
        promise
            .then(() => {
                logger.info(context, 'Background task completed');
            })
            .catch((err) => {
                logger.error({ ...context, err: err instanceof Error ? err.message : String(err) }, 'Background task failed');
            })
            .finally(() => {
                this.tasks.delete(promise);
            });
    }

    /**
     * Useful for graceful shutdown if needed.
     */
    async waitForAll() {
        if (this.tasks.size === 0) return;
        logger.info({ count: this.tasks.size }, 'Waiting for background tasks to complete...');
        await Promise.allSettled(this.tasks);
    }
}

export const taskRegistry = new TaskRegistry();
