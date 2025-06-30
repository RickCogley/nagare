/**
 * @fileoverview Simple logging system for Nagare with security audit support
 * Simplified version adapted from Salty's logger
 */

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
   * Log errors
   */
  error(message: string, error?: Error): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(`[ERROR] ${message}`, error);
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
}
