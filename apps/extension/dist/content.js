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

  // src/panel.ts
  var ARCHETYPE_TAROT = {
    ["builder" /* Builder */]: "magician",
    ["advisor" /* Advisor */]: "high-priestess",
    ["creator" /* Creator */]: "empress",
    ["executive" /* Executive */]: "emperor",
    ["connector" /* Connector */]: "lovers",
    ["operator" /* Operator */]: "chariot",
    ["seller" /* Seller */]: "strength",
    ["researcher" /* Researcher */]: "hermit",
    ["integrator" /* Integrator */]: "temperance",
    ["evangelist" /* Evangelist */]: "star",
    ["investor" /* Investor */]: "judgement",
    ["unknown" /* Unknown */]: "unknown"
  };
  var ARCHETYPE_DESCRIPTIONS = {
    ["builder" /* Builder */]: {
      title: "The Magician",
      subtitle: "The Builder",
      description: "Technical founders and engineers who turn ideas into reality. They wield code, systems, and tools to create products from nothing. Often the first hire or co-founder you need to ship."
    },
    ["advisor" /* Advisor */]: {
      title: "The High Priestess",
      subtitle: "The Advisor",
      description: "Keepers of hidden knowledge and institutional wisdom. Board members, executive coaches, and seasoned advisors who see what others miss. They speak rarely but their counsel shapes destinies."
    },
    ["creator" /* Creator */]: {
      title: "The Empress",
      subtitle: "The Creator",
      description: "Creative forces who birth new ideas and nurture them to fruition. Designers, brand builders, and product visionaries who shape how things feel. They bring beauty and meaning to functional things."
    },
    ["executive" /* Executive */]: {
      title: "The Emperor",
      subtitle: "The Executive",
      description: "Leaders who build structure and command respect. CEOs, presidents, and managing directors who create order from chaos. They establish the rules, set the culture, and hold the line."
    },
    ["connector" /* Connector */]: {
      title: "The Lovers",
      subtitle: "The Connector",
      description: "Network weavers who make valuable introductions. They know everyone and understand who needs to meet whom. The person whose text gets returned by anyone in the ecosystem."
    },
    ["operator" /* Operator */]: {
      title: "The Chariot",
      subtitle: "The Operator",
      description: "Execution machines who drive toward goals through sheer will. COOs, Chiefs of Staff, and program managers who make things happen. They turn strategy into results through discipline and focus."
    },
    ["seller" /* Seller */]: {
      title: "Strength",
      subtitle: "The Seller",
      description: "Revenue generators who close deals through persistence and persuasion. They understand customer psychology and can sell vision as effectively as product. First sales hire material."
    },
    ["researcher" /* Researcher */]: {
      title: "The Hermit",
      subtitle: "The Researcher",
      description: "Deep thinkers who illuminate through solitary study. Scientists, analysts, and domain experts who find truth through rigorous investigation. They validate assumptions before you bet the company."
    },
    ["integrator" /* Integrator */]: {
      title: "Temperance",
      subtitle: "The Integrator",
      description: "Masters of balance who blend opposing forces. Product managers, generalists, and bridge-builders who synthesize different perspectives. They find harmony between competing priorities."
    },
    ["evangelist" /* Evangelist */]: {
      title: "The Star",
      subtitle: "The Evangelist",
      description: "Beacons who inspire and attract through authentic sharing. Developer advocates, thought leaders, and community builders who draw others to the mission. They turn users into believers."
    },
    ["investor" /* Investor */]: {
      title: "Judgement",
      subtitle: "The Investor",
      description: "Evaluators who decide which ventures deserve capital and support. Angels, VCs, and LPs who place bets on people and ideas. Their judgment determines who gets the chance to build."
    },
    ["unknown" /* Unknown */]: {
      title: "?",
      subtitle: "Unknown",
      description: "A profile that doesn't clearly fit the core entrepreneurial archetypes. They may be early in their journey, in a specialized field, or simply haven't revealed enough to classify yet."
    }
  };
  var FREE_PROFILE_LIMIT = 10;
  function formatContactForClipboard(intelligence) {
    const lines = [];
    lines.push(intelligence.name);
    if (intelligence.archetype) {
      lines.push(`Archetype: ${capitalizeFirst(intelligence.archetype)}`);
    }
    if (intelligence.skills && intelligence.skills.length > 0) {
      lines.push(`Skills: ${intelligence.skills.join(", ")}`);
    }
    if (intelligence.couldBe && intelligence.couldBe.length > 0) {
      lines.push(`Could Be: ${intelligence.couldBe.join(", ")}`);
    }
    if (intelligence.goodFor && intelligence.goodFor.length > 0) {
      lines.push(`Good For: ${intelligence.goodFor.join(", ")}`);
    }
    return lines.join("\n");
  }
  function formatRelativeTime(date) {
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1e3 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    if (diffYears > 0) {
      return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
    } else if (diffMonths > 0) {
      return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    }
    return "today";
  }
  function filterMeaningfulHistory(history2, firstSeen) {
    if (!history2 || !firstSeen) return history2 || [];
    const firstSeenDate = new Date(firstSeen);
    firstSeenDate.setHours(0, 0, 0, 0);
    return history2.filter((entry) => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() > firstSeenDate.getTime();
    });
  }
  function formatHistoryEntry(entry) {
    var _a, _b, _c, _d;
    const date = formatRelativeTime(new Date(entry.date));
    const fieldLabels = {
      name: "Name",
      headline: "Title",
      location: "Location",
      employers: "Company",
      education: "Education"
    };
    const field = fieldLabels[entry.field] || entry.field;
    if (entry.field === "employers") {
      const oldCompany = Array.isArray(entry.oldValue) && ((_a = entry.oldValue[0]) == null ? void 0 : _a.company);
      const newCompany = Array.isArray(entry.newValue) && ((_b = entry.newValue[0]) == null ? void 0 : _b.company);
      if (oldCompany && newCompany) {
        return `${date}: Joined ${newCompany} (was ${oldCompany})`;
      } else if (newCompany) {
        return `${date}: Joined ${newCompany}`;
      }
    }
    if (entry.field === "education") {
      const oldSchool = Array.isArray(entry.oldValue) && ((_c = entry.oldValue[0]) == null ? void 0 : _c.school);
      const newSchool = Array.isArray(entry.newValue) && ((_d = entry.newValue[0]) == null ? void 0 : _d.school);
      if (newSchool && newSchool !== oldSchool) {
        return `${date}: Added ${newSchool}`;
      }
    }
    const oldVal = typeof entry.oldValue === "string" ? entry.oldValue : "";
    const newVal = typeof entry.newValue === "string" ? entry.newValue : "";
    if (oldVal && newVal) {
      const truncOld = oldVal.length > 30 ? oldVal.slice(0, 27) + "..." : oldVal;
      const truncNew = newVal.length > 30 ? newVal.slice(0, 27) + "..." : newVal;
      return `${date}: ${field} \u2192 ${truncNew}`;
    } else if (newVal) {
      return `${date}: ${field} set to ${newVal}`;
    }
    return `${date}: ${field} changed`;
  }
  function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  function showTarotPopup(archetype) {
    var _a, _b;
    const existingPopup = document.querySelector(".sr-tarot-popup");
    existingPopup == null ? void 0 : existingPopup.remove();
    const validArchetype = archetype && archetype in ARCHETYPE_TAROT ? archetype : "unknown" /* Unknown */;
    const tarotCard = ARCHETYPE_TAROT[validArchetype];
    const info = ARCHETYPE_DESCRIPTIONS[validArchetype];
    const cardImageUrl = chrome.runtime.getURL(`tarot/${tarotCard}.jpg`);
    const popup = document.createElement("div");
    popup.className = "sr-tarot-popup";
    popup.innerHTML = `
    <div class="sr-tarot-popup__backdrop"></div>
    <div class="sr-tarot-popup__content">
      <button class="sr-tarot-popup__close">&times;</button>
      <div class="sr-tarot-popup__card">
        <img src="${cardImageUrl}" alt="${info.title}" />
      </div>
      <div class="sr-tarot-popup__info">
        <h2 class="sr-tarot-popup__title">${info.subtitle}</h2>
        <p class="sr-tarot-popup__description">${info.description}</p>
      </div>
    </div>
  `;
    document.body.appendChild(popup);
    requestAnimationFrame(() => {
      popup.classList.add("sr-tarot-popup--visible");
    });
    const closePopup = () => {
      popup.classList.remove("sr-tarot-popup--visible");
      setTimeout(() => popup.remove(), 300);
    };
    (_a = popup.querySelector(".sr-tarot-popup__backdrop")) == null ? void 0 : _a.addEventListener("click", closePopup);
    (_b = popup.querySelector(".sr-tarot-popup__close")) == null ? void 0 : _b.addEventListener("click", closePopup);
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        closePopup();
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);
  }
  function createPanel(container) {
    let state = "minimized" /* Minimized */;
    let position = { x: 20, y: 20 };
    let profileCount = 0;
    let isAuthenticated = false;
    let reanalyzeCallback = null;
    let addNoteCallback = null;
    let editNoteCallback = null;
    let deleteNoteCallback = null;
    let skillConfirmCallback = null;
    let skillDismissCallback = null;
    let currentProfileId2 = null;
    let currentIntelligence = null;
    let currentNotes = [];
    let notesSortOrder = "desc";
    let pendingDeleteNote = null;
    let pendingDeleteTimer = null;
    let tagRemoveCallback = null;
    let currentGroups = [];
    let availableGroups = [];
    let addToGroupCallback = null;
    let removeFromGroupCallback = null;
    let networkContacts = [];
    let currentIntroduction = null;
    let bulkTagCallback = null;
    let consentAcceptCallback = null;
    let bulkSelectMode = false;
    let selectedProfiles = /* @__PURE__ */ new Set();
    let currentStats = null;
    const defaultTemplates = [
      { id: "default-1", name: "Met at [event]", content: "Met at [event] - ", isDefault: true },
      { id: "default-2", name: "Intro from [person]", content: "Intro from [person] - ", isDefault: true },
      { id: "default-3", name: "Follow up", content: "Follow up: ", isDefault: true },
      { id: "default-4", name: "Discussed", content: "Discussed: ", isDefault: true },
      { id: "default-5", name: "Action item", content: "Action item: ", isDefault: true }
    ];
    let noteTemplates = [...defaultTemplates];
    const element = document.createElement("div");
    element.className = "sr-panel sr-panel--minimized sr-panel--draggable";
    element.style.transform = `translate(${position.x}px, ${position.y}px)`;
    element.setAttribute("tabindex", "0");
    const orb = document.createElement("div");
    orb.className = "sr-panel__orb sr-panel__orb--visible";
    element.appendChild(orb);
    const content = document.createElement("div");
    content.className = "sr-panel__content";
    element.appendChild(content);
    const progressBar = document.createElement("div");
    progressBar.className = "sr-panel__progress";
    progressBar.innerHTML = `
    <div class="sr-panel__progress-header">
      <span class="sr-panel__progress-label">Loading...</span>
      <span class="sr-panel__progress-time">0.0s</span>
    </div>
    <div class="sr-panel__progress-workers"></div>
    <div class="sr-panel__progress-track">
      <div class="sr-panel__progress-fill"></div>
    </div>
  `;
    container.appendChild(element);
    function toggle() {
      if (state === "minimized" /* Minimized */) {
        state = "expanded" /* Expanded */;
        element.classList.remove("sr-panel--minimized");
        element.classList.add("sr-panel--expanded");
        orb.classList.remove("sr-panel__orb--visible");
        content.classList.add("sr-panel__content--visible");
      } else {
        state = "minimized" /* Minimized */;
        element.classList.remove("sr-panel--expanded");
        element.classList.add("sr-panel--minimized");
        orb.classList.add("sr-panel__orb--visible");
        content.classList.remove("sr-panel__content--visible");
      }
    }
    function setIntelligence(intelligence) {
      logger.debug(" setIntelligence called with:", intelligence);
      currentIntelligence = intelligence;
      const validArchetype = intelligence.archetype && intelligence.archetype in ARCHETYPE_TAROT ? intelligence.archetype : "unknown" /* Unknown */;
      const tarotCard = ARCHETYPE_TAROT[validArchetype];
      logger.debug(" Using archetype:", validArchetype, "tarot:", tarotCard);
      const jobAlertHtml = intelligence.jobChange ? `<div class="sr-panel__job-alert">
          <span class="sr-panel__job-alert-icon">\u{1F525}</span>
          <span class="sr-panel__job-alert-text">NEW: ${intelligence.jobChange.current} (was ${intelligence.jobChange.previous})</span>
        </div>` : "";
      const subtitleParts = [];
      if (intelligence.headline) subtitleParts.push(intelligence.headline);
      if (intelligence.location) subtitleParts.push(intelligence.location);
      const subtitleHtml = subtitleParts.length > 0 ? `<div class="sr-panel__subtitle">${subtitleParts.join(" \xB7 ")}</div>` : "";
      const unverifiedIndicator = intelligence.verified === false ? '<span class="sr-panel__unverified" title="Profile data from community - not yet verified">?</span>' : "";
      content.innerHTML = `
      <div class="sr-panel__header">
        <span class="sr-panel__name">${intelligence.name}</span>${unverifiedIndicator}
        <div class="sr-panel__header-actions">
          <button class="sr-panel__network-graph-btn" title="View network graph">\u{1F578}\uFE0F</button>
          <button class="sr-panel__copy-btn" title="Copy contact info">\u{1F4CB}</button>
          <button class="sr-panel__minimize">\u2501</button>
        </div>
      </div>
      ${subtitleHtml}
      <div class="sr-panel__body">
        ${jobAlertHtml}
        <div class="sr-panel__archetype">
          <div class="sr-panel__tarot sr-panel__tarot--clickable" data-card="${tarotCard}" title="Click to learn more"></div>
          <span class="sr-panel__archetype-name">${capitalizeFirst(validArchetype)}</span>
        </div>
        <div class="sr-panel__skills">
          ${intelligence.skills.map((s) => `
            <div class="sr-panel__skill-item" data-skill="${s}">
              <span class="sr-panel__skill">${s}</span>
              <div class="sr-panel__skill-actions">
                <button class="sr-panel__skill-confirm" title="Confirm this skill">\u2713</button>
                <button class="sr-panel__skill-dismiss" title="Dismiss this skill">\xD7</button>
              </div>
            </div>
          `).join("")}
        </div>
        <div class="sr-panel__could-be">
          <span class="sr-panel__label">COULD BE</span>
          ${intelligence.couldBe.join(" \xB7 ")}
        </div>
        <div class="sr-panel__good-for">
          <span class="sr-panel__label">GOOD FOR</span>
          ${intelligence.goodFor.join(" \xB7 ")}
        </div>
        ${currentIntroduction && (currentIntroduction.introducedBy || currentIntroduction.metAt) ? `
          <div class="sr-panel__introduction">
            ${currentIntroduction.introducedBy ? `
              <div class="sr-panel__intro-field">
                <span class="sr-panel__intro-label">Introduced by</span>
                <span class="sr-panel__intro-value">${currentIntroduction.introducedBy}</span>
              </div>
            ` : ""}
            ${currentIntroduction.metAt ? `
              <div class="sr-panel__intro-field">
                <span class="sr-panel__intro-label">Met at</span>
                <span class="sr-panel__intro-value">${currentIntroduction.metAt}</span>
              </div>
            ` : ""}
          </div>
        ` : ""}
        ${(() => {
        const meaningfulHistory = filterMeaningfulHistory(intelligence.history || [], intelligence.firstSeen);
        return meaningfulHistory.length > 0 ? `
          <div class="sr-panel__history-section">
            <span class="sr-panel__label">HISTORY</span>
            <div class="sr-panel__history-entries">
              ${meaningfulHistory.slice(-5).reverse().map(
          (entry) => `<div class="sr-panel__history-entry">${formatHistoryEntry(entry)}</div>`
        ).join("")}
            </div>
          </div>
        ` : "";
      })()}
        ${currentStats ? `
          <div class="sr-panel__stats">
            <span class="sr-panel__label">STATS</span>
            <div class="sr-panel__stats-grid">
              <div class="sr-panel__stat-item">
                <span class="sr-panel__stat-value">${currentStats.totalContacts}</span>
                <span class="sr-panel__stat-label">Contacts</span>
              </div>
              <div class="sr-panel__stat-item">
                <span class="sr-panel__stat-value">${currentStats.totalNotes}</span>
                <span class="sr-panel__stat-label">Notes</span>
              </div>
              <div class="sr-panel__stat-item">
                <span class="sr-panel__stat-value">${currentStats.totalTags}</span>
                <span class="sr-panel__stat-label">Tags</span>
              </div>
              <div class="sr-panel__stat-item">
                <span class="sr-panel__stat-value">${currentStats.thisWeekContacts}</span>
                <span class="sr-panel__stat-label">This Week</span>
              </div>
            </div>
          </div>
        ` : ""}
        ${intelligence.firstSeen ? `
          <div class="sr-panel__first-seen">First seen ${formatRelativeTime(intelligence.firstSeen)}</div>
        ` : ""}
      </div>
      <div class="sr-panel__footer">
        <button class="sr-panel__add-note">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M10.5 1.5L12.5 3.5L4.5 11.5L1.5 12.5L2.5 9.5L10.5 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M8.5 3.5L10.5 5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>Add note</span>
        </button>
        <button class="sr-panel__add-introduction">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="4" cy="4" r="2.5" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="10" cy="4" r="2.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M1 12.5C1 10.5 2.5 9 4.5 9C5.5 9 6.5 9.5 7 10C7.5 9.5 8.5 9 9.5 9C11.5 9 13 10.5 13 12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>Add intro</span>
        </button>
        <button class="sr-panel__reanalyze" title="Re-run AI analysis">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 7C1.5 4 4 1.5 7 1.5C10 1.5 12.5 4 12.5 7C12.5 10 10 12.5 7 12.5C5 12.5 3.3 11.5 2.3 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M1 7.5L2.3 10L4.5 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Re-analyze</span>
        </button>
      </div>
    `;
      logger.debug(" Content updated, innerHTML length:", content.innerHTML.length);
      logger.debug(" Content visible class:", content.classList.contains("sr-panel__content--visible"));
      logger.debug(" Panel state:", state);
      const minimizeBtn = content.querySelector(".sr-panel__minimize");
      minimizeBtn == null ? void 0 : minimizeBtn.addEventListener("click", toggle);
      const copyBtn = content.querySelector(".sr-panel__copy-btn");
      copyBtn == null ? void 0 : copyBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (currentIntelligence) {
          const text = formatContactForClipboard(currentIntelligence);
          await navigator.clipboard.writeText(text);
          copyBtn.classList.add("sr-panel__copy-btn--success");
          setTimeout(() => copyBtn.classList.remove("sr-panel__copy-btn--success"), 2e3);
        }
      });
      const networkGraphBtn = content.querySelector(".sr-panel__network-graph-btn");
      networkGraphBtn == null ? void 0 : networkGraphBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showNetworkGraph();
      });
      const tarotEl = content.querySelector(".sr-panel__tarot");
      tarotEl == null ? void 0 : tarotEl.addEventListener("click", (e) => {
        e.stopPropagation();
        showTarotPopup(validArchetype);
      });
      const reanalyzeBtn = content.querySelector(".sr-panel__reanalyze");
      reanalyzeBtn == null ? void 0 : reanalyzeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (reanalyzeCallback) {
          reanalyzeCallback();
        }
      });
      const addNoteBtn = content.querySelector(".sr-panel__add-note");
      addNoteBtn == null ? void 0 : addNoteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showNoteInput();
      });
      const addIntroBtn = content.querySelector(".sr-panel__add-introduction");
      addIntroBtn == null ? void 0 : addIntroBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        showIntroductionForm();
      });
      content.querySelectorAll(".sr-panel__skill-confirm").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const skillItem = btn.closest(".sr-panel__skill-item");
          const skill = skillItem == null ? void 0 : skillItem.getAttribute("data-skill");
          if (!skill || !skillConfirmCallback) return;
          const result = await skillConfirmCallback(skill);
          if (result.success) {
            skillItem == null ? void 0 : skillItem.classList.add("sr-panel__skill-item--confirmed");
          }
        });
      });
      content.querySelectorAll(".sr-panel__skill-dismiss").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const skillItem = btn.closest(".sr-panel__skill-item");
          const skill = skillItem == null ? void 0 : skillItem.getAttribute("data-skill");
          if (!skill || !skillDismissCallback) return;
          const result = await skillDismissCallback(skill);
          if (result.success) {
            skillItem == null ? void 0 : skillItem.remove();
          }
        });
      });
    }
    const MAX_NOTE_LENGTH = 500;
    function showNoteInput() {
      const existingInput = content.querySelector(".sr-panel__note-input");
      existingInput == null ? void 0 : existingInput.remove();
      const noteInput = document.createElement("div");
      noteInput.className = "sr-panel__note-input";
      noteInput.innerHTML = `
      <div class="sr-panel__note-header">
        <div class="sr-panel__note-header-line"></div>
        <span class="sr-panel__note-header-title">NEW NOTE</span>
        <div class="sr-panel__note-header-line"></div>
      </div>
      <div class="sr-panel__note-composer">
        <div class="sr-panel__note-textarea-wrapper">
          <textarea class="sr-panel__note-textarea" placeholder="What would you like to remember about this person?" rows="4" maxlength="${MAX_NOTE_LENGTH}"></textarea>
          <div class="sr-panel__note-toolbar">
            <button class="sr-panel__template-btn" title="Insert template">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="3" width="12" height="2" rx="0.5" fill="currentColor"/>
                <rect x="2" y="7" width="8" height="2" rx="0.5" fill="currentColor"/>
                <rect x="2" y="11" width="10" height="2" rx="0.5" fill="currentColor"/>
              </svg>
            </button>
            <div class="sr-panel__note-char-indicator">
              <svg class="sr-panel__char-ring" viewBox="0 0 36 36">
                <circle class="sr-panel__char-ring-bg" cx="18" cy="18" r="16" fill="none" stroke-width="2"/>
                <circle class="sr-panel__char-ring-progress" cx="18" cy="18" r="16" fill="none" stroke-width="2" stroke-dasharray="100.53" stroke-dashoffset="100.53"/>
              </svg>
              <span class="sr-panel__char-count-text">0</span>
            </div>
          </div>
        </div>
      </div>
      <div class="sr-panel__note-actions">
        <button class="sr-panel__note-cancel">
          <span>Cancel</span>
        </button>
        <button class="sr-panel__note-save">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11.5 3.5L5.5 10.5L2.5 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Save Note</span>
        </button>
      </div>
      <div class="sr-panel__note-status"></div>
    `;
      const footer = content.querySelector(".sr-panel__footer");
      if (footer) {
        footer.insertAdjacentElement("beforebegin", noteInput);
      } else {
        content.appendChild(noteInput);
      }
      const textarea = noteInput.querySelector(".sr-panel__note-textarea");
      const charCountText = noteInput.querySelector(".sr-panel__char-count-text");
      const charRingProgress = noteInput.querySelector(".sr-panel__char-ring-progress");
      const charIndicator = noteInput.querySelector(".sr-panel__note-char-indicator");
      const circumference = 2 * Math.PI * 16;
      textarea == null ? void 0 : textarea.focus();
      function updateCharCount() {
        const currentLength = textarea.value.length;
        const percentage = currentLength / MAX_NOTE_LENGTH;
        const offset = circumference - percentage * circumference;
        if (charCountText) charCountText.textContent = `${currentLength}`;
        if (charRingProgress) charRingProgress.style.strokeDashoffset = `${offset}`;
        if (charIndicator) {
          charIndicator.classList.remove("sr-panel__note-char-indicator--warning", "sr-panel__note-char-indicator--danger");
          if (percentage >= 0.9) {
            charIndicator.classList.add("sr-panel__note-char-indicator--danger");
          } else if (percentage >= 0.75) {
            charIndicator.classList.add("sr-panel__note-char-indicator--warning");
          }
        }
      }
      textarea == null ? void 0 : textarea.addEventListener("input", updateCharCount);
      const cancelBtn = noteInput.querySelector(".sr-panel__note-cancel");
      cancelBtn == null ? void 0 : cancelBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        noteInput.remove();
      });
      const templateBtn = noteInput.querySelector(".sr-panel__template-btn");
      templateBtn == null ? void 0 : templateBtn.addEventListener("click", (e) => {
        var _a;
        e.stopPropagation();
        const existingDropdown = noteInput.querySelector(".sr-panel__template-dropdown");
        if (existingDropdown) {
          existingDropdown.remove();
          return;
        }
        const dropdown = document.createElement("div");
        dropdown.className = "sr-panel__template-dropdown";
        const templatesHtml = noteTemplates.map(
          (t) => `<button class="sr-panel__template-option" data-template="${t.content}">${t.name}</button>`
        ).join("");
        dropdown.innerHTML = `
        ${templatesHtml}
        <div class="sr-panel__template-divider"></div>
        <button class="sr-panel__template-manage">\u2699\uFE0F Manage Templates</button>
      `;
        dropdown.querySelectorAll(".sr-panel__template-option").forEach((option) => {
          option.addEventListener("click", (ev) => {
            ev.stopPropagation();
            const template = option.getAttribute("data-template") || "";
            textarea.value = template;
            textarea.focus();
            updateCharCount();
            dropdown.remove();
          });
        });
        (_a = dropdown.querySelector(".sr-panel__template-manage")) == null ? void 0 : _a.addEventListener("click", (ev) => {
          ev.stopPropagation();
          dropdown.remove();
          noteInput.remove();
          showTemplatesManager();
        });
        templateBtn.insertAdjacentElement("afterend", dropdown);
      });
      const saveBtn = noteInput.querySelector(".sr-panel__note-save");
      const statusEl = noteInput.querySelector(".sr-panel__note-status");
      saveBtn == null ? void 0 : saveBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const noteContent = textarea == null ? void 0 : textarea.value.trim();
        if (!noteContent) {
          statusEl.textContent = "Please enter a note";
          statusEl.className = "sr-panel__note-status sr-panel__note-status--error";
          return;
        }
        if (!addNoteCallback) {
          statusEl.textContent = "Note saving not configured";
          statusEl.className = "sr-panel__note-status sr-panel__note-status--error";
          return;
        }
        saveBtn.disabled = true;
        cancelBtn.disabled = true;
        statusEl.textContent = "Saving...";
        statusEl.className = "sr-panel__note-status";
        try {
          const result = await addNoteCallback(noteContent);
          if (result.success) {
            statusEl.textContent = "Note saved!";
            statusEl.className = "sr-panel__note-status sr-panel__note-status--success";
            setTimeout(() => noteInput.remove(), 1e3);
          } else {
            statusEl.textContent = result.error || "Failed to save note";
            statusEl.className = "sr-panel__note-status sr-panel__note-status--error";
            saveBtn.disabled = false;
            cancelBtn.disabled = false;
          }
        } catch (err) {
          statusEl.textContent = "Network error";
          statusEl.className = "sr-panel__note-status sr-panel__note-status--error";
          saveBtn.disabled = false;
          cancelBtn.disabled = false;
        }
      });
    }
    function primeForProfile(name, headline, location, avatarUrl) {
      logger.debug(" Priming for profile:", name, headline, location);
      const tarotCard = ARCHETYPE_TAROT["unknown" /* Unknown */];
      const subtitleParts = [];
      if (headline) subtitleParts.push(headline);
      if (location) subtitleParts.push(location);
      const subtitleHtml = subtitleParts.length > 0 ? `<div class="sr-panel__subtitle">${subtitleParts.join(" \xB7 ")}</div>` : "";
      content.innerHTML = `
      <div class="sr-panel__header">
        <span class="sr-panel__name">${name}</span>
        <button class="sr-panel__minimize">\u2501</button>
      </div>
      ${subtitleHtml}
      <div class="sr-panel__body">
        <div class="sr-panel__archetype">
          <div class="sr-panel__tarot sr-panel__tarot--loading" data-card="${tarotCard}" title="Analyzing..."></div>
          <span class="sr-panel__archetype-name sr-panel__archetype-name--loading">Analyzing...</span>
        </div>
        <div class="sr-panel__skills sr-panel__skills--loading">
          <span class="sr-panel__skill sr-panel__skill--placeholder">\xB7\xB7\xB7</span>
        </div>
        <div class="sr-panel__could-be sr-panel__could-be--loading">
          <span class="sr-panel__label">COULD BE</span>
          <span class="sr-panel__placeholder-text">Analyzing profile...</span>
        </div>
        <div class="sr-panel__good-for sr-panel__good-for--loading">
          <span class="sr-panel__label">GOOD FOR</span>
          <span class="sr-panel__placeholder-text">Analyzing profile...</span>
        </div>
      </div>
    `;
      const minimizeBtn = content.querySelector(".sr-panel__minimize");
      minimizeBtn == null ? void 0 : minimizeBtn.addEventListener("click", toggle);
      if (state === "minimized" /* Minimized */) {
        toggle();
      }
    }
    function setPosition(x, y) {
      position = { x, y };
      element.style.transform = `translate(${x}px, ${y}px)`;
    }
    function getPosition() {
      return __spreadValues({}, position);
    }
    function setProfileCount(count) {
      profileCount = count;
      updateCounter();
    }
    function setAuthenticated(authenticated) {
      isAuthenticated = authenticated;
      updateCounter();
      if (authenticated) {
        const existingGate = content.querySelector(".sr-panel__gate");
        existingGate == null ? void 0 : existingGate.remove();
        const body = content.querySelector(".sr-panel__body");
        body == null ? void 0 : body.classList.remove("sr-panel__body--hidden");
      }
    }
    function updateCounter() {
      const existingCounter = content.querySelector(".sr-panel__counter");
      existingCounter == null ? void 0 : existingCounter.remove();
      if (isAuthenticated) {
        return;
      }
      if (profileCount > 0 && profileCount <= FREE_PROFILE_LIMIT) {
        const footer = content.querySelector(".sr-panel__footer");
        if (footer) {
          const counter = document.createElement("div");
          counter.className = "sr-panel__counter";
          counter.innerHTML = `<span>${profileCount} of ${FREE_PROFILE_LIMIT} free profiles</span>`;
          footer.insertBefore(counter, footer.firstChild);
        }
      }
    }
    function showGate() {
      if (isAuthenticated) {
        return;
      }
      const body = content.querySelector(".sr-panel__body");
      body == null ? void 0 : body.classList.add("sr-panel__body--hidden");
      const existingGate = content.querySelector(".sr-panel__gate");
      existingGate == null ? void 0 : existingGate.remove();
      const gate = document.createElement("div");
      gate.className = "sr-panel__gate";
      gate.innerHTML = `
      <div class="sr-panel__gate-header">
        <span class="sr-panel__gate-diamond">\u25C7</span>
        You've tracked ${profileCount} people.
        <br>Your network is growing.
      </div>
      <div class="sr-panel__gate-body">
        <p class="sr-panel__gate-intro">Create a free account to unlock:</p>

        <div class="sr-panel__gate-section">
          <span class="sr-panel__gate-label">EXTENSION</span>
          <ul class="sr-panel__gate-list">
            <li>Track unlimited connections</li>
            <li>Never lose your network</li>
          </ul>
        </div>

        <div class="sr-panel__gate-section">
          <span class="sr-panel__gate-label">WEB APP</span>
          <ul class="sr-panel__gate-list">
            <li>Search "Who can help with X?"</li>
            <li>Dashboard of all contacts</li>
            <li>Relationship management</li>
            <li>Full CRM features</li>
          </ul>
        </div>
      </div>
      <button class="sr-panel__gate-cta">
        Continue with Google
      </button>
      <div class="sr-panel__gate-footer">
        <span class="sr-panel__gate-diamond">\u25C7</span>
      </div>
    `;
      const header = content.querySelector(".sr-panel__header");
      if (header) {
        header.insertAdjacentElement("afterend", gate);
      }
    }
    let isMinimalMode = false;
    function setMinimalMode(minimal) {
      isMinimalMode = minimal;
      if (minimal) {
        element.classList.add("sr-panel--minimal");
        orb.title = "Social Recall - Click to see recent profiles";
        if (state === "expanded" /* Expanded */) {
          state = "minimized" /* Minimized */;
          element.classList.remove("sr-panel--expanded");
          element.classList.add("sr-panel--minimized");
          orb.classList.add("sr-panel__orb--visible");
          content.classList.remove("sr-panel__content--visible");
        }
      } else {
        element.classList.remove("sr-panel--minimal");
        orb.title = "";
        const tarotCard = ARCHETYPE_TAROT["unknown" /* Unknown */];
        content.innerHTML = `
        <div class="sr-panel__header">
          <span class="sr-panel__name">Loading...</span>
          <button class="sr-panel__minimize">\u2501</button>
        </div>
        <div class="sr-panel__body">
          <div class="sr-panel__archetype">
            <div class="sr-panel__tarot sr-panel__tarot--loading" data-card="${tarotCard}" title="Analyzing..."></div>
            <span class="sr-panel__archetype-name sr-panel__archetype-name--loading">Analyzing...</span>
          </div>
        </div>
      `;
        const minimizeBtn = content.querySelector(".sr-panel__minimize");
        minimizeBtn == null ? void 0 : minimizeBtn.addEventListener("click", toggle);
      }
    }
    function showHistory(profiles) {
      bulkSelectMode = false;
      selectedProfiles.clear();
      function renderHistoryItems() {
        return profiles.length > 0 ? profiles.map((p) => {
          var _a;
          const initials = p.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
          const avatarContent = p.avatarUrl ? `<img src="${p.avatarUrl}" alt="${p.name}">` : initials;
          const timeAgo = formatRelativeTime(new Date(p.lastSeen));
          const checkboxHtml = bulkSelectMode ? `<input type="checkbox" class="sr-panel__bulk-checkbox" data-profile-id="${p.profileId}" ${selectedProfiles.has(p.profileId) ? "checked" : ""} />` : "";
          return `
              <div class="sr-panel__history-item ${bulkSelectMode ? "sr-panel__history-item--bulk" : ""}" data-profile-id="${p.profileId}">
                ${checkboxHtml}
                <div class="sr-panel__history-avatar">${avatarContent}</div>
                <div class="sr-panel__history-info">
                  <div class="sr-panel__history-name">${p.name}</div>
                  <div class="sr-panel__history-meta">${((_a = p.headline) == null ? void 0 : _a.slice(0, 50)) || "LinkedIn"} \xB7 ${timeAgo}</div>
                </div>
              </div>
            `;
        }).join("") : `<div class="sr-panel__history-empty">
            <p>No profiles yet</p>
            <p>Visit LinkedIn to start tracking</p>
          </div>`;
      }
      function renderBulkActionsBar() {
        if (!bulkSelectMode || selectedProfiles.size === 0) return "";
        return `
        <div class="sr-panel__bulk-actions">
          <span class="sr-panel__bulk-count">${selectedProfiles.size} selected</span>
          <button class="sr-panel__bulk-add-tag">+ Tag</button>
        </div>
      `;
      }
      function updateUI() {
        const historyList = content.querySelector(".sr-panel__history-list");
        const bulkActionsContainer = content.querySelector(".sr-panel__bulk-actions-container");
        if (historyList) {
          historyList.innerHTML = renderHistoryItems();
          wireUpHistoryItems();
        }
        if (bulkActionsContainer) {
          bulkActionsContainer.innerHTML = renderBulkActionsBar();
          wireUpBulkActions();
        }
        const toggleBtn = content.querySelector(".sr-panel__bulk-toggle");
        if (toggleBtn) {
          toggleBtn.textContent = bulkSelectMode ? "Cancel" : "Select";
        }
      }
      function wireUpHistoryItems() {
        content.querySelectorAll(".sr-panel__bulk-checkbox").forEach((checkbox) => {
          checkbox.addEventListener("change", (e) => {
            e.stopPropagation();
            const profileId = checkbox.getAttribute("data-profile-id");
            if (profileId) {
              if (checkbox.checked) {
                selectedProfiles.add(profileId);
              } else {
                selectedProfiles.delete(profileId);
              }
              updateUI();
            }
          });
        });
        content.querySelectorAll(".sr-panel__history-item").forEach((item) => {
          item.addEventListener("click", (e) => {
            if (bulkSelectMode) {
              const checkbox = item.querySelector(".sr-panel__bulk-checkbox");
              if (checkbox && e.target !== checkbox) {
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event("change", { bubbles: true }));
              }
            } else {
              const profileId = item.getAttribute("data-profile-id");
              if (profileId) {
                window.open(`https://linkedin.com/in/${profileId}`, "_blank");
              }
            }
          });
        });
      }
      function wireUpBulkActions() {
        const addTagBtn = content.querySelector(".sr-panel__bulk-add-tag");
        addTagBtn == null ? void 0 : addTagBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          showBulkTagInput();
        });
      }
      function showBulkTagInput() {
        const existingInput = content.querySelector(".sr-panel__bulk-tag-form");
        if (existingInput) {
          existingInput.remove();
          return;
        }
        const form = document.createElement("div");
        form.className = "sr-panel__bulk-tag-form";
        form.innerHTML = `
        <input type="text" class="sr-panel__bulk-tag-input" placeholder="Tag name..." />
        <button class="sr-panel__bulk-tag-submit">Apply</button>
      `;
        const bulkActionsContainer = content.querySelector(".sr-panel__bulk-actions-container");
        bulkActionsContainer == null ? void 0 : bulkActionsContainer.appendChild(form);
        const input = form.querySelector(".sr-panel__bulk-tag-input");
        input == null ? void 0 : input.focus();
        const submitBtn = form.querySelector(".sr-panel__bulk-tag-submit");
        submitBtn == null ? void 0 : submitBtn.addEventListener("click", () => {
          const tagName = input == null ? void 0 : input.value.trim();
          if (tagName && bulkTagCallback && selectedProfiles.size > 0) {
            bulkTagCallback(Array.from(selectedProfiles), tagName);
            form.remove();
          }
        });
      }
      content.innerHTML = `
      <div class="sr-panel__header">
        <span class="sr-panel__name">Social Recall</span>
        <div class="sr-panel__header-actions">
          ${profiles.length > 0 ? '<button class="sr-panel__bulk-toggle">Select</button>' : ""}
          <button class="sr-panel__minimize">\u2501</button>
        </div>
      </div>
      <div class="sr-panel__bulk-actions-container"></div>
      <div class="sr-panel__body sr-panel__history">
        <div class="sr-panel__history-header">
          <span class="sr-panel__history-label">RECENT</span>
        </div>
        <div class="sr-panel__history-list">
          ${renderHistoryItems()}
        </div>
      </div>
    `;
      const minimizeBtn = content.querySelector(".sr-panel__minimize");
      minimizeBtn == null ? void 0 : minimizeBtn.addEventListener("click", toggle);
      const bulkToggle = content.querySelector(".sr-panel__bulk-toggle");
      bulkToggle == null ? void 0 : bulkToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        bulkSelectMode = !bulkSelectMode;
        if (!bulkSelectMode) {
          selectedProfiles.clear();
        }
        updateUI();
      });
      wireUpHistoryItems();
    }
    orb.addEventListener("click", () => {
      toggle();
    });
    function setProgress(progress) {
      const labelEl = progressBar.querySelector(".sr-panel__progress-label");
      const timeEl = progressBar.querySelector(".sr-panel__progress-time");
      const fillEl = progressBar.querySelector(".sr-panel__progress-fill");
      const workersEl = progressBar.querySelector(".sr-panel__progress-workers");
      if (!progress) {
        progressBar.remove();
        progressBar.classList.remove("sr-panel__progress--complete");
        workersEl.innerHTML = "";
        return;
      }
      if (!content.contains(progressBar)) {
        content.insertBefore(progressBar, content.firstChild);
      }
      labelEl.textContent = progress.label;
      timeEl.textContent = `${(progress.elapsed / 1e3).toFixed(1)}s`;
      fillEl.style.width = `${Math.round(progress.progress * 100)}%`;
      if (progress.workers && progress.workers.length > 0) {
        const workerStatusIcon = (status) => {
          switch (status) {
            case "pending":
              return "\u25CB";
            case "loading":
              return "\u25D0";
            case "complete":
              return "\u2713";
          }
        };
        const workerStatusClass = (status) => {
          return `sr-panel__progress-worker--${status}`;
        };
        workersEl.innerHTML = progress.workers.map(
          (w) => `<span class="sr-panel__progress-worker ${workerStatusClass(w.status)}" title="${w.name}">
          <span class="sr-panel__progress-worker-icon">${workerStatusIcon(w.status)}</span>
          <span class="sr-panel__progress-worker-name">${w.name}</span>
        </span>`
        ).join("");
      } else {
        workersEl.innerHTML = "";
      }
      if (progress.step === "complete") {
        progressBar.classList.add("sr-panel__progress--complete");
        if (state === "minimized" /* Minimized */ && !isMinimalMode) {
          toggle();
        }
      } else {
        progressBar.classList.remove("sr-panel__progress--complete");
        if (state === "minimized" /* Minimized */ && !isMinimalMode) {
          toggle();
        }
      }
    }
    function onReanalyze(callback) {
      reanalyzeCallback = callback;
    }
    function onAddNote(callback) {
      addNoteCallback = callback;
    }
    function setCurrentProfile(profileId) {
      currentProfileId2 = profileId;
    }
    function setNotes(notes) {
      currentNotes = notes;
      const existingNotes = content.querySelector(".sr-panel__notes-section");
      existingNotes == null ? void 0 : existingNotes.remove();
      const notesSection = document.createElement("div");
      notesSection.className = "sr-panel__notes-section";
      const sortArrow = notesSortOrder === "desc" ? "\u2193" : "\u2191";
      const sortTitle = notesSortOrder === "desc" ? "Newest first" : "Oldest first";
      function escapeHtml(text) {
        return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
      }
      function formatNoteContent(text) {
        let formatted = escapeHtml(text);
        const lines = formatted.split("\n");
        let inList = false;
        const processedLines = [];
        for (const line of lines) {
          if (line.match(/^- /)) {
            if (!inList) {
              processedLines.push('<ul class="sr-panel__note-list">');
              inList = true;
            }
            processedLines.push(`<li>${line.substring(2)}</li>`);
          } else {
            if (inList) {
              processedLines.push("</ul>");
              inList = false;
            }
            processedLines.push(line);
          }
        }
        if (inList) {
          processedLines.push("</ul>");
        }
        formatted = processedLines.join("\n");
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
        formatted = formatted.replace(new RegExp("(?<!\\*)\\*([^*]+)\\*(?!\\*)", "g"), "<em>$1</em>");
        return formatted;
      }
      function highlightText(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
        return text.replace(regex, '<span class="sr-panel__note-highlight">$1</span>');
      }
      function renderNotesList(searchQuery = "") {
        const sortedNotes = [...notes].sort((a, b) => {
          const timeA = new Date(a.created_at).getTime();
          const timeB = new Date(b.created_at).getTime();
          return notesSortOrder === "desc" ? timeB - timeA : timeA - timeB;
        });
        const filteredNotes = searchQuery ? sortedNotes.filter((note) => note.content.toLowerCase().includes(searchQuery.toLowerCase())) : sortedNotes;
        if (filteredNotes.length === 0 && searchQuery) {
          return '<div class="sr-panel__notes-no-results">No notes matching your search</div>';
        }
        return sortedNotes.map((note) => {
          const timeAgo = formatRelativeTime(new Date(note.created_at));
          const wasEdited = note.updated_at && note.updated_at !== note.created_at;
          const editedIndicator = wasEdited ? '<span class="sr-panel__note-edited">(edited)</span>' : "";
          const matchesSearch = !searchQuery || note.content.toLowerCase().includes(searchQuery.toLowerCase());
          const hiddenClass = matchesSearch ? "" : "sr-panel__note--hidden";
          const formattedContent = formatNoteContent(note.content);
          const displayContent = searchQuery && matchesSearch ? highlightText(formattedContent, searchQuery) : formattedContent;
          return `
          <div class="sr-panel__note-item ${hiddenClass}" data-note-id="${note.id}">
            <div class="sr-panel__note-header">
              <div class="sr-panel__note-time">${timeAgo} ${editedIndicator}</div>
              <div class="sr-panel__note-actions-inline">
                <button class="sr-panel__note-edit" title="Edit">\u270E</button>
                <button class="sr-panel__note-delete" title="Delete">\xD7</button>
              </div>
            </div>
            <div class="sr-panel__note-content">${displayContent}</div>
          </div>
        `;
        }).join("");
      }
      if (notes.length === 0) {
        return;
      }
      notesSection.innerHTML = `
      <div class="sr-panel__notes-header">
        <span class="sr-panel__label">NOTES</span>
        <input type="text" class="sr-panel__notes-search" placeholder="Search notes..." />
        <button class="sr-panel__notes-sort" title="${sortTitle}">${sortArrow}</button>
      </div>
      <div class="sr-panel__notes-list">${renderNotesList()}</div>
    `;
      const searchInput = notesSection.querySelector(".sr-panel__notes-search");
      searchInput == null ? void 0 : searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim();
        const notesList = notesSection.querySelector(".sr-panel__notes-list");
        if (notesList) {
          notesList.innerHTML = renderNotesList(query);
          wireUpNoteButtons(notesSection);
        }
      });
      const body = content.querySelector(".sr-panel__body");
      if (body) {
        body.appendChild(notesSection);
      } else {
        const footer = content.querySelector(".sr-panel__footer");
        if (footer) {
          footer.insertAdjacentElement("beforebegin", notesSection);
        } else {
          content.appendChild(notesSection);
        }
      }
      const sortBtn = notesSection.querySelector(".sr-panel__notes-sort");
      sortBtn == null ? void 0 : sortBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        notesSortOrder = notesSortOrder === "desc" ? "asc" : "desc";
        setNotes(currentNotes);
      });
      wireUpNoteButtons(notesSection);
    }
    function wireUpNoteButtons(notesSection) {
      notesSection.querySelectorAll(".sr-panel__note-edit").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          var _a, _b;
          e.stopPropagation();
          const noteItem = btn.closest(".sr-panel__note-item");
          const noteId = noteItem == null ? void 0 : noteItem.getAttribute("data-note-id");
          const contentEl = noteItem == null ? void 0 : noteItem.querySelector(".sr-panel__note-content");
          const currentContent = (contentEl == null ? void 0 : contentEl.textContent) || "";
          if (!noteId || !noteItem) return;
          const editForm = document.createElement("div");
          editForm.className = "sr-panel__note-edit-form";
          editForm.innerHTML = `
          <textarea class="sr-panel__note-edit-textarea">${currentContent}</textarea>
          <div class="sr-panel__note-edit-actions">
            <button class="sr-panel__note-cancel-edit">Cancel</button>
            <button class="sr-panel__note-save-edit">Save</button>
          </div>
        `;
          contentEl == null ? void 0 : contentEl.classList.add("sr-panel__note-content--hidden");
          noteItem.appendChild(editForm);
          const textarea = editForm.querySelector("textarea");
          textarea == null ? void 0 : textarea.focus();
          (_a = editForm.querySelector(".sr-panel__note-cancel-edit")) == null ? void 0 : _a.addEventListener("click", (ev) => {
            ev.stopPropagation();
            editForm.remove();
            contentEl == null ? void 0 : contentEl.classList.remove("sr-panel__note-content--hidden");
          });
          (_b = editForm.querySelector(".sr-panel__note-save-edit")) == null ? void 0 : _b.addEventListener("click", async (ev) => {
            ev.stopPropagation();
            const newContent = textarea == null ? void 0 : textarea.value.trim();
            if (!newContent || !editNoteCallback) return;
            await editNoteCallback(noteId, newContent);
          });
        });
      });
      notesSection.querySelectorAll(".sr-panel__note-delete").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const noteItem = btn.closest(".sr-panel__note-item");
          const noteId = noteItem == null ? void 0 : noteItem.getAttribute("data-note-id");
          if (!noteId) return;
          const noteToDelete = currentNotes.find((n) => n.id === noteId);
          if (!noteToDelete) return;
          pendingDeleteNote = noteToDelete;
          const notesWithoutDeleted = currentNotes.filter((n) => n.id !== noteId);
          setNotes(notesWithoutDeleted);
          showUndoToast();
          if (pendingDeleteTimer) {
            clearTimeout(pendingDeleteTimer);
          }
          pendingDeleteTimer = setTimeout(async () => {
            if (pendingDeleteNote && deleteNoteCallback) {
              await deleteNoteCallback(pendingDeleteNote.id);
            }
            hideUndoToast();
            pendingDeleteNote = null;
            pendingDeleteTimer = null;
          }, 5e3);
        });
      });
    }
    function showUndoToast() {
      hideUndoToast();
      const toast = document.createElement("div");
      toast.className = "sr-panel__undo-toast";
      toast.innerHTML = `
      <span class="sr-panel__undo-text">Note deleted</span>
      <button class="sr-panel__undo-btn">Undo</button>
    `;
      const undoBtn = toast.querySelector(".sr-panel__undo-btn");
      undoBtn == null ? void 0 : undoBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (pendingDeleteTimer) {
          clearTimeout(pendingDeleteTimer);
          pendingDeleteTimer = null;
        }
        if (pendingDeleteNote) {
          currentNotes = [...currentNotes, pendingDeleteNote];
          setNotes(currentNotes);
          pendingDeleteNote = null;
        }
        hideUndoToast();
      });
      content.appendChild(toast);
    }
    function hideUndoToast() {
      const existingToast = content.querySelector(".sr-panel__undo-toast");
      existingToast == null ? void 0 : existingToast.remove();
    }
    function onEditNote(callback) {
      editNoteCallback = callback;
    }
    function onDeleteNote(callback) {
      deleteNoteCallback = callback;
    }
    function onSkillConfirm(callback) {
      skillConfirmCallback = callback;
    }
    function onSkillDismiss(callback) {
      skillDismissCallback = callback;
    }
    function setNotesLoading(loading) {
      let notesSection = content.querySelector(".sr-panel__notes-section");
      if (loading) {
        notesSection == null ? void 0 : notesSection.remove();
        const loadingSection = document.createElement("div");
        loadingSection.className = "sr-panel__notes-section";
        loadingSection.innerHTML = `
        <span class="sr-panel__label">NOTES</span>
        <div class="sr-panel__notes-loading">Loading notes...</div>
      `;
        const body = content.querySelector(".sr-panel__body");
        if (body) {
          body.appendChild(loadingSection);
        } else {
          const footer = content.querySelector(".sr-panel__footer");
          if (footer) {
            footer.insertAdjacentElement("beforebegin", loadingSection);
          } else {
            content.appendChild(loadingSection);
          }
        }
      } else {
        const loadingIndicator = content.querySelector(".sr-panel__notes-loading");
        if (loadingIndicator) {
          loadingIndicator.remove();
        }
      }
    }
    function setRelationshipScore(scoreData) {
      const existingScore = content.querySelector(".sr-panel__relationship-score");
      existingScore == null ? void 0 : existingScore.remove();
      let level;
      let levelClass;
      if (scoreData.score >= 70) {
        level = "Strong";
        levelClass = "sr-panel__score-level--strong";
      } else if (scoreData.score >= 40) {
        level = "Moderate";
        levelClass = "sr-panel__score-level--moderate";
      } else {
        level = "Weak";
        levelClass = "sr-panel__score-level--weak";
      }
      const scoreSection = document.createElement("div");
      scoreSection.className = "sr-panel__relationship-score";
      scoreSection.innerHTML = `
      <div class="sr-panel__score-header">
        <span class="sr-panel__label">RELATIONSHIP STRENGTH</span>
        <span class="sr-panel__score-value">${scoreData.score}</span>
      </div>
      <div class="sr-panel__score-bar">
        <div class="sr-panel__score-bar-fill" style="width: ${scoreData.score}%"></div>
      </div>
      <span class="sr-panel__score-level ${levelClass}">${level}</span>
    `;
      const archetypeSection = content.querySelector(".sr-panel__archetype");
      const body = content.querySelector(".sr-panel__body");
      if (archetypeSection) {
        archetypeSection.insertAdjacentElement("afterend", scoreSection);
      } else if (body) {
        body.insertBefore(scoreSection, body.firstChild);
      }
    }
    function setTags(tags) {
      const existingTags = content.querySelector(".sr-panel__tags");
      existingTags == null ? void 0 : existingTags.remove();
      const tagsSection = document.createElement("div");
      tagsSection.className = "sr-panel__tags";
      const tagsHtml = tags.map((tag) => `
      <span class="sr-panel__tag-chip" data-tag-id="${tag.id}" style="--tag-color: ${tag.color}">
        <span class="sr-panel__tag-name">${tag.name}</span>
        <button class="sr-panel__tag-remove" title="Remove tag">\xD7</button>
      </span>
    `).join("");
      tagsSection.innerHTML = `
      <div class="sr-panel__tags-header">
        <span class="sr-panel__label">TAGS</span>
      </div>
      <div class="sr-panel__tags-list">
        ${tagsHtml}
        <button class="sr-panel__add-tag-btn" title="Add tag">+</button>
      </div>
    `;
      tagsSection.querySelectorAll(".sr-panel__tag-remove").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const chip = btn.closest(".sr-panel__tag-chip");
          const tagId = chip == null ? void 0 : chip.getAttribute("data-tag-id");
          if (tagId && tagRemoveCallback) {
            tagRemoveCallback(tagId);
          }
        });
      });
      const addTagBtn = tagsSection.querySelector(".sr-panel__add-tag-btn");
      addTagBtn == null ? void 0 : addTagBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const existingInput = tagsSection.querySelector(".sr-panel__tag-input");
        if (existingInput) {
          existingInput.remove();
          return;
        }
        const tagInput = document.createElement("input");
        tagInput.className = "sr-panel__tag-input";
        tagInput.type = "text";
        tagInput.placeholder = "Enter tag name...";
        addTagBtn.insertAdjacentElement("beforebegin", tagInput);
        tagInput.focus();
      });
      const skillsSection = content.querySelector(".sr-panel__skills");
      const scoreSection = content.querySelector(".sr-panel__relationship-score");
      const archetypeSection = content.querySelector(".sr-panel__archetype");
      const body = content.querySelector(".sr-panel__body");
      if (skillsSection) {
        skillsSection.insertAdjacentElement("afterend", tagsSection);
      } else if (scoreSection) {
        scoreSection.insertAdjacentElement("afterend", tagsSection);
      } else if (archetypeSection) {
        archetypeSection.insertAdjacentElement("afterend", tagsSection);
      } else if (body) {
        body.appendChild(tagsSection);
      }
    }
    function onTagRemove(callback) {
      tagRemoveCallback = callback;
    }
    function setGroups(groups) {
      currentGroups = groups;
      const existingGroups = content.querySelector(".sr-panel__groups");
      existingGroups == null ? void 0 : existingGroups.remove();
      const groupsSection = document.createElement("div");
      groupsSection.className = "sr-panel__groups";
      const groupsHtml = groups.map((group) => `
      <div class="sr-panel__group-item" data-group-id="${group.id}">
        <span class="sr-panel__group-name">${group.name}</span>
        <span class="sr-panel__group-count">${group.memberCount}</span>
        <button class="sr-panel__group-remove" title="Remove from group">\xD7</button>
      </div>
    `).join("");
      groupsSection.innerHTML = `
      <div class="sr-panel__groups-header">
        <span class="sr-panel__label">GROUPS</span>
      </div>
      <div class="sr-panel__groups-list">
        ${groupsHtml}
        <button class="sr-panel__add-to-group-btn" title="Add to group">+ Add to Group</button>
      </div>
    `;
      groupsSection.querySelectorAll(".sr-panel__group-remove").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const item = btn.closest(".sr-panel__group-item");
          const groupId = item == null ? void 0 : item.getAttribute("data-group-id");
          if (groupId && removeFromGroupCallback) {
            removeFromGroupCallback(groupId);
          }
        });
      });
      const addToGroupBtn = groupsSection.querySelector(".sr-panel__add-to-group-btn");
      addToGroupBtn == null ? void 0 : addToGroupBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const existingDropdown = groupsSection.querySelector(".sr-panel__group-dropdown");
        if (existingDropdown) {
          existingDropdown.remove();
          return;
        }
        const currentGroupIds = currentGroups.map((g) => g.id);
        const availableToAdd = availableGroups.filter((g) => !currentGroupIds.includes(g.id));
        const dropdown = document.createElement("div");
        dropdown.className = "sr-panel__group-dropdown";
        dropdown.innerHTML = availableToAdd.map((group) => `
        <button class="sr-panel__group-option" data-group-id="${group.id}">${group.name}</button>
      `).join("") || '<div class="sr-panel__group-dropdown-empty">No groups available</div>';
        dropdown.querySelectorAll(".sr-panel__group-option").forEach((option) => {
          option.addEventListener("click", (e2) => {
            e2.stopPropagation();
            const groupId = option.getAttribute("data-group-id");
            if (groupId && addToGroupCallback) {
              addToGroupCallback(groupId);
            }
            dropdown.remove();
          });
        });
        addToGroupBtn.insertAdjacentElement("afterend", dropdown);
      });
      const tagsSection = content.querySelector(".sr-panel__tags");
      const skillsSection = content.querySelector(".sr-panel__skills");
      const scoreSection = content.querySelector(".sr-panel__relationship-score");
      const archetypeSection = content.querySelector(".sr-panel__archetype");
      const body = content.querySelector(".sr-panel__body");
      if (tagsSection) {
        tagsSection.insertAdjacentElement("afterend", groupsSection);
      } else if (skillsSection) {
        skillsSection.insertAdjacentElement("afterend", groupsSection);
      } else if (scoreSection) {
        scoreSection.insertAdjacentElement("afterend", groupsSection);
      } else if (archetypeSection) {
        archetypeSection.insertAdjacentElement("afterend", groupsSection);
      } else if (body) {
        body.appendChild(groupsSection);
      }
    }
    function setAvailableGroups(groups) {
      availableGroups = groups;
    }
    function onAddToGroup(callback) {
      addToGroupCallback = callback;
    }
    function onRemoveFromGroup(callback) {
      removeFromGroupCallback = callback;
    }
    function setActivityFeed(activities) {
      const existingFeed = content.querySelector(".sr-panel__activity-feed");
      existingFeed == null ? void 0 : existingFeed.remove();
      const feedSection = document.createElement("div");
      feedSection.className = "sr-panel__activity-feed";
      const activityIcons = {
        note_added: "\u{1F4DD}",
        profile_viewed: "\u{1F441}\uFE0F",
        tag_added: "\u{1F3F7}\uFE0F",
        group_added: "\u{1F465}",
        skill_confirmed: "\u2705"
      };
      const displayActivities = activities.slice(0, 5);
      if (displayActivities.length === 0) {
        feedSection.innerHTML = `
        <div class="sr-panel__activity-header">
          <span class="sr-panel__label">RECENT ACTIVITY</span>
        </div>
        <div class="sr-panel__activity-empty">No recent activity</div>
      `;
      } else {
        const activitiesHtml = displayActivities.map((activity) => {
          const icon = activityIcons[activity.type] || "\u{1F4CC}";
          const timeAgo = formatRelativeTime(activity.timestamp);
          return `
          <div class="sr-panel__activity-item" data-activity-id="${activity.id}">
            <span class="sr-panel__activity-icon">${icon}</span>
            <span class="sr-panel__activity-description">${activity.description}</span>
            <span class="sr-panel__activity-time">${timeAgo}</span>
          </div>
        `;
        }).join("");
        feedSection.innerHTML = `
        <div class="sr-panel__activity-header">
          <span class="sr-panel__label">RECENT ACTIVITY</span>
        </div>
        <div class="sr-panel__activity-list">
          ${activitiesHtml}
        </div>
      `;
      }
      const groupsSection = content.querySelector(".sr-panel__groups");
      const tagsSection = content.querySelector(".sr-panel__tags");
      const skillsSection = content.querySelector(".sr-panel__skills");
      const body = content.querySelector(".sr-panel__body");
      if (groupsSection) {
        groupsSection.insertAdjacentElement("afterend", feedSection);
      } else if (tagsSection) {
        tagsSection.insertAdjacentElement("afterend", feedSection);
      } else if (skillsSection) {
        skillsSection.insertAdjacentElement("afterend", feedSection);
      } else if (body) {
        body.appendChild(feedSection);
      }
    }
    function setNetworkContacts(contacts) {
      networkContacts = contacts;
    }
    function setIntroduction(intro) {
      currentIntroduction = intro;
      if (currentIntelligence) {
        setIntelligence(currentIntelligence);
      }
    }
    function onBulkTagApply(callback) {
      bulkTagCallback = callback;
    }
    function setStats(stats) {
      currentStats = stats;
      if (currentIntelligence) {
        setIntelligence(currentIntelligence);
      }
    }
    function generateTemplateId() {
      return `template-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    function getTemplates() {
      return [...noteTemplates];
    }
    function addTemplate(template) {
      const newTemplate = __spreadProps(__spreadValues({}, template), {
        id: generateTemplateId()
      });
      noteTemplates.push(newTemplate);
    }
    function editTemplate(id, updates) {
      const index = noteTemplates.findIndex((t) => t.id === id);
      if (index !== -1) {
        noteTemplates[index] = __spreadValues(__spreadValues({}, noteTemplates[index]), updates);
      }
    }
    function deleteTemplate(id) {
      noteTemplates = noteTemplates.filter((t) => t.id !== id);
    }
    function showTemplatesManager() {
      const existingManager = content.querySelector(".sr-panel__templates-manager");
      if (existingManager) {
        existingManager.remove();
        return;
      }
      const manager = document.createElement("div");
      manager.className = "sr-panel__templates-manager";
      function renderTemplatesList() {
        return noteTemplates.map((template) => `
        <div class="sr-panel__template-item" data-template-id="${template.id}">
          <div class="sr-panel__template-info">
            <span class="sr-panel__template-name">${template.name}</span>
            <span class="sr-panel__template-preview">${template.content}</span>
          </div>
          <div class="sr-panel__template-actions">
            <button class="sr-panel__template-edit-btn" title="Edit">\u270E</button>
            <button class="sr-panel__template-delete-btn" title="Delete">\xD7</button>
          </div>
        </div>
      `).join("");
      }
      function renderManager() {
        manager.innerHTML = `
        <div class="sr-panel__templates-header">
          <span class="sr-panel__label">MANAGE TEMPLATES</span>
          <button class="sr-panel__templates-close">\xD7</button>
        </div>
        <div class="sr-panel__templates-list">
          ${renderTemplatesList()}
        </div>
        <button class="sr-panel__template-add-new">+ Add Template</button>
      `;
        const closeBtn = manager.querySelector(".sr-panel__templates-close");
        closeBtn == null ? void 0 : closeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          manager.remove();
        });
        manager.querySelectorAll(".sr-panel__template-edit-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const item = btn.closest(".sr-panel__template-item");
            const templateId = item == null ? void 0 : item.getAttribute("data-template-id");
            if (templateId) {
              showTemplateForm(templateId);
            }
          });
        });
        manager.querySelectorAll(".sr-panel__template-delete-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const item = btn.closest(".sr-panel__template-item");
            const templateId = item == null ? void 0 : item.getAttribute("data-template-id");
            if (templateId) {
              deleteTemplate(templateId);
              renderManager();
            }
          });
        });
        const addNewBtn = manager.querySelector(".sr-panel__template-add-new");
        addNewBtn == null ? void 0 : addNewBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          showTemplateForm();
        });
      }
      function showTemplateForm(editId) {
        var _a, _b;
        const existing = editId ? noteTemplates.find((t) => t.id === editId) : null;
        const form = document.createElement("div");
        form.className = "sr-panel__template-form";
        form.innerHTML = `
        <div class="sr-panel__template-form-field">
          <label class="sr-panel__template-form-label">Template Name</label>
          <input type="text" class="sr-panel__template-name-input" value="${(existing == null ? void 0 : existing.name) || ""}" placeholder="e.g., Weekly check-in" />
        </div>
        <div class="sr-panel__template-form-field">
          <label class="sr-panel__template-form-label">Template Content</label>
          <input type="text" class="sr-panel__template-content-input" value="${(existing == null ? void 0 : existing.content) || ""}" placeholder="e.g., Weekly check-in: " />
        </div>
        <div class="sr-panel__template-form-actions">
          <button class="sr-panel__template-cancel-btn">Cancel</button>
          <button class="sr-panel__template-save-btn">${editId ? "Update" : "Add"}</button>
        </div>
      `;
        const list = manager.querySelector(".sr-panel__templates-list");
        const addBtn = manager.querySelector(".sr-panel__template-add-new");
        list == null ? void 0 : list.classList.add("sr-panel__templates-list--hidden");
        addBtn == null ? void 0 : addBtn.classList.add("sr-panel__template-add-new--hidden");
        manager.appendChild(form);
        (_a = form.querySelector(".sr-panel__template-cancel-btn")) == null ? void 0 : _a.addEventListener("click", (e) => {
          e.stopPropagation();
          form.remove();
          list == null ? void 0 : list.classList.remove("sr-panel__templates-list--hidden");
          addBtn == null ? void 0 : addBtn.classList.remove("sr-panel__template-add-new--hidden");
        });
        (_b = form.querySelector(".sr-panel__template-save-btn")) == null ? void 0 : _b.addEventListener("click", (e) => {
          e.stopPropagation();
          const nameInput = form.querySelector(".sr-panel__template-name-input");
          const contentInput = form.querySelector(".sr-panel__template-content-input");
          const name = nameInput == null ? void 0 : nameInput.value.trim();
          const templateContent = contentInput == null ? void 0 : contentInput.value;
          if (name && templateContent) {
            if (editId) {
              editTemplate(editId, { name, content: templateContent });
            } else {
              addTemplate({ name, content: templateContent });
            }
            form.remove();
            renderManager();
          }
        });
      }
      renderManager();
      const footer = content.querySelector(".sr-panel__footer");
      if (footer) {
        footer.insertAdjacentElement("beforebegin", manager);
      } else {
        content.appendChild(manager);
      }
    }
    function showConsentOverlay() {
      const existingOverlay = document.querySelector(".sr-consent-modal");
      if (existingOverlay) return;
      const modal = document.createElement("div");
      modal.className = "sr-consent-modal";
      modal.innerHTML = `
      <div class="sr-consent-modal__backdrop"></div>
      <div class="sr-consent-modal__container">
        <div class="sr-consent-modal__border-top"></div>
        <div class="sr-consent-modal__content">
          <div class="sr-consent-modal__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 9v4m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"/>
            </svg>
          </div>
          <div class="sr-consent-modal__label">NOTICE</div>
          <h2 class="sr-consent-modal__title">Authenticated Proxy</h2>
          <div class="sr-consent-modal__divider">
            <span class="sr-consent-modal__diamond">\u25C6</span>
          </div>
          <div class="sr-consent-modal__text">
            <p>This extension captures LinkedIn profile data visible through <strong>your authenticated session</strong>.</p>
            <p>This includes connection-restricted information accessible only through your credentials.</p>
            <p><strong>Consent is required</strong> for AI-powered analysis and server synchronization.</p>
            <p class="sr-consent-modal__highlight">By proceeding, you consent to act as a data collection proxy.</p>
          </div>
          <a href="https://socialrecall.now/privacy" target="_blank" class="sr-consent-modal__privacy-link">
            <span>Read Full Privacy Policy</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
          </a>
          <button class="sr-consent-modal__accept">
            <span class="sr-consent-modal__accept-text">I Understand & Accept</span>
          </button>
          <p class="sr-consent-modal__footnote">You can revoke consent anytime in Settings</p>
        </div>
        <div class="sr-consent-modal__border-bottom"></div>
      </div>
    `;
      document.body.appendChild(modal);
      requestAnimationFrame(() => {
        modal.classList.add("sr-consent-modal--visible");
      });
      const acceptBtn = modal.querySelector(".sr-consent-modal__accept");
      acceptBtn == null ? void 0 : acceptBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (consentAcceptCallback) {
          consentAcceptCallback();
        }
      });
    }
    function hideConsentOverlay() {
      const modal = document.querySelector(".sr-consent-modal");
      if (modal) {
        modal.classList.remove("sr-consent-modal--visible");
        setTimeout(() => modal.remove(), 300);
      }
    }
    function onConsentAccept(callback) {
      consentAcceptCallback = callback;
    }
    function showIntroductionForm() {
      const existingForm = content.querySelector(".sr-panel__introduction-form");
      if (existingForm) {
        existingForm.remove();
        return;
      }
      const form = document.createElement("div");
      form.className = "sr-panel__introduction-form";
      form.innerHTML = `
      <div class="sr-panel__intro-form-field">
        <label class="sr-panel__intro-form-label">Introduced by</label>
        <input type="text" class="sr-panel__intro-form-input" name="introducedBy" value="${(currentIntroduction == null ? void 0 : currentIntroduction.introducedBy) || ""}" placeholder="Who introduced you?" />
      </div>
      <div class="sr-panel__intro-form-field">
        <label class="sr-panel__intro-form-label">Met at</label>
        <input type="text" class="sr-panel__intro-form-input" name="metAt" value="${(currentIntroduction == null ? void 0 : currentIntroduction.metAt) || ""}" placeholder="Event, conference, etc." />
      </div>
      <div class="sr-panel__intro-form-actions">
        <button class="sr-panel__intro-form-cancel">Cancel</button>
        <button class="sr-panel__intro-form-save">Save</button>
      </div>
    `;
      const cancelBtn = form.querySelector(".sr-panel__intro-form-cancel");
      cancelBtn == null ? void 0 : cancelBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        form.remove();
      });
      const saveBtn = form.querySelector(".sr-panel__intro-form-save");
      saveBtn == null ? void 0 : saveBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const introducedByInput = form.querySelector('input[name="introducedBy"]');
        const metAtInput = form.querySelector('input[name="metAt"]');
        currentIntroduction = {
          introducedBy: (introducedByInput == null ? void 0 : introducedByInput.value.trim()) || void 0,
          metAt: (metAtInput == null ? void 0 : metAtInput.value.trim()) || void 0
        };
        form.remove();
        if (currentIntelligence) {
          setIntelligence(currentIntelligence);
        }
      });
      const footer = content.querySelector(".sr-panel__footer");
      if (footer) {
        footer.insertAdjacentElement("beforebegin", form);
      } else {
        content.appendChild(form);
      }
    }
    let isDestroyed = false;
    function closeNoteInput() {
      const noteInput = content.querySelector(".sr-panel__note-input");
      if (noteInput) {
        noteInput.remove();
        return true;
      }
      return false;
    }
    let quickActionsOpen = false;
    let focusedNoteIndex = -1;
    function updateNoteFocus() {
      content.querySelectorAll(".sr-panel__note-item--focused").forEach((el) => {
        el.classList.remove("sr-panel__note-item--focused");
      });
      const notes = content.querySelectorAll(".sr-panel__note-item:not(.sr-panel__note--hidden)");
      if (focusedNoteIndex >= 0 && focusedNoteIndex < notes.length) {
        notes[focusedNoteIndex].classList.add("sr-panel__note-item--focused");
        const el = notes[focusedNoteIndex];
        if (el.scrollIntoView) {
          el.scrollIntoView({ block: "nearest" });
        }
      }
    }
    function clearNoteFocus() {
      focusedNoteIndex = -1;
      content.querySelectorAll(".sr-panel__note-item--focused").forEach((el) => {
        el.classList.remove("sr-panel__note-item--focused");
      });
    }
    function triggerEditOnFocusedNote() {
      const focusedNote = content.querySelector(".sr-panel__note-item--focused");
      if (focusedNote) {
        const editBtn = focusedNote.querySelector(".sr-panel__note-edit");
        editBtn == null ? void 0 : editBtn.click();
      }
    }
    function showNetworkGraph() {
      const existingModal = content.querySelector(".sr-panel__network-graph-modal");
      if (existingModal) {
        existingModal.remove();
        return;
      }
      const currentName = (currentIntelligence == null ? void 0 : currentIntelligence.name) || "Unknown";
      const connectedNodesHtml = networkContacts.length > 0 ? networkContacts.map((contact, index) => {
        const angle = index / networkContacts.length * 2 * Math.PI;
        const radius = 80;
        const x = 100 + radius * Math.cos(angle);
        const y = 100 + radius * Math.sin(angle);
        return `
            <div class="sr-panel__graph-node sr-panel__graph-node--connected" style="left: ${x}px; top: ${y}px;" title="${contact.sharedTags.join(", ")}">
              <span class="sr-panel__graph-node-name">${contact.name}</span>
            </div>
            <svg class="sr-panel__graph-edge" style="position: absolute; left: 0; top: 0; width: 200px; height: 200px; pointer-events: none;">
              <line x1="100" y1="100" x2="${x}" y2="${y}" stroke="var(--sr-gold)" stroke-width="1" opacity="0.5" />
            </svg>
          `;
      }).join("") : '<div class="sr-panel__graph-empty">No connections yet</div>';
      const modal = document.createElement("div");
      modal.className = "sr-panel__network-graph-modal";
      modal.innerHTML = `
      <div class="sr-panel__graph-header">
        <span class="sr-panel__graph-title">Network Graph</span>
        <button class="sr-panel__graph-close">\xD7</button>
      </div>
      <div class="sr-panel__graph-container">
        <div class="sr-panel__graph-node sr-panel__graph-node--center">
          <span class="sr-panel__graph-node-name">${currentName}</span>
        </div>
        ${connectedNodesHtml}
      </div>
    `;
      const closeBtn = modal.querySelector(".sr-panel__graph-close");
      closeBtn == null ? void 0 : closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        modal.remove();
      });
      content.appendChild(modal);
    }
    function showQuickActionsMenu() {
      const existingMenu = content.querySelector(".sr-panel__quick-actions");
      if (existingMenu) {
        existingMenu.remove();
        quickActionsOpen = false;
        return;
      }
      quickActionsOpen = true;
      const quickActionsMenu = document.createElement("div");
      quickActionsMenu.className = "sr-panel__quick-actions";
      const actions = [
        { id: "add-note", label: "Add Note", shortcut: "N", icon: "\u{1F4DD}" },
        { id: "copy-contact", label: "Copy Contact Info", shortcut: "C", icon: "\u{1F4CB}" },
        { id: "add-tag", label: "Add Tag", shortcut: "T", icon: "\u{1F3F7}\uFE0F" },
        { id: "add-to-group", label: "Add to Group", shortcut: "G", icon: "\u{1F465}" },
        { id: "reanalyze", label: "Reanalyze Profile", shortcut: "R", icon: "\u{1F504}" },
        { id: "toggle-panel", label: "Toggle Panel", shortcut: "M", icon: "\u{1F4CC}" }
      ];
      const actionsHtml = actions.map((action) => `
      <button class="sr-panel__quick-action-item" data-action="${action.id}">
        <span class="sr-panel__quick-action-icon">${action.icon}</span>
        <span class="sr-panel__quick-action-label">${action.label}</span>
        <span class="sr-panel__quick-action-shortcut">${action.shortcut}</span>
      </button>
    `).join("");
      quickActionsMenu.innerHTML = `
      <div class="sr-panel__quick-actions-header">
        <input type="text" class="sr-panel__quick-actions-input" placeholder="Type a command..." />
      </div>
      <div class="sr-panel__quick-actions-list">
        ${actionsHtml}
      </div>
    `;
      const searchInput = quickActionsMenu.querySelector(".sr-panel__quick-actions-input");
      searchInput.addEventListener("input", () => {
        const query = searchInput.value.toLowerCase();
        quickActionsMenu.querySelectorAll(".sr-panel__quick-action-item").forEach((item) => {
          var _a, _b;
          const label = ((_b = (_a = item.querySelector(".sr-panel__quick-action-label")) == null ? void 0 : _a.textContent) == null ? void 0 : _b.toLowerCase()) || "";
          if (label.includes(query)) {
            item.classList.remove("sr-panel__quick-action-item--hidden");
          } else {
            item.classList.add("sr-panel__quick-action-item--hidden");
          }
        });
      });
      quickActionsMenu.querySelectorAll(".sr-panel__quick-action-item").forEach((btn) => {
        btn.addEventListener("click", () => {
          const action = btn.getAttribute("data-action");
          closeQuickActionsMenu();
          executeQuickAction(action);
        });
      });
      content.insertBefore(quickActionsMenu, content.firstChild);
      searchInput.focus();
    }
    function closeQuickActionsMenu() {
      const menu = content.querySelector(".sr-panel__quick-actions");
      if (menu) {
        menu.remove();
        quickActionsOpen = false;
      }
    }
    function executeQuickAction(action) {
      switch (action) {
        case "add-note":
          showNoteInput();
          break;
        case "copy-contact":
          if (currentIntelligence) {
            const text = formatContactForClipboard(currentIntelligence);
            navigator.clipboard.writeText(text);
          }
          break;
        case "add-tag":
          const addTagBtn = content.querySelector(".sr-panel__add-tag-btn");
          addTagBtn == null ? void 0 : addTagBtn.click();
          break;
        case "add-to-group":
          const addToGroupBtn = content.querySelector(".sr-panel__add-to-group-btn");
          addToGroupBtn == null ? void 0 : addToGroupBtn.click();
          break;
        case "reanalyze":
          if (reanalyzeCallback) {
            reanalyzeCallback();
          }
          break;
        case "toggle-panel":
          toggle();
          break;
      }
    }
    function handleKeydown(e) {
      if (isDestroyed) return;
      const key = e.key.toLowerCase();
      const target = e.target;
      const panelHasFocus = element.contains(document.activeElement) || element === document.activeElement;
      const isEditableInPanel = panelHasFocus && target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (key === "escape") {
        if (quickActionsOpen) {
          closeQuickActionsMenu();
          return;
        }
        if (focusedNoteIndex >= 0) {
          clearNoteFocus();
          return;
        }
        if (closeNoteInput()) {
          return;
        }
        if (state === "expanded" /* Expanded */) {
          toggle();
        }
        return;
      }
      if (!panelHasFocus) return;
      if (isEditableInPanel) {
        if (key === "enter" && !e.shiftKey && target.closest(".sr-panel__note-input")) {
          return;
        }
        return;
      }
      if (key === "k") {
        e.preventDefault();
        if (state === "expanded" /* Expanded */) {
          showQuickActionsMenu();
        }
      } else if (key === "m") {
        e.preventDefault();
        toggle();
      } else if (key === "n") {
        e.preventDefault();
        if (state === "expanded" /* Expanded */) {
          showNoteInput();
        }
      } else if (key === "arrowdown" && state === "expanded" /* Expanded */) {
        e.preventDefault();
        const notes = content.querySelectorAll(".sr-panel__note-item:not(.sr-panel__note--hidden)");
        if (notes.length > 0) {
          focusedNoteIndex = Math.min(focusedNoteIndex + 1, notes.length - 1);
          updateNoteFocus();
        }
      } else if (key === "arrowup" && state === "expanded" /* Expanded */) {
        e.preventDefault();
        const notes = content.querySelectorAll(".sr-panel__note-item:not(.sr-panel__note--hidden)");
        if (notes.length > 0 && focusedNoteIndex > 0) {
          focusedNoteIndex = Math.max(focusedNoteIndex - 1, 0);
          updateNoteFocus();
        }
      } else if (key === "enter" && focusedNoteIndex >= 0) {
        e.preventDefault();
        triggerEditOnFocusedNote();
      }
    }
    document.addEventListener("keydown", handleKeydown);
    function destroy() {
      isDestroyed = true;
      document.removeEventListener("keydown", handleKeydown);
      element.remove();
    }
    return {
      element,
      getState: () => state,
      toggle,
      setIntelligence,
      primeForProfile,
      setPosition,
      getPosition,
      setProfileCount,
      setAuthenticated,
      showGate,
      setMinimalMode,
      setProgress,
      showHistory,
      onReanalyze,
      onAddNote,
      onEditNote,
      onDeleteNote,
      onSkillConfirm,
      onSkillDismiss,
      setCurrentProfile,
      setNotes,
      setNotesLoading,
      setRelationshipScore,
      setTags,
      onTagRemove,
      setGroups,
      setAvailableGroups,
      onAddToGroup,
      onRemoveFromGroup,
      setActivityFeed,
      setNetworkContacts,
      setIntroduction,
      onBulkTagApply,
      setStats,
      getTemplates,
      addTemplate,
      editTemplate,
      deleteTemplate,
      showTemplatesManager,
      showConsentOverlay,
      hideConsentOverlay,
      onConsentAccept,
      destroy
    };
  }

  // src/utils.ts
  function extractProfileIdFromUrl(url) {
    const urlRegex = /linkedin\.com\/in\/([^/?#]+)/;
    const match = urlRegex.exec(url);
    return match ? match[1] : null;
  }
  function isLinkedInProfileUrl(url) {
    const profileRegex = /linkedin\.com\/in\/([^/]+)/;
    return profileRegex.test(url);
  }

  // src/ai-client.ts
  var DEFAULT_API_URL = "https://www.socialrecall.now";
  var DEFAULT_TIMEOUT_MS = 1e4;
  async function inferIntelligence(profile, options = {}) {
    const { apiUrl = DEFAULT_API_URL, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${apiUrl}/api/infer-skills`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ profile }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        return {
          success: false,
          error: `API error: ${response.status} ${response.statusText}`
        };
      }
      const data = await response.json();
      if (!data.success) {
        return {
          success: false,
          error: data.error || "Unknown API error"
        };
      }
      return {
        success: true,
        skills: data.skills || [],
        archetype: data.archetype || null,
        couldBe: data.couldBe || [],
        goodFor: data.goodFor || []
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error || error && typeof error === "object" && "name" in error) {
        const err = error;
        if (err.name === "AbortError") {
          return {
            success: false,
            error: "Request timeout"
          };
        }
        return {
          success: false,
          error: `Network error: ${err.message || "Unknown"}`
        };
      }
      return {
        success: false,
        error: "Unknown error"
      };
    }
  }
  async function getProfileIntelligence(profile, options) {
    var _a, _b;
    const { apiUrl = DEFAULT_API_URL, timeoutMs = DEFAULT_TIMEOUT_MS, linkedinId, fingerprint } = options;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${apiUrl}/api/profile-intelligence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          linkedin_id: linkedinId,
          profile_data: profile,
          fingerprint
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || `API error: ${response.status} ${response.statusText}`
        };
      }
      const data = await response.json();
      return {
        success: true,
        skills: data.skills || [],
        archetype: data.archetype || null,
        couldBe: data.could_be || [],
        goodFor: data.good_for || [],
        verified: (_a = data.verified) != null ? _a : false,
        cached: (_b = data.cached) != null ? _b : false,
        analyzed_at: data.analyzed_at
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        return {
          success: false,
          error: "Request timeout"
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }

  // src/dom-utils.ts
  var DEFAULT_TIMEOUT = 3e4;
  var DEFAULT_INTERVAL = 100;
  async function waitForSelector(selector, options = {}) {
    const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL } = options;
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    logger.debug(`waitForSelector timeout: ${selector}`);
    return null;
  }
  async function waitForFunction(fn, options = {}) {
    const { timeout = DEFAULT_TIMEOUT, interval = DEFAULT_INTERVAL } = options;
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      try {
        const result = await fn();
        if (result) {
          return true;
        }
      } catch (e) {
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    return false;
  }
  async function waitForStable(stabilityMs = 500) {
    return new Promise((resolve) => {
      let lastChangeTime = Date.now();
      let resolved = false;
      const observer = new MutationObserver(() => {
        lastChangeTime = Date.now();
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
      const checkStability = () => {
        if (resolved) return;
        if (Date.now() - lastChangeTime >= stabilityMs) {
          resolved = true;
          observer.disconnect();
          resolve();
        } else {
          setTimeout(checkStability, 100);
        }
      };
      setTimeout(checkStability, stabilityMs);
    });
  }
  async function waitForLinkedInProfile(options = {}) {
    const { timeout = DEFAULT_TIMEOUT } = options;
    logger.debug("Waiting for LinkedIn profile to load...");
    const main = await waitForSelector("main", { timeout: 5e3 });
    if (!main) {
      logger.debug("Main element not found");
      return false;
    }
    const loaded = await waitForFunction(
      () => {
        var _a, _b, _c, _d;
        const h1 = document.querySelector("h1");
        const hasName = ((_b = (_a = h1 == null ? void 0 : h1.textContent) == null ? void 0 : _a.trim().length) != null ? _b : 0) > 0;
        const headlineSelectors = [
          ".text-body-medium.break-words",
          ".text-body-medium",
          "[data-generated-suggestion-target] + div",
          ".pv-text-details__left-panel .text-body-medium"
        ];
        let hasHeadline = false;
        for (const sel of headlineSelectors) {
          const el = document.querySelector(sel);
          if (((_d = (_c = el == null ? void 0 : el.textContent) == null ? void 0 : _c.trim().length) != null ? _d : 0) > 0) {
            hasHeadline = true;
            break;
          }
        }
        const bodyText = document.body.textContent || "";
        const hasProfileContent = bodyText.includes("Experience") || bodyText.includes("About") || bodyText.includes("Skills") || bodyText.includes("Education");
        const mainEl = document.querySelector("main");
        const hasMultipleChildren = ((mainEl == null ? void 0 : mainEl.children.length) || 0) >= 3;
        const hasPvsElements = document.querySelectorAll('[class*="pvs-"]').length > 50;
        const hasArtdecoCards = document.querySelectorAll("main section.artdeco-card").length >= 2;
        const loadersGone = document.querySelectorAll('[class*="pvs-loader"]').length === 0;
        logger.debug(`Load check: name=${hasName}, headline=${hasHeadline}, content=${hasProfileContent}, children=${mainEl == null ? void 0 : mainEl.children.length}, pvs=${hasPvsElements}, cards=${hasArtdecoCards}, loadersGone=${loadersGone}`);
        return hasName && hasHeadline && (hasProfileContent || hasMultipleChildren && hasPvsElements && loadersGone || hasArtdecoCards);
      },
      { timeout, interval: 500 }
    );
    if (loaded) {
      logger.debug("Profile loaded successfully");
      await waitForStable(500);
    } else {
      logger.debug("Profile load timeout - proceeding anyway");
      await waitForStable(1e3);
    }
    return loaded;
  }
  async function triggerLazyLoad() {
    await new Promise((resolve) => setTimeout(resolve, 3e3));
  }
  async function waitForSectionContent(options = {}) {
    var _a;
    const { timeout = 8e3, interval = 400 } = options;
    const startTime = Date.now();
    logger.debug("Waiting for section content...");
    await triggerLazyLoad();
    while (Date.now() - startTime < timeout) {
      const sections = document.querySelectorAll("main section");
      for (const section of sections) {
        const h2 = section.querySelector("h2");
        if ((_a = h2 == null ? void 0 : h2.textContent) == null ? void 0 : _a.toLowerCase().includes("experience")) {
          const logos = section.querySelectorAll('img[src*="company-logo"], img[src*="shrink_100"]');
          const spans = section.querySelectorAll('span[aria-hidden="true"]');
          if (logos.length >= 1 || spans.length >= 3) {
            logger.debug("Section content loaded (logos:", logos.length, "spans:", spans.length, ")");
            return true;
          }
        }
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    logger.debug("Section content timeout - proceeding anyway");
    return false;
  }
  function observeLazyContent(callback) {
    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        callback();
      }, 500);
    });
    const main = document.querySelector("main");
    if (main) {
      observer.observe(main, {
        childList: true,
        subtree: true
      });
    }
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }
  async function waitForCompleteProfile(options = {}) {
    const { timeout = 15e3 } = options;
    const startTime = Date.now();
    const basicLoaded = await waitForLinkedInProfile({
      timeout: Math.min(1e4, timeout)
    });
    if (!basicLoaded) {
      logger.debug("Basic profile load failed");
      return false;
    }
    const remainingTimeout = timeout - (Date.now() - startTime);
    if (remainingTimeout > 0) {
      await waitForSectionContent({ timeout: Math.min(8e3, remainingTimeout) });
    }
    return true;
  }

  // src/profile-history.ts
  function detectChanges(oldProfile, newProfile) {
    const changes = [];
    if (newProfile.name !== void 0 && newProfile.name !== oldProfile.name) {
      changes.push({
        field: "name",
        oldValue: oldProfile.name,
        newValue: newProfile.name
      });
    }
    if (newProfile.headline !== void 0 && newProfile.headline !== oldProfile.headline) {
      changes.push({
        field: "headline",
        oldValue: oldProfile.headline,
        newValue: newProfile.headline
      });
    }
    if (newProfile.location !== void 0 && newProfile.location !== oldProfile.location) {
      changes.push({
        field: "location",
        oldValue: oldProfile.location,
        newValue: newProfile.location
      });
    }
    if (newProfile.employers !== void 0) {
      const oldEmployers = JSON.stringify(oldProfile.employers || []);
      const newEmployers = JSON.stringify(newProfile.employers || []);
      if (oldEmployers !== newEmployers) {
        changes.push({
          field: "employers",
          oldValue: oldProfile.employers,
          newValue: newProfile.employers
        });
      }
    }
    if (newProfile.education !== void 0) {
      const oldEducation = JSON.stringify(oldProfile.education || []);
      const newEducation = JSON.stringify(newProfile.education || []);
      if (oldEducation !== newEducation) {
        changes.push({
          field: "education",
          oldValue: oldProfile.education,
          newValue: newProfile.education
        });
      }
    }
    return changes;
  }
  function recordHistory(profile, changes, timestamp) {
    if (changes.length === 0) {
      return profile;
    }
    const newEntries = changes.map((change) => ({
      date: timestamp,
      field: change.field,
      oldValue: change.oldValue,
      newValue: change.newValue
    }));
    return __spreadProps(__spreadValues({}, profile), {
      history: [...profile.history || [], ...newEntries]
    });
  }

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
  async function syncHistory(profileId, entries) {
    var _a, _b;
    const token = await getSyncToken();
    if (!token) {
      return {
        success: false,
        error: "Not logged in"
      };
    }
    if (entries.length === 0) {
      return { success: true, synced: 0, failed: 0 };
    }
    const webAppUrl = await getWebAppUrl();
    try {
      const response = await fetch(`${webAppUrl}/api/contacts/history`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          profileId,
          entries
        })
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
          error: errorData.error || `History sync failed: ${response.status}`
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
  async function saveNote(linkedinId, content) {
    const token = await getSyncToken();
    if (!token) {
      return {
        success: false,
        error: "Not logged in. Please connect to Social Recall first."
      };
    }
    const webAppUrl = await getWebAppUrl();
    try {
      const response = await fetch(`${webAppUrl}/api/contacts/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ linkedinId, content })
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
          error: errorData.error || `Failed to save note: ${response.status}`
        };
      }
      const data = await response.json();
      return {
        success: true,
        note: data.note
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Network error"
      };
    }
  }
  async function getNotesForContact(linkedinId) {
    const token = await getSyncToken();
    if (!token) {
      return {
        success: false,
        error: "Not logged in"
      };
    }
    const webAppUrl = await getWebAppUrl();
    try {
      const response = await fetch(`${webAppUrl}/api/contacts/notes?linkedinId=${encodeURIComponent(linkedinId)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          await clearSyncToken();
          return {
            success: false,
            error: "Session expired"
          };
        }
        return {
          success: false,
          error: errorData.error || `Failed to fetch notes: ${response.status}`
        };
      }
      const data = await response.json();
      return {
        success: true,
        notes: data.notes || []
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Network error"
      };
    }
  }
  async function updateNote(noteId, content) {
    const token = await getSyncToken();
    if (!token) {
      return {
        success: false,
        error: "Not logged in. Please connect to Social Recall first."
      };
    }
    const webAppUrl = await getWebAppUrl();
    try {
      const response = await fetch(`${webAppUrl}/api/contacts/notes`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ noteId, content })
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
          error: errorData.error || `Failed to update note: ${response.status}`
        };
      }
      const data = await response.json();
      return {
        success: true,
        note: data.note
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Network error"
      };
    }
  }
  async function deleteNote(noteId) {
    const token = await getSyncToken();
    if (!token) {
      return {
        success: false,
        error: "Not logged in. Please connect to Social Recall first."
      };
    }
    const webAppUrl = await getWebAppUrl();
    try {
      const response = await fetch(`${webAppUrl}/api/contacts/notes`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ noteId })
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
          error: errorData.error || `Failed to delete note: ${response.status}`
        };
      }
      return {
        success: true
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Network error"
      };
    }
  }

  // src/dom-extractors.ts
  function stripNotificationBadge(name) {
    return name.replace(/^\(\d+\+?\)\s*/, "").trim();
  }
  function extractName() {
    var _a, _b;
    const selectors = [
      "h1.text-heading-xlarge",
      "h1.inline.t-24.v-align-middle.break-words",
      ".pv-top-card--list li:first-child",
      ".text-heading-xlarge",
      "h1[data-generated-suggestion-target]",
      // Profile card name
      ".pv-text-details__left-panel h1",
      ".ph5 h1"
    ];
    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if ((_a = el == null ? void 0 : el.textContent) == null ? void 0 : _a.trim()) {
        const name = el.textContent.trim();
        logger.debug("Found name with selector:", selector, "\u2192", name);
        return stripNotificationBadge(name);
      }
    }
    logger.debug("Name not found in DOM, using page title fallback");
    const title = document.title;
    const parts = title.split(/\s[|–-]\s/);
    return stripNotificationBadge(((_b = parts[0]) == null ? void 0 : _b.trim()) || "Unknown");
  }
  function extractHeadline() {
    var _a;
    const headlineEl = document.querySelector(".text-body-medium.break-words");
    return (_a = headlineEl == null ? void 0 : headlineEl.textContent) == null ? void 0 : _a.trim();
  }
  function extractLocation() {
    var _a;
    const selectors = [
      // Primary location text
      ".pv-text-details__left-panel span.text-body-small",
      ".text-body-small.inline.t-black--light.break-words",
      // Location in profile card
      ".pv-top-card--list.pv-top-card--list-bullet li:nth-child(1)",
      // Alternative profile structure
      'span[class*="text-body-small"][class*="t-black--light"]'
    ];
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = (_a = el.textContent) == null ? void 0 : _a.trim();
        if (text && text.length > 2 && text.length < 100) {
          if (/^\d+[\d,]*\s*(connections?|followers?)$/i.test(text)) continue;
          if (/^\([^)]+\)$/.test(text)) continue;
          if (text.includes("linkedin.com")) continue;
          logger.debug("Found location:", text);
          return text;
        }
      }
    }
    logger.debug("Location not found");
    return void 0;
  }
  function extractAvatarUrl() {
    const avatarImg = document.querySelector(".pv-top-card-profile-picture__image");
    return avatarImg == null ? void 0 : avatarImg.src;
  }
  function findSectionByHeader(headerText) {
    var _a, _b, _c, _d, _e, _f, _g;
    const searchText = headerText.toLowerCase();
    const anchor = document.querySelector(`div.pv-profile-card__anchor[id*="${searchText}" i], [id*="${searchText}" i].pv-profile-card__anchor`);
    if (anchor) {
      const section = anchor.closest("section");
      if (section) {
        logger.debug(`Found "${headerText}" via pv-profile-card__anchor id`);
        return section;
      }
    }
    const byId = document.querySelector(`section[id*="${searchText}" i], div[id*="${searchText}" i]`);
    if (byId) {
      const section = byId.tagName === "SECTION" ? byId : byId.closest("section");
      if (section) {
        logger.debug(`Found "${headerText}" via id attribute`);
        return section;
      }
    }
    const profileCards = document.querySelectorAll('section[data-view-name="profile-card"]');
    for (const card of profileCards) {
      const spans = card.querySelectorAll('span[aria-hidden="true"]');
      for (let i = 0; i < Math.min(5, spans.length); i++) {
        const text = (_a = spans[i].textContent) == null ? void 0 : _a.trim().toLowerCase();
        if (text === searchText || (text == null ? void 0 : text.startsWith(searchText))) {
          logger.debug(`Found "${headerText}" via profile-card data-view-name`);
          return card;
        }
      }
    }
    const artdecoSections = document.querySelectorAll("main section.artdeco-card");
    for (const section of artdecoSections) {
      const srOnly = section.querySelector('.visually-hidden, .sr-only, [class*="visually-hidden"]');
      if ((_b = srOnly == null ? void 0 : srOnly.textContent) == null ? void 0 : _b.toLowerCase().includes(searchText)) {
        logger.debug(`Found "${headerText}" via visually-hidden text`);
        return section;
      }
      const spans = section.querySelectorAll('span[aria-hidden="true"], span.t-bold');
      for (let i = 0; i < Math.min(10, spans.length); i++) {
        const text = (_c = spans[i].textContent) == null ? void 0 : _c.trim().toLowerCase();
        if (text === searchText || (text == null ? void 0 : text.startsWith(searchText))) {
          logger.debug(`Found "${headerText}" via artdeco-card span`);
          return section;
        }
      }
    }
    const allSections = document.querySelectorAll("section");
    for (const section of allSections) {
      const h2 = section.querySelector("h2");
      if ((_d = h2 == null ? void 0 : h2.textContent) == null ? void 0 : _d.trim().toLowerCase().includes(searchText)) {
        logger.debug(`Found "${headerText}" via section h2`);
        return section;
      }
      const firstSpans = section.querySelectorAll('div span[aria-hidden="true"]');
      for (let i = 0; i < Math.min(5, firstSpans.length); i++) {
        if (((_e = firstSpans[i].textContent) == null ? void 0 : _e.trim().toLowerCase()) === searchText) {
          logger.debug(`Found "${headerText}" via section span`);
          return section;
        }
      }
    }
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (((_f = walker.currentNode.textContent) == null ? void 0 : _f.trim().toLowerCase()) === searchText) {
        const parent = walker.currentNode.parentElement;
        const section = parent == null ? void 0 : parent.closest("section");
        if (section) {
          logger.debug(`Found "${headerText}" via TreeWalker text search`);
          return section;
        }
      }
    }
    const allSpans = document.querySelectorAll('span[aria-hidden="true"]');
    for (const span of allSpans) {
      if (((_g = span.textContent) == null ? void 0 : _g.trim().toLowerCase()) === searchText) {
        const section = span.closest("section");
        if (section) {
          logger.debug(`Found "${headerText}" via span search`);
          return section;
        }
      }
    }
    logger.debug(`Could not find "${headerText}" section`);
    return null;
  }
  function extractExperienceFromContainer(container) {
    var _a, _b;
    const spans = container.querySelectorAll('span[aria-hidden="true"]');
    const texts = [];
    const datePattern = /^\w{3} \d{4}|^\d{4}\s*-|Present|\d+\s*(yr|yrs|mo|mos|year|month)/i;
    const locationPattern = /^(Remote|Hybrid|On-site)$|,\s*(Remote|Hybrid|On-site)$/i;
    const employmentTypes = ["full-time", "part-time", "contract", "freelance", "self-employed", "internship", "apprenticeship", "seasonal"];
    for (const span of spans) {
      const text = (_a = span.textContent) == null ? void 0 : _a.trim();
      if (!text || text.length < 2 || text.length > 100) continue;
      if (datePattern.test(text)) continue;
      if (text.includes(" \xB7 ") && /\d+\s*(yr|mo)/i.test(text)) continue;
      if (locationPattern.test(text)) continue;
      if (text === "Experience" || text === "Skills" || text.includes("endorsement")) continue;
      texts.push(text);
    }
    if (texts.length < 2) return null;
    const title = texts[0];
    let company = texts[1];
    if (company.includes(" \xB7 ")) {
      const parts = company.split(" \xB7 ");
      const suffix = ((_b = parts[1]) == null ? void 0 : _b.toLowerCase()) || "";
      if (employmentTypes.some((type) => suffix.includes(type))) {
        company = parts[0].trim();
      }
    }
    if (title && company && title.length > 1 && company.length > 1) {
      return { title, company };
    }
    return null;
  }
  function extractEmployers() {
    const employers = [];
    const seen = /* @__PURE__ */ new Set();
    logger.debug("extractEmployers: Starting extraction...");
    const experienceSection = findSectionByHeader("Experience");
    logger.debug("extractEmployers: experienceSection found:", !!experienceSection);
    let searchContainer = experienceSection || document;
    let sectionFound = !!experienceSection;
    if (!experienceSection) {
      const mainSections = document.querySelectorAll("main section");
      for (const section of mainSections) {
        const logos = section.querySelectorAll('img[src*="company-logo"], img[src*="shrink_100"]');
        if (logos.length >= 2) {
          const sectionRect = section.getBoundingClientRect();
          if (sectionRect.top > 300) {
            logger.debug("Found Experience section by company logo pattern");
            searchContainer = section;
            sectionFound = true;
            break;
          }
        }
      }
    }
    if (sectionFound) {
      logger.debug("Extracting employers from section");
    } else {
      logger.debug("Experience section not found, searching entire main");
      searchContainer = document.querySelector("main") || document;
    }
    const allDivs = searchContainer.querySelectorAll("div");
    for (const div of allDivs) {
      const img = div.querySelector('img[src*="company-logo"], img[src*="shrink_100"]');
      if (!img) continue;
      const nestedImgs = div.querySelectorAll('img[src*="company-logo"], img[src*="shrink_100"]');
      if (nestedImgs.length > 1) continue;
      const experience = extractExperienceFromContainer(div);
      if (experience && !seen.has(experience.company.toLowerCase())) {
        seen.add(experience.company.toLowerCase());
        employers.push({
          company: experience.company,
          title: experience.title,
          logo: img.src || ""
        });
        logger.debug(`Found employer: ${experience.title} at ${experience.company}`);
      }
    }
    logger.debug("Extracted employers:", employers.length, employers.map((e) => `${e.title} @ ${e.company}`));
    return employers;
  }
  function extractAbout() {
    var _a;
    const aboutSection = findSectionByHeader("About");
    if (!aboutSection) return void 0;
    const textEl = aboutSection.querySelector('.pv-shared-text-with-see-more span[aria-hidden="true"]') || aboutSection.querySelector('[class*="inline-show-more-text"] span[aria-hidden="true"]') || aboutSection.querySelector('span[aria-hidden="true"]');
    const text = (_a = textEl == null ? void 0 : textEl.textContent) == null ? void 0 : _a.trim();
    if (!text || text.length < 20) return void 0;
    return text;
  }
  function extractEducation() {
    var _a, _b;
    const education = [];
    const section = findSectionByHeader("Education");
    if (!section) {
      logger.debug("Education section not found");
      return education;
    }
    logger.debug("Found Education section");
    const seen = /* @__PURE__ */ new Set();
    const allDivs = section.querySelectorAll("div");
    for (const div of allDivs) {
      const img = div.querySelector('img[src*="shrink_100"], img[src*="company-logo"]');
      if (!img) continue;
      const nestedImgs = div.querySelectorAll('img[src*="shrink_100"], img[src*="company-logo"]');
      if (nestedImgs.length > 1) continue;
      const spans = div.querySelectorAll('span[aria-hidden="true"]');
      let school = "";
      let degree = "";
      let field = "";
      let dates = "";
      for (const span of spans) {
        const text = (_a = span.textContent) == null ? void 0 : _a.trim();
        if (!text) continue;
        if (/^\d{4}\s*-\s*(\d{4}|Present)$/.test(text)) {
          dates = text;
          continue;
        }
        if (!school && text.length > 2 && !text.includes(",")) {
          const parentClasses = ((_b = span.parentElement) == null ? void 0 : _b.className) || "";
          if (parentClasses.includes("bold") || parentClasses.includes("t-bold")) {
            school = text;
            continue;
          }
        }
        if (!degree && text.includes(",")) {
          const parts = text.split(",").map((s) => s.trim());
          degree = parts[0];
          field = parts.slice(1).join(", ");
          continue;
        }
        if (!school && text.length > 2 && text.length < 100) {
          school = text;
        }
      }
      if (school && !seen.has(school.toLowerCase())) {
        seen.add(school.toLowerCase());
        education.push({ school, degree, field, dates });
        logger.debug(`Found education: ${school}`);
      }
    }
    logger.debug("Extracted education:", education.length);
    return education;
  }
  function extractSkills() {
    var _a, _b;
    const skills = [];
    const section = findSectionByHeader("Skills");
    if (!section) {
      logger.debug("Skills section not found");
      return skills;
    }
    logger.debug("Found Skills section");
    const seen = /* @__PURE__ */ new Set();
    const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');
    for (const span of boldSpans) {
      const text = (_a = span.textContent) == null ? void 0 : _a.trim();
      if (!text || text.length < 2) continue;
      if (text.includes("Show all") || text.includes("endorsement")) continue;
      if (/^\d+$/.test(text)) continue;
      if (text.length < 60 && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        skills.push(text);
        logger.debug(`Found skill: ${text}`);
      }
    }
    if (skills.length === 0) {
      const listItems = section.querySelectorAll('li span[aria-hidden="true"]');
      for (const span of listItems) {
        const text = (_b = span.textContent) == null ? void 0 : _b.trim();
        if (!text || text.length < 2 || text.length > 60) continue;
        if (text.includes("Show all") || text.includes("endorsement")) continue;
        if (/^\d+$/.test(text)) continue;
        if (!seen.has(text.toLowerCase())) {
          seen.add(text.toLowerCase());
          skills.push(text);
        }
      }
    }
    logger.debug("Extracted skills:", skills.length, skills.slice(0, 5));
    return skills;
  }
  function extractCertifications() {
    var _a, _b;
    const certifications = [];
    const section = findSectionByHeader("Licenses") || findSectionByHeader("Certifications");
    if (!section) {
      logger.debug("Certifications section not found");
      return certifications;
    }
    logger.debug("Found Certifications section");
    const seen = /* @__PURE__ */ new Set();
    const allDivs = section.querySelectorAll("div");
    for (const div of allDivs) {
      const img = div.querySelector('img[src*="shrink_100"], img[src*="company-logo"]');
      if (!img) continue;
      const nestedImgs = div.querySelectorAll('img[src*="shrink_100"], img[src*="company-logo"]');
      if (nestedImgs.length > 1) continue;
      const spans = div.querySelectorAll('span[aria-hidden="true"]');
      let name = "";
      let issuer = "";
      let issueDate;
      for (const span of spans) {
        const text = (_a = span.textContent) == null ? void 0 : _a.trim();
        if (!text) continue;
        if (text.startsWith("Issued ")) {
          issueDate = text.replace("Issued ", "");
          continue;
        }
        if (/^[A-Z][a-z]{2} \d{4}$/.test(text)) {
          issueDate = text;
          continue;
        }
        if (!name && text.length > 2) {
          const parentClasses = ((_b = span.parentElement) == null ? void 0 : _b.className) || "";
          if (parentClasses.includes("bold") || parentClasses.includes("t-bold")) {
            name = text;
            continue;
          }
        }
        if (name && !issuer && text.length > 2) {
          issuer = text;
          continue;
        }
        if (!name && text.length > 2 && text.length < 100) {
          name = text;
        }
      }
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        certifications.push({ name, issuer, issueDate });
        logger.debug(`Found certification: ${name}`);
      }
    }
    logger.debug("Extracted certifications:", certifications.length);
    return certifications;
  }
  function extractVolunteering() {
    var _a, _b;
    const volunteering = [];
    const section = findSectionByHeader("Volunteer");
    if (!section) {
      logger.debug("Volunteer section not found");
      return volunteering;
    }
    logger.debug("Found Volunteer section");
    const seen = /* @__PURE__ */ new Set();
    const allDivs = section.querySelectorAll("div");
    for (const div of allDivs) {
      const img = div.querySelector('img[src*="shrink_100"], img[src*="company-logo"]');
      const spans = div.querySelectorAll('span[aria-hidden="true"]');
      if (spans.length < 2) continue;
      if (img) {
        const nestedImgs = div.querySelectorAll('img[src*="shrink_100"], img[src*="company-logo"]');
        if (nestedImgs.length > 1) continue;
      }
      let role = "";
      let organization = "";
      const cause = "";
      for (const span of spans) {
        const text = (_a = span.textContent) == null ? void 0 : _a.trim();
        if (!text || text.length < 2) continue;
        if (/^\w{3} \d{4}\s*-/.test(text) || /^\d+\s*(yr|mo)/.test(text)) {
          continue;
        }
        if (!role) {
          const parentClasses = ((_b = span.parentElement) == null ? void 0 : _b.className) || "";
          if (parentClasses.includes("bold") || parentClasses.includes("t-bold")) {
            role = text;
            continue;
          }
        }
        if (role && !organization && text.length > 2) {
          organization = text;
          continue;
        }
        if (!role && text.length > 2 && text.length < 80) {
          role = text;
        }
      }
      const key = `${role}-${organization}`.toLowerCase();
      if ((role || organization) && !seen.has(key)) {
        seen.add(key);
        volunteering.push({ organization, role, cause });
        logger.debug(`Found volunteering: ${role} at ${organization}`);
      }
    }
    logger.debug("Extracted volunteering:", volunteering.length);
    return volunteering;
  }
  function extractActivities() {
    var _a;
    const activities = [];
    const MAX_ACTIVITIES = 20;
    const activitySection = findSectionByHeader("Activity");
    if (!activitySection) {
      logger.debug("Activity section not found on main page");
      return activities;
    }
    logger.debug("Found Activity section on profile page");
    const seen = /* @__PURE__ */ new Set();
    const postTexts = activitySection.querySelectorAll('span[aria-hidden="true"], .update-components-text, .feed-shared-text');
    const allTexts = Array.from(postTexts).slice(0, 10).map((el) => {
      var _a2;
      return (_a2 = el.textContent) == null ? void 0 : _a2.trim().slice(0, 50);
    });
    logger.debug("Activity section text samples:", allTexts);
    for (const span of postTexts) {
      if (activities.length >= MAX_ACTIVITIES) break;
      const text = (_a = span.textContent) == null ? void 0 : _a.trim();
      if (!text || text.length < 20) continue;
      if (text.includes("Show all") || text.includes("follower") || text.includes("reaction")) continue;
      if (/^\d+\s*(reactions?|comments?|reposts?)$/.test(text)) continue;
      const textLower = text.toLowerCase();
      if (seen.has(textLower)) continue;
      seen.add(textLower);
      activities.push({
        type: "post",
        text: text.slice(0, 500)
      });
      logger.debug(`Found activity post: ${text.slice(0, 50)}...`);
    }
    logger.debug(`Extracted ${activities.length} posts from profile Activity section`);
    return activities;
  }
  function extractRecommendations() {
    var _a;
    const recommendations = [];
    const MAX_RECOMMENDATIONS = 10;
    const section = findSectionByHeader("Recommendations");
    if (!section) {
      logger.debug("Recommendations section not found");
      return recommendations;
    }
    logger.debug("Found Recommendations section");
    const seen = /* @__PURE__ */ new Set();
    const textElements = section.querySelectorAll('span[aria-hidden="true"]');
    for (const element of textElements) {
      if (recommendations.length >= MAX_RECOMMENDATIONS) break;
      const text = (_a = element.textContent) == null ? void 0 : _a.trim();
      if (!text || text.length < 50) continue;
      if (text.includes("Show all") || text.includes("Received") || text.includes("Given")) continue;
      if (/^\d+$/.test(text)) continue;
      if (text.length < 100 && /^[A-Z][a-z]+ [A-Z]/.test(text)) continue;
      const textLower = text.toLowerCase();
      if (seen.has(textLower)) continue;
      seen.add(textLower);
      recommendations.push(text.slice(0, 1e3));
    }
    logger.debug(`Extracted ${recommendations.length} recommendations`);
    return recommendations;
  }
  function extractPublications() {
    var _a;
    const publications = [];
    const section = findSectionByHeader("Publications");
    if (!section) {
      return publications;
    }
    logger.debug("Found Publications section");
    const seen = /* @__PURE__ */ new Set();
    const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');
    for (const span of boldSpans) {
      const text = (_a = span.textContent) == null ? void 0 : _a.trim();
      if (!text || text.length < 5 || text.length > 200) continue;
      if (text.includes("Show all")) continue;
      const textLower = text.toLowerCase();
      if (!seen.has(textLower)) {
        seen.add(textLower);
        publications.push(text);
      }
    }
    logger.debug(`Extracted ${publications.length} publications`);
    return publications;
  }
  function extractOrganizations() {
    var _a;
    const organizations = [];
    const section = findSectionByHeader("Organizations");
    if (!section) {
      return organizations;
    }
    logger.debug("Found Organizations section");
    const seen = /* @__PURE__ */ new Set();
    const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');
    for (const span of boldSpans) {
      const text = (_a = span.textContent) == null ? void 0 : _a.trim();
      if (!text || text.length < 2 || text.length > 150) continue;
      if (text.includes("Show all")) continue;
      const textLower = text.toLowerCase();
      if (!seen.has(textLower)) {
        seen.add(textLower);
        organizations.push(text);
      }
    }
    logger.debug(`Extracted ${organizations.length} organizations`);
    return organizations;
  }
  function extractInterests() {
    var _a;
    const interests = [];
    const section = findSectionByHeader("Interests");
    if (!section) {
      return interests;
    }
    logger.debug("Found Interests section");
    const seen = /* @__PURE__ */ new Set();
    const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');
    for (const span of boldSpans) {
      const text = (_a = span.textContent) == null ? void 0 : _a.trim();
      if (!text || text.length < 2 || text.length > 150) continue;
      if (text.includes("Show all") || text.includes("follower")) continue;
      const textLower = text.toLowerCase();
      if (!seen.has(textLower)) {
        seen.add(textLower);
        interests.push(text);
      }
    }
    logger.debug(`Extracted ${interests.length} interests`);
    return interests;
  }
  function extractHonorsAwards() {
    var _a;
    const awards = [];
    const section = findSectionByHeader("Honors") || findSectionByHeader("Awards");
    if (!section) return awards;
    const seen = /* @__PURE__ */ new Set();
    const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');
    for (const span of boldSpans) {
      const text = (_a = span.textContent) == null ? void 0 : _a.trim();
      if (text && text.length > 2 && text.length < 100 && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        awards.push(text);
      }
    }
    return awards;
  }
  function extractCourses() {
    var _a;
    const courses = [];
    const section = findSectionByHeader("Courses");
    if (!section) return courses;
    const seen = /* @__PURE__ */ new Set();
    const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');
    for (const span of boldSpans) {
      const text = (_a = span.textContent) == null ? void 0 : _a.trim();
      if (text && text.length > 2 && text.length < 100 && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        courses.push(text);
      }
    }
    return courses;
  }
  function extractLanguages() {
    var _a;
    const languages = [];
    const section = findSectionByHeader("Languages");
    if (!section) return languages;
    const seen = /* @__PURE__ */ new Set();
    const boldSpans = section.querySelectorAll('.t-bold span[aria-hidden="true"], span.t-bold');
    for (const span of boldSpans) {
      const text = (_a = span.textContent) == null ? void 0 : _a.trim();
      if (text && text.length > 1 && text.length < 50 && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        languages.push(text);
      }
    }
    return languages;
  }
  function extractTestScores() {
    var _a;
    const testScores = [];
    const section = findSectionByHeader("Test Scores") || findSectionByHeader("Scores");
    if (!section) {
      return testScores;
    }
    logger.debug("Found Test Scores section");
    const spans = section.querySelectorAll('span[aria-hidden="true"]');
    for (const span of spans) {
      const text = (_a = span.textContent) == null ? void 0 : _a.trim();
      if (!text || text.length < 3) continue;
      if (text.includes("Show all")) continue;
      if (/\d/.test(text) && (text.includes(":") || text.includes("-") || /^\d+$/.test(text) === false)) {
        testScores.push(text);
      }
    }
    logger.debug(`Extracted ${testScores.length} test scores`);
    return testScores;
  }
  function extractServices() {
    var _a;
    const services = [];
    const section = findSectionByHeader("Services") || findSectionByHeader("Open to");
    if (!section) {
      return services;
    }
    logger.debug("Found Services section");
    const seen = /* @__PURE__ */ new Set();
    const spans = section.querySelectorAll('span[aria-hidden="true"]');
    for (const span of spans) {
      const text = (_a = span.textContent) == null ? void 0 : _a.trim();
      if (!text || text.length < 3 || text.length > 200) continue;
      if (text.includes("Show all")) continue;
      const textLower = text.toLowerCase();
      if (!seen.has(textLower)) {
        seen.add(textLower);
        services.push(text);
      }
    }
    logger.debug(`Extracted ${services.length} services`);
    return services;
  }
  function extractProjects() {
    var _a;
    const projects = [];
    const section = findSectionByHeader("Projects");
    if (!section) {
      logger.debug("Projects section not found");
      return projects;
    }
    logger.debug("Found Projects section");
    const seen = /* @__PURE__ */ new Set();
    const allDivs = section.querySelectorAll("div");
    for (const div of allDivs) {
      const spans = div.querySelectorAll('span[aria-hidden="true"]');
      if (spans.length < 1) continue;
      const nestedDivs = div.querySelectorAll("div");
      if (nestedDivs.length > 10) continue;
      let name = "";
      let description = "";
      for (const span of spans) {
        const text = (_a = span.textContent) == null ? void 0 : _a.trim();
        if (!text || text.length < 2) continue;
        if (/^\w{3} \d{4}|Present|\d+\s*(yr|mo)/i.test(text)) continue;
        if (text.includes("Show all") || text === "Projects") continue;
        if (!name && text.length > 2 && text.length < 100) {
          name = text;
          continue;
        }
        if (name && !description && text.length > 10 && text.length < 500) {
          description = text;
          break;
        }
      }
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        projects.push({ name, description: description || void 0 });
        logger.debug(`Found project: ${name}`);
      }
    }
    logger.debug(`Extracted ${projects.length} projects`);
    return projects;
  }

  // src/storage.ts
  var DEFAULT_WEB_APP_URL2 = "https://www.socialrecall.now";
  async function getStoredProfile(profileId) {
    if (!isExtensionContextValid()) {
      return null;
    }
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(["socialNotes"], (result) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          const notes = result.socialNotes || {};
          resolve(notes[profileId] || null);
        });
      } catch (e) {
        resolve(null);
      }
    });
  }
  async function saveProfile(profileId, data) {
    if (!isExtensionContextValid()) {
      return;
    }
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(["socialNotes"], (result) => {
          if (chrome.runtime.lastError) {
            resolve();
            return;
          }
          const notes = result.socialNotes || {};
          notes[profileId] = data;
          chrome.storage.sync.set({ socialNotes: notes }, () => {
            if (chrome.runtime.lastError) {
              logger.warn("Failed to save:", chrome.runtime.lastError);
            }
            resolve();
          });
        });
      } catch (e) {
        resolve();
      }
    });
  }
  async function getApiUrl() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["webAppUrl"], (result) => {
        resolve(result.webAppUrl || DEFAULT_WEB_APP_URL2);
      });
    });
  }

  // src/profile-merge.ts
  var VALID_ARCHETYPES = /* @__PURE__ */ new Set([
    "builder" /* Builder */,
    "advisor" /* Advisor */,
    "creator" /* Creator */,
    "executive" /* Executive */,
    "connector" /* Connector */,
    "operator" /* Operator */,
    "seller" /* Seller */,
    "researcher" /* Researcher */,
    "integrator" /* Integrator */,
    "evangelist" /* Evangelist */,
    "investor" /* Investor */,
    "unknown" /* Unknown */
  ]);
  function isValidArchetype(archetype) {
    return archetype !== void 0 && VALID_ARCHETYPES.has(archetype);
  }
  function inferArchetype(_data) {
    return "unknown" /* Unknown */;
  }
  function inferCouldBe(_data) {
    return [];
  }
  function inferGoodFor(_data) {
    return [];
  }

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
  async function hasConsent() {
    const consent = await getConsent();
    return (consent == null ? void 0 : consent.given) === true;
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

  // src/content.ts
  logger.debug("===== CONTENT SCRIPT STARTING =====");
  var AI_SKILLS_VERSION = 2;
  var DISABLE_API_WRITES = true;
  var panel = null;
  var currentProfileId = null;
  var isDragging = false;
  var dragOffset = { x: 0, y: 0 };
  var EXTRACTION_STEPS = [
    { id: "loading", label: "Loading profile" },
    { id: "expanding", label: "Expanding sections" },
    { id: "experience", label: "Extracting experience" },
    { id: "skills", label: "Extracting skills" },
    { id: "ai", label: "AI analysis" },
    { id: "complete", label: "Complete" }
  ];
  function updateProgress(stepId, startTime) {
    if (!panel) return;
    const stepIndex = EXTRACTION_STEPS.findIndex((s) => s.id === stepId);
    const step = EXTRACTION_STEPS[stepIndex];
    if (!step) return;
    const progress = (stepIndex + 1) / EXTRACTION_STEPS.length;
    const elapsed = Date.now() - startTime;
    panel.setProgress({
      step: step.id,
      label: step.label,
      progress,
      elapsed
    });
  }
  function completeExtraction(profileId, durationMs) {
    if (panel) {
      panel.setProgress({
        step: "complete",
        label: "Complete",
        progress: 1,
        elapsed: durationMs
      });
      setTimeout(() => {
        panel == null ? void 0 : panel.setProgress(null);
      }, 2e3);
    }
    if (isExtensionContextValid()) {
      try {
        chrome.storage.local.get(["extractionHistory"], (result) => {
          if (!isExtensionContextValid()) return;
          const history2 = result.extractionHistory || [];
          history2.unshift({
            profileId,
            durationMs,
            timestamp: Date.now()
          });
          chrome.storage.local.set({ extractionHistory: history2.slice(0, 100) });
        });
      } catch (e) {
        logger.debug("Extension context invalidated during history storage");
      }
    }
  }
  async function loadAndShowHistory() {
    if (!panel) return;
    if (!isExtensionContextValid()) {
      logger.debug("Extension context invalidated, skipping loadAndShowHistory");
      return;
    }
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(["socialNotes"], (result) => {
          if (!isExtensionContextValid()) {
            resolve();
            return;
          }
          const notes = result.socialNotes || {};
          const profiles = Object.entries(notes).map(([profileId, data]) => ({
            profileId,
            name: data.name,
            headline: data.headline,
            avatarUrl: data.avatarUrl,
            lastSeen: data.lastSeen || (/* @__PURE__ */ new Date()).toISOString()
          })).sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()).slice(0, 10);
          panel == null ? void 0 : panel.showHistory(profiles);
          resolve();
        });
      } catch (e) {
        logger.debug("Extension context invalidated during loadAndShowHistory");
        resolve();
      }
    });
  }
  function initialize() {
    logger.debug("Content script loaded on:", window.location.href);
    injectStyles();
    logger.debug("CSS injected");
    panel = createPanel(document.body);
    logger.debug("Panel created:", panel == null ? void 0 : panel.element);
    panel.onReanalyze(() => {
      logger.debug("Re-analyze requested");
      forceReanalyze();
    });
    panel.onAddNote(async (content) => {
      if (!currentProfileId) {
        return { success: false, error: "No profile loaded" };
      }
      logger.debug("Saving note for:", currentProfileId);
      const result = await saveNote(currentProfileId, content);
      if (result.success) {
        logger.debug("Note saved successfully");
        const notesResult = await getNotesForContact(currentProfileId);
        if (notesResult.success && notesResult.notes && panel) {
          panel.setNotes(notesResult.notes);
        }
      } else {
        logger.debug("Failed to save note:", result.error);
      }
      return result;
    });
    panel.onEditNote(async (noteId, content) => {
      if (!currentProfileId) {
        return { success: false, error: "No profile loaded" };
      }
      logger.debug("Updating note:", noteId);
      const result = await updateNote(noteId, content);
      if (result.success) {
        logger.debug("Note updated successfully");
        const notesResult = await getNotesForContact(currentProfileId);
        if (notesResult.success && notesResult.notes && panel) {
          panel.setNotes(notesResult.notes);
        }
      } else {
        logger.debug("Failed to update note:", result.error);
      }
      return result;
    });
    panel.onDeleteNote(async (noteId) => {
      if (!currentProfileId) {
        return { success: false, error: "No profile loaded" };
      }
      logger.debug("Deleting note:", noteId);
      const result = await deleteNote(noteId);
      if (result.success) {
        logger.debug("Note deleted successfully");
        const notesResult = await getNotesForContact(currentProfileId);
        if (notesResult.success && notesResult.notes && panel) {
          panel.setNotes(notesResult.notes);
        }
      } else {
        logger.debug("Failed to delete note:", result.error);
      }
      return result;
    });
    setupDragListeners();
    panel.onConsentAccept(async () => {
      logger.debug("Consent accepted, granting consent...");
      try {
        const apiUrl = await getApiUrl();
        await grantConsent(apiUrl);
        logger.debug("Consent granted successfully");
        panel == null ? void 0 : panel.hideConsentOverlay();
      } catch (error) {
        logger.error("Failed to grant consent:", error);
        panel == null ? void 0 : panel.hideConsentOverlay();
      }
    });
    hasConsent().then((consented) => {
      if (!consented && panel) {
        logger.debug("No consent found, showing consent overlay");
        panel.showConsentOverlay();
      }
    });
    if (isLinkedInProfileUrl(window.location.href)) {
      logger.debug("On profile page, extracting intelligence...");
      if (panel) {
        panel.setMinimalMode(false);
      }
      primePanel();
      handleProfilePage();
    } else {
      logger.debug("Not a profile page, showing history mode");
      if (panel) {
        panel.setMinimalMode(true);
        loadAndShowHistory();
      }
    }
    observeUrlChanges();
    let lastHandledUrl = window.location.href;
    if (isExtensionContextValid()) {
      try {
        chrome.runtime.onMessage.addListener((message) => {
          if (!isExtensionContextValid()) return;
          if (message.type === "URL_CHANGED") {
            logger.debug("URL change message from background:", message.url);
            if (message.url !== lastHandledUrl) {
              const oldUrl = lastHandledUrl;
              lastHandledUrl = message.url;
              handleUrlChange(message.url, oldUrl);
            }
          }
        });
      } catch (e) {
        logger.debug("Extension context invalidated, cannot add message listener");
      }
    }
  }
  function injectStyles() {
    if (document.getElementById("sr-panel-styles")) {
      return;
    }
    if (!isExtensionContextValid()) {
      logger.debug("Extension context invalidated, skipping style injection");
      return;
    }
    try {
      const link = document.createElement("link");
      link.id = "sr-panel-styles";
      link.rel = "stylesheet";
      link.href = chrome.runtime.getURL("panel.css");
      document.head.appendChild(link);
    } catch (e) {
      logger.debug("Extension context invalidated during style injection");
    }
  }
  function setupDragListeners() {
    if (!panel) return;
    const element = panel.element;
    element.addEventListener("mousedown", (e) => {
      const target = e.target;
      if (target.tagName === "BUTTON" || target.closest("button")) {
        return;
      }
      isDragging = true;
      const pos = panel.getPosition();
      dragOffset = {
        x: e.clientX - pos.x,
        y: e.clientY - pos.y
      };
      element.style.cursor = "grabbing";
    });
    document.addEventListener("mousemove", (e) => {
      if (!isDragging || !panel) return;
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      panel.setPosition(newX, newY);
    });
    document.addEventListener("mouseup", () => {
      if (isDragging && panel) {
        isDragging = false;
        panel.element.style.cursor = "grab";
        savePosition(panel.getPosition());
      }
    });
  }
  function savePosition(position) {
    if (!isExtensionContextValid()) return;
    try {
      chrome.storage.sync.set({ panelPosition: position });
    } catch (e) {
      logger.debug("Extension context invalidated during savePosition");
    }
  }
  async function loadPosition() {
    if (!isExtensionContextValid()) {
      logger.debug("Extension context invalidated, skipping loadPosition");
      return null;
    }
    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(["panelPosition"], (result) => {
          if (chrome.runtime.lastError) {
            logger.debug("Storage error:", chrome.runtime.lastError);
            resolve(null);
            return;
          }
          resolve(result.panelPosition || null);
        });
      } catch (e) {
        logger.debug("Extension context invalidated");
        resolve(null);
      }
    });
  }
  async function warmUpAI() {
    try {
      const apiUrl = await getApiUrl();
      fetch(`${apiUrl}/api/infer-skills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warmup: true })
      }).catch(() => {
      });
      logger.debug("AI warm-up ping sent");
    } catch (e) {
    }
  }
  function primePanel() {
    var _a, _b, _c;
    if (!panel) return;
    const h1 = document.querySelector("h1");
    const name = ((_a = h1 == null ? void 0 : h1.textContent) == null ? void 0 : _a.trim()) || "Loading...";
    const avatarImg = document.querySelector("img.pv-top-card-profile-picture__image");
    const avatarUrl = avatarImg == null ? void 0 : avatarImg.src;
    const headlineEl = document.querySelector(".text-body-medium.break-words");
    const headline = (_b = headlineEl == null ? void 0 : headlineEl.textContent) == null ? void 0 : _b.trim();
    const locationSelectors = [
      ".pv-text-details__left-panel span.text-body-small",
      ".text-body-small.inline.t-black--light.break-words"
    ];
    let location;
    for (const selector of locationSelectors) {
      const el = document.querySelector(selector);
      const text = (_c = el == null ? void 0 : el.textContent) == null ? void 0 : _c.trim();
      if (text && text.length > 2 && text.length < 100 && !/^\d+[\d,]*\s*(connections?|followers?)$/i.test(text)) {
        location = text;
        break;
      }
    }
    logger.debug("Priming panel with name:", name, "headline:", headline, "location:", location);
    panel.primeForProfile(name, headline, location, avatarUrl);
  }
  async function forceReanalyze() {
    if (!currentProfileId) {
      logger.debug("No current profile to re-analyze");
      return;
    }
    logger.debug("Forcing re-analysis for:", currentProfileId);
    const storageKey = `profile:${currentProfileId}`;
    const result = await chrome.storage.local.get(storageKey);
    const storedData = result[storageKey];
    if (storedData) {
      delete storedData.aiVersion;
      await chrome.storage.local.set({ [storageKey]: storedData });
      logger.debug("Cleared aiVersion, re-running extraction");
    }
    const profileId = currentProfileId;
    currentProfileId = null;
    await handleProfilePage();
  }
  async function handleProfilePage() {
    if (!isExtensionContextValid()) {
      logger.debug("Extension context invalidated, aborting");
      return;
    }
    warmUpAI();
    const profileId = extractProfileIdFromUrl(window.location.href);
    if (!profileId || profileId === currentProfileId) {
      return;
    }
    currentProfileId = profileId;
    const startTime = Date.now();
    const savedPosition = await loadPosition();
    if (savedPosition && panel) {
      panel.setPosition(savedPosition.x, savedPosition.y);
    }
    updateProgress("loading", startTime);
    await waitForCompleteProfile({ timeout: 15e3 });
    if (!isExtensionContextValid()) {
      logger.debug("Extension context invalidated during wait, aborting");
      return;
    }
    let profileData = await extractProfileData(profileId, startTime);
    if (profileId !== currentProfileId) {
      logger.debug("Profile changed during extraction, aborting:", profileId);
      return;
    }
    const storedData = await getStoredProfile(profileId);
    updateProgress("ai", startTime);
    let mergedData = await mergeProfileData(profileData, storedData);
    await saveProfile(profileId, mergedData);
    updateProgress("complete", startTime);
    const durationMs = Date.now() - startTime;
    completeExtraction(profileId, durationMs);
    const jobChange = detectJobChange(profileData, storedData);
    let intelligence = buildIntelligence(mergedData, jobChange);
    logger.debug("Intelligence built:", JSON.stringify(intelligence, null, 2));
    if (profileId !== currentProfileId) {
      logger.debug("Profile changed during extraction, discarding results for:", profileId);
      return;
    }
    if (panel) {
      logger.debug("Setting intelligence on panel...");
      panel.setIntelligence(intelligence);
      logger.debug("Intelligence set complete");
      const orb = panel.element.querySelector(".sr-panel__orb");
      if (jobChange && orb) {
        orb.classList.add("sr-panel__orb--alert");
      }
      if (currentProfileId) {
        panel.setNotesLoading(true);
        getNotesForContact(currentProfileId).then((result) => {
          if (result.success && result.notes && panel) {
            logger.debug(`Loaded ${result.notes.length} notes from backend`);
            panel.setNotes(result.notes);
          } else if (!result.success) {
            logger.debug("Failed to load notes:", result.error);
            panel == null ? void 0 : panel.setNotes([]);
          }
        }).catch((err) => {
          logger.debug("Error fetching notes:", err);
          panel == null ? void 0 : panel.setNotes([]);
        });
      }
    }
    const stopObserving = observeLazyContent(async () => {
      var _a, _b, _c, _d;
      if (profileId !== currentProfileId || !panel) return;
      logger.debug("Lazy content detected, re-extracting...");
      const newProfileData = await extractProfileData(profileId, Date.now());
      if (profileId !== currentProfileId) return;
      const oldEmployerCount = (_b = (_a = mergedData.employers) == null ? void 0 : _a.length) != null ? _b : 0;
      const newEmployerCount = (_d = (_c = newProfileData.employers) == null ? void 0 : _c.length) != null ? _d : 0;
      if (newEmployerCount > oldEmployerCount) {
        logger.debug(`Found ${newEmployerCount - oldEmployerCount} new employers`);
        mergedData = await mergeProfileData(newProfileData, mergedData);
        await saveProfile(profileId, mergedData);
        intelligence = buildIntelligence(mergedData, jobChange);
        panel.setIntelligence(intelligence);
      }
    });
    const originalProfileId = profileId;
    const checkInterval = setInterval(() => {
      if (currentProfileId !== originalProfileId) {
        logger.debug("Profile changed, stopping lazy content observer");
        stopObserving();
        clearInterval(checkInterval);
      }
    }, 1e3);
  }
  async function extractProfileData(profileId, startTime) {
    var _a, _b, _c;
    logger.debug("Starting DOM extraction...");
    updateProgress("experience", startTime);
    const profileData = {
      name: extractName(),
      headline: extractHeadline(),
      location: extractLocation(),
      avatarUrl: extractAvatarUrl(),
      about: extractAbout(),
      employers: extractEmployers(),
      education: extractEducation(),
      skills: extractSkills(),
      certifications: extractCertifications(),
      volunteering: extractVolunteering(),
      honorsAwards: extractHonorsAwards(),
      courses: extractCourses(),
      languages: extractLanguages(),
      activities: extractActivities(),
      recommendations: extractRecommendations(),
      publications: extractPublications(),
      organizations: extractOrganizations(),
      interests: extractInterests(),
      testScores: extractTestScores(),
      services: extractServices(),
      projects: extractProjects(),
      lastSeen: (/* @__PURE__ */ new Date()).toISOString()
    };
    logger.debug("DOM extraction complete:", {
      name: profileData.name,
      employers: (_a = profileData.employers) == null ? void 0 : _a.length,
      education: (_b = profileData.education) == null ? void 0 : _b.length,
      skills: (_c = profileData.skills) == null ? void 0 : _c.length
    });
    updateProgress("complete", startTime);
    return profileData;
  }
  function mergeProfileDataSync(newData, storedData) {
    var _a, _b;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (!storedData) {
      return {
        name: newData.name || "Unknown",
        headline: newData.headline,
        location: newData.location,
        avatarUrl: newData.avatarUrl,
        about: newData.about,
        employers: newData.employers,
        education: newData.education,
        honorsAwards: newData.honorsAwards,
        courses: newData.courses,
        languages: newData.languages,
        volunteering: newData.volunteering,
        certifications: newData.certifications,
        activities: newData.activities,
        recommendations: newData.recommendations,
        publications: newData.publications,
        organizations: newData.organizations,
        interests: newData.interests,
        testScores: newData.testScores,
        services: newData.services,
        firstSeen: now,
        lastSeen: now,
        // Default intelligence values - use scraped skills if available
        archetype: inferArchetype(newData),
        skills: ((_a = newData.skills) == null ? void 0 : _a.length) ? newData.skills : [],
        couldBe: inferCouldBe(newData),
        goodFor: inferGoodFor(newData)
      };
    }
    const needsRecompute = !isValidArchetype(storedData.archetype);
    return __spreadValues(__spreadProps(__spreadValues({}, storedData), {
      name: newData.name || storedData.name,
      headline: newData.headline || storedData.headline,
      location: newData.location || storedData.location,
      avatarUrl: newData.avatarUrl || storedData.avatarUrl,
      about: newData.about || storedData.about,
      employers: newData.employers || storedData.employers,
      education: newData.education || storedData.education,
      honorsAwards: newData.honorsAwards || storedData.honorsAwards,
      courses: newData.courses || storedData.courses,
      languages: newData.languages || storedData.languages,
      volunteering: newData.volunteering || storedData.volunteering,
      certifications: newData.certifications || storedData.certifications,
      activities: newData.activities || storedData.activities,
      recommendations: newData.recommendations || storedData.recommendations,
      publications: newData.publications || storedData.publications,
      organizations: newData.organizations || storedData.organizations,
      interests: newData.interests || storedData.interests,
      testScores: newData.testScores || storedData.testScores,
      services: newData.services || storedData.services,
      // Always update skills from scraping (fresh data)
      skills: ((_b = newData.skills) == null ? void 0 : _b.length) ? newData.skills : storedData.skills,
      lastSeen: now
    }), needsRecompute && {
      archetype: inferArchetype(newData),
      couldBe: inferCouldBe(newData),
      goodFor: inferGoodFor(newData)
    });
  }
  async function mergeProfileData(newData, storedData) {
    var _a, _b, _c;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    logger.debug("mergeProfileData called, storedData:", storedData ? "exists" : "null");
    let historyUpdates = [];
    const isEstablishedProfile = (storedData == null ? void 0 : storedData.firstSeen) && Date.now() - new Date(storedData.firstSeen).getTime() > 6e4;
    if (storedData && isEstablishedProfile) {
      const changes = detectChanges(storedData, newData);
      if (changes.length > 0) {
        logger.debug("Detected changes:", changes.map((c) => c.field));
        const withHistory = recordHistory(storedData, changes, now);
        historyUpdates = withHistory.history || [];
        const profileId = extractProfileIdFromUrl(window.location.href);
        if (profileId) {
          hasConsent().then((consented2) => {
            if (!consented2) {
              logger.debug("Server sync skipped - no consent");
              return;
            }
            const newEntries = changes.map((change) => ({
              field: change.field,
              oldValue: change.oldValue,
              newValue: change.newValue,
              detectedAt: now
            }));
            syncHistory(profileId, newEntries).then((result) => {
              if (result.success) {
                logger.debug("History synced to backend:", result.synced);
              } else {
                logger.debug("History sync failed:", result.error);
              }
            }).catch((err) => {
              logger.debug("History sync error:", err);
            });
          });
        }
      } else {
        historyUpdates = storedData.history || [];
      }
    } else if (storedData) {
      historyUpdates = storedData.history || [];
    }
    const hasRealIntelligence = ((_a = storedData == null ? void 0 : storedData.skills) == null ? void 0 : _a.length) && storedData.skills[0] !== "Professional" && storedData.archetype !== "unknown" /* Unknown */ && storedData.aiVersion === AI_SKILLS_VERSION;
    if (storedData && isValidArchetype(storedData.archetype) && hasRealIntelligence) {
      logger.debug("Using stored data with valid archetype:", storedData.archetype, "aiVersion:", storedData.aiVersion);
      return __spreadProps(__spreadValues({}, storedData), {
        name: newData.name || storedData.name,
        headline: newData.headline || storedData.headline,
        location: newData.location || storedData.location,
        avatarUrl: newData.avatarUrl || storedData.avatarUrl,
        about: newData.about || storedData.about,
        employers: newData.employers || storedData.employers,
        education: newData.education || storedData.education,
        honorsAwards: newData.honorsAwards || storedData.honorsAwards,
        courses: newData.courses || storedData.courses,
        languages: newData.languages || storedData.languages,
        volunteering: newData.volunteering || storedData.volunteering,
        certifications: newData.certifications || storedData.certifications,
        activities: newData.activities || storedData.activities,
        lastSeen: now,
        history: historyUpdates.length > 0 ? historyUpdates : storedData.history
      });
    }
    logger.debug("Running AI inference (stored archetype:", storedData == null ? void 0 : storedData.archetype, "hasRealIntelligence:", hasRealIntelligence, ")");
    const aiProfileData = {
      name: newData.name || "Unknown",
      headline: newData.headline || "",
      about: newData.about,
      employers: newData.employers,
      education: newData.education,
      honorsAwards: newData.honorsAwards,
      courses: newData.courses,
      languages: newData.languages,
      volunteering: newData.volunteering,
      certifications: newData.certifications,
      activities: newData.activities,
      projects: newData.projects
    };
    if (DISABLE_API_WRITES) {
      logger.debug("API writes disabled (DISABLE_API_WRITES=true). Using local heuristics.");
      logger.debug("Extracted profile data:", JSON.stringify(aiProfileData, null, 2));
      const syncResult2 = mergeProfileDataSync(newData, storedData);
      if (historyUpdates.length > 0) {
        syncResult2.history = historyUpdates;
      }
      return syncResult2;
    }
    const consented = await hasConsent();
    if (!consented) {
      logger.debug("Server sync skipped - no consent. Using local heuristics.");
      const syncResult2 = mergeProfileDataSync(newData, storedData);
      if (historyUpdates.length > 0) {
        syncResult2.history = historyUpdates;
      }
      return syncResult2;
    }
    try {
      const apiUrl = await getApiUrl();
      const linkedinId = extractProfileIdFromUrl(window.location.href);
      logger.debug("Calling AI inference at:", apiUrl);
      logger.debug("Profile data being sent:", JSON.stringify(aiProfileData, null, 2));
      let result;
      if (linkedinId) {
        result = await getProfileIntelligence(aiProfileData, { apiUrl, timeoutMs: 15e3, linkedinId });
        logger.debug("AI result cached:", result.cached);
        logger.debug("AI result verified:", result.verified);
      } else {
        const fallbackResult = await inferIntelligence(aiProfileData, { apiUrl, timeoutMs: 15e3 });
        result = __spreadProps(__spreadValues({}, fallbackResult), { cached: false, verified: false });
      }
      logger.debug("AI result success:", result == null ? void 0 : result.success);
      logger.debug("AI result archetype:", result == null ? void 0 : result.archetype);
      logger.debug("AI result skills:", result == null ? void 0 : result.skills);
      logger.debug("AI result error:", result == null ? void 0 : result.error);
      if (result.success) {
        const archetypeMap = {
          builder: "builder" /* Builder */,
          advisor: "advisor" /* Advisor */,
          creator: "creator" /* Creator */,
          executive: "executive" /* Executive */,
          connector: "connector" /* Connector */,
          operator: "operator" /* Operator */,
          seller: "seller" /* Seller */,
          researcher: "researcher" /* Researcher */,
          integrator: "integrator" /* Integrator */,
          evangelist: "evangelist" /* Evangelist */,
          investor: "investor" /* Investor */,
          unknown: "unknown" /* Unknown */
        };
        return {
          name: newData.name || "Unknown",
          headline: newData.headline,
          location: newData.location,
          avatarUrl: newData.avatarUrl,
          about: newData.about,
          employers: newData.employers,
          education: newData.education,
          honorsAwards: newData.honorsAwards,
          courses: newData.courses,
          languages: newData.languages,
          volunteering: newData.volunteering,
          certifications: newData.certifications,
          activities: newData.activities,
          recommendations: newData.recommendations,
          publications: newData.publications,
          organizations: newData.organizations,
          interests: newData.interests,
          testScores: newData.testScores,
          services: newData.services,
          firstSeen: (storedData == null ? void 0 : storedData.firstSeen) || now,
          lastSeen: now,
          archetype: result.archetype ? archetypeMap[result.archetype] || (logger.debug("Unknown archetype from AI:", result.archetype), "unknown" /* Unknown */) : (logger.debug("No archetype returned from AI"), "unknown" /* Unknown */),
          // Use AI-derived skills, fall back to scraped skills if AI returns none
          skills: ((_b = result.skills) == null ? void 0 : _b.length) ? result.skills.map((s) => s.name) : newData.skills || [],
          couldBe: result.couldBe || inferCouldBe(newData),
          goodFor: result.goodFor || inferGoodFor(newData),
          note: storedData == null ? void 0 : storedData.note,
          aiVersion: AI_SKILLS_VERSION,
          // Mark as AI-generated with current version
          history: historyUpdates.length > 0 ? historyUpdates : storedData == null ? void 0 : storedData.history,
          verified: (_c = result.verified) != null ? _c : false
        };
      }
    } catch (error) {
      logger.debug("AI inference failed, using local heuristics:", error);
    }
    const syncResult = mergeProfileDataSync(newData, storedData);
    if (historyUpdates.length > 0) {
      syncResult.history = historyUpdates;
    }
    return syncResult;
  }
  function detectJobChange(newData, storedData) {
    var _a, _b, _c, _d;
    if (!((_a = storedData == null ? void 0 : storedData.employers) == null ? void 0 : _a.length) || !((_b = newData.employers) == null ? void 0 : _b.length)) {
      return void 0;
    }
    const currentEmployer = (_c = newData.employers[0]) == null ? void 0 : _c.company;
    const previousEmployer = (_d = storedData.employers[0]) == null ? void 0 : _d.company;
    if (currentEmployer && previousEmployer && currentEmployer !== previousEmployer) {
      return { current: currentEmployer, previous: previousEmployer };
    }
    return void 0;
  }
  function buildIntelligence(data, jobChange) {
    var _a, _b, _c;
    return {
      name: data.name,
      headline: data.headline,
      location: data.location,
      avatarUrl: data.avatarUrl,
      archetype: data.archetype || "unknown" /* Unknown */,
      // Use defaults if arrays are empty or missing
      skills: ((_a = data.skills) == null ? void 0 : _a.length) ? data.skills : ["Professional"],
      couldBe: ((_b = data.couldBe) == null ? void 0 : _b.length) ? data.couldBe : ["Collaborator"],
      goodFor: ((_c = data.goodFor) == null ? void 0 : _c.length) ? data.goodFor : ["Projects"],
      firstSeen: data.firstSeen ? new Date(data.firstSeen) : void 0,
      jobChange,
      history: data.history,
      verified: data.verified
    };
  }
  function handleUrlChange(newUrl, lastUrl) {
    if (newUrl === lastUrl) return;
    logger.debug("URL changed from", lastUrl, "to", newUrl);
    currentProfileId = null;
    if (isLinkedInProfileUrl(newUrl)) {
      logger.debug("Navigated to profile page");
      if (panel) {
        panel.setMinimalMode(false);
        primePanel();
      }
      setTimeout(() => handleProfilePage(), 500);
    } else {
      logger.debug("Navigated away from profile page");
      if (panel) {
        panel.setMinimalMode(true);
        loadAndShowHistory();
      }
    }
  }
  function observeUrlChanges() {
    let lastUrl = window.location.href;
    const checkUrlChange = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        const oldUrl = lastUrl;
        lastUrl = currentUrl;
        handleUrlChange(currentUrl, oldUrl);
      }
    };
    const originalPushState = history.pushState.bind(history);
    const originalReplaceState = history.replaceState.bind(history);
    history.pushState = function(...args) {
      originalPushState(...args);
      logger.debug("history.pushState detected");
      checkUrlChange();
    };
    history.replaceState = function(...args) {
      originalReplaceState(...args);
      logger.debug("history.replaceState detected");
      checkUrlChange();
    };
    window.addEventListener("popstate", () => {
      logger.debug("popstate event detected");
      checkUrlChange();
    });
    const observer = new MutationObserver(() => {
      checkUrlChange();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    logger.debug("URL change observers installed");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();
