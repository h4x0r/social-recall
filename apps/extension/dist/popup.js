"use strict";
(() => {
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
  async function getAllContacts() {
    if (!isExtensionContextValid()) return {};
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(["socialNotes"], (result) => {
          resolve(result.socialNotes || {});
        });
      } catch (e) {
        resolve({});
      }
    });
  }
  function transformContact(profileId, note) {
    const transformedEducation = (note.education || []).map((edu) => ({
      school: edu.school,
      degree: edu.degree,
      field: edu.field,
      startDate: edu.startDate,
      endDate: edu.endDate
    }));
    const transformedCertifications = (note.certifications || []).map((cert) => ({
      name: cert.name,
      issuer: cert.issuer,
      issueDate: cert.issueDate,
      expirationDate: cert.expirationDate
    }));
    const transformedEmployers = (note.employers || []).map((emp, index) => {
      var _a;
      return {
        company: emp.company,
        logo: emp.logo,
        title: emp.title,
        isCurrent: (_a = emp.isCurrent) != null ? _a : index === 0,
        startDate: emp.startDate,
        endDate: emp.endDate
      };
    });
    return {
      profileId,
      name: note.name,
      url: `https://linkedin.com/in/${profileId}`,
      headline: note.headline || void 0,
      location: note.location || void 0,
      avatarUrl: note.avatarUrl || void 0,
      about: note.about || void 0,
      employers: transformedEmployers,
      education: transformedEducation,
      certifications: transformedCertifications,
      skills: note.skills || [],
      languages: note.languages || [],
      projects: note.projects || [],
      publications: note.publications || [],
      services: note.services || [],
      websites: note.websites || [],
      note: note.text || void 0
    };
  }
  async function syncAllContacts() {
    var _a, _b;
    const token = await getSyncToken();
    if (!token) {
      return {
        success: false,
        error: "Not logged in. Please connect to Social Recall first."
      };
    }
    const webAppUrl = await getWebAppUrl();
    const contacts = await getAllContacts();
    const profileIds = Object.keys(contacts);
    if (profileIds.length === 0) {
      return {
        success: true,
        synced: 0,
        failed: 0
      };
    }
    const apiContacts = profileIds.map(
      (profileId) => transformContact(profileId, contacts[profileId])
    );
    try {
      const response = await fetch(`${webAppUrl}/api/contacts/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ contacts: apiContacts })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          await clearSyncToken();
          return {
            success: false,
            error: "Session expired. Please reconnect to Social Recall."
          };
        }
        return {
          success: false,
          error: errorData.error || `Sync failed: ${response.status}`
        };
      }
      const data = await response.json();
      return {
        success: true,
        synced: ((_a = data.result) == null ? void 0 : _a.synced) || 0,
        failed: ((_b = data.result) == null ? void 0 : _b.failed) || 0
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Network error"
      };
    }
  }

  // src/popup.ts
  document.addEventListener("DOMContentLoaded", async () => {
    const statusDot = document.querySelector(".popup__status-dot");
    const statusText = document.getElementById("statusText");
    const profileCount = document.getElementById("profileCount");
    const newCount = document.getElementById("newCount");
    const recentList = document.getElementById("recentList");
    const syncBtn = document.getElementById("syncBtn");
    const webAppBtn = document.getElementById("webAppBtn");
    const progressSection = document.getElementById("progressSection");
    const progressLabel = document.getElementById("progressLabel");
    const progressTime = document.getElementById("progressTime");
    const progressFill = document.getElementById("progressFill");
    let lastProgressTimestamp = 0;
    let hideTimeout = null;
    function checkProgress() {
      chrome.storage.local.get(["extractionProgress"], (result) => {
        const progress = result.extractionProgress;
        if (!progress || progress.timestamp === lastProgressTimestamp) {
          return;
        }
        lastProgressTimestamp = progress.timestamp;
        const isRecent = Date.now() - progress.timestamp < 3e4;
        if (!isRecent) {
          progressSection.style.display = "none";
          return;
        }
        if (hideTimeout) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
        progressSection.style.display = "block";
        progressLabel.textContent = progress.stepLabel;
        progressTime.textContent = `${(progress.elapsed / 1e3).toFixed(1)}s`;
        progressFill.style.width = `${Math.round(progress.progress * 100)}%`;
        if (progress.step === "complete") {
          progressSection.classList.add("popup__progress--complete");
          hideTimeout = setTimeout(() => {
            progressSection.style.display = "none";
            progressSection.classList.remove("popup__progress--complete");
            progressFill.style.width = "0%";
          }, 3e3);
          loadStats();
          loadRecentProfiles();
        } else {
          progressSection.classList.remove("popup__progress--complete");
        }
      });
    }
    checkProgress();
    setInterval(checkProgress, 500);
    const connected = await isLoggedIn();
    updateConnectionStatus(connected);
    await loadStats();
    await loadRecentProfiles();
    syncBtn.addEventListener("click", async () => {
      if (!connected) {
        const webAppUrl = await getWebAppUrl();
        chrome.tabs.create({ url: `${webAppUrl}/auth/extension` });
        return;
      }
      syncBtn.disabled = true;
      syncBtn.innerHTML = '<span class="popup__btn-icon">\u21BB</span> Syncing...';
      const result = await syncAllContacts();
      if (result.success) {
        syncBtn.innerHTML = '<span class="popup__btn-icon">\u2713</span> Synced!';
        setTimeout(() => {
          syncBtn.disabled = false;
          syncBtn.innerHTML = '<span class="popup__btn-icon">\u21BB</span> Sync Now';
        }, 2e3);
      } else {
        syncBtn.innerHTML = '<span class="popup__btn-icon">\u2715</span> Failed';
        setTimeout(() => {
          syncBtn.disabled = false;
          syncBtn.innerHTML = '<span class="popup__btn-icon">\u21BB</span> Sync Now';
        }, 2e3);
      }
    });
    webAppBtn.addEventListener("click", async () => {
      const webAppUrl = await getWebAppUrl();
      chrome.tabs.create({ url: webAppUrl });
    });
    function updateConnectionStatus(isConnected) {
      if (isConnected) {
        statusDot.classList.add("popup__status-dot--connected");
        statusText.textContent = "Connected to Social Recall";
        statusText.classList.add("popup__status-text--connected");
        syncBtn.innerHTML = '<span class="popup__btn-icon">\u21BB</span> Sync Now';
      } else {
        statusDot.classList.add("popup__status-dot--disconnected");
        statusText.textContent = "Not connected";
        syncBtn.innerHTML = '<span class="popup__btn-icon">\u2192</span> Connect';
      }
    }
    async function loadStats() {
      return new Promise((resolve) => {
        chrome.storage.sync.get(["socialNotes"], (result) => {
          const notes = result.socialNotes || {};
          const profiles = Object.keys(notes);
          const total = profiles.length;
          const oneWeekAgo = /* @__PURE__ */ new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          let thisWeek = 0;
          profiles.forEach((id) => {
            const note = notes[id];
            if (note.lastSeen) {
              const lastSeen = new Date(note.lastSeen);
              if (lastSeen >= oneWeekAgo) {
                thisWeek++;
              }
            }
          });
          profileCount.textContent = total.toString();
          newCount.textContent = thisWeek.toString();
          resolve();
        });
      });
    }
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
