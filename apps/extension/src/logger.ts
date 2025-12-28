/**
 * Structured logging module for Social Recall extension
 * Provides consistent, filterable logging across all modules
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const PREFIX = '[Social Recall]';

let currentLevel: LogLevel = 'debug';

/**
 * Set the minimum log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/**
 * Get the current log level
 */
export function getLogLevel(): LogLevel {
  return currentLevel;
}

/**
 * Check if a log level should be displayed
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

/**
 * Format the log prefix with module name
 */
function formatPrefix(module: string): string {
  return `${PREFIX} [${module}]`;
}

/**
 * Core logging function - simplified to just prefix + args
 */
function log(
  level: LogLevel,
  ...args: unknown[]
): void {
  if (!shouldLog(level)) return;

  const consoleFn = level === 'debug' ? console.debug
    : level === 'info' ? console.log
    : level === 'warn' ? console.warn
    : console.error;

  consoleFn(PREFIX, ...args);
}

/**
 * Module-specific logger interface
 */
interface ModuleLogger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

/**
 * Main logger object with methods for each log level
 * Simple API: logger.debug('message', data1, data2, ...)
 */
export const logger = {
  /**
   * Debug level - detailed information for debugging
   */
  debug(...args: unknown[]): void {
    log('debug', ...args);
  },

  /**
   * Info level - general information about operations
   */
  info(...args: unknown[]): void {
    log('info', ...args);
  },

  /**
   * Warn level - potential issues that don't prevent operation
   */
  warn(...args: unknown[]): void {
    log('warn', ...args);
  },

  /**
   * Error level - errors that may affect functionality
   */
  error(...args: unknown[]): void {
    log('error', ...args);
  },

  /**
   * Create a logger bound to a specific module
   * Useful for reducing repetition in a single file
   */
  forModule(module: string): ModuleLogger {
    const modulePrefix = `[${module}]`;
    return {
      debug: (...args: unknown[]) => log('debug', modulePrefix, ...args),
      info: (...args: unknown[]) => log('info', modulePrefix, ...args),
      warn: (...args: unknown[]) => log('warn', modulePrefix, ...args),
      error: (...args: unknown[]) => log('error', modulePrefix, ...args),
    };
  },
};
