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

  // src/types.ts
  function isExtensionContextValid() {
    var _a;
    try {
      return ((_a = chrome.runtime) == null ? void 0 : _a.id) !== void 0;
    } catch (e) {
      return false;
    }
  }

  // src/sync.ts
  var DEFAULT_WEB_APP_URL = "https://www.socialrecall.now";
  async function getWebAppUrl() {
    if (!isExtensionContextValid()) {
      return DEFAULT_WEB_APP_URL;
    }
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(["webAppUrl"], (result) => {
          resolve(result.webAppUrl || DEFAULT_WEB_APP_URL);
        });
      } catch (e) {
        resolve(DEFAULT_WEB_APP_URL);
      }
    });
  }
  async function setWebAppUrl(url) {
    if (!isExtensionContextValid()) return;
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.set({ webAppUrl: url }, resolve);
      } catch (e) {
        resolve();
      }
    });
  }
  async function getSyncToken() {
    if (!isExtensionContextValid()) return null;
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(["syncToken"], (result) => {
          resolve(result.syncToken || null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }
  async function clearSyncToken() {
    if (!isExtensionContextValid()) return;
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.remove(["syncToken"], resolve);
      } catch (e) {
        resolve();
      }
    });
  }
  async function isLoggedIn() {
    const token = await getSyncToken();
    return token !== null && token.length > 0;
  }
  async function getUserInfo() {
    const token = await getSyncToken();
    if (!token) {
      return null;
    }
    const webAppUrl = await getWebAppUrl();
    try {
      const response = await fetch(`${webAppUrl}/api/user/me`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          await clearSyncToken();
        }
        return null;
      }
      const data = await response.json();
      return data.user || null;
    } catch (e) {
      return null;
    }
  }

  // src/popup-auth.ts
  var WEB_APP_BASE_URL = false ? "https://www.socialrecall.now" : "http://localhost:3000";
  var WEB_APP_AUTH_URL = `${WEB_APP_BASE_URL}/auth/extension`;
  function handleConnect() {
    chrome.tabs.create({ url: WEB_APP_AUTH_URL });
  }
  function setupAuthMessageListener(onAuthSuccess) {
    chrome.runtime.onMessage.addListener((message) => {
      if (typeof message === "object" && message !== null && message.type === "AUTH_SUCCESS") {
        onAuthSuccess();
      }
    });
  }

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
  var EXTENSION_VERSION = "0.0.7";
  var CONSENT_TEXT = `This extension acts as an AUTHENTICATED PROXY.

It captures LinkedIn profile data visible through YOUR logged-in session\u2014including connection-restricted information you can access because of your credentials.

This data is transmitted to our servers. By proceeding, you acknowledge you are acting as a data collection proxy.`;
  function getConsentTextHash() {
    let hash = 0;
    for (let i = 0; i < CONSENT_TEXT.length; i++) {
      const char = CONSENT_TEXT.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
  async function getConsent() {
    try {
      const result = await chrome.storage.local.get(["consent"]);
      return result.consent || null;
    } catch (error) {
      logger.error("Failed to get consent:", error);
      return null;
    }
  }
  async function setConsent(serverResponse) {
    const consentRecord = {
      given: true,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      extensionVersion: EXTENSION_VERSION,
      consentTextVersion: getConsentTextHash(),
      userAgent: navigator.userAgent,
      ip: serverResponse.ip,
      serverLogId: serverResponse.logId
    };
    try {
      await chrome.storage.local.set({ consent: consentRecord });
      logger.info("Consent stored successfully");
    } catch (error) {
      logger.error("Failed to store consent:", error);
      throw error;
    }
  }
  async function revokeConsent() {
    try {
      const existing = await getConsent();
      if (existing) {
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
  async function logConsentToServer(apiUrl) {
    const response = await fetch(`${apiUrl}/api/consent-log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        extensionVersion: EXTENSION_VERSION,
        consentTextVersion: getConsentTextHash(),
        userAgent: navigator.userAgent
      })
    });
    if (!response.ok) {
      throw new Error(`Failed to log consent: ${response.status}`);
    }
    return response.json();
  }
  async function grantConsent(apiUrl) {
    const serverResponse = await logConsentToServer(apiUrl);
    await setConsent(serverResponse);
  }

  // src/settings.ts
  document.addEventListener("DOMContentLoaded", async () => {
    const googleAccount = document.getElementById("googleAccount");
    const googleEmail = document.getElementById("googleEmail");
    const connectBtn = document.getElementById("connectBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const exportBtn = document.getElementById("exportBtn");
    const importBtn = document.getElementById("importBtn");
    const webAppUrlInput = document.getElementById("webAppUrl");
    const saveUrlBtn = document.getElementById("saveUrlBtn");
    await updateUI();
    const savedUrl = await getWebAppUrl();
    if (webAppUrlInput) {
      webAppUrlInput.value = savedUrl;
    }
    if (saveUrlBtn) {
      saveUrlBtn.addEventListener("click", async () => {
        const url = webAppUrlInput.value.trim();
        if (url) {
          await setWebAppUrl(url);
          showToast("Web app URL saved!", "success");
        }
      });
    }
    if (connectBtn) {
      connectBtn.addEventListener("click", () => {
        handleConnect();
        showToast("Opening Social Recall...", "info");
      });
    }
    setupAuthMessageListener(async () => {
      await updateUI();
      showToast("Connected to Social Recall!", "success");
    });
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await clearSyncToken();
        await updateUI();
        showToast("Disconnected from Social Recall", "info");
      });
    }
    if (exportBtn) {
      exportBtn.addEventListener("click", exportData);
    }
    if (importBtn) {
      importBtn.addEventListener("click", importData);
    }
    const consentStatus = document.getElementById("consentStatus");
    const revokeConsentBtn = document.getElementById("revokeConsentBtn");
    const grantConsentBtn = document.getElementById("grantConsentBtn");
    await updateConsentUI();
    if (revokeConsentBtn) {
      revokeConsentBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to revoke your consent? This will stop data collection to our servers.")) {
          await revokeConsent();
          await updateConsentUI();
          showToast("Consent revoked. Data collection stopped.", "info");
        }
      });
    }
    if (grantConsentBtn) {
      grantConsentBtn.addEventListener("click", async () => {
        try {
          const apiUrl = await getWebAppUrl();
          await grantConsent(apiUrl);
          await updateConsentUI();
          showToast("Consent granted. Data collection enabled.", "success");
        } catch (error) {
          showToast("Failed to grant consent. Please try again.", "error");
        }
      });
    }
    async function updateConsentUI() {
      const consent = await getConsent();
      if (!consent) {
        if (consentStatus) consentStatus.textContent = "No consent given yet";
        if (revokeConsentBtn) revokeConsentBtn.style.display = "none";
        if (grantConsentBtn) grantConsentBtn.style.display = "flex";
      } else if (consent.given) {
        const date = new Date(consent.timestamp).toLocaleDateString();
        if (consentStatus) consentStatus.textContent = `Consent granted on ${date}`;
        if (revokeConsentBtn) revokeConsentBtn.style.display = "flex";
        if (grantConsentBtn) grantConsentBtn.style.display = "none";
      } else {
        const revokedDate = consent.revokedAt ? new Date(consent.revokedAt).toLocaleDateString() : "unknown date";
        if (consentStatus) consentStatus.textContent = `Consent revoked on ${revokedDate}`;
        if (revokeConsentBtn) revokeConsentBtn.style.display = "none";
        if (grantConsentBtn) grantConsentBtn.style.display = "flex";
      }
    }
    async function updateUI() {
      const loggedIn = await isLoggedIn();
      if (connectBtn) connectBtn.style.display = loggedIn ? "none" : "flex";
      if (logoutBtn) logoutBtn.style.display = loggedIn ? "flex" : "none";
      if (loggedIn) {
        googleAccount == null ? void 0 : googleAccount.classList.add("settings__account--connected");
        const userInfo = await getUserInfo();
        if (userInfo && googleEmail) {
          googleEmail.textContent = userInfo.email;
        } else if (googleEmail) {
          googleEmail.textContent = "Connected";
        }
      } else {
        googleAccount == null ? void 0 : googleAccount.classList.remove("settings__account--connected");
        if (googleEmail) {
          googleEmail.textContent = "Not connected";
        }
      }
    }
    function showToast(message, type) {
      const existingToast = document.querySelector(".settings__toast");
      if (existingToast) {
        existingToast.remove();
      }
      const toast = document.createElement("div");
      toast.className = `settings__toast settings__toast--${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 3e3);
    }
    function exportData() {
      chrome.storage.sync.get(["socialNotes"], (result) => {
        const socialNotes = result.socialNotes || {};
        const csvRows = [];
        csvRows.push(["ProfileId", "PersonName", "Notes", "Companies"].join(","));
        Object.keys(socialNotes).forEach((profileId) => {
          const profile = socialNotes[profileId];
          if (!profile) {
            return;
          }
          const personName = `"${(profile.name || "").replace(/"/g, '""')}"`;
          const notes = `"${(profile.text || "").replace(/"/g, '""')}"`;
          let companies = "";
          if (profile.employers && profile.employers.length) {
            companies = `"${profile.employers.map((e) => e.company || "").join("; ").replace(/"/g, '""')}"`;
          }
          csvRows.push([profileId, personName, notes, companies].join(","));
        });
        if (csvRows.length <= 1) {
          showToast("No profile data found to export", "error");
          return;
        }
        const csvContent = csvRows.join("\n");
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `social-recall-backup-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Exported ${csvRows.length - 1} profiles`, "success");
      });
    }
    function importData() {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".csv";
      input.onchange = (e) => {
        var _a;
        const target = e.target;
        const file = (_a = target.files) == null ? void 0 : _a[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          var _a2;
          try {
            const csvContent = (_a2 = event.target) == null ? void 0 : _a2.result;
            const rows = csvContent.split("\n");
            chrome.storage.sync.get(["socialNotes"], (result) => {
              const socialNotes = result.socialNotes || {};
              let importCount = 0;
              for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;
                const fields = [];
                let inQuotes = false;
                let currentField = "";
                for (let j = 0; j < row.length; j++) {
                  const char = row[j];
                  if (char === '"') {
                    if (j + 1 < row.length && row[j + 1] === '"') {
                      currentField += '"';
                      j++;
                    } else {
                      inQuotes = !inQuotes;
                    }
                  } else if (char === "," && !inQuotes) {
                    fields.push(currentField);
                    currentField = "";
                  } else {
                    currentField += char;
                  }
                }
                fields.push(currentField);
                const [profileId, personName, notes, companies] = fields;
                if (profileId) {
                  socialNotes[profileId] = {
                    name: personName || "",
                    text: notes || ""
                  };
                  if (companies) {
                    const companyNames = companies.split(";").map((c) => c.trim()).filter((c) => c);
                    socialNotes[profileId].employers = companyNames.map((company) => ({
                      company,
                      logo: ""
                    }));
                  }
                  importCount++;
                }
              }
              chrome.storage.sync.set({ socialNotes }, () => {
                showToast(`Imported ${importCount} profiles`, "success");
              });
            });
          } catch (error) {
            console.error("Import error:", error);
            showToast("Error importing CSV data", "error");
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }
  });
})();
