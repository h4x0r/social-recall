"use strict";
(() => {
  // src/settings.ts
  var WEB_APP_URL = "https://www.socialrecall.now";
  document.addEventListener("DOMContentLoaded", async () => {
    const googleRow = document.getElementById("googleRow");
    const googleStatus = document.getElementById("googleStatus");
    const disconnectRow = document.getElementById("disconnectRow");
    const privacyRow = document.getElementById("privacyRow");
    let isConnected = false;
    let showingDisconnect = false;
    await refreshAuthState();
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
  });
})();
