/**
 * @fileoverview Comprehensive test suite for ReleaseManager to improve coverage
 * @module release-manager-comprehensive_test
 */

import { assertEquals, assertExists, assertRejects, assertStringIncludes } from "@std/assert";
import { spy, stub } from "@std/testing/mock";

import { ReleaseManager } from "./release-manager.ts";
import { BumpType, LogLevel, NagareConfig, PreflightCheck } from "../../types.ts";
import { createTestConfig, TEST_COMMITS } from "./release-manager_test_helper.ts";
import { createMockDeps } from "./release-manager_test_mocks.ts";
import { ErrorCodes, NagareError } from "../core/enhanced-error.ts";
import { initI18n } from "../core/i18n.ts";

// Initialize i18n for tests
await initI18n("en");

// =============================================================================
// Preflight Checks Tests
// =============================================================================

Deno.test("ReleaseManager - preflight checks execution", async () => {
  const config = createTestConfig({
    release: {
      preflightChecks: {
        runTests: true,
        custom: [
          {
            name: "test-check",
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

  // Mock the preflight check execution
  const checkSpy = spy();
  // Override private method after manager is created
  (manager as any).performPreflightChecks = async () => {
    checkSpy();
    return { success: true };
  };
  const result = await manager.release();

  assertEquals(result.success, true);
  assertEquals(checkSpy.calls.length, 1);
});

Deno.test("ReleaseManager - preflight check failure handling", async () => {
  const config = createTestConfig({
    release: {
      preflightChecks: {
        runTests: false,
        custom: [
          {
            name: "failing-check",
            command: ["exit", "1"],
            fixable: false,
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

  // Override private method to simulate failure
  (manager as any).performPreflightChecks = async () => {
    return {
      success: false,
      failedCheck: "failing-check",
      error: "exit code 1",
      suggestion: "Fix the issue",
    };
  };
  const result = await manager.release();

  assertEquals(result.success, false);
  assertStringIncludes(result.error || "", "check");
});

// =============================================================================
// Hooks Execution Tests
// =============================================================================

Deno.test("ReleaseManager - pre-release hook execution", async () => {
  const hookSpy = spy();

  const config = createTestConfig({
    hooks: {
      preRelease: [
        async () => {
          hookSpy("pre");
        },
      ],
    },
  });

  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.fix] },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, true);
  assertEquals(hookSpy.calls.length, 1);
  assertEquals(hookSpy.calls[0].args[0], "pre");
});

Deno.test("ReleaseManager - post-release hook execution", async () => {
  const hookSpy = spy();

  const config = createTestConfig({
    hooks: {
      postRelease: [
        async () => {
          hookSpy("post");
        },
      ],
    },
  });

  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.fix] },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, true);
  assertEquals(hookSpy.calls.length, 1);
  assertEquals(hookSpy.calls[0].args[0], "post");
});

Deno.test("ReleaseManager - hook failure handling", async () => {
  const config = createTestConfig({
    hooks: {
      preRelease: [
        async () => {
          throw new Error("Hook failed");
        },
      ],
    },
  });

  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.fix] },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, false);
  assertStringIncludes(result.error || "", "Hook failed");
});

// =============================================================================
// Error Recovery Tests
// =============================================================================

Deno.test("ReleaseManager - handles version file not found", async () => {
  const config = createTestConfig();
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.fix] },
    currentVersion: null, // Simulate version file not found
  });

  mockDeps.versionUtils.getCurrentVersion = async () => {
    throw new NagareError(
      "Version file not found",
      ErrorCodes.VERSION_NOT_FOUND,
      ["Create a version file"],
      { path: "./version.ts" },
    );
  };

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, false);
  assertExists(result.error);
  assertStringIncludes(result.error.toLowerCase(), "version");
});

Deno.test("ReleaseManager - handles malformed version", async () => {
  const config = createTestConfig();
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.fix] },
    currentVersion: "invalid.version",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, false);
  assertExists(result.error);
});

// =============================================================================
// Commit Analysis Tests
// =============================================================================

Deno.test("ReleaseManager - handles empty commit list", async () => {
  const config = createTestConfig();
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [] }, // No commits
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  // Should default to patch bump when no commits
  assertEquals(result.success, true);
  assertEquals(result.version, "1.0.1");
});

Deno.test("ReleaseManager - categorizes multiple commit types", async () => {
  const config = createTestConfig();
  const mockDeps = createMockDeps(config, {
    gitState: {
      commits: [
        TEST_COMMITS.feat,
        TEST_COMMITS.fix,
        TEST_COMMITS.docs,
        TEST_COMMITS.style,
        TEST_COMMITS.refactor,
        TEST_COMMITS.test,
        TEST_COMMITS.chore,
      ],
    },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, true);
  assertEquals(result.version, "1.1.0"); // Minor bump due to feat
  assertExists(result.releaseNotes);

  // Check that commits are properly categorized
  assertEquals(result.releaseNotes?.added.length, 1); // feat
  assertEquals(result.releaseNotes?.fixed.length, 1); // fix
  assertEquals(result.releaseNotes?.other.length, 5); // docs, style, refactor, test, chore
});

// =============================================================================
// GitHub Integration Tests
// =============================================================================

Deno.test("ReleaseManager - creates GitHub release when configured", async () => {
  const githubSpy = spy();

  const config = createTestConfig({
    github: {
      release: true,
      draft: false,
      prerelease: false,
    },
  });

  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.feat] },
    currentVersion: "1.0.0",
  });

  // Mock GitHub release creation
  (mockDeps.github as any).createRelease = async (tag: string, notes: string) => {
    githubSpy(tag, notes);
    return { success: true, url: `https://github.com/test/test/releases/tag/${tag}` };
  };

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, true);
  assertEquals(githubSpy.calls.length, 1);
  assertEquals(githubSpy.calls[0].args[0], "v1.1.0");
});

Deno.test("ReleaseManager - handles GitHub release failure gracefully", async () => {
  const config = createTestConfig({
    github: {
      release: true,
    },
  });

  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.feat] },
    currentVersion: "1.0.0",
  });

  // Mock GitHub release failure
  (mockDeps.github as any).createRelease = async () => {
    throw new Error("GitHub API error");
  };

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  // Should still succeed but with warning
  assertEquals(result.success, true);
  assertEquals(result.version, "1.1.0");
});

// =============================================================================
// Template Processing Tests
// =============================================================================

Deno.test("ReleaseManager - processes custom templates", async () => {
  const config = createTestConfig({
    templates: {
      versionFile: "export const VERSION = '{{version}}';\nexport const RELEASE_DATE = '{{date}}';",
    },
  });

  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.fix] },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, true);
  assertEquals(result.version, "1.0.1");
});

// =============================================================================
// Concurrent Operations Tests
// =============================================================================

Deno.test("ReleaseManager - handles concurrent file updates", async () => {
  const config = createTestConfig({
    updateFiles: [
      { path: "./package.json" },
      { path: "./deno.json" },
      { path: "./README.md" },
      { path: "./docs/version.md" },
    ],
  });

  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.feat] },
    currentVersion: "1.0.0",
  });

  const updateSpy = spy();
  (mockDeps.fileHandlerManager as any).updateFile = async (path: string, version: string) => {
    updateSpy(path);
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10));
    return true;
  };

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, true);
  assertEquals(updateSpy.calls.length, 5); // version file + 4 update files
});

// =============================================================================
// State Tracking Tests
// =============================================================================

Deno.test("ReleaseManager - tracks release state throughout process", async () => {
  const stateSpy = spy();

  const config = createTestConfig();
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.feat] },
    currentVersion: "1.0.0",
  });

  // Spy on state tracker
  const originalSaveState = (mockDeps.stateTracker as any).saveState;
  (mockDeps.stateTracker as any).saveState = async () => {
    stateSpy();
    return originalSaveState.call(mockDeps.stateTracker);
  };

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, true);
  // State should be saved multiple times during the process
  assertEquals(stateSpy.calls.length > 0, true);
});

// =============================================================================
// Rollback Preparation Tests
// =============================================================================

Deno.test("ReleaseManager - creates backup before changes", async () => {
  const backupSpy = spy();

  const config = createTestConfig();
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.feat] },
    currentVersion: "1.0.0",
  });

  // Spy on backup creation
  (mockDeps.backupManager as any).createBackup = async (files: string[]) => {
    backupSpy(files);
    return true;
  };

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, true);
  assertEquals(backupSpy.calls.length, 1);
  assertEquals(backupSpy.calls[0].args[0].includes("./version.ts"), true);
});

// =============================================================================
// Logging and Debug Tests
// =============================================================================

Deno.test("ReleaseManager - respects log level configuration", async () => {
  const logSpy = spy();

  const config = createTestConfig({
    options: {
      logLevel: LogLevel.DEBUG,
    },
  });

  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.feat] },
    currentVersion: "1.0.0",
  });

  // Spy on logger
  const logger = mockDeps.logger!;
  const originalLog = logger.debug.bind(logger);
  logger.debug = (message: string, ...args: unknown[]) => {
    logSpy(message, args);
    return originalLog(message, ...args);
  };

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, true);
  // Debug logs should be present
  assertEquals(logSpy.calls.length > 0, true);
});

// =============================================================================
// Edge Cases and Boundary Tests
// =============================================================================

Deno.test("ReleaseManager - handles version 0.x.x correctly", async () => {
  const config = createTestConfig();
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.breaking] },
    currentVersion: "0.5.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  // In 0.x.x, breaking changes should bump minor, not major
  assertEquals(result.success, true);
  assertEquals(result.version, "0.6.0");
});

Deno.test("ReleaseManager - handles prerelease versions", async () => {
  const config = createTestConfig();
  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.fix] },
    currentVersion: "1.0.0-beta.1",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  assertEquals(result.success, true);
  assertEquals(result.version, "1.0.1"); // Should remove prerelease
});

Deno.test("ReleaseManager - validates custom patterns", async () => {
  const config = createTestConfig({
    updateFiles: [{
      path: "./custom.txt",
      patterns: ["VERSION=(.*)"], // Invalid regex group
    }],
  });

  const mockDeps = createMockDeps(config, {
    gitState: { commits: [TEST_COMMITS.fix] },
    currentVersion: "1.0.0",
  });

  const manager = new ReleaseManager(config, mockDeps);
  const result = await manager.release();

  // Should handle invalid pattern gracefully
  assertEquals(result.success, true);
});

// =============================================================================
// getConfig Method Test
// =============================================================================

Deno.test("ReleaseManager - getConfig returns immutable config", () => {
  const config = createTestConfig();
  const manager = new ReleaseManager(config);

  const returnedConfig = manager.getConfig();
  assertExists(returnedConfig);
  assertEquals(returnedConfig.project.name, "test-project");

  // Verify it's a copy, not the original
  returnedConfig.project.name = "modified";
  const secondConfig = manager.getConfig();
  assertEquals(secondConfig.project.name, "test-project");
});
