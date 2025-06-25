/**
 * @fileoverview Simple logging system for Nagare
 * Simplified version adapted from Salty's logger
 */

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
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
  debug(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log general information
   */
  info(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log warnings
   */
  warn(message: string, ...args: any[]): void {
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
}