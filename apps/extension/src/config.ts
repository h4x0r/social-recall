/**
 * Centralized configuration for Social Recall extension
 * Single source of truth for all magic numbers and settings
 */

export const config = Object.freeze({
  /**
   * AI inference settings
   */
  ai: Object.freeze({
    /** Version number to force re-inference when AI skills change */
    skillsVersion: 2,
    /** Base URL for the Social Recall API */
    apiUrl: 'https://www.socialrecall.now',
    /** Timeout for AI warm-up ping (ms) */
    warmupTimeout: 5000,
    /** Timeout for AI inference requests (ms) */
    inferenceTimeout: 30000,
  }),

  /**
   * Profile extraction settings
   */
  extraction: Object.freeze({
    /** Timeout for waiting for SSR code tags to appear (ms) */
    ssrTimeout: 8000,
    /** Time to wait for LinkedIn lazy loading (ms) - tested optimal value */
    lazyLoadWait: 3000,
    /** Overall timeout for profile loading (ms) */
    profileLoadTimeout: 15000,
    /** Interval for polling during waits (ms) */
    pollInterval: 100,
    /** Time to wait for DOM stability (ms) */
    stabilityWait: 500,
  }),

  /**
   * Chrome storage keys
   */
  storage: Object.freeze({
    /** Key for storing panel position */
    positionKey: 'socialRecallPanelPosition',
    /** Key for storing profile data */
    profilesKey: 'socialNotes',
    /** Key for sync token */
    syncTokenKey: 'syncToken',
    /** Key for web app URL override */
    webAppUrlKey: 'webAppUrl',
  }),

  /**
   * Debug/development settings
   */
  debug: Object.freeze({
    /** Set to true to disable API writes during testing */
    disableApiWrites: true,
    /** Set to true for verbose console logging */
    verboseLogging: false,
  }),

  /**
   * UI settings
   */
  ui: Object.freeze({
    /** Default panel position */
    defaultPosition: { x: 20, y: 20 },
    /** Progress bar hide delay after completion (ms) */
    progressHideDelay: 2000,
  }),
});

/** Type for the config object */
export type Config = typeof config;
