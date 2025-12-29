"use strict";
(() => {
  // src/logger.ts
  var LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };
  var PREFIX = "[Social Recall]";
  var currentLevel = "debug";
  function shouldLog(level) {
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
  }
  function log(level, ...args) {
    if (!shouldLog(level)) return;
    const consoleFn = level === "debug" ? console.debug : level === "info" ? console.log : level === "warn" ? console.warn : console.error;
    consoleFn(PREFIX, ...args);
  }
  var logger = {
    /**
     * Debug level - detailed information for debugging
     */
    debug(...args) {
      log("debug", ...args);
    },
    /**
     * Info level - general information about operations
     */
    info(...args) {
      log("info", ...args);
    },
    /**
     * Warn level - potential issues that don't prevent operation
     */
    warn(...args) {
      log("warn", ...args);
    },
    /**
     * Error level - errors that may affect functionality
     */
    error(...args) {
      log("error", ...args);
    },
    /**
     * Create a logger bound to a specific module
     * Useful for reducing repetition in a single file
     */
    forModule(module) {
      const modulePrefix = `[${module}]`;
      return {
        debug: (...args) => log("debug", modulePrefix, ...args),
        info: (...args) => log("info", modulePrefix, ...args),
        warn: (...args) => log("warn", modulePrefix, ...args),
        error: (...args) => log("error", modulePrefix, ...args)
      };
    }
  };

  // src/background.ts
  var WEB_APP_ORIGINS = [
    "http://localhost:3000",
    "https://www.socialrecall.now"
  ];
  function isValidOrigin(url) {
    if (!url) return false;
    return WEB_APP_ORIGINS.some((origin) => url.startsWith(origin));
  }
  function isAuthTokenMessage(message) {
    return typeof message === "object" && message !== null && message.type === "AUTH_TOKEN";
  }
  function setupAuthListener() {
    chrome.runtime.onMessageExternal.addListener(
      (message, sender, sendResponse) => {
        if (!isValidOrigin(sender.url)) {
          sendResponse({ success: false, error: "Invalid origin" });
          return;
        }
        if (isAuthTokenMessage(message)) {
          if (!message.token) {
            sendResponse({ success: false, error: "Missing token" });
            return;
          }
          chrome.storage.sync.set({ syncToken: message.token }, () => {
            sendResponse({ success: true });
            chrome.runtime.sendMessage({ type: "AUTH_SUCCESS" });
          });
          return true;
        }
      }
    );
  }
  function setupContextMenu() {
    chrome.runtime.onInstalled.addListener(() => {
      chrome.contextMenus.create({
        id: "social-recall-settings",
        title: "Settings",
        contexts: ["action"]
        // Shows on extension icon right-click
      });
    });
    chrome.contextMenus.onClicked.addListener((info) => {
      if (info.menuItemId === "social-recall-settings") {
        chrome.runtime.openOptionsPage();
      }
    });
  }
  function setupNavigationListener() {
    chrome.webNavigation.onHistoryStateUpdated.addListener(
      (details) => {
        if (details.frameId !== 0) return;
        logger.debug(" SPA navigation detected:", details.url);
        chrome.tabs.sendMessage(details.tabId, {
          type: "URL_CHANGED",
          url: details.url
        }).catch(() => {
        });
      },
      { url: [{ hostContains: "linkedin.com" }] }
    );
    logger.debug(" Navigation listener set up");
  }
  function setupAutoUpdate() {
    chrome.runtime.onUpdateAvailable.addListener(() => {
      logger.debug(" Update available, reloading...");
      chrome.runtime.reload();
    });
  }
  var _a, _b;
  if (typeof chrome !== "undefined" && ((_a = chrome.runtime) == null ? void 0 : _a.onMessageExternal)) {
    setupAuthListener();
    setupContextMenu();
    setupAutoUpdate();
    if ((_b = chrome.webNavigation) == null ? void 0 : _b.onHistoryStateUpdated) {
      setupNavigationListener();
    }
  }
})();
