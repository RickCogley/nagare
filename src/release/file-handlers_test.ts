/**
 * @fileoverview Unit tests for file-handlers module
 * @module file-handlers_test
 * @description Comprehensive test suite for intelligent file handlers
 */

import { assertEquals, assertExists, assertNotEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { assertSpyCall, assertSpyCalls, spy } from "https://deno.land/std@0.208.0/testing/mock.ts";

import { BUILT_IN_HANDLERS, FileHandler, FileHandlerManager, PatternBuilder } from "./file-handlers.ts";

// =============================================================================
// Test Fixtures
// =============================================================================

const SAMPLE_DENO_JSON = `{
  "name": "@rick/nagare",
  "version": "1.0.0",
  "exports": "./mod.ts",
  "tasks": {
    "dev": "deno run --watch main.ts"
  }
}`;

const SAMPLE_PACKAGE_JSON = `{
  "name": "my-package",
  "version": "2.3.4",
  "description": "Test package",
  "main": "index.js",
  "scripts": {
    "test": "jest"
  }
}`;

const SAMPLE_README_MD = `# My Project

![Version](https://shields.io/badge/version-1.5.0-blue)
![npm](https://img.shields.io/npm/v/my-package)

## Installation

\`\`\`bash
npm install my-package@1.5.0
yarn add my-package@1.5.0
deno add my-package@1.5.0
\`\`\`

## Version

Current version: 1.5.0

### Release v1.5.0`;

const SAMPLE_YAML = `name: My Config
version: "3.2.1"
appVersion: '3.2.1'
description: Test YAML file`;

const SAMPLE_TYPESCRIPT = `export const VERSION = "4.5.6";
export const BUILD_DATE = "2024-01-01";
export default "4.5.6";`;

// =============================================================================
// FileHandlerManager Tests
// =============================================================================

Deno.test("FileHandlerManager - initialization", () => {
  const manager = new FileHandlerManager();
  const handlerIds = manager.getAllHandlerIds();

  // Should have all built-in handlers
  assertExists(handlerIds);
  assertEquals(handlerIds.length > 0, true);
  assertEquals(handlerIds.includes("deno.json"), true);
  assertEquals(handlerIds.includes("package.json"), true);
  assertEquals(handlerIds.includes("markdown"), true);
});

Deno.test("FileHandlerManager - getHandler for known files", () => {
  const manager = new FileHandlerManager();

  // Test exact matches
  const denoHandler = manager.getHandler("./deno.json");
  assertExists(denoHandler);
  assertEquals(denoHandler.id, "deno.json");

  const packageHandler = manager.getHandler("./package.json");
  assertExists(packageHandler);
  assertEquals(packageHandler.id, "package.json");

  // Test path variations
  const nestedDeno = manager.getHandler("src/config/deno.json");
  assertExists(nestedDeno);
  assertEquals(nestedDeno.id, "deno.json");

  // Test .jsonc support
  const denoJsonc = manager.getHandler("./deno.jsonc");
  assertExists(denoJsonc);
  assertEquals(denoJsonc.id, "deno.json");
});

Deno.test("FileHandlerManager - getHandler for markdown files", () => {
  const manager = new FileHandlerManager();

  const readmeHandler = manager.getHandler("./README.md");
  assertExists(readmeHandler);
  assertEquals(readmeHandler.id, "markdown");

  const changelogHandler = manager.getHandler("./CHANGELOG.md");
  assertExists(changelogHandler);
  assertEquals(changelogHandler.id, "markdown");

  const markdownExt = manager.getHandler("docs/guide.markdown");
  assertExists(markdownExt);
  assertEquals(markdownExt.id, "markdown");
});

Deno.test("FileHandlerManager - getHandler returns undefined for unknown files", () => {
  const manager = new FileHandlerManager();

  const unknownHandler = manager.getHandler("./unknown.xyz");
  assertEquals(unknownHandler, undefined);

  const noExtHandler = manager.getHandler("./Makefile");
  assertEquals(noExtHandler, undefined);
});

Deno.test("FileHandlerManager - hasHandler", () => {
  const manager = new FileHandlerManager();

  assertEquals(manager.hasHandler("./deno.json"), true);
  assertEquals(manager.hasHandler("./package.json"), true);
  assertEquals(manager.hasHandler("./README.md"), true);
  assertEquals(manager.hasHandler("./unknown.xyz"), false);
});

Deno.test("FileHandlerManager - registerHandler", () => {
  const manager = new FileHandlerManager();

  const customHandler: FileHandler = {
    id: "custom-config",
    name: "Custom Config",
    detector: (path) => path.endsWith(".custom"),
    patterns: {
      version: /version=(.+)/,
    },
  };

  manager.registerHandler(customHandler);

  const retrieved = manager.getHandler("./config.custom");
  assertExists(retrieved);
  assertEquals(retrieved.id, "custom-config");

  // Should be in handler list
  const handlerIds = manager.getAllHandlerIds();
  assertEquals(handlerIds.includes("custom-config"), true);
});

Deno.test("FileHandlerManager - registerHandler prevents duplicates", () => {
  const manager = new FileHandlerManager();

  const handler: FileHandler = {
    id: "test-handler",
    name: "Test",
    detector: () => true,
    patterns: {},
  };

  manager.registerHandler(handler);

  // Try to register again with same ID
  let errorThrown = false;
  try {
    manager.registerHandler(handler);
  } catch (error) {
    errorThrown = true;
    assertEquals(error.message.includes("already exists") || error.message.includes("configInvalid"), true);
  }

  assertEquals(errorThrown, true);
});

// =============================================================================
// File Update Tests with Mocking
// =============================================================================

Deno.test("FileHandlerManager - updateFile with deno.json", async () => {
  const manager = new FileHandlerManager();

  // Mock Deno.readTextFile
  const originalReadTextFile = Deno.readTextFile;
  Deno.readTextFile = async (path: string | URL) => {
    if (path.toString().includes("deno.json")) {
      return SAMPLE_DENO_JSON;
    }
    throw new Error("File not found");
  };

  try {
    const result = await manager.updateFile("./deno.json", "version", "2.0.0");

    assertEquals(result.success, true);
    assertExists(result.content);

    if (result.content) {
      // Check version was updated
      assertEquals(result.content.includes('"version": "2.0.0"'), true);
      // Check other content unchanged
      assertEquals(result.content.includes('"name": "@rick/nagare"'), true);

      // Validate JSON is still valid
      const parsed = JSON.parse(result.content);
      assertEquals(parsed.version, "2.0.0");
    }
  } finally {
    Deno.readTextFile = originalReadTextFile;
  }
});

Deno.test("FileHandlerManager - updateFile with package.json", async () => {
  const manager = new FileHandlerManager();

  const originalReadTextFile = Deno.readTextFile;
  Deno.readTextFile = async () => SAMPLE_PACKAGE_JSON;

  try {
    const result = await manager.updateFile("./package.json", "version", "3.0.0");

    assertEquals(result.success, true);
    assertExists(result.content);

    if (result.content) {
      const parsed = JSON.parse(result.content);
      assertEquals(parsed.version, "3.0.0");
      assertEquals(parsed.name, "my-package"); // Unchanged
    }
  } finally {
    Deno.readTextFile = originalReadTextFile;
  }
});

Deno.test("FileHandlerManager - updateFile with markdown", async () => {
  const manager = new FileHandlerManager();

  const originalReadTextFile = Deno.readTextFile;
  Deno.readTextFile = async () => SAMPLE_README_MD;

  try {
    // The markdown handler uses a replacer function
    const result = await manager.updateFile("./README.md", "version", "2.0.0");

    assertEquals(result.success, true);
    assertExists(result.content);

    if (result.content) {
      // Check badge was updated
      assertEquals(result.content.includes("badge/version-2.0.0-"), true);
      // Check version header was updated
      assertEquals(result.content.includes("Current version: 2.0.0"), true);
      // Check install commands were updated
      assertEquals(result.content.includes("npm install my-package@2.0.0"), true);
      assertEquals(result.content.includes("yarn add my-package@2.0.0"), true);
    }
  } finally {
    Deno.readTextFile = originalReadTextFile;
  }
});

Deno.test("FileHandlerManager - updateFile with custom function", async () => {
  const manager = new FileHandlerManager();

  const originalReadTextFile = Deno.readTextFile;
  Deno.readTextFile = async () => "original content";

  const customUpdateFn = spy((content: string, data: { version: string }) => {
    return `${content} - version ${data.version}`;
  });

  try {
    const result = await manager.updateFile(
      "./any-file.txt",
      "version",
      "1.0.0",
      customUpdateFn,
    );

    assertEquals(result.success, true);
    assertEquals(result.content, "original content - version 1.0.0");
    assertSpyCalls(customUpdateFn, 1);
  } finally {
    Deno.readTextFile = originalReadTextFile;
  }
});

Deno.test("FileHandlerManager - updateFile handles missing pattern", async () => {
  const manager = new FileHandlerManager();

  const originalReadTextFile = Deno.readTextFile;
  Deno.readTextFile = async () => SAMPLE_DENO_JSON;

  try {
    const result = await manager.updateFile("./deno.json", "nonexistent", "1.0.0");

    assertEquals(result.success, false);
    assertExists(result.error);
    assertEquals(result.error?.includes("No pattern defined"), true);
  } finally {
    Deno.readTextFile = originalReadTextFile;
  }
});

Deno.test("FileHandlerManager - updateFile handles no matches", async () => {
  const manager = new FileHandlerManager();

  const originalReadTextFile = Deno.readTextFile;
  Deno.readTextFile = async () => '{"name": "test"}'; // No version field

  try {
    const result = await manager.updateFile("./deno.json", "version", "1.0.0");

    assertEquals(result.success, false);
    assertExists(result.error);
    assertEquals(result.error?.includes("found no matches"), true);
  } finally {
    Deno.readTextFile = originalReadTextFile;
  }
});

// =============================================================================
// Security Tests
// =============================================================================

Deno.test("FileHandlerManager - prevents path traversal", async () => {
  const manager = new FileHandlerManager();

  const maliciousPaths = [
    "../../../etc/passwd",
    "./valid/../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
  ];

  for (const path of maliciousPaths) {
    const result = await manager.updateFile(path, "version", "1.0.0");
    assertEquals(result.success, false);
    assertExists(result.error);
    assertEquals(result.error?.includes("Invalid file path") || result.error?.includes("traversal"), true);
  }
});

Deno.test("FileHandlerManager - validates JSON after update", async () => {
  const manager = new FileHandlerManager();

  // Create a handler that produces invalid JSON
  const badHandler: FileHandler = {
    id: "bad-json",
    name: "Bad JSON Handler",
    detector: (path) => path.endsWith(".badjson"),
    patterns: {
      version: /("version":\s*")([^"]+)(")/,
    },
    replacer: () => '{"version": invalid json}', // Invalid JSON
  };

  manager.registerHandler(badHandler);

  const originalReadTextFile = Deno.readTextFile;
  Deno.readTextFile = async () => '{"version": "1.0.0"}';

  try {
    const result = await manager.updateFile("./test.badjson", "version", "2.0.0");

    // The deno.json handler has validation, but our bad handler doesn't
    // So this should succeed but produce invalid content
    assertEquals(result.success, true);
    assertEquals(result.content, '{"version": invalid json}');
  } finally {
    Deno.readTextFile = originalReadTextFile;
  }
});

// =============================================================================
// Preview Changes Tests
// =============================================================================

Deno.test("FileHandlerManager - previewChanges", async () => {
  const manager = new FileHandlerManager();

  const originalReadTextFile = Deno.readTextFile;
  Deno.readTextFile = async () => SAMPLE_DENO_JSON;

  try {
    const preview = await manager.previewChanges("./deno.json", "version", "5.0.0");

    assertExists(preview.matches);
    assertEquals(preview.matches.length, 1);

    const match = preview.matches[0];
    assertEquals(match.line, 3); // Line number where version appears
    assertEquals(match.original.includes('"version": "1.0.0"'), true);
    assertEquals(match.updated.includes('"version": "5.0.0"'), true);
  } finally {
    Deno.readTextFile = originalReadTextFile;
  }
});

Deno.test("FileHandlerManager - previewChanges with multiple matches", async () => {
  const manager = new FileHandlerManager();

  const multiVersionContent = `
# Version 1.0.0
npm install pkg@1.0.0
yarn add pkg@1.0.0
Current version: 1.0.0
`;

  const originalReadTextFile = Deno.readTextFile;
  Deno.readTextFile = async () => multiVersionContent;

  try {
    const preview = await manager.previewChanges("./README.md", "version", "2.0.0");

    assertExists(preview.matches);
    // Markdown replacer handles multiple patterns but preview shows line-by-line
    assertEquals(preview.matches.length > 0, true);
  } finally {
    Deno.readTextFile = originalReadTextFile;
  }
});

// =============================================================================
// Built-in Handler Tests
// =============================================================================

Deno.test("BUILT_IN_HANDLERS - deno.json handler", () => {
  const handler = BUILT_IN_HANDLERS["deno.json"];

  assertEquals(handler.detector("deno.json"), true);
  assertEquals(handler.detector("./deno.json"), true);
  assertEquals(handler.detector("deno.jsonc"), true);
  assertEquals(handler.detector("package.json"), false);

  // Test pattern
  const testContent = '  "version": "1.2.3",';
  const matches = testContent.match(handler.patterns.version);
  assertExists(matches);
  assertEquals(matches[2], "1.2.3");

  // Test validation
  if (handler.validate) {
    const validResult = handler.validate('{"version": "1.0.0"}');
    assertEquals(validResult.valid, true);

    const invalidResult = handler.validate('{"version": invalid}');
    assertEquals(invalidResult.valid, false);
    assertExists(invalidResult.error);
  }
});

Deno.test("BUILT_IN_HANDLERS - TypeScript handler", () => {
  const handler = BUILT_IN_HANDLERS["typescript-version"];

  assertEquals(handler.detector("version.ts"), true);
  assertEquals(handler.detector("src/constants.ts"), true);
  assertEquals(handler.detector("index.ts"), false); // No "version" in name

  // Test various patterns
  const patterns = handler.patterns;

  const constVersion = 'export const VERSION = "1.0.0";';
  assertEquals(patterns.constVersion.test(constVersion), true);

  const defaultExport = 'export default "2.0.0";';
  assertEquals(patterns.defaultExport.test(defaultExport), true);
});

Deno.test("BUILT_IN_HANDLERS - YAML handler", () => {
  const handler = BUILT_IN_HANDLERS["yaml"];

  assertEquals(handler.detector("config.yaml"), true);
  assertEquals(handler.detector("config.yml"), true);
  assertEquals(handler.detector("config.json"), false);

  // Test patterns with different quote styles
  const noQuotes = "version: 1.0.0";
  const singleQuotes = "version: '1.0.0'";
  const doubleQuotes = 'version: "1.0.0"';

  assertEquals(handler.patterns.version.test(noQuotes), true);
  assertEquals(handler.patterns.version.test(singleQuotes), true);
  assertEquals(handler.patterns.version.test(doubleQuotes), true);
});

// =============================================================================
// PatternBuilder Tests
// =============================================================================

Deno.test("PatternBuilder - jsonVersion", () => {
  const indentAware = PatternBuilder.jsonVersion(true);
  const notIndentAware = PatternBuilder.jsonVersion(false);

  const testJson = `{
  "version": "1.0.0",
  "nested": {
    "version": "2.0.0"
  }
}`;

  // Indent-aware should only match first version
  const indentMatches = testJson.match(new RegExp(indentAware.source, "gm"));
  assertExists(indentMatches);
  assertEquals(indentMatches.length, 1);
  assertEquals(indentMatches[0].includes("1.0.0"), true);

  // Non-indent-aware matches all versions
  const allMatches = testJson.match(new RegExp(notIndentAware.source, "g"));
  assertExists(allMatches);
  assertEquals(allMatches.length, 2);
});

Deno.test("PatternBuilder - yamlVersion", () => {
  const bothQuotes = PatternBuilder.yamlVersion("both");
  const singleOnly = PatternBuilder.yamlVersion("single");
  const doubleOnly = PatternBuilder.yamlVersion("double");
  const noQuotes = PatternBuilder.yamlVersion("none");

  assertEquals(bothQuotes.test("version: '1.0.0'"), true);
  assertEquals(bothQuotes.test('version: "1.0.0"'), true);
  assertEquals(bothQuotes.test("version: 1.0.0"), true);

  assertEquals(singleOnly.test("version: '1.0.0'"), true);
  assertEquals(singleOnly.test('version: "1.0.0"'), false);

  assertEquals(doubleOnly.test('version: "1.0.0"'), true);
  assertEquals(doubleOnly.test("version: '1.0.0'"), false);

  assertEquals(noQuotes.test("version: 1.0.0"), true);
  assertEquals(noQuotes.test("version: '1.0.0'"), false);
});

Deno.test("PatternBuilder - tsConst", () => {
  const exported = PatternBuilder.tsConst("VERSION", true);
  const notExported = PatternBuilder.tsConst("VERSION", false);

  assertEquals(exported.test('export const VERSION = "1.0.0"'), true);
  assertEquals(exported.test('const VERSION = "1.0.0"'), false);

  assertEquals(notExported.test('const VERSION = "1.0.0"'), true);
  assertEquals(notExported.test('export const VERSION = "1.0.0"'), false);

  // Test with single quotes
  assertEquals(exported.test("export const VERSION = '1.0.0'"), true);
});

Deno.test("PatternBuilder - versionBadge", () => {
  const shieldsOnly = PatternBuilder.versionBadge("shields.io");
  const imgShieldsOnly = PatternBuilder.versionBadge("img.shields.io");
  const anyBadge = PatternBuilder.versionBadge("any");

  const shieldsBadge = "https://shields.io/badge/version-1.0.0-blue";
  const imgShieldsBadge = "https://img.shields.io/badge/version-1.0.0-green";

  assertEquals(shieldsOnly.test(shieldsBadge), true);
  assertEquals(shieldsOnly.test(imgShieldsBadge), false);

  assertEquals(imgShieldsOnly.test(imgShieldsBadge), true);
  assertEquals(imgShieldsOnly.test(shieldsBadge), false);

  assertEquals(anyBadge.test(shieldsBadge), true);
  assertEquals(anyBadge.test(imgShieldsBadge), true);
});

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

Deno.test("FileHandlerManager - handles file read errors gracefully", async () => {
  const manager = new FileHandlerManager();

  const originalReadTextFile = Deno.readTextFile;
  Deno.readTextFile = async () => {
    throw new Error("Permission denied");
  };

  try {
    const result = await manager.updateFile("./deno.json", "version", "1.0.0");

    assertEquals(result.success, false);
    assertExists(result.error);
    assertEquals(result.error?.includes("Failed to update file"), true);
  } finally {
    Deno.readTextFile = originalReadTextFile;
  }
});

Deno.test("FileHandlerManager - handles malformed content", async () => {
  const manager = new FileHandlerManager();

  const originalReadTextFile = Deno.readTextFile;

  try {
    // Test with corrupted JSON
    Deno.readTextFile = async () => '{"version": "1.0.0"'; // Missing closing brace

    const result = await manager.updateFile("./deno.json", "version", "2.0.0");

    // Should still update the content, validation happens separately
    assertEquals(result.success, true);
    if (result.content && BUILT_IN_HANDLERS["deno.json"].validate) {
      const validation = BUILT_IN_HANDLERS["deno.json"].validate(result.content);
      assertEquals(validation.valid, false);
    }
  } finally {
    Deno.readTextFile = originalReadTextFile;
  }
});
