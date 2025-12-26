/**
 * Offline Queue for handling operations when network is unavailable
 * Queues operations when offline and retries when online
 */

export interface QueuedOperation {
  id: string;
  type: string;
  execute: () => Promise<{ success: boolean; error?: string }>;
  retryCount: number;
  createdAt: Date;
  error?: Error;
}

export interface OfflineQueueOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface OfflineQueue {
  enqueue: (type: string, operation: () => Promise<{ success: boolean; error?: string }>) => Promise<void>;
  getPendingCount: () => number;
  isOnline: () => boolean;
  clear: () => void;
  onOperationSuccess: (callback: (op: QueuedOperation) => void) => void;
  onOperationFailed: (callback: (op: QueuedOperation) => void) => void;
  destroy: () => void;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;

export function createOfflineQueue(options: OfflineQueueOptions = {}): OfflineQueue {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  const queue: QueuedOperation[] = [];
  let processing = false;
  let successCallbacks: ((op: QueuedOperation) => void)[] = [];
  let failureCallbacks: ((op: QueuedOperation) => void)[] = [];

  function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  function isOnline(): boolean {
    return navigator.onLine;
  }

  async function processQueue(): Promise<void> {
    if (processing || queue.length === 0 || !isOnline()) {
      return;
    }

    processing = true;

    while (queue.length > 0 && isOnline()) {
      const operation = queue[0];

      try {
        const result = await operation.execute();

        if (result.success) {
          // Remove from queue on success
          queue.shift();
          successCallbacks.forEach(cb => cb(operation));
        } else {
          // Treat as failure
          throw new Error(result.error || 'Operation failed');
        }
      } catch (e) {
        operation.retryCount++;
        operation.error = e instanceof Error ? e : new Error(String(e));

        if (operation.retryCount >= maxRetries) {
          // Remove from queue and notify failure
          queue.shift();
          failureCallbacks.forEach(cb => cb(operation));
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        }
      }
    }

    processing = false;
  }

  function handleOnline(): void {
    processQueue();
  }

  // Listen for online events
  window.addEventListener('online', handleOnline);

  async function enqueue(
    type: string,
    execute: () => Promise<{ success: boolean; error?: string }>
  ): Promise<void> {
    const operation: QueuedOperation = {
      id: generateId(),
      type,
      execute,
      retryCount: 0,
      createdAt: new Date(),
    };

    if (isOnline()) {
      // Execute immediately if online
      queue.push(operation);
      await processQueue();
    } else {
      // Queue for later if offline
      queue.push(operation);
    }
  }

  function getPendingCount(): number {
    return queue.length;
  }

  function clear(): void {
    queue.length = 0;
  }

  function onOperationSuccess(callback: (op: QueuedOperation) => void): void {
    successCallbacks.push(callback);
  }

  function onOperationFailed(callback: (op: QueuedOperation) => void): void {
    failureCallbacks.push(callback);
  }

  function destroy(): void {
    window.removeEventListener('online', handleOnline);
    successCallbacks = [];
    failureCallbacks = [];
    queue.length = 0;
  }

  return {
    enqueue,
    getPendingCount,
    isOnline,
    clear,
    onOperationSuccess,
    onOperationFailed,
    destroy,
  };
}
