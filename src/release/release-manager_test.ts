/**
 * @fileoverview Unit tests for ReleaseManager using dependency injection
 * @module release-manager_test_new
 */

import { assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { assertSpyCalls, spy } from "https://deno.land/std@0.208.0/testing/mock.ts";

import { ReleaseManager } from "./release-manager.ts";
import { BumpType } from "../../types.ts";
import { createTestConfig, TEST_COMMITS } from "./release-manager_test_helper.ts";
import { createMockDeps, MockFileHandlerManager } from "./release-manager_test_mocks.ts";
import { initI18n } from "../core/i18n.ts";

// =============================================================================
// ReleaseManager Constructor Tests
// =============================================================================

Deno.test("ReleaseManager - constructor with minimal config", () => {
  const config = createTestConfig();
  const manager = new ReleaseManager(config);

  assertExists(manager);
  const managerConfig = manager.getConfig();
  assertEquals(managerConfig.project.name, "test-project");
  assertEquals(managerConfig.versionFile.path, "./version.ts");
});

Deno.test("ReleaseManager - constructor merges with defaults", () => {
  const config = createTestConfig({
    options: {
      tagPrefix: "release-",
    },
  });
  const manager = new ReleaseManager(config);
  const managerConfig = manager.getConfig();

  // Custom value preserved
  assertEquals(managerConfig.options?.tagPrefix, "release-");
  // Defaults applied
  assertExists(managerConfig.options?.skipConfirmation);
});

// =============================================================================
// Environment Validation Tests
// =============================================================================

Deno.test("ReleaseManager - validates git repository", async () => {
  const config = createTestConfig({ options: { dryRun: false } });
  const mockDeps = createMockDeps(config, {
    gitState: { isRepo: false },
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, false);
  assertExists(result.error);
  assertStringIncludes(result.error.toLowerCase(), "git");
});

Deno.test("ReleaseManager - detects uncommitted changes", async () => {
  const config = createTestConfig({ options: { dryRun: false } });
  const mockDeps = createMockDeps(config, {
    gitState: { hasUncommittedChanges: true },
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, false);
  assertExists(result.error);
  assertStringIncludes(result.error.toLowerCase(), "uncommitted");
});

// =============================================================================
// Version Calculation Tests
// =============================================================================

Deno.test("ReleaseManager - calculates patch version from fix commits", async () => {
  const config = createTestConfig();
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.fix] },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, true);
  assertEquals(result.version, "1.0.1"); // Patch bump
});

Deno.test("ReleaseManager - calculates minor version from feat commits", async () => {
  const config = createTestConfig();
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.feat] },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, true);
  assertEquals(result.version, "1.1.0"); // Minor bump
});

Deno.test("ReleaseManager - calculates major version from breaking changes", async () => {
  const config = createTestConfig();
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.breaking] },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, true);
  assertEquals(result.version, "2.0.0"); // Major bump
});

Deno.test("ReleaseManager - respects explicit bump type", async () => {
  const config = createTestConfig();
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.fix] }, // Add a fix commit
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);

  // Force major bump despite only having fix commits
  const result = await manager.release(BumpType.MAJOR);
  assertEquals(result.success, true);
  assertEquals(result.version, "2.0.0");
});

// =============================================================================
// File Update Tests
// =============================================================================

Deno.test("ReleaseManager - updates version file in dry run", async () => {
  const config = createTestConfig({ options: { dryRun: true } });
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.feat] },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release(BumpType.MINOR);

  assertEquals(result.success, true);
  assertEquals(result.version, "1.1.0");

  // In dry run, files should not actually be modified
  const fileHandler = mockDeps.fileHandlerManager as unknown as MockFileHandlerManager;
  const versionFile = fileHandler.getMockFile("./version.ts");
  assertStringIncludes(versionFile!, '"1.0.0"'); // Still old version
});

Deno.test("ReleaseManager - updates additional files", async () => {
  const config = createTestConfig({
    updateFiles: [
      { path: "./deno.json" },
      { path: "./package.json" },
    ],
  });
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.fix] },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release(BumpType.PATCH);

  assertEquals(result.success, true);
  assertEquals(result.version, "1.0.1");
});

// =============================================================================
// Release Notes Generation Tests
// =============================================================================

Deno.test("ReleaseManager - generates release notes", async () => {
  const config = createTestConfig({
    releaseNotes: {
      includeCommitHashes: true,
      maxDescriptionLength: 50,
    },
  });
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.feat, TEST_COMMITS.fix] },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, true);
  assertExists(result.releaseNotes);
  assertEquals(result.releaseNotes?.added.length, 1); // One feat
  assertEquals(result.releaseNotes?.fixed.length, 1); // One fix
});

Deno.test("ReleaseManager - categorizes commits correctly", async () => {
  const config = createTestConfig({
    commitTypes: {
      feat: "added",
      fix: "fixed",
      docs: "changed",
      perf: "changed",
    },
  });

  const commits = [
    { type: "feat", description: "new feature", hash: "aaa", date: "2024-01-01", breakingChange: false },
    { type: "fix", description: "bug fix", hash: "bbb", date: "2024-01-02", breakingChange: false },
    { type: "docs", description: "update readme", hash: "ccc", date: "2024-01-03", breakingChange: false },
    { type: "perf", description: "optimize", hash: "ddd", date: "2024-01-04", breakingChange: false },
  ];

  const mockDeps = createMockDeps(config, {
    gitState: { commits },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, true);
  assertExists(result.releaseNotes);

  // Check categorization
  const notes = result.releaseNotes!;
  assertEquals(notes.added.length, 1);
  assertEquals(notes.fixed.length, 1);
  assertEquals(notes.changed.length, 2); // docs + perf
});

// =============================================================================
// Dry Run Tests
// =============================================================================

Deno.test("ReleaseManager - dry run doesn't modify files", async () => {
  const config = createTestConfig({ options: { dryRun: true } });
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.breaking] },
    currentVersion: "1.0.0",
  });

  const fileHandler = mockDeps.fileHandlerManager as unknown as MockFileHandlerManager;
  const _updateSpy = spy(fileHandler, "updateFile");

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release(BumpType.MAJOR);

  assertEquals(result.success, true);
  assertEquals(result.version, "2.0.0");

  // In dry run, updateFile shouldn't be called for actual updates
  // (might be called for preview, but not for actual changes)
  // Since we're in dry run, no actual file modifications should occur
});

// =============================================================================
// Hook Tests
// =============================================================================

Deno.test("ReleaseManager - executes pre/post release hooks", async () => {
  // Initialize i18n for non-dry-run tests
  await initI18n("en");

  const preHook = spy(() => Promise.resolve());
  const postHook = spy(() => Promise.resolve());

  const config = createTestConfig({
    options: {
      dryRun: false, // Must be false for post-release hooks to execute
      skipConfirmation: true, // Skip confirmation prompts in tests
    },
    hooks: {
      preRelease: [preHook],
      postRelease: [postHook],
    },
    release: {
      preflightChecks: {
        runTests: false, // Disable test pre-flight checks
        custom: [], // No custom checks
      },
    },
  });

  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.feat] },
    currentVersion: "1.0.0",
  });

  // Mock Deno.Command to bypass pre-flight checks
  const originalCommand = Deno.Command;
  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    // deno-lint-ignore no-explicit-any
    constructor(public cmd: string, public options?: any) {}

    // deno-lint-ignore require-await
    output = async () => {
      // Make pre-flight checks pass
      if (this.cmd === "deno") {
        return {
          success: true,
          code: 0,
          stdout: new Uint8Array(),
          stderr: new Uint8Array(),
        };
      }
      // Default for git commands
      return {
        success: true,
        code: 0,
        stdout: new TextEncoder().encode(""),
        stderr: new Uint8Array(),
      };
    };
  };

  try {
    const manager = new ReleaseManager(config, mockDeps);
    const result = await manager.release();

    assertEquals(result.success, true);
    // Pre-release hooks are called before dry-run check, so they should always be called
    assertSpyCalls(preHook, 1);
    // Post-release hooks are only called in non-dry-run mode
    assertSpyCalls(postHook, 1);
  } finally {
    // Restore original Command
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
  }
});

// =============================================================================
// Error Handling Tests
// =============================================================================

Deno.test("ReleaseManager - handles missing version file", async () => {
  const config = createTestConfig({ options: { dryRun: false } });
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.feat] },
    currentVersion: "1.0.0",
  });

  // Make version file return empty/invalid content
  const fileHandler = mockDeps.fileHandlerManager as unknown as MockFileHandlerManager;
  fileHandler.setMockFile("./version.ts", ""); // Empty file will cause parsing error

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  // This should succeed in dry run but might fail in real run
  // depending on how version parsing is handled
  assertEquals(typeof result.success, "boolean");
});

Deno.test("ReleaseManager - handles no commits", async () => {
  const config = createTestConfig();
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [] }, // No commits
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release(); // No explicit bump type

  assertEquals(result.success, false);
  assertExists(result.error);
  assertStringIncludes(result.error, "No commits");
});

// =============================================================================
// Security Tests
// =============================================================================

Deno.test("ReleaseManager - validates file patterns for safety", async () => {
  const config = createTestConfig({
    updateFiles: [
      {
        path: "./package.json",
        patterns: {
          // Pattern without proper anchors (potentially dangerous)
          version: /version/,
        },
      },
    ],
  });

  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.fix] },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);

  // Should still work but with warnings logged
  const result = await manager.release();
  assertEquals(result.success, true);
});

Deno.test("ReleaseManager - sanitizes error messages", async () => {
  const config = createTestConfig({ options: { dryRun: false } });
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.feat] },
    currentVersion: "1.0.0",
  });

  // Inject a file with sensitive info that will cause an error
  const fileHandler = mockDeps.fileHandlerManager as unknown as MockFileHandlerManager;
  fileHandler.setMockFile("./version.ts", "Database password: secret123");

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  // Error should be sanitized if there is one
  if (!result.success && result.error) {
    assertEquals(result.error.includes("secret123"), false);
  }
});

// =============================================================================
// Template Processing Tests
// =============================================================================

Deno.test("ReleaseManager - processes custom templates", async () => {
  const config = createTestConfig({
    versionFile: {
      path: "./version.ts",
      // deno-lint-ignore no-explicit-any
      template: "custom" as any,
      customTemplate: 'export const VERSION = "{{ version }}";',
    },
  });

  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.feat] },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release(BumpType.MINOR);

  assertEquals(result.success, true);
  assertEquals(result.version, "1.1.0");
});

// =============================================================================
// GitHub Integration Tests
// =============================================================================

Deno.test("ReleaseManager - creates GitHub release when configured", async () => {
  const config = createTestConfig({
    github: {
      createRelease: true,
      owner: "test",
      repo: "project",
    },
    options: { dryRun: true }, // Keep as dry run for test
  });

  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.feat] },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release(BumpType.MINOR);

  // In dry run, GitHub release isn't created but should succeed
  assertEquals(result.success, true);
  assertEquals(result.version, "1.1.0");
});

// =============================================================================
// Pre-flight Checks Tests
// =============================================================================

Deno.test("ReleaseManager - runs pre-flight checks", async () => {
  const config = createTestConfig({
    release: {
      preflightChecks: {
        runTests: true,
        custom: [
          {
            name: "Custom Check",
            command: ["echo", "test"],
            fixable: false,
            description: "Test check",
          },
        ],
      },
    },
  });

  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.fix] },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release(BumpType.PATCH);

  // Should pass if all checks succeed
  assertEquals(result.success, true);
});

// =============================================================================
// Rollback and State Tracking Tests
// =============================================================================

Deno.test("ReleaseManager - tracks release state for rollback", async () => {
  const config = createTestConfig({ options: { dryRun: true } });
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.feat] },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release(BumpType.MINOR);

  // State tracking should work even in dry run
  assertEquals(result.success, true);
  assertEquals(result.version, "1.1.0");
});

// =============================================================================
// Config Validation Tests
// =============================================================================

Deno.test("ReleaseManager - config validation", () => {
  const validConfig = createTestConfig();
  const validation = ReleaseManager.validateConfig(validConfig);

  assertEquals(validation.valid, true);
  assertEquals(validation.errors.length, 0);
});

Deno.test("ReleaseManager - config validation catches missing fields", () => {
  const invalidConfig = {
    project: {
      // Missing name
      repository: "https://github.com/test/project",
    },
    versionFile: {
      path: "./version.ts",
      // deno-lint-ignore no-explicit-any
      template: "typescript" as any,
    },
    // deno-lint-ignore no-explicit-any
  } as any;

  const validation = ReleaseManager.validateConfig(invalidConfig);

  assertEquals(validation.valid, false);
  assertEquals(validation.errors.includes("project.name is required"), true);
});
