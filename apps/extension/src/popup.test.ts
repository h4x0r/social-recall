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
    },
    local: {
      get: vi.fn((keys: string[], callback: (result: Record<string, unknown>) => void) => {
        callback({});
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
import { createPopup, PopupElements } from './popup-ui';

describe('Popup UI', () => {
  let dom: JSDOM;
  let document: Document;
  let popup: PopupElements;

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
    it('does not have stats section', () => {
      popup = createPopup(document.getElementById('app')!);

      const statsSection = popup.element.querySelector('.popup__stats');
      const profileCount = popup.element.querySelector('#profileCount');
      const newCount = popup.element.querySelector('#newCount');

      expect(statsSection).toBeNull();
      expect(profileCount).toBeNull();
      expect(newCount).toBeNull();
    });

    it('does not have sync button', () => {
      popup = createPopup(document.getElementById('app')!);

      const syncBtn = popup.element.querySelector('#syncBtn');
      const syncButtonByText = popup.element.querySelector('[data-action="sync"]');

      expect(syncBtn).toBeNull();
      expect(syncButtonByText).toBeNull();
    });

    it('has Open Dashboard button as only action', () => {
      popup = createPopup(document.getElementById('app')!);

      const dashboardBtn = popup.element.querySelector('[data-action="dashboard"]');
      const allButtons = popup.element.querySelectorAll('button');

      expect(dashboardBtn).not.toBeNull();
      expect(allButtons.length).toBe(1);
    });

    it('has recent profiles section', () => {
      popup = createPopup(document.getElementById('app')!);

      const recentSection = popup.element.querySelector('.popup__recent');
      const recentList = popup.element.querySelector('.popup__recent-list');

      expect(recentSection).not.toBeNull();
      expect(recentList).not.toBeNull();
    });

    it('has settings gear icon', () => {
      popup = createPopup(document.getElementById('app')!);

      const settingsLink = popup.element.querySelector('.popup__settings');

      expect(settingsLink).not.toBeNull();
      expect(settingsLink?.getAttribute('href')).toBe('settings.html');
    });
  });

  describe('Recent Profiles', () => {
    it('displays recent profiles from storage', async () => {
      mockStorage.socialNotes = {
        'sarah-chen': { name: 'Sarah Chen', headline: 'VP Engineering', lastSeen: new Date().toISOString() },
        'marcus-johnson': { name: 'Marcus Johnson', headline: 'Founder', lastSeen: new Date().toISOString() },
      };

      popup = createPopup(document.getElementById('app')!);
      await popup.loadRecentProfiles();

      const items = popup.element.querySelectorAll('.popup__recent-item');
      expect(items.length).toBe(2);
    });

    it('opens LinkedIn profile when recent item clicked', async () => {
      mockStorage.socialNotes = {
        'sarah-chen': { name: 'Sarah Chen', headline: 'VP Engineering', lastSeen: new Date().toISOString() },
      };

      popup = createPopup(document.getElementById('app')!);
      await popup.loadRecentProfiles();

      const item = popup.element.querySelector('.popup__recent-item') as HTMLElement;
      item.click();

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://linkedin.com/in/sarah-chen',
      });
    });

    it('shows empty state when no profiles', async () => {
      mockStorage.socialNotes = {};

      popup = createPopup(document.getElementById('app')!);
      await popup.loadRecentProfiles();

      const emptyState = popup.element.querySelector('.popup__recent-empty');
      expect(emptyState).not.toBeNull();
    });
  });

  describe('Dashboard Button', () => {
    it('opens dashboard when clicked', async () => {
      popup = createPopup(document.getElementById('app')!);

      const dashboardBtn = popup.element.querySelector('[data-action="dashboard"]') as HTMLButtonElement;
      dashboardBtn.click();

      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'https://www.socialrecall.now',
      });
    });
  });
});
