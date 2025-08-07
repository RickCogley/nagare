/**
 * @module Logger
 * @description Structured logging system for Nagare with security audit support.
 *
 * Provides leveled logging (DEBUG, INFO, WARN, ERROR) with i18n support,
 * security audit trails, and enhanced error formatting. Adapted from Salty's
 * battle-tested logging implementation.
 *
 * @example Basic usage
 * ```typescript
 * import { Logger, LogLevel } from "./core/logger.ts";
 *
 * const logger = new Logger(LogLevel.INFO);
 * logger.info("Starting release process");
 * logger.debug("This won't show with INFO level");
 * logger.error("Release failed", new Error("Git push failed"));
 * ```
 *
 * @example Security audit logging
 * ```typescript
 * const logger = new Logger();
 * logger.audit("USER_LOGIN", {
 *   userId: "user123",
 *   ipAddress: "192.168.1.1",
 *   timestamp: new Date()
 * });
 * ```
 *
 * @example i18n-enabled logging
 * ```typescript
 * const logger = new Logger();
 * logger.infoI18n("cli.release.success", { version: "1.2.3" });
 * // Output: [INFO] Successfully released version 1.2.3
 * ```
 *
 * @since 1.0.0
 */

import { NagareError } from "./enhanced-error.ts";
import { getI18n, t } from "./i18n.ts";
import type { TranslationKey } from "../../locales/schema.ts";

/**
 * Helper to check if i18n is available.
 *
 * @returns {boolean} True if i18n system is initialized and available
 * @private
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
 * Log levels in order of severity.
 *
 * @enum {number}
 * @readonly
 * @since 1.0.0
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Logger class for structured logging in Nagare.
 *
 * @class Logger
 * @since 1.0.0
 *
 * @example Creating a logger with custom log level
 * ```typescript
 * import { Logger, LogLevel } from "./core/logger.ts";
 *
 * // Production logger (only INFO and above)
 * const prodLogger = new Logger(LogLevel.INFO);
 *
 * // Development logger (all messages)
 * const devLogger = new Logger(LogLevel.DEBUG);
 * ```
 */
export class Logger {
  private logLevel: LogLevel;

  constructor(logLevel: LogLevel = LogLevel.INFO) {
    this.logLevel = logLevel;
  }

  /**
   * Log debug information.
   *
   * @param {string} message - The debug message to log
   * @param {...unknown} args - Additional arguments to log
   * @returns {void}
   *
   * @example
   * ```typescript
   * logger.debug("Processing file", { path: "./version.ts", size: 1024 });
   * ```
   *
   * @since 1.0.0
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log general information.
   *
   * @param {string} message - The info message to log
   * @param {...unknown} args - Additional arguments to log
   * @returns {void}
   *
   * @example
   * ```typescript
   * logger.info("Release started", { version: "1.2.3" });
   * ```
   *
   * @since 1.0.0
   */
  info(message: string, ...args: unknown[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log warnings.
   *
   * @param {string} message - The warning message to log
   * @param {...unknown} args - Additional arguments to log
   * @returns {void}
   *
   * @example
   * ```typescript
   * logger.warn("Deprecated pattern detected", { pattern: "broad-pattern" });
   * ```
   *
   * @since 1.0.0
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  /**
   * Log errors with support for enhanced errors.
   *
   * @param {string} message - The error message to log
   * @param {Error | NagareError} [error] - Optional error object with stack trace
   * @returns {void}
   *
   * @example
   * ```typescript
   * try {
   *   await gitPush();
   * } catch (error) {
   *   logger.error("Git push failed", error);
   * }
   * ```
   *
   * @since 1.0.0
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
   * Generate a unique request ID for tracking operations.
   *
   * @returns {string} A unique request identifier
   *
   * @example
   * ```typescript
   * const requestId = logger.generateRequestId();
   * // Returns: "req_1234567890_abc123def"
   * ```
   *
   * @since 1.0.0
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log security audit event.
   *
   * Security audit events are always logged regardless of log level,
   * following OWASP logging guidelines.
   *
   * @param {string} action - The security action being audited
   * @param {Record<string, unknown>} details - Audit event details
   * @returns {void}
   *
   * @example
   * ```typescript
   * logger.audit("FILE_ACCESS", {
   *   user: "admin",
   *   file: "./config.ts",
   *   operation: "write",
   *   timestamp: new Date()
   * });
   * ```
   *
   * @since 1.0.0
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
   * Log a message with i18n support.
   *
   * Falls back to the key if i18n is not available.
   *
   * @param {LogLevel} level - The log level for this message
   * @param {string | TranslationKey} messageKeyOrString - Translation key or raw message
   * @param {Record<string, unknown>} [params] - Parameters for translation interpolation
   * @returns {void}
   *
   * @example
   * ```typescript
   * logger.log(LogLevel.INFO, "cli.release.success", { version: "1.2.3" });
   * ```
   *
   * @since 1.0.0
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
   * Log debug information with i18n support.
   *
   * @param {TranslationKey} key - Translation key for the message
   * @param {Record<string, unknown>} [params] - Parameters for translation interpolation
   * @returns {void}
   *
   * @example
   * ```typescript
   * logger.debugI18n("log.file.processing", { file: "version.ts" });
   * ```
   *
   * @since 1.0.0
   */
  debugI18n(key: TranslationKey, params?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, key, params);
  }

  /**
   * Log info with i18n support.
   *
   * @param {TranslationKey} key - Translation key for the message
   * @param {Record<string, unknown>} [params] - Parameters for translation interpolation
   * @returns {void}
   *
   * @example
   * ```typescript
   * logger.infoI18n("cli.release.success", { version: "1.2.3" });
   * ```
   *
   * @since 1.0.0
   */
  infoI18n(key: TranslationKey, params?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, key, params);
  }

  /**
   * Log warning with i18n support.
   *
   * @param {TranslationKey} key - Translation key for the message
   * @param {Record<string, unknown>} [params] - Parameters for translation interpolation
   * @returns {void}
   *
   * @example
   * ```typescript
   * logger.warnI18n("validation.pattern.dangerous", { pattern: ".*" });
   * ```
   *
   * @since 1.0.0
   */
  warnI18n(key: TranslationKey, params?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, key, params);
  }

  /**
   * Log error with i18n support.
   *
   * @param {TranslationKey} key - Translation key for the message
   * @param {Record<string, unknown>} [params] - Parameters for translation interpolation
   * @returns {void}
   *
   * @example
   * ```typescript
   * logger.errorI18n("error.git.push_failed", { remote: "origin" });
   * ```
   *
   * @since 1.0.0
   */
  errorI18n(key: TranslationKey, params?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, key, params);
  }

  /**
   * Check if a string could be a translation key.
   *
   * Simple heuristic: contains dots (e.g., "cli.release.success")
   *
   * @param {string} str - String to check
   * @returns {boolean} True if string appears to be a translation key
   * @private
   *
   * @since 1.0.0
   */
  private isTranslationKey(str: string): boolean {
    return str.includes(".");
  }
}
