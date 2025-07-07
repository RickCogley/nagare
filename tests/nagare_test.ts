/**
 * @fileoverview Comprehensive integration tests for Nagare library
 * @module tests
 *
 * @description
 * Tests core functionality including the new file handler system (v1.1.0)
 */

import { assertEquals, assertExists, assertInstanceOf, assertThrows } from "@std/assert";
import { VERSION } from "../version.ts";
import { DEFAULT_COMMIT_TYPES } from "../config.ts";
import { BumpType, LogLevel, TemplateFormat } from "../types.ts";
import type { NagareConfig } from "../types.ts";

// ============================================
// Basic Library Tests (Existing)
// ============================================

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

// ============================================
// File Handler Tests (New in v1.1.0)
// ============================================

Deno.test("FileHandlerManager should be exported and functional", async () => {
  const { FileHandlerManager, BUILT_IN_HANDLERS } = await import("../mod.ts");

  assertExists(FileHandlerManager);
  assertExists(BUILT_IN_HANDLERS);
  assertEquals(typeof FileHandlerManager, "function");

  // Test instantiation
  const manager = new FileHandlerManager();
  assertInstanceOf(manager, FileHandlerManager);
});

Deno.test("Built-in handlers should detect appropriate files", async () => {
  const { FileHandlerManager } = await import("../mod.ts");
  const manager = new FileHandlerManager();

  // Test file detection
  const testCases = [
    { path: "./deno.json", expectedHandler: "Deno Configuration" },
    { path: "./deno.jsonc", expectedHandler: "Deno Configuration" },
    { path: "./package.json", expectedHandler: "NPM Package Configuration" },
    { path: "./jsr.json", expectedHandler: "JSR Configuration" },
    { path: "./README.md", expectedHandler: "Markdown Documentation" },
    { path: "./CHANGELOG.md", expectedHandler: "Markdown Documentation" },
    { path: "./cargo.toml", expectedHandler: "Rust Cargo Configuration" },
    { path: "./pyproject.toml", expectedHandler: "Python Project Configuration" },
    { path: "./config.yaml", expectedHandler: "YAML Configuration" },
    { path: "./settings.yml", expectedHandler: "YAML Configuration" },
  ];

  for (const { path, expectedHandler } of testCases) {
    const handler = manager.getHandler(path);
    assertExists(handler, `No handler found for ${path}`);
    assertEquals(handler.name, expectedHandler);
  }

  // Test non-matching file
  const noHandler = manager.getHandler("./unknown.xyz");
  assertEquals(noHandler, undefined);
});

Deno.test("PatternBuilder should create safe patterns", async () => {
  const { PatternBuilder } = await import("../mod.ts");

  // Test JSON pattern
  const jsonPattern = PatternBuilder.jsonVersion(true);
  assertEquals(jsonPattern.source, '^(\\s*)"version":\\s*"([^"]+)"');
  assertEquals(jsonPattern.flags, "m");

  // Test YAML patterns
  const yamlBoth = PatternBuilder.yamlVersion("both");
  assertEquals(yamlBoth.test('version: "1.2.3"'), true);
  assertEquals(yamlBoth.test("version: '1.2.3'"), true);
  assertEquals(yamlBoth.test("version: 1.2.3"), true);

  // Test TypeScript const pattern
  const tsPattern = PatternBuilder.tsConst("VERSION", true);
  assertEquals(tsPattern.test('export const VERSION = "1.2.3"'), true);
  assertEquals(tsPattern.test('const VERSION = "1.2.3"'), false); // Should not match without export

  // Test version badge patterns
  const badgePattern = PatternBuilder.versionBadge("shields.io");
  assertEquals(badgePattern.test("shields.io/badge/version-1.2.3-blue"), true);
});

Deno.test("FileHandlerManager preview should work", async () => {
  const { FileHandlerManager } = await import("../mod.ts");
  const manager = new FileHandlerManager();

  // Create a temporary test file with exact name "package.json"
  const testContent = `{
  "name": "@rick/nagare",
  "version": "1.0.0",
  "exports": "./mod.ts"
}`;

  const tempDir = await Deno.makeTempDir();
  const tempFile = `${tempDir}/package.json`;
  await Deno.writeTextFile(tempFile, testContent);

  try {
    // Preview changes
    const preview = await manager.previewChanges(tempFile, "version", "2.0.0");

    assertExists(preview);
    assertEquals(preview.error, undefined);
    assertEquals(preview.matches.length, 1);
    assertEquals(preview.matches[0].line, 3);
    assertEquals(preview.matches[0].original.includes('"1.0.0"'), true);
    assertEquals(preview.matches[0].updated.includes('"2.0.0"'), true);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("FileHandlerManager updateFile should validate JSON", async () => {
  const { FileHandlerManager } = await import("../mod.ts");
  const manager = new FileHandlerManager();

  // Test with valid JSON
  const validJson = `{
  "name": "test",
  "version": "1.0.0"
}`;

  const tempDir = await Deno.makeTempDir();
  const tempFile = `${tempDir}/package.json`;
  await Deno.writeTextFile(tempFile, validJson);

  try {
    const result = await manager.updateFile(tempFile, "version", "2.0.0");

    assertEquals(result.success, true);
    assertExists(result.content);
    assertEquals(result.error, undefined);

    // Verify the content is valid JSON
    const parsed = JSON.parse(result.content!);
    assertEquals(parsed.version, "2.0.0");
    assertEquals(parsed.name, "test");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

// ============================================
// ReleaseManager Integration Tests
// ============================================

Deno.test("ReleaseManager should validate configuration", async () => {
  const { ReleaseManager } = await import("../mod.ts");

  // Test invalid config
  const invalidConfig = {} as NagareConfig;
  const validation = ReleaseManager.validateConfig(invalidConfig);

  assertEquals(validation.valid, false);
  assertEquals(validation.errors.length > 0, true);
  assertEquals(validation.errors.includes("project.name is required"), true);

  // Test valid config
  const validConfig: NagareConfig = {
    project: {
      name: "Test Project",
      repository: "https://github.com/test/project",
    },
    versionFile: {
      path: "./version.ts",
      template: TemplateFormat.TYPESCRIPT,
    },
  };

  const validValidation = ReleaseManager.validateConfig(validConfig);
  assertEquals(validValidation.valid, true);
  assertEquals(validValidation.errors.length, 0);
});

Deno.test("ReleaseManager should suggest file handlers", async () => {
  const { ReleaseManager } = await import("../mod.ts");

  // Create a test configuration with files that have handlers
  const config: NagareConfig = {
    project: {
      name: "Test Project",
      repository: "https://github.com/test/project",
    },
    versionFile: {
      path: "./version.ts",
      template: TemplateFormat.TYPESCRIPT,
    },
    updateFiles: [
      { path: "./deno.json" },
      { path: "./package.json" },
      { path: "./README.md" },
    ],
    options: {
      logLevel: LogLevel.DEBUG,
    },
  };

  // This test would need to capture logger output to verify suggestions
  // For now, just verify the manager can be created with this config
  const manager = new ReleaseManager(config);
  assertExists(manager);

  // Verify configuration was merged with defaults
  const mergedConfig = manager.getConfig();
  assertExists(mergedConfig.commitTypes);
  assertEquals(mergedConfig.commitTypes!.feat, "added");
});

// ============================================
// Configuration Tests
// ============================================

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

// ============================================
// Custom Handler Registration Tests
// ============================================

Deno.test("FileHandlerManager should support custom handlers", async () => {
  const { FileHandlerManager } = await import("../mod.ts");
  const manager = new FileHandlerManager();

  // Define a custom handler
  const customHandler = {
    id: "custom-config",
    name: "Custom Configuration",
    detector: (path: string) => path.endsWith(".custom"),
    patterns: {
      version: /^version=(.+)$/m,
    },
  };

  // Register the handler
  manager.registerHandler(customHandler);

  // Test detection
  const handler = manager.getHandler("./config.custom");
  assertExists(handler);
  assertEquals(handler.name, "Custom Configuration");

  // Test duplicate registration throws
  assertThrows(
    () => {
      manager.registerHandler(customHandler);
    },
    Error,
  );
});

// ============================================
// Error Handling Tests
// ============================================

Deno.test("FileHandlerManager should handle missing files gracefully", async () => {
  const { FileHandlerManager } = await import("../mod.ts");
  const manager = new FileHandlerManager();

  // Use a file path without a handler first
  const noHandlerResult = await manager.updateFile("./unknown.xyz", "version", "1.0.0");

  assertEquals(noHandlerResult.success, false);
  assertExists(noHandlerResult.error);
  assertEquals(noHandlerResult.error.includes("No handler found"), true);

  // Now test with a real missing file that has a handler
  const missingFileResult = await manager.updateFile(
    "./non-existent-package.json",
    "version",
    "1.0.0",
  );

  assertEquals(missingFileResult.success, false);
  assertExists(missingFileResult.error);
  assertEquals(missingFileResult.error.includes("Failed to update file"), true);
});

Deno.test("FileHandlerManager should handle invalid patterns gracefully", async () => {
  const { FileHandlerManager } = await import("../mod.ts");
  const manager = new FileHandlerManager();

  const tempDir = await Deno.makeTempDir();
  const tempFile = `${tempDir}/package.json`;
  await Deno.writeTextFile(tempFile, '{"name": "test"}');

  try {
    const result = await manager.updateFile(tempFile, "nonexistent", "1.0.0");

    assertEquals(result.success, false);
    assertExists(result.error);
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
