/**
 * Simple unit tests for version utility functions
 * Focus on the parseVersion pure function that doesn't need dependencies
 */

import { assertEquals } from "@std/assert";
import { VersionUtils } from "../src/release/version-utils.ts";
import { BumpType } from "../types.ts";

// Create minimal mock objects to instantiate VersionUtils
const mockConfig = {} as any;
const mockGit = {} as any;

Deno.test("parseVersion - parses simple version", () => {
  const utils = new VersionUtils(mockConfig, mockGit);
  const result = utils.parseVersion("1.2.3");

  assertEquals(result.major, 1);
  assertEquals(result.minor, 2);
  assertEquals(result.patch, 3);
  assertEquals(result.prerelease, null);
});

Deno.test("parseVersion - parses version with v prefix", () => {
  const utils = new VersionUtils(mockConfig, mockGit);
  const result = utils.parseVersion("v2.5.8");

  assertEquals(result.major, 2);
  assertEquals(result.minor, 5);
  assertEquals(result.patch, 8);
  assertEquals(result.prerelease, null);
});

Deno.test("parseVersion - parses version with prerelease", () => {
  const utils = new VersionUtils(mockConfig, mockGit);
  const result = utils.parseVersion("1.0.0-alpha.1");

  assertEquals(result.major, 1);
  assertEquals(result.minor, 0);
  assertEquals(result.patch, 0);
  assertEquals(result.prerelease, "alpha.1");
});

Deno.test("parseVersion - handles zero version", () => {
  const utils = new VersionUtils(mockConfig, mockGit);
  const result = utils.parseVersion("0.0.0");

  assertEquals(result.major, 0);
  assertEquals(result.minor, 0);
  assertEquals(result.patch, 0);
  assertEquals(result.prerelease, null);
});

// Test calculateNewVersion with simple mock commits
Deno.test("calculateNewVersion - patch bump for fixes", () => {
  const utils = new VersionUtils(mockConfig, mockGit);
  const commits = [
    { type: "fix", description: "Fix bug", breakingChange: false },
  ];

  const result = utils.calculateNewVersion("1.0.0", commits as any);
  assertEquals(result, "1.0.1");
});

Deno.test("calculateNewVersion - minor bump for features", () => {
  const utils = new VersionUtils(mockConfig, mockGit);
  const commits = [
    { type: "feat", description: "Add feature", breakingChange: false },
  ];

  const result = utils.calculateNewVersion("1.0.0", commits as any);
  assertEquals(result, "1.1.0");
});

Deno.test("calculateNewVersion - major bump for breaking changes", () => {
  const utils = new VersionUtils(mockConfig, mockGit);
  const commits = [
    { type: "feat", description: "Breaking change", breakingChange: true },
  ];

  const result = utils.calculateNewVersion("1.0.0", commits as any);
  assertEquals(result, "2.0.0");
});

Deno.test("calculateNewVersion - explicit patch bump", () => {
  const utils = new VersionUtils(mockConfig, mockGit);
  const commits = [
    { type: "docs", description: "Update docs", breakingChange: false },
  ];

  const result = utils.calculateNewVersion("1.2.3", commits as any, BumpType.PATCH);
  assertEquals(result, "1.2.4");
});

Deno.test("calculateNewVersion - explicit minor bump", () => {
  const utils = new VersionUtils(mockConfig, mockGit);
  const commits = [
    { type: "chore", description: "Update deps", breakingChange: false },
  ];

  const result = utils.calculateNewVersion("1.2.3", commits as any, BumpType.MINOR);
  assertEquals(result, "1.3.0");
});

Deno.test("calculateNewVersion - explicit major bump", () => {
  const utils = new VersionUtils(mockConfig, mockGit);
  const commits = [
    { type: "chore", description: "Update deps", breakingChange: false },
  ];

  const result = utils.calculateNewVersion("1.2.3", commits as any, BumpType.MAJOR);
  assertEquals(result, "2.0.0");
});
