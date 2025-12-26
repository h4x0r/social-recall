import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock chrome APIs
const mockStorage: Record<string, unknown> = {};
let messageExternalListener: ((
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
) => boolean | void) | null = null;

const mockSendMessage = vi.fn();

vi.stubGlobal('chrome', {
  storage: {
    sync: {
      get: vi.fn((keys: string[], callback: (result: Record<string, unknown>) => void) => {
        const result: Record<string, unknown> = {};
        keys.forEach((key) => {
          if (mockStorage[key] !== undefined) {
            result[key] = mockStorage[key];
          }
        });
        callback(result);
      }),
      set: vi.fn((data: Record<string, unknown>, callback?: () => void) => {
        Object.assign(mockStorage, data);
        callback?.();
      }),
    },
  },
  runtime: {
    onMessageExternal: {
      addListener: vi.fn((listener) => {
        messageExternalListener = listener;
      }),
    },
    sendMessage: mockSendMessage,
  },
});

// Import after mocking
import { setupAuthListener, WEB_APP_ORIGINS } from './background';

describe('Background Script', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    vi.clearAllMocks();
    messageExternalListener = null;
  });

  describe('setupAuthListener', () => {
    it('registers an external message listener', () => {
      setupAuthListener();
      expect(chrome.runtime.onMessageExternal.addListener).toHaveBeenCalledTimes(1);
      expect(messageExternalListener).not.toBeNull();
    });
  });

  describe('WEB_APP_ORIGINS', () => {
    it('includes localhost for development', () => {
      expect(WEB_APP_ORIGINS).toContain('http://localhost:3000');
    });

    it('includes production URL', () => {
      expect(WEB_APP_ORIGINS).toContain('https://www.socialrecall.now');
    });
  });

  describe('message handling', () => {
    beforeEach(() => {
      setupAuthListener();
    });

    it('rejects messages from invalid origins', () => {
      const sendResponse = vi.fn();
      const sender = { url: 'https://evil-site.com/page' };

      messageExternalListener!(
        { type: 'AUTH_TOKEN', token: 'fake-token' },
        sender as chrome.runtime.MessageSender,
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid origin',
      });
      expect(mockStorage.syncToken).toBeUndefined();
    });

    it('rejects messages without sender URL', () => {
      const sendResponse = vi.fn();
      const sender = {};

      messageExternalListener!(
        { type: 'AUTH_TOKEN', token: 'test-token' },
        sender as chrome.runtime.MessageSender,
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid origin',
      });
    });

    it('accepts messages from localhost:3000', () => {
      const sendResponse = vi.fn();
      const sender = { url: 'http://localhost:3000/auth/extension' };

      messageExternalListener!(
        { type: 'AUTH_TOKEN', token: 'valid-token' },
        sender as chrome.runtime.MessageSender,
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({ success: true });
      expect(mockStorage.syncToken).toBe('valid-token');
    });

    it('accepts messages from production vercel URL', () => {
      const sendResponse = vi.fn();
      const sender = { url: 'https://www.socialrecall.now/auth/extension' };

      messageExternalListener!(
        { type: 'AUTH_TOKEN', token: 'prod-token' },
        sender as chrome.runtime.MessageSender,
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({ success: true });
      expect(mockStorage.syncToken).toBe('prod-token');
    });

    it('stores token in chrome.storage.sync', () => {
      const sendResponse = vi.fn();
      const sender = { url: 'http://localhost:3000/auth/extension' };

      messageExternalListener!(
        { type: 'AUTH_TOKEN', token: 'store-me' },
        sender as chrome.runtime.MessageSender,
        sendResponse
      );

      expect(chrome.storage.sync.set).toHaveBeenCalledWith(
        { syncToken: 'store-me' },
        expect.any(Function)
      );
    });

    it('broadcasts AUTH_SUCCESS to popup after storing token', () => {
      const sendResponse = vi.fn();
      const sender = { url: 'http://localhost:3000/auth/extension' };

      messageExternalListener!(
        { type: 'AUTH_TOKEN', token: 'test-token' },
        sender as chrome.runtime.MessageSender,
        sendResponse
      );

      expect(mockSendMessage).toHaveBeenCalledWith({ type: 'AUTH_SUCCESS' });
    });

    it('rejects AUTH_TOKEN without token value', () => {
      const sendResponse = vi.fn();
      const sender = { url: 'http://localhost:3000/auth/extension' };

      messageExternalListener!(
        { type: 'AUTH_TOKEN' },
        sender as chrome.runtime.MessageSender,
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({
        success: false,
        error: 'Missing token',
      });
      expect(mockStorage.syncToken).toBeUndefined();
    });

    it('ignores unknown message types', () => {
      const sendResponse = vi.fn();
      const sender = { url: 'http://localhost:3000/auth/extension' };

      const result = messageExternalListener!(
        { type: 'UNKNOWN_TYPE' },
        sender as chrome.runtime.MessageSender,
        sendResponse
      );

      expect(sendResponse).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('returns true to keep message channel open for async response', () => {
      const sendResponse = vi.fn();
      const sender = { url: 'http://localhost:3000/auth/extension' };

      const result = messageExternalListener!(
        { type: 'AUTH_TOKEN', token: 'test' },
        sender as chrome.runtime.MessageSender,
        sendResponse
      );

      expect(result).toBe(true);
    });
  });
});
