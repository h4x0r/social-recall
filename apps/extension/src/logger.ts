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

let currentLevel: LogLevel = 'info';

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
 * Core logging function
 */
function log(
  level: LogLevel,
  module: string,
  message: string,
  data?: unknown
): void {
  if (!shouldLog(level)) return;

  const prefix = formatPrefix(module);
  const consoleFn = level === 'debug' ? console.debug
    : level === 'info' ? console.log
    : level === 'warn' ? console.warn
    : console.error;

  if (data !== undefined) {
    consoleFn(prefix, message, data);
  } else {
    consoleFn(prefix, message);
  }
}

/**
 * Module-specific logger interface
 */
interface ModuleLogger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
}

/**
 * Main logger object with methods for each log level
 */
export const logger = {
  /**
   * Debug level - detailed information for debugging
   */
  debug(module: string, message: string, data?: unknown): void {
    log('debug', module, message, data);
  },

  /**
   * Info level - general information about operations
   */
  info(module: string, message: string, data?: unknown): void {
    log('info', module, message, data);
  },

  /**
   * Warn level - potential issues that don't prevent operation
   */
  warn(module: string, message: string, data?: unknown): void {
    log('warn', module, message, data);
  },

  /**
   * Error level - errors that may affect functionality
   */
  error(module: string, message: string, data?: unknown): void {
    log('error', module, message, data);
  },

  /**
   * Create a logger bound to a specific module
   * Useful for reducing repetition in a single file
   */
  forModule(module: string): ModuleLogger {
    return {
      debug: (message: string, data?: unknown) => log('debug', module, message, data),
      info: (message: string, data?: unknown) => log('info', module, message, data),
      warn: (message: string, data?: unknown) => log('warn', module, message, data),
      error: (message: string, data?: unknown) => log('error', module, message, data),
    };
  },
};
