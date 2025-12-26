/**
 * Tests for offline queue functionality
 * Handles queueing saves when offline and retrying when online
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOfflineQueue, type QueuedOperation } from './offline-queue';

describe('Offline Queue', () => {
  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a queue with empty state', () => {
    const queue = createOfflineQueue();

    expect(queue.getPendingCount()).toBe(0);
    expect(queue.isOnline()).toBe(true);
  });

  it('executes operations immediately when online', async () => {
    const queue = createOfflineQueue();
    const mockOperation = vi.fn().mockResolvedValue({ success: true });

    await queue.enqueue('save-note', mockOperation);

    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(queue.getPendingCount()).toBe(0);
  });

  it('queues operations when offline', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const queue = createOfflineQueue();
    const mockOperation = vi.fn().mockResolvedValue({ success: true });

    await queue.enqueue('save-note', mockOperation);

    expect(mockOperation).not.toHaveBeenCalled();
    expect(queue.getPendingCount()).toBe(1);
  });

  it('processes queued operations when coming back online', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const queue = createOfflineQueue({ retryDelayMs: 0 });
    const mockOperation = vi.fn().mockResolvedValue({ success: true });

    await queue.enqueue('save-note', mockOperation);
    expect(queue.getPendingCount()).toBe(1);

    // Come back online
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    window.dispatchEvent(new Event('online'));

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockOperation).toHaveBeenCalledTimes(1);
    expect(queue.getPendingCount()).toBe(0);
  });

  it('retries failed operations', async () => {
    // Use no retry delay for testing
    const queue = createOfflineQueue({ retryDelayMs: 0 });
    let attempts = 0;
    const mockOperation = vi.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Network error');
      }
      return { success: true };
    });

    await queue.enqueue('save-note', mockOperation);

    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('gives up after max retries', async () => {
    // Use no retry delay for testing
    const queue = createOfflineQueue({ maxRetries: 2, retryDelayMs: 0 });
    const mockOperation = vi.fn().mockRejectedValue(new Error('Network error'));
    const onFailure = vi.fn();

    queue.onOperationFailed(onFailure);
    await queue.enqueue('save-note', mockOperation);

    expect(mockOperation).toHaveBeenCalledTimes(2);
    expect(onFailure).toHaveBeenCalledWith(expect.objectContaining({
      type: 'save-note',
      error: expect.any(Error),
    }));
  });

  it('notifies when operation succeeds', async () => {
    const queue = createOfflineQueue();
    const mockOperation = vi.fn().mockResolvedValue({ success: true });
    const onSuccess = vi.fn();

    queue.onOperationSuccess(onSuccess);
    await queue.enqueue('save-note', mockOperation);

    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({
      type: 'save-note',
    }));
  });

  it('clears all pending operations', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });

    const queue = createOfflineQueue();
    await queue.enqueue('op1', vi.fn());
    await queue.enqueue('op2', vi.fn());
    await queue.enqueue('op3', vi.fn());

    expect(queue.getPendingCount()).toBe(3);

    queue.clear();

    expect(queue.getPendingCount()).toBe(0);
  });
});
