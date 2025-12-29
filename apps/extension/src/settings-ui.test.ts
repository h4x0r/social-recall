import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock chrome API
const mockStorage: Record<string, unknown> = {};
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
  tabs: {
    create: vi.fn(),
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
  },
});

// Import after mocking
import { createSettings, SettingsElements } from './settings-ui';

describe('Settings UI', () => {
  let dom: JSDOM;
  let document: Document;
  let settings: SettingsElements;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
    document = dom.window.document;
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  afterEach(() => {
    dom.window.close();
  });

  describe('Simplified Design', () => {
    it('does not have Web App URL field', () => {
      settings = createSettings(document.getElementById('app')!);

      const urlInput = settings.element.querySelector('#webAppUrl');
      const urlField = settings.element.querySelector('.settings__field');
      const advancedSection = settings.element.querySelector('[data-section="advanced"]');

      expect(urlInput).toBeNull();
      expect(urlField).toBeNull();
      expect(advancedSection).toBeNull();
    });

    it('does not have Export/Import buttons', () => {
      settings = createSettings(document.getElementById('app')!);

      const exportBtn = settings.element.querySelector('#exportBtn');
      const importBtn = settings.element.querySelector('#importBtn');
      const dataSection = settings.element.querySelector('[data-section="data-management"]');

      expect(exportBtn).toBeNull();
      expect(importBtn).toBeNull();
      expect(dataSection).toBeNull();
    });

    it('does not have separate Connection section', () => {
      settings = createSettings(document.getElementById('app')!);

      const connectionSection = settings.element.querySelector('#connectionSection');
      const connectBtn = settings.element.querySelector('#connectBtn');
      const logoutBtn = settings.element.querySelector('#logoutBtn');

      expect(connectionSection).toBeNull();
      expect(connectBtn).toBeNull();
      expect(logoutBtn).toBeNull();
    });
  });

  describe('Account Rows', () => {
    it('has clickable Google account row', () => {
      settings = createSettings(document.getElementById('app')!);

      const googleRow = settings.element.querySelector('[data-account="google"]');

      expect(googleRow).not.toBeNull();
      expect(googleRow?.classList.contains('settings__account-row')).toBe(true);
    });

    it('clicking disconnected Google row initiates connection', () => {
      settings = createSettings(document.getElementById('app')!);

      const googleRow = settings.element.querySelector('[data-account="google"]') as HTMLElement;
      googleRow.click();

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: expect.stringContaining('/auth/extension'),
      });
    });

    it('shows connected state when token exists', async () => {
      mockStorage.syncToken = 'valid-token';

      settings = createSettings(document.getElementById('app')!);
      await settings.refreshAuthState();

      const googleRow = settings.element.querySelector('[data-account="google"]');
      expect(googleRow?.classList.contains('settings__account-row--connected')).toBe(true);
    });

    it('has iCloud row with Coming Soon badge', () => {
      settings = createSettings(document.getElementById('app')!);

      const icloudRow = settings.element.querySelector('[data-account="icloud"]');
      const badge = icloudRow?.querySelector('.settings__badge');

      expect(icloudRow).not.toBeNull();
      expect(badge?.textContent).toContain('Soon');
      expect(icloudRow?.classList.contains('settings__account-row--disabled')).toBe(true);
    });
  });

  describe('Privacy Row', () => {
    it('has Privacy & Data row', () => {
      settings = createSettings(document.getElementById('app')!);

      const privacyRow = settings.element.querySelector('[data-action="privacy"]');

      expect(privacyRow).not.toBeNull();
    });

    it('clicking Privacy row opens privacy page', () => {
      settings = createSettings(document.getElementById('app')!);

      const privacyRow = settings.element.querySelector('[data-action="privacy"]') as HTMLElement;
      privacyRow.click();

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://www.socialrecall.now/privacy',
      });
    });
  });

  describe('Disconnect Flow', () => {
    it('shows disconnect option when clicking connected Google row', async () => {
      mockStorage.syncToken = 'valid-token';

      settings = createSettings(document.getElementById('app')!);
      await settings.refreshAuthState();

      const googleRow = settings.element.querySelector('[data-account="google"]') as HTMLElement;
      googleRow.click();

      // Should show disconnect confirmation or action
      const disconnectAction = settings.element.querySelector('[data-action="disconnect"]');
      expect(disconnectAction).not.toBeNull();
    });

    it('disconnects when confirm clicked', async () => {
      mockStorage.syncToken = 'valid-token';

      settings = createSettings(document.getElementById('app')!);
      await settings.refreshAuthState();

      // Click Google row to show disconnect
      const googleRow = settings.element.querySelector('[data-account="google"]') as HTMLElement;
      googleRow.click();

      // Click disconnect
      const disconnectAction = settings.element.querySelector('[data-action="disconnect"]') as HTMLElement;
      disconnectAction.click();

      expect(chrome.storage.sync.remove).toHaveBeenCalledWith(['syncToken'], expect.any(Function));
    });
  });
});
