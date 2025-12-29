"use strict";
(() => {
  // src/popup.ts
  var WEB_APP_URL = "https://www.socialrecall.now";
  document.addEventListener("DOMContentLoaded", async () => {
    const recentList = document.getElementById("recentList");
    const dashboardBtn = document.getElementById("dashboardBtn");
    await loadRecentProfiles();
    dashboardBtn.addEventListener("click", () => {
      chrome.tabs.create({ url: WEB_APP_URL });
    });
    async function loadRecentProfiles() {
      return new Promise((resolve) => {
        chrome.storage.sync.get(["socialNotes"], (result) => {
          const notes = result.socialNotes || {};
          const profiles = Object.entries(notes);
          profiles.sort((a, b) => {
            const aTime = a[1].lastSeen ? new Date(a[1].lastSeen).getTime() : 0;
            const bTime = b[1].lastSeen ? new Date(b[1].lastSeen).getTime() : 0;
            return bTime - aTime;
          });
          const recent = profiles.slice(0, 5);
          if (recent.length === 0) {
            recentList.innerHTML = `
            <div class="popup__recent-empty">
              <p>No profiles yet</p>
              <p style="margin-top: 4px; opacity: 0.7;">Visit LinkedIn to start tracking</p>
            </div>
          `;
            resolve();
            return;
          }
          recentList.innerHTML = recent.map(([profileId, note]) => {
            const initials = getInitials(note.name);
            const avatarHtml = note.avatarUrl ? `<img src="${note.avatarUrl}" alt="${note.name}">` : initials;
            return `
              <div class="popup__recent-item" data-profile-id="${profileId}">
                <div class="popup__recent-avatar">${avatarHtml}</div>
                <div class="popup__recent-info">
                  <div class="popup__recent-name">${note.name}</div>
                  <div class="popup__recent-meta">${note.headline || "LinkedIn"}</div>
                </div>
              </div>
            `;
          }).join("");
          recentList.querySelectorAll(".popup__recent-item").forEach((item) => {
            item.addEventListener("click", () => {
              const profileId = item.getAttribute("data-profile-id");
              if (profileId) {
                chrome.tabs.create({ url: `https://linkedin.com/in/${profileId}` });
              }
            });
          });
          resolve();
        });
      });
    }
    function getInitials(name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
  });
})();
