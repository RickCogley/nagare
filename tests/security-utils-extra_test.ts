/**
 * Additional tests for security utility functions
 * Tests more validation and sanitization functions
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { createSecurityLog, sanitizeErrorMessage } from "../src/validation/security-utils.ts";

// Test createSecurityLog
Deno.test("createSecurityLog - creates structured log entry", () => {
  const log = createSecurityLog("user_login", {
    userId: "user123",
    timestamp: "2024-01-01T12:00:00Z",
  });

  assertStringIncludes(log, "[SECURITY]");
  assertStringIncludes(log, "Action: user_login");
  assertStringIncludes(log, '"userId": "user123"');
  assertStringIncludes(log, '"timestamp": "2024-01-01T12:00:00Z"');
});

Deno.test("createSecurityLog - includes timestamp", () => {
  const log = createSecurityLog("file_access", {
    path: "/etc/passwd",
  });

  assertStringIncludes(log, "[SECURITY]");
  assertStringIncludes(log, "T"); // ISO format timestamp
  assertStringIncludes(log, "Action: file_access");
});

Deno.test("createSecurityLog - handles empty details", () => {
  const log = createSecurityLog("system_check", {});

  assertStringIncludes(log, "[SECURITY]");
  assertStringIncludes(log, "Action: system_check");
  assertStringIncludes(log, "Details: {}");
});

// Test sanitizeErrorMessage
Deno.test("sanitizeErrorMessage - sanitizes deep paths", () => {
  const error = new Error("Failed to connect to /home/user/secret/file.txt");
  const result = sanitizeErrorMessage(error, false);

  assertStringIncludes(result, "/***/***/***/***");
  assertEquals(result.includes("/home/user/secret"), false);
});

Deno.test("sanitizeErrorMessage - excludes stack by default", () => {
  const error = new Error("Test error");
  const result = sanitizeErrorMessage(error, false);

  assertEquals(result, "Test error");
  assertEquals(result.includes("Stack trace:"), false);
});

Deno.test("sanitizeErrorMessage - includes stack when requested", () => {
  const error = new Error("Test error");
  const result = sanitizeErrorMessage(error, true);

  assertStringIncludes(result, "Test error");
  assertStringIncludes(result, "Stack trace:");
});

Deno.test("sanitizeErrorMessage - handles non-Error objects", () => {
  const result = sanitizeErrorMessage("string error", false);
  assertEquals(result, "An error occurred");
});

Deno.test("sanitizeErrorMessage - handles null", () => {
  const result = sanitizeErrorMessage(null, false);
  assertEquals(result, "An error occurred");
});

Deno.test("sanitizeErrorMessage - handles undefined", () => {
  const result = sanitizeErrorMessage(undefined, false);
  assertEquals(result, "An error occurred");
});

Deno.test("sanitizeErrorMessage - handles objects", () => {
  const result = sanitizeErrorMessage({ code: "ERROR_CODE", message: "Error" }, false);
  assertEquals(result, "An error occurred");
});

// Test sanitization of sensitive fields
Deno.test("createSecurityLog - sanitizes sensitive fields", () => {
  const log = createSecurityLog("auth_attempt", {
    username: "user123",
    password: "secret123",
    token: "abc-def-ghi",
    apiKey: "key123456",
  });

  assertStringIncludes(log, '"username": "user123"'); // Username not sensitive
  assertStringIncludes(log, '"password": "***"'); // Password sanitized
  assertStringIncludes(log, '"token": "***"'); // Token sanitized
  assertStringIncludes(log, '"apiKey": "***"'); // API key sanitized
});

Deno.test("createSecurityLog - formats details as JSON", () => {
  const log = createSecurityLog("test", {
    nested: {
      value: 123,
      array: [1, 2, 3],
    },
  });

  assertStringIncludes(log, "Details:");
  assertStringIncludes(log, '"nested":');
  assertStringIncludes(log, '"value": 123');
});
