"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

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

  // src/consent.ts
  async function getConsent() {
    try {
      const result = await chrome.storage.local.get(["consent"]);
      return result.consent || null;
    } catch (error) {
      logger.error("Failed to get consent:", error);
      return null;
    }
  }
  async function revokeConsent(apiUrl) {
    try {
      const existing = await getConsent();
      if (existing) {
        try {
          await fetch(`${apiUrl}/api/privacy/revoke-consent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ consentLogId: existing.serverLogId })
          });
        } catch (serverError) {
          logger.warn("Failed to notify server of revocation:", serverError);
        }
        const revokedRecord = __spreadProps(__spreadValues({}, existing), {
          given: false,
          revokedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        await chrome.storage.local.set({ consent: revokedRecord });
        logger.info("Consent revoked");
      }
    } catch (error) {
      logger.error("Failed to revoke consent:", error);
      throw error;
    }
  }
  async function hasConsent() {
    const consent = await getConsent();
    return (consent == null ? void 0 : consent.given) === true;
  }

  // src/settings.ts
  var WEB_APP_URL = "https://www.socialrecall.now";
  document.addEventListener("DOMContentLoaded", async () => {
    const googleRow = document.getElementById("googleRow");
    const googleStatus = document.getElementById("googleStatus");
    const disconnectRow = document.getElementById("disconnectRow");
    const privacyRow = document.getElementById("privacyRow");
    const revokeRow = document.getElementById("revokeRow");
    const revokeStatus = document.getElementById("revokeStatus");
    let isConnected = false;
    let showingDisconnect = false;
    await refreshAuthState();
    await refreshConsentState();
    googleRow.addEventListener("click", () => {
      if (!isConnected) {
        chrome.tabs.create({ url: `${WEB_APP_URL}/auth/extension` });
      } else {
        showingDisconnect = !showingDisconnect;
        disconnectRow.style.display = showingDisconnect ? "flex" : "none";
        if (showingDisconnect) {
          googleRow.classList.add("settings__row--expanded");
        } else {
          googleRow.classList.remove("settings__row--expanded");
        }
      }
    });
    disconnectRow.addEventListener("click", () => {
      chrome.storage.sync.remove(["syncToken"], () => {
        isConnected = false;
        showingDisconnect = false;
        disconnectRow.style.display = "none";
        googleRow.classList.remove("settings__row--connected", "settings__row--expanded");
        googleStatus.textContent = "Not connected";
      });
    });
    privacyRow.addEventListener("click", () => {
      chrome.tabs.create({ url: `${WEB_APP_URL}/privacy` });
    });
    revokeRow.addEventListener("click", async () => {
      const confirmed = confirm(
        "Are you sure you want to revoke consent?\n\nThis will stop all data collection and server sync. Your existing data will remain until you request deletion."
      );
      if (confirmed) {
        try {
          await revokeConsent(WEB_APP_URL);
          await refreshConsentState();
        } catch (error) {
          console.error("Failed to revoke consent:", error);
          alert("Failed to revoke consent. Please try again.");
        }
      }
    });
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === "AUTH_SUCCESS") {
        refreshAuthState();
      }
    });
    async function refreshAuthState() {
      return new Promise((resolve) => {
        chrome.storage.sync.get(["syncToken"], (result) => {
          isConnected = !!result.syncToken;
          if (isConnected) {
            googleRow.classList.add("settings__row--connected");
            googleStatus.textContent = "Connected";
          } else {
            googleRow.classList.remove("settings__row--connected");
            googleStatus.textContent = "Not connected";
          }
          resolve();
        });
      });
    }
    async function refreshConsentState() {
      const consent = await getConsent();
      const hasActiveConsent = await hasConsent();
      if (!consent) {
        revokeRow.classList.add("settings__row--disabled");
        revokeStatus.textContent = "No consent given";
      } else if (hasActiveConsent) {
        revokeRow.classList.remove("settings__row--disabled");
        revokeRow.classList.add("settings__row--warning");
        revokeStatus.textContent = "Click to revoke";
      } else {
        revokeRow.classList.add("settings__row--disabled");
        revokeStatus.textContent = "Consent revoked";
      }
    }
  });
})();
