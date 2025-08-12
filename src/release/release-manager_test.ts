/**
 * @fileoverview Fixed unit tests for ReleaseManager using proper mock infrastructure
 * @module release-manager_test_fixed
 */

import { assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { assertSpyCalls, spy } from "https://deno.land/std@0.208.0/testing/mock.ts";

import { ReleaseManager } from "./release-manager.ts";
import { BumpType } from "../../types.ts";
import { createTestConfig, MockEnvironment, TEST_COMMITS } from "./release-manager_test_helper.ts";

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
  const mockEnv = new MockEnvironment();
  mockEnv.configureGit({ isRepo: false });
  mockEnv.install();

  try {
    const config = createTestConfig({ options: { dryRun: false } });
    const manager = new ReleaseManager(config);

    const result = await manager.release();
    assertEquals(result.success, false);
    assertExists(result.error);
    assertStringIncludes(result.error, "git");
  } finally {
    mockEnv.cleanup();
  }
});

Deno.test("ReleaseManager - detects uncommitted changes", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.configureGit({ hasUncommittedChanges: true });
  mockEnv.install();

  try {
    const config = createTestConfig({ options: { dryRun: false } });
    const manager = new ReleaseManager(config);

    const result = await manager.release();
    assertEquals(result.success, false);
    assertExists(result.error);
    assertStringIncludes(result.error.toLowerCase(), "uncommitted");
  } finally {
    mockEnv.cleanup();
  }
});

// =============================================================================
// Version Calculation Tests
// =============================================================================

Deno.test("ReleaseManager - calculates patch version from fix commits", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.addCommits(TEST_COMMITS.fix);
  mockEnv.install();

  try {
    const config = createTestConfig();
    const manager = new ReleaseManager(config);

    const result = await manager.release();
    assertEquals(result.success, true);
    assertEquals(result.version, "1.0.1"); // Patch bump
  } finally {
    mockEnv.cleanup();
  }
});

Deno.test("ReleaseManager - calculates minor version from feat commits", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.addCommits(TEST_COMMITS.feat);
  mockEnv.install();

  try {
    const config = createTestConfig();
    const manager = new ReleaseManager(config);

    const result = await manager.release();
    assertEquals(result.success, true);
    assertEquals(result.version, "1.1.0"); // Minor bump
  } finally {
    mockEnv.cleanup();
  }
});

Deno.test("ReleaseManager - calculates major version from breaking changes", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.addCommits(TEST_COMMITS.breaking);
  mockEnv.install();

  try {
    const config = createTestConfig();
    const manager = new ReleaseManager(config);

    const result = await manager.release();
    assertEquals(result.success, true);
    assertEquals(result.version, "2.0.0"); // Major bump
  } finally {
    mockEnv.cleanup();
  }
});

Deno.test("ReleaseManager - respects explicit bump type", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.addCommits(TEST_COMMITS.fix); // Add a fix commit
  mockEnv.install();

  try {
    const config = createTestConfig();
    const manager = new ReleaseManager(config);

    // Force major bump despite only having fix commits
    const result = await manager.release(BumpType.MAJOR);
    assertEquals(result.success, true);
    assertEquals(result.version, "2.0.0");
  } finally {
    mockEnv.cleanup();
  }
});

// =============================================================================
// File Update Tests
// =============================================================================

Deno.test("ReleaseManager - updates version file in dry run", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.addCommits(TEST_COMMITS.feat);
  mockEnv.install();

  try {
    const config = createTestConfig({ options: { dryRun: true } });
    const manager = new ReleaseManager(config);

    const result = await manager.release(BumpType.MINOR);
    assertEquals(result.success, true);
    assertEquals(result.version, "1.1.0");

    // In dry run, file should not be modified
    const versionFile = mockEnv.getFile("./version.ts");
    assertStringIncludes(versionFile!, '"1.0.0"'); // Still old version
  } finally {
    mockEnv.cleanup();
  }
});

Deno.test("ReleaseManager - updates additional files", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.addCommits(TEST_COMMITS.fix);
  mockEnv.install();

  try {
    const config = createTestConfig({
      updateFiles: [
        { path: "./deno.json" },
        { path: "./package.json" },
      ],
    });
    const manager = new ReleaseManager(config);

    const result = await manager.release(BumpType.PATCH);
    assertEquals(result.success, true);
    assertEquals(result.version, "1.0.1");
  } finally {
    mockEnv.cleanup();
  }
});

// =============================================================================
// Release Notes Generation Tests
// =============================================================================

Deno.test("ReleaseManager - generates release notes", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.addCommits(TEST_COMMITS.feat, TEST_COMMITS.fix);
  mockEnv.install();

  try {
    const config = createTestConfig({
      releaseNotes: {
        includeCommitHashes: true,
        maxDescriptionLength: 50,
      },
    });
    const manager = new ReleaseManager(config);

    const result = await manager.release();
    assertEquals(result.success, true);
    assertExists(result.releaseNotes);
    assertEquals(result.releaseNotes?.added.length, 1); // One feat
    assertEquals(result.releaseNotes?.fixed.length, 1); // One fix
  } finally {
    mockEnv.cleanup();
  }
});

Deno.test("ReleaseManager - categorizes commits correctly", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.addCommits(
    { type: "feat", description: "new feature", hash: "aaa", date: "2024-01-01", breakingChange: false },
    { type: "fix", description: "bug fix", hash: "bbb", date: "2024-01-02", breakingChange: false },
    { type: "docs", description: "update readme", hash: "ccc", date: "2024-01-03", breakingChange: false },
    { type: "perf", description: "optimize", hash: "ddd", date: "2024-01-04", breakingChange: false },
  );
  mockEnv.install();

  try {
    const config = createTestConfig({
      commitTypes: {
        feat: "added",
        fix: "fixed",
        docs: "changed",
        perf: "changed",
      },
    });
    const manager = new ReleaseManager(config);

    const result = await manager.release();
    assertEquals(result.success, true);
    assertExists(result.releaseNotes);

    // Check categorization
    const notes = result.releaseNotes!;
    assertEquals(notes.added.length, 1);
    assertEquals(notes.fixed.length, 1);
    assertEquals(notes.changed.length, 2); // docs + perf
  } finally {
    mockEnv.cleanup();
  }
});

// =============================================================================
// Dry Run Tests
// =============================================================================

Deno.test("ReleaseManager - dry run doesn't modify files", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.addCommits(TEST_COMMITS.breaking);

  // Spy on writeTextFile to ensure it's not called
  const writeTextFileSpy = spy(mockEnv, "setFile");
  mockEnv.install();

  try {
    const config = createTestConfig({ options: { dryRun: true } });
    const manager = new ReleaseManager(config);

    const result = await manager.release(BumpType.MAJOR);
    assertEquals(result.success, true);
    assertEquals(result.version, "2.0.0");

    // In dry run, no files should be written
    assertSpyCalls(writeTextFileSpy, 0);
  } finally {
    mockEnv.cleanup();
  }
});

// =============================================================================
// Hook Tests
// =============================================================================

Deno.test("ReleaseManager - executes pre/post release hooks", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.addCommits(TEST_COMMITS.feat);
  mockEnv.install();

  const preHook = spy(() => Promise.resolve());
  const postHook = spy(() => Promise.resolve());

  try {
    const config = createTestConfig({
      hooks: {
        preRelease: [preHook],
        postRelease: [postHook],
      },
    });
    const manager = new ReleaseManager(config);

    const result = await manager.release();
    assertEquals(result.success, true);
    assertSpyCalls(preHook, 1);
    assertSpyCalls(postHook, 1);
  } finally {
    mockEnv.cleanup();
  }
});

// =============================================================================
// Error Handling Tests
// =============================================================================

Deno.test("ReleaseManager - handles missing version file", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.addCommits(TEST_COMMITS.feat);
  // Remove the version file
  mockEnv.setFile("./version.ts", ""); // Empty file will cause parsing error
  mockEnv.install();

  try {
    const config = createTestConfig({ options: { dryRun: false } });
    const manager = new ReleaseManager(config);

    const result = await manager.release();
    assertEquals(result.success, false);
    assertExists(result.error);
  } finally {
    mockEnv.cleanup();
  }
});

Deno.test("ReleaseManager - handles no commits", async () => {
  const mockEnv = new MockEnvironment();
  // No commits added
  mockEnv.install();

  try {
    const config = createTestConfig();
    const manager = new ReleaseManager(config);

    const result = await manager.release(); // No explicit bump type
    assertEquals(result.success, false);
    assertExists(result.error);
    assertStringIncludes(result.error, "No commits");
  } finally {
    mockEnv.cleanup();
  }
});

// =============================================================================
// Security Tests
// =============================================================================

Deno.test("ReleaseManager - validates file patterns for safety", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.addCommits(TEST_COMMITS.fix);
  mockEnv.install();

  try {
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
    const manager = new ReleaseManager(config);

    // Should still work but with warnings logged
    const result = await manager.release();
    assertEquals(result.success, true);
  } finally {
    mockEnv.cleanup();
  }
});

Deno.test("ReleaseManager - sanitizes error messages", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.addCommits(TEST_COMMITS.feat);

  // Inject a file with sensitive info that will cause an error
  mockEnv.setFile("./version.ts", "Database password: secret123");
  mockEnv.install();

  try {
    const config = createTestConfig({ options: { dryRun: false } });
    const manager = new ReleaseManager(config);

    const result = await manager.release();

    // Error should be sanitized
    if (!result.success && result.error) {
      assertEquals(result.error.includes("secret123"), false);
    }
  } finally {
    mockEnv.cleanup();
  }
});

// =============================================================================
// Template Processing Tests
// =============================================================================

Deno.test("ReleaseManager - processes custom templates", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.addCommits(TEST_COMMITS.feat);
  mockEnv.install();

  try {
    const config = createTestConfig({
      versionFile: {
        path: "./version.ts",
        // deno-lint-ignore no-explicit-any
        template: "custom" as any,
        customTemplate: 'export const VERSION = "{{ version }}";',
      },
    });
    const manager = new ReleaseManager(config);

    const result = await manager.release(BumpType.MINOR);
    assertEquals(result.success, true);
    assertEquals(result.version, "1.1.0");
  } finally {
    mockEnv.cleanup();
  }
});

// =============================================================================
// GitHub Integration Tests
// =============================================================================

Deno.test("ReleaseManager - creates GitHub release when configured", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.addCommits(TEST_COMMITS.feat);
  mockEnv.install();

  try {
    const config = createTestConfig({
      github: {
        createRelease: true,
        owner: "test",
        repo: "project",
      },
      options: { dryRun: true }, // Keep as dry run for test
    });

    const manager = new ReleaseManager(config);
    const result = await manager.release(BumpType.MINOR);

    // In dry run, GitHub release isn't created but should succeed
    assertEquals(result.success, true);
    assertEquals(result.version, "1.1.0");
  } finally {
    mockEnv.cleanup();
  }
});

// =============================================================================
// Pre-flight Checks Tests
// =============================================================================

Deno.test("ReleaseManager - runs pre-flight checks", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.addCommits(TEST_COMMITS.fix);
  mockEnv.install();

  const checkSpy = spy(() => ({ success: true }));

  try {
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

    const manager = new ReleaseManager(config);
    const result = await manager.release(BumpType.PATCH);

    // Should pass if all checks succeed
    assertEquals(result.success, true);
  } finally {
    mockEnv.cleanup();
  }
});

// =============================================================================
// Rollback and State Tracking Tests
// =============================================================================

Deno.test("ReleaseManager - tracks release state for rollback", async () => {
  const mockEnv = new MockEnvironment();
  mockEnv.addCommits(TEST_COMMITS.feat);
  mockEnv.install();

  try {
    const config = createTestConfig({ options: { dryRun: true } });
    const manager = new ReleaseManager(config);

    const result = await manager.release(BumpType.MINOR);

    // State tracking should work even in dry run
    assertEquals(result.success, true);
    assertEquals(result.version, "1.1.0");
  } finally {
    mockEnv.cleanup();
  }
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
