/**
 * @fileoverview Basic integration tests for Nagare library
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { VERSION } from "../version.ts";
import { DEFAULT_COMMIT_TYPES } from "../config.ts";
import { BumpType, TemplateFormat } from "../types.ts";

Deno.test("Version should be available and valid", () => {
  assertExists(VERSION);
  assertEquals(typeof VERSION, "string");

  // Test semver format
  const versionRegex = /^\d+\.\d+\.\d+$/;
  assertEquals(versionRegex.test(VERSION), true);
});

Deno.test("Default commit types should be properly configured", () => {
  assertExists(DEFAULT_COMMIT_TYPES);
  assertEquals(DEFAULT_COMMIT_TYPES.feat, "added");
  assertEquals(DEFAULT_COMMIT_TYPES.fix, "fixed");
  assertEquals(DEFAULT_COMMIT_TYPES.security, "security");
});

Deno.test("BumpType enum should have expected values", () => {
  assertEquals(BumpType.MAJOR, "major");
  assertEquals(BumpType.MINOR, "minor");
  assertEquals(BumpType.PATCH, "patch");
});

Deno.test("TemplateFormat enum should have expected values", () => {
  assertEquals(TemplateFormat.TYPESCRIPT, "typescript");
  assertEquals(TemplateFormat.JSON, "json");
  assertEquals(TemplateFormat.YAML, "yaml");
  assertEquals(TemplateFormat.CUSTOM, "custom");
});

Deno.test("Main library exports should be available", async () => {
  // Test that we can import the main library exports
  const { ReleaseManager, GitOperations } = await import("../mod.ts");

  assertExists(ReleaseManager);
  assertExists(GitOperations);
  assertEquals(typeof ReleaseManager, "function");
  assertEquals(typeof GitOperations, "function");
});

Deno.test("Configuration defaults should be properly structured", () => {
  assertExists(DEFAULT_COMMIT_TYPES);
  assertEquals(typeof DEFAULT_COMMIT_TYPES, "object");

  // Verify some key mappings
  const expectedMappings = {
    feat: "added",
    fix: "fixed",
    docs: "changed",
    security: "security",
  };

  for (const [key, value] of Object.entries(expectedMappings)) {
    assertEquals(DEFAULT_COMMIT_TYPES[key], value);
  }
});
