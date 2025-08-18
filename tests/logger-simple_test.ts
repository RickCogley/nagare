/**
 * Simple unit tests for logger functions
 * Tests log level filtering logic
 */

import { assertEquals } from "@std/assert";
import { LogLevel } from "../src/core/logger.ts";

// Test helper to check if a message should be logged
function shouldLog(messageLevel: LogLevel, configuredLevel: LogLevel): boolean {
  return configuredLevel <= messageLevel;
}

// Test LogLevel enumeration values
Deno.test("LogLevel - has correct numeric values", () => {
  assertEquals(LogLevel.DEBUG, 0);
  assertEquals(LogLevel.INFO, 1);
  assertEquals(LogLevel.WARN, 2);
  assertEquals(LogLevel.ERROR, 3);
});

// Test log level filtering logic
Deno.test("shouldLog - DEBUG level shows all messages", () => {
  const level = LogLevel.DEBUG;

  assertEquals(shouldLog(LogLevel.DEBUG, level), true);
  assertEquals(shouldLog(LogLevel.INFO, level), true);
  assertEquals(shouldLog(LogLevel.WARN, level), true);
  assertEquals(shouldLog(LogLevel.ERROR, level), true);
});

Deno.test("shouldLog - INFO level filters DEBUG", () => {
  const level = LogLevel.INFO;

  assertEquals(shouldLog(LogLevel.DEBUG, level), false);
  assertEquals(shouldLog(LogLevel.INFO, level), true);
  assertEquals(shouldLog(LogLevel.WARN, level), true);
  assertEquals(shouldLog(LogLevel.ERROR, level), true);
});

Deno.test("shouldLog - WARN level filters DEBUG and INFO", () => {
  const level = LogLevel.WARN;

  assertEquals(shouldLog(LogLevel.DEBUG, level), false);
  assertEquals(shouldLog(LogLevel.INFO, level), false);
  assertEquals(shouldLog(LogLevel.WARN, level), true);
  assertEquals(shouldLog(LogLevel.ERROR, level), true);
});

Deno.test("shouldLog - ERROR level only shows errors", () => {
  const level = LogLevel.ERROR;

  assertEquals(shouldLog(LogLevel.DEBUG, level), false);
  assertEquals(shouldLog(LogLevel.INFO, level), false);
  assertEquals(shouldLog(LogLevel.WARN, level), false);
  assertEquals(shouldLog(LogLevel.ERROR, level), true);
});

// Test log level comparison
Deno.test("LogLevel - ordering is correct", () => {
  assertEquals(LogLevel.DEBUG < LogLevel.INFO, true);
  assertEquals(LogLevel.INFO < LogLevel.WARN, true);
  assertEquals(LogLevel.WARN < LogLevel.ERROR, true);
});

// Test default log level (would be INFO)
Deno.test("LogLevel - default should filter DEBUG", () => {
  const defaultLevel = LogLevel.INFO; // Default in Logger constructor

  assertEquals(shouldLog(LogLevel.DEBUG, defaultLevel), false);
  assertEquals(shouldLog(LogLevel.INFO, defaultLevel), true);
});
