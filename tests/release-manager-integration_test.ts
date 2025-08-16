/**
 * @fileoverview Integration tests for ReleaseManager that require actual file operations
 * @module release-manager-integration_test
 * 
 * These tests set dryRun: false to test behaviors that only occur during real releases:
 * - Actual file backups
 * - State tracking file writes
 * - Post-release hooks that run after file changes
 * - Concurrent file operations
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { spy } from "@std/testing/mock";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";

import { ReleaseManager } from "../src/release/release-manager.ts";
import { LogLevel } from "../types.ts";
import { createTestConfig, TEST_COMMITS } from "../src/release/release-manager_test_helper.ts";
import { createMockDeps } from "../src/release/release-manager_test_mocks.ts";
import { initI18n } from "../src/core/i18n.ts";
import { Logger } from "../src/core/logger.ts";

// Initialize i18n for tests
await initI18n("en");

// Test directory for file operations
const TEST_DIR = await Deno.makeTempDir({ prefix: "nagare_test_" });

// Clean up test directory after all tests
globalThis.addEventListener("unload", () => {
  try {
    Deno.removeSync(TEST_DIR, { recursive: true });
  } catch {
    // Ignore cleanup errors
  }
});

Deno.test({
  name: "ReleaseManager Integration - preflight check failure with actual commands",
  ignore: true, // These need a proper test environment
  fn: async () => {
    const config = createTestConfig({
      release: {
        preflightChecks: {
          runTests: false,
          custom: [
            {
              name: "failing-check",
              command: ["false"], // Unix command that always fails
              fixable: false,
            },
          ],
        },
      },
      options: {
        dryRun: false,
        skipConfirmation: true,
        logLevel: LogLevel.ERROR,
      },
    });

    const mockDeps = createMockDeps(config, {
      gitState: { commits: [TEST_COMMITS.fix] },
      currentVersion: "1.0.0",
    });

    const manager = new ReleaseManager(config, mockDeps);
    const result = await manager.release();

    assertEquals(result.success, false);
    assertStringIncludes(result.error || "", "check");
  },
});

Deno.test({
  name: "ReleaseManager Integration - post-release hook after file writes",
  ignore: true, // These need a proper test environment
  fn: async () => {
    const hookSpy = spy();
    const testVersionFile = join(TEST_DIR, "version.ts");
    
    // Create test version file
    await Deno.writeTextFile(testVersionFile, 'export const VERSION = "1.0.0";');

    const config = createTestConfig({
      versionFile: {
        path: testVersionFile,
      },
      hooks: {
        postRelease: [
          async () => {
            hookSpy("post");
          },
        ],
      },
      options: {
        dryRun: false,
        skipConfirmation: true,
        logLevel: LogLevel.ERROR,
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
  },
});

Deno.test({
  name: "ReleaseManager Integration - creates actual backup files",
  ignore: true, // These need a proper test environment
  fn: async () => {
    const testVersionFile = join(TEST_DIR, "version-backup.ts");
    await Deno.writeTextFile(testVersionFile, 'export const VERSION = "1.0.0";');

    const config = createTestConfig({
      versionFile: {
        path: testVersionFile,
      },
      options: {
        dryRun: false,
        skipConfirmation: true,
        logLevel: LogLevel.ERROR,
      },
    });

    const mockDeps = createMockDeps(config, {
      gitState: { commits: [TEST_COMMITS.feat] },
      currentVersion: "1.0.0",
    });

    const backupSpy = spy();
    if (mockDeps.backupManager) {
      const originalCreate = mockDeps.backupManager.createBackup;
      mockDeps.backupManager.createBackup = async (files: string[]) => {
        backupSpy(files);
        return originalCreate.call(mockDeps.backupManager, files);
      };
    }

    const manager = new ReleaseManager(config, mockDeps);
    const result = await manager.release();

    assertEquals(result.success, true);
    assertEquals(backupSpy.calls.length, 1);
  },
});

Deno.test({
  name: "ReleaseManager Integration - concurrent file operations",
  ignore: true, // These need a proper test environment
  fn: async () => {
    const testFiles = [
      join(TEST_DIR, "package.json"),
      join(TEST_DIR, "deno.json"),
      join(TEST_DIR, "README.md"),
    ];

    // Create test files
    for (const file of testFiles) {
      await Deno.writeTextFile(file, '{"version": "1.0.0"}');
    }

    const config = createTestConfig({
      versionFile: {
        path: join(TEST_DIR, "version.ts"),
      },
      updateFiles: testFiles.map(path => ({ path })),
      options: {
        dryRun: false,
        skipConfirmation: true,
        logLevel: LogLevel.ERROR,
      },
    });

    const mockDeps = createMockDeps(config, {
      gitState: { commits: [TEST_COMMITS.feat] },
      currentVersion: "1.0.0",
    });

    const manager = new ReleaseManager(config, mockDeps);
    const result = await manager.release();

    assertEquals(result.success, true);
    
    // Verify files were updated
    for (const file of testFiles) {
      const content = await Deno.readTextFile(file);
      assertStringIncludes(content, "1.1.0");
    }
  },
});

Deno.test({
  name: "ReleaseManager Integration - state tracking with file persistence",
  ignore: true, // These need a proper test environment
  fn: async () => {
    const config = createTestConfig({
      options: {
        dryRun: false,
        skipConfirmation: true,
        logLevel: LogLevel.ERROR,
      },
    });

    const mockDeps = createMockDeps(config, {
      gitState: { commits: [TEST_COMMITS.feat] },
      currentVersion: "1.0.0",
    });

    const stateSpy = spy();
    const originalSaveState = mockDeps.stateTracker.saveState;
    mockDeps.stateTracker.saveState = async () => {
      stateSpy();
      return originalSaveState.call(mockDeps.stateTracker);
    };

    const manager = new ReleaseManager(config, mockDeps);
    const result = await manager.release();

    assertEquals(result.success, true);
    // Should save state multiple times during process
    assertEquals(stateSpy.calls.length > 0, true);
  },
});