/**
 * Tests for structured logging module
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, setLogLevel, getLogLevel } from './logger';

describe('logger', () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
    setLogLevel('debug'); // Reset to debug for all tests
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('log methods', () => {
    it('logger.debug logs with [Social Recall] prefix', () => {
      logger.debug('Found profile');
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        '[Social Recall]',
        'Found profile'
      );
    });

    it('logger.info logs with [Social Recall] prefix', () => {
      logger.info('Initialized');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[Social Recall]',
        'Initialized'
      );
    });

    it('logger.warn logs with [Social Recall] prefix', () => {
      logger.warn('Context invalid');
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        '[Social Recall]',
        'Context invalid'
      );
    });

    it('logger.error logs with [Social Recall] prefix', () => {
      logger.error('Request failed');
      expect(consoleSpy.error).toHaveBeenCalledWith(
        '[Social Recall]',
        'Request failed'
      );
    });
  });

  describe('multiple arguments', () => {
    it('passes multiple arguments through', () => {
      const data = { linkedinId: 'john-doe', name: 'John Doe' };
      logger.info('Found profile', data);
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[Social Recall]',
        'Found profile',
        data
      );
    });

    it('handles many arguments', () => {
      logger.debug('Value is', 42, 'and', true);
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        '[Social Recall]',
        'Value is',
        42,
        'and',
        true
      );
    });
  });

  describe('log levels', () => {
    it('respects log level - debug shows all', () => {
      setLogLevel('debug');
      logger.debug('debug msg');
      logger.info('info msg');
      logger.warn('warn msg');
      logger.error('error msg');

      expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it('respects log level - info hides debug', () => {
      setLogLevel('info');
      logger.debug('debug msg');
      logger.info('info msg');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.log).toHaveBeenCalledTimes(1);
    });

    it('respects log level - warn hides debug and info', () => {
      setLogLevel('warn');
      logger.debug('debug msg');
      logger.info('info msg');
      logger.warn('warn msg');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    });

    it('respects log level - error hides all except error', () => {
      setLogLevel('error');
      logger.debug('debug msg');
      logger.info('info msg');
      logger.warn('warn msg');
      logger.error('error msg');

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it('getLogLevel returns current level', () => {
      setLogLevel('warn');
      expect(getLogLevel()).toBe('warn');
    });
  });

  describe('module-specific loggers', () => {
    it('logger.forModule creates a bound logger with module prefix', () => {
      const ssrLogger = logger.forModule('SSR');
      ssrLogger.info('Found data');
      expect(consoleSpy.log).toHaveBeenCalledWith(
        '[Social Recall]',
        '[SSR]',
        'Found data'
      );
    });

    it('module logger passes multiple arguments', () => {
      const panelLogger = logger.forModule('Panel');
      panelLogger.debug('State', { expanded: true });
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        '[Social Recall]',
        '[Panel]',
        'State',
        { expanded: true }
      );
    });
  });
});
