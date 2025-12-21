import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock chrome.storage.sync
const mockStorage: Record<string, unknown> = {};
const mockSendMessage = vi.fn();
let messageListener: ((message: unknown) => void) | null = null;

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
      remove: vi.fn((keys: string[], callback?: () => void) => {
        keys.forEach((key) => delete mockStorage[key]);
        callback?.();
      }),
    },
  },
  runtime: {
    onMessage: {
      addListener: vi.fn((listener) => {
        messageListener = listener;
      }),
    },
    sendMessage: mockSendMessage,
  },
  tabs: {
    create: vi.fn(),
  },
});

import {
  getAuthStatus,
  handleConnect,
  handleDisconnect,
  setupAuthMessageListener,
  AUTH_STATUS,
  WEB_APP_AUTH_URL,
} from './popup-auth';

describe('Popup Auth', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
    vi.clearAllMocks();
    messageListener = null;
  });

  describe('WEB_APP_AUTH_URL', () => {
    it('points to the extension auth page', () => {
      expect(WEB_APP_AUTH_URL).toContain('/auth/extension');
    });
  });

  describe('getAuthStatus', () => {
    it('returns disconnected when no token exists', async () => {
      const status = await getAuthStatus();
      expect(status).toBe(AUTH_STATUS.DISCONNECTED);
    });

    it('returns connected when token exists', async () => {
      mockStorage.syncToken = 'valid-token-123';
      const status = await getAuthStatus();
      expect(status).toBe(AUTH_STATUS.CONNECTED);
    });

    it('returns disconnected for empty token', async () => {
      mockStorage.syncToken = '';
      const status = await getAuthStatus();
      expect(status).toBe(AUTH_STATUS.DISCONNECTED);
    });
  });

  describe('handleConnect', () => {
    it('opens the web app auth page in a new tab', () => {
      handleConnect();
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: expect.stringContaining('/auth/extension'),
      });
    });

    it('uses localhost URL in development', () => {
      handleConnect();
      const call = (chrome.tabs.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(call.url).toMatch(/localhost:3000|social-recall\.vercel\.app/);
    });
  });

  describe('handleDisconnect', () => {
    it('removes the sync token from storage', async () => {
      mockStorage.syncToken = 'token-to-remove';
      await handleDisconnect();
      expect(chrome.storage.sync.remove).toHaveBeenCalledWith(
        ['syncToken'],
        expect.any(Function)
      );
    });

    it('returns disconnected status after clearing', async () => {
      mockStorage.syncToken = 'token-to-remove';
      const status = await handleDisconnect();
      expect(status).toBe(AUTH_STATUS.DISCONNECTED);
    });
  });

  describe('setupAuthMessageListener', () => {
    it('registers a message listener', () => {
      const callback = vi.fn();
      setupAuthMessageListener(callback);
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });

    it('calls callback when AUTH_SUCCESS message received', () => {
      const callback = vi.fn();
      setupAuthMessageListener(callback);

      // Simulate AUTH_SUCCESS message
      messageListener!({ type: 'AUTH_SUCCESS' });

      expect(callback).toHaveBeenCalled();
    });

    it('does not call callback for other message types', () => {
      const callback = vi.fn();
      setupAuthMessageListener(callback);

      messageListener!({ type: 'OTHER_MESSAGE' });

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
