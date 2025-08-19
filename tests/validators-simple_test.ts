/**
 * Simple unit tests for validator functions
 * Tests Result type utilities and validation functions
 */

import { assertEquals } from "@std/assert";
import { combineResults, err, isError, isSuccess, ok, validateReleaseType } from "../src/validation/validators.ts";

// Test Result utility functions
Deno.test("ok - creates success result", () => {
  const result = ok("test value");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "test value");
  }
});

Deno.test("err - creates error result", () => {
  const result = err("error message");
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.error, "error message");
  }
});

Deno.test("isSuccess - identifies success results", () => {
  const success = ok("value");
  const failure = err("error");

  assertEquals(isSuccess(success), true);
  assertEquals(isSuccess(failure), false);
});

Deno.test("isError - identifies error results", () => {
  const success = ok("value");
  const failure = err("error");

  assertEquals(isError(success), false);
  assertEquals(isError(failure), true);
});

Deno.test("combineResults - combines all successes", () => {
  const results = [
    ok("value1"),
    ok("value2"),
    ok("value3"),
  ];

  const combined = combineResults(results);
  assertEquals(combined.success, true);
  if (combined.success) {
    assertEquals(combined.data, ["value1", "value2", "value3"]);
  }
});

Deno.test("combineResults - fails on first error", () => {
  const results = [
    ok("value1"),
    err("error message"),
    ok("value3"),
  ];

  const combined = combineResults(results);
  assertEquals(combined.success, false);
  if (!combined.success) {
    assertEquals(combined.error, "error message");
  }
});

// Test validateReleaseType
Deno.test("validateReleaseType - accepts valid types", () => {
  const result = validateReleaseType("patch");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "patch");
  }
});

Deno.test("validateReleaseType - accepts major", () => {
  const result = validateReleaseType("major");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "major");
  }
});

Deno.test("validateReleaseType - accepts minor", () => {
  const result = validateReleaseType("minor");
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, "minor");
  }
});

Deno.test("validateReleaseType - rejects invalid type", () => {
  const result = validateReleaseType("invalid");
  assertEquals(result.success, false);
});

Deno.test("validateReleaseType - rejects non-string", () => {
  const result = validateReleaseType(123);
  assertEquals(result.success, false);
});

Deno.test("validateReleaseType - rejects null", () => {
  const result = validateReleaseType(null);
  assertEquals(result.success, false);
});

Deno.test("validateReleaseType - rejects undefined", () => {
  const result = validateReleaseType(undefined);
  assertEquals(result.success, false);
});
