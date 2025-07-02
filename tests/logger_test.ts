/**
 * @fileoverview Comprehensive tests for the Logger module
 * @description Tests all logging functionality including level filtering, formatting, and security audit
 *
 * InfoSec: Tests include security audit logging verification to ensure proper security event tracking
 */

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { assertSpyCalls, spy } from "https://deno.land/std@0.208.0/testing/mock.ts";
import { Logger, LogLevel } from "../src/logger.ts";
import { NagareError } from "../src/enhanced-error.ts";

Deno.test("Logger - Log level filtering", async (t) => {
  await t.step("should respect DEBUG log level", () => {
    const logger = new Logger(LogLevel.DEBUG);
    const consoleSpy = spy(console, "log");
    const warnSpy = spy(console, "warn");
    const errorSpy = spy(console, "error");

    try {
      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warn message");
      logger.error("error message");

      // All methods should be called when log level is DEBUG
      assertSpyCalls(consoleSpy, 2); // debug + info
      assertSpyCalls(warnSpy, 1);
      assertSpyCalls(errorSpy, 1);
    } finally {
      consoleSpy.restore();
      warnSpy.restore();
      errorSpy.restore();
    }
  });

  await t.step("should respect INFO log level", () => {
    const logger = new Logger(LogLevel.INFO);
    const consoleSpy = spy(console, "log");
    const warnSpy = spy(console, "warn");
    const errorSpy = spy(console, "error");

    try {
      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warn message");
      logger.error("error message");

      // Debug should be filtered out
      assertSpyCalls(consoleSpy, 1); // only info
      assertSpyCalls(warnSpy, 1);
      assertSpyCalls(errorSpy, 1);
    } finally {
      consoleSpy.restore();
      warnSpy.restore();
      errorSpy.restore();
    }
  });

  await t.step("should respect WARN log level", () => {
    const logger = new Logger(LogLevel.WARN);
    const consoleSpy = spy(console, "log");
    const warnSpy = spy(console, "warn");
    const errorSpy = spy(console, "error");

    try {
      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warn message");
      logger.error("error message");

      // Debug and info should be filtered out
      assertSpyCalls(consoleSpy, 0);
      assertSpyCalls(warnSpy, 1);
      assertSpyCalls(errorSpy, 1);
    } finally {
      consoleSpy.restore();
      warnSpy.restore();
      errorSpy.restore();
    }
  });

  await t.step("should respect ERROR log level", () => {
    const logger = new Logger(LogLevel.ERROR);
    const consoleSpy = spy(console, "log");
    const warnSpy = spy(console, "warn");
    const errorSpy = spy(console, "error");

    try {
      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warn message");
      logger.error("error message");

      // Only error should be logged
      assertSpyCalls(consoleSpy, 0);
      assertSpyCalls(warnSpy, 0);
      assertSpyCalls(errorSpy, 1);
    } finally {
      consoleSpy.restore();
      warnSpy.restore();
      errorSpy.restore();
    }
  });
});

Deno.test("Logger - Message formatting", async (t) => {
  await t.step("should format debug messages correctly", () => {
    const logger = new Logger(LogLevel.DEBUG);
    const consoleSpy = spy(console, "log");

    try {
      logger.debug("test debug message");

      assertSpyCalls(consoleSpy, 1);
      assertEquals(consoleSpy.calls[0].args[0], "[DEBUG] test debug message");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should format info messages correctly", () => {
    const logger = new Logger(LogLevel.INFO);
    const consoleSpy = spy(console, "log");

    try {
      logger.info("test info message");

      assertSpyCalls(consoleSpy, 1);
      assertEquals(consoleSpy.calls[0].args[0], "[INFO] test info message");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should format warn messages correctly", () => {
    const logger = new Logger(LogLevel.WARN);
    const warnSpy = spy(console, "warn");

    try {
      logger.warn("test warn message");

      assertSpyCalls(warnSpy, 1);
      assertEquals(warnSpy.calls[0].args[0], "[WARN] test warn message");
    } finally {
      warnSpy.restore();
    }
  });

  await t.step("should handle additional arguments", () => {
    const logger = new Logger(LogLevel.DEBUG);
    const consoleSpy = spy(console, "log");

    try {
      const obj = { key: "value" };
      const arr = [1, 2, 3];
      logger.debug("message with args", obj, arr);

      assertSpyCalls(consoleSpy, 1);
      assertEquals(consoleSpy.calls[0].args[0], "[DEBUG] message with args");
      assertEquals(consoleSpy.calls[0].args[1], obj);
      assertEquals(consoleSpy.calls[0].args[2], arr);
    } finally {
      consoleSpy.restore();
    }
  });
});

Deno.test("Logger - Error handling", async (t) => {
  await t.step("should format regular error messages", () => {
    const logger = new Logger(LogLevel.ERROR);
    const errorSpy = spy(console, "error");

    try {
      const error = new Error("Standard error");
      logger.error("Error occurred", error);

      assertSpyCalls(errorSpy, 1);
      assertEquals(errorSpy.calls[0].args[0], "[ERROR] Error occurred");
      assertEquals(errorSpy.calls[0].args[1], error);
    } finally {
      errorSpy.restore();
    }
  });

  await t.step("should handle NagareError with custom formatting", () => {
    const logger = new Logger(LogLevel.ERROR);
    const errorSpy = spy(console, "error");

    try {
      const nagareError = new NagareError(
        "Custom error message",
        "TEST_ERROR",
        ["Fix suggestion 1", "Fix suggestion 2"],
        { detail: "some detail" },
      );

      logger.error("Nagare error occurred", nagareError);

      assertSpyCalls(errorSpy, 1);
      // NagareError uses toString() which includes emojis and formatting
      const output = errorSpy.calls[0].args[0];
      assertStringIncludes(output, "❌ Custom error message");
      assertStringIncludes(output, "💡 To fix this:");
    } finally {
      errorSpy.restore();
    }
  });

  await t.step("should handle error message without error object", () => {
    const logger = new Logger(LogLevel.ERROR);
    const errorSpy = spy(console, "error");

    try {
      logger.error("Just an error message");

      assertSpyCalls(errorSpy, 1);
      assertEquals(errorSpy.calls[0].args[0], "[ERROR] Just an error message");
      assertEquals(errorSpy.calls[0].args[1], undefined);
    } finally {
      errorSpy.restore();
    }
  });
});

Deno.test("Logger - Security audit functionality", async (t) => {
  await t.step("should always log security audit events regardless of log level", () => {
    const logger = new Logger(LogLevel.ERROR); // Even at ERROR level
    const consoleSpy = spy(console, "log");

    try {
      logger.audit("FILE_UPDATE", { file: "version.ts", oldValue: "1.0.0", newValue: "1.0.1" });

      assertSpyCalls(consoleSpy, 1);
      const loggedMessage = consoleSpy.calls[0].args[0];
      assertStringIncludes(loggedMessage, "[SECURITY AUDIT]");

      // Parse the JSON to verify structure
      const jsonPart = loggedMessage.replace("[SECURITY AUDIT] ", "");
      const auditEntry = JSON.parse(jsonPart);

      assertEquals(auditEntry.action, "FILE_UPDATE");
      assertEquals(auditEntry.details.file, "version.ts");
      assertEquals(auditEntry.details.oldValue, "1.0.0");
      assertEquals(auditEntry.details.newValue, "1.0.1");
      assertStringIncludes(auditEntry.requestId, "req_");
      assertEquals(typeof auditEntry.timestamp, "string");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should generate unique request IDs", () => {
    const logger = new Logger();
    const requestIds = new Set<string>();

    // Generate multiple request IDs
    for (let i = 0; i < 100; i++) {
      const id = logger.generateRequestId();
      assertStringIncludes(id, "req_");
      requestIds.add(id);
    }

    // All IDs should be unique
    assertEquals(requestIds.size, 100);
  });

  await t.step("should handle complex audit details", () => {
    const logger = new Logger();
    const consoleSpy = spy(console, "log");

    try {
      const complexDetails = {
        user: "test-user",
        operation: {
          type: "release",
          version: "2.0.0",
          files: ["deno.json", "version.ts", "README.md"],
        },
        environment: {
          os: "darwin",
          deno: "1.40.0",
        },
      };

      logger.audit("RELEASE_OPERATION", complexDetails);

      assertSpyCalls(consoleSpy, 1);
      const loggedMessage = consoleSpy.calls[0].args[0];
      const jsonPart = loggedMessage.replace("[SECURITY AUDIT] ", "");
      const auditEntry = JSON.parse(jsonPart);

      assertEquals(auditEntry.details, complexDetails);
    } finally {
      consoleSpy.restore();
    }
  });
});

Deno.test("Logger - Edge cases", async (t) => {
  await t.step("should handle undefined and null messages gracefully", () => {
    const logger = new Logger(LogLevel.DEBUG);
    const consoleSpy = spy(console, "log");
    const warnSpy = spy(console, "warn");
    const errorSpy = spy(console, "error");

    try {
      // TypeScript will complain about these, but we want to test runtime behavior
      // @ts-ignore - Testing edge case
      logger.debug(undefined);
      // @ts-ignore - Testing edge case
      logger.info(null);
      // @ts-ignore - Testing edge case
      logger.warn(null);
      // @ts-ignore - Testing edge case
      logger.error(undefined);

      assertSpyCalls(consoleSpy, 2);
      assertSpyCalls(warnSpy, 1);
      assertSpyCalls(errorSpy, 1);

      assertEquals(consoleSpy.calls[0].args[0], "[DEBUG] undefined");
      assertEquals(consoleSpy.calls[1].args[0], "[INFO] null");
      assertEquals(warnSpy.calls[0].args[0], "[WARN] null");
      assertEquals(errorSpy.calls[0].args[0], "[ERROR] undefined");
    } finally {
      consoleSpy.restore();
      warnSpy.restore();
      errorSpy.restore();
    }
  });

  await t.step("should handle empty strings", () => {
    const logger = new Logger(LogLevel.INFO);
    const consoleSpy = spy(console, "log");

    try {
      logger.info("");

      assertSpyCalls(consoleSpy, 1);
      assertEquals(consoleSpy.calls[0].args[0], "[INFO] ");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should handle very long messages", () => {
    const logger = new Logger(LogLevel.INFO);
    const consoleSpy = spy(console, "log");

    try {
      const longMessage = "a".repeat(10000);
      logger.info(longMessage);

      assertSpyCalls(consoleSpy, 1);
      assertEquals(consoleSpy.calls[0].args[0], `[INFO] ${longMessage}`);
    } finally {
      consoleSpy.restore();
    }
  });
});

Deno.test("Logger - Default log level", async (t) => {
  await t.step("should default to INFO level", () => {
    const logger = new Logger(); // No log level specified
    const consoleSpy = spy(console, "log");

    try {
      logger.debug("debug message");
      logger.info("info message");

      // Debug should be filtered out, info should be logged
      assertSpyCalls(consoleSpy, 1);
      assertEquals(consoleSpy.calls[0].args[0], "[INFO] info message");
    } finally {
      consoleSpy.restore();
    }
  });
});

Deno.test("Logger - Request ID generation", async (t) => {
  await t.step("should generate valid request ID format", () => {
    const logger = new Logger();
    const requestId = logger.generateRequestId();

    // Should start with req_
    assertStringIncludes(requestId, "req_");

    // Should have format: req_<timestamp>_<random>
    const parts = requestId.split("_");
    assertEquals(parts.length, 3);
    assertEquals(parts[0], "req");

    // Timestamp should be a valid number
    const timestamp = parseInt(parts[1]);
    assertEquals(typeof timestamp, "number");
    assertEquals(timestamp > 0, true);

    // Random part should be alphanumeric
    const randomPart = parts[2];
    assertEquals(/^[a-z0-9]+$/.test(randomPart), true);
  });
});
