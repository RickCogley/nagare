/**
 * @fileoverview Simple logging system for Nagare with security audit support
 * Simplified version adapted from Salty's logger
 */

import { NagareError } from "./enhanced-error.ts";
import { getI18n, t } from "./i18n.ts";
import type { TranslationKey } from "../locales/schema.ts";

/**
 * Helper to check if i18n is available
 */
function hasI18n(): boolean {
  try {
    getI18n();
    return true;
  } catch {
    return false;
  }
}

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Simple logger for Nagare operations
 */
export class Logger {
  private logLevel: LogLevel;

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    this.logLevel = logLevel;
  }

  /**
   * Log debug information
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log general information
   */
  info(message: string, ...args: unknown[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log warnings
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Log errors with support for enhanced errors
   */
  error(message: string, error?: Error | NagareError): void {
    if (this.logLevel <= LogLevel.ERROR) {
      // Handle enhanced errors with their custom formatting
      if (error instanceof NagareError) {
        console.error(error.toString());
      } else {
        console.error(`[ERROR] ${message}`, error);
      }
    }
  }

  /**
   * Generate a simple request ID
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log security audit event
   */
  audit(action: string, details: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const auditEntry = {
      timestamp,
      action,
      details,
      requestId: this.generateRequestId(),
    };

    // Always log security events regardless of log level
    console.log(`[SECURITY AUDIT] ${JSON.stringify(auditEntry)}`);
  }

  // i18n-enabled logging methods

  /**
   * Log a message with i18n support
   * Falls back to the key if i18n is not available
   */
  log(
    level: LogLevel,
    messageKeyOrString: string | TranslationKey,
    params?: Record<string, unknown>,
  ): void {
    const message = hasI18n() && this.isTranslationKey(messageKeyOrString)
      ? t(messageKeyOrString as TranslationKey, params)
      : messageKeyOrString;

    switch (level) {
      case LogLevel.DEBUG:
        this.debug(message);
        break;
      case LogLevel.INFO:
        this.info(message);
        break;
      case LogLevel.WARN:
        this.warn(message);
        break;
      case LogLevel.ERROR:
        this.error(message);
        break;
    }
  }

  /**
   * Log debug information with i18n support
   */
  debugI18n(key: TranslationKey, params?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, key, params);
  }

  /**
   * Log info with i18n support
   */
  infoI18n(key: TranslationKey, params?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, key, params);
  }

  /**
   * Log warning with i18n support
   */
  warnI18n(key: TranslationKey, params?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, key, params);
  }

  /**
   * Log error with i18n support
   */
  errorI18n(key: TranslationKey, params?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, key, params);
  }

  /**
   * Check if a string could be a translation key
   * Simple heuristic: contains dots (e.g., "cli.release.success")
   */
  private isTranslationKey(str: string): boolean {
    return str.includes(".");
  }
}
