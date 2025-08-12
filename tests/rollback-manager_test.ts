/**
 * @fileoverview Unit tests for RollbackManager
 * @module rollback-manager_test
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { spy, stub } from "https://deno.land/std@0.208.0/testing/mock.ts";
import { RollbackManager } from "../src/release/rollback-manager.ts";
import type { NagareConfig } from "../types.ts";
import { initI18n } from "../src/core/i18n.ts";

// Initialize i18n for tests
await initI18n("en");

function createTestConfig(overrides?: Partial<NagareConfig>): NagareConfig {
  return {
    project: {
      name: "test-project",
      repository: "https://github.com/test/project",
    },
    versionFile: {
      path: "./version.ts",
      template: "typescript",
    },
    options: {
      skipConfirmation: true, // Skip prompts in tests
      logLevel: "ERROR", // Reduce noise in tests
      ...overrides?.options,
    },
    ...overrides,
  };
}

// =============================================================================
// Constructor Tests
// =============================================================================

Deno.test("RollbackManager - constructor initializes properly", () => {
  const config = createTestConfig();
  const manager = new RollbackManager(config);

  assertExists(manager);
  assertEquals(manager.getConfig(), config);
});

// =============================================================================
// Rollback Tests with Mocked Git Operations
// =============================================================================

Deno.test("RollbackManager - rollback with no git repository", async () => {
  const config = createTestConfig();
  const manager = new RollbackManager(config);

  // Mock GitOperations methods
  const gitOps = (manager as any).git;
  stub(gitOps, "isGitRepository", () => Promise.resolve(false));

  const result = await manager.rollback("1.0.0");

  assertEquals(result.success, false);
  assertExists(result.error);
  assertEquals(result.error?.includes("git"), true);
});

Deno.test("RollbackManager - rollback with release commit", async () => {
  const config = createTestConfig();
  const manager = new RollbackManager(config);

  // Mock GitOperations methods
  const gitOps = (manager as any).git;
  stub(gitOps, "isGitRepository", () => Promise.resolve(true));
  stub(gitOps, "getLastCommitMessage", () => Promise.resolve("chore(release): bump version to 1.2.3"));
  stub(gitOps, "getLocalTags", () => Promise.resolve(["v1.2.3", "v1.2.2"]));
  const deleteTagSpy = stub(gitOps, "deleteLocalTag", () => Promise.resolve());
  const resetSpy = stub(gitOps, "resetToCommit", () => Promise.resolve());
  stub(gitOps, "remoteTagExists", () => Promise.resolve(false));

  const result = await manager.rollback();

  assertEquals(result.success, true);
  assertExists(result.actions);
  assertEquals(result.actions?.length, 2); // Removed tag and reset
  assertEquals(deleteTagSpy.calls.length, 1);
  assertEquals(deleteTagSpy.calls[0].args[0], "v1.2.3");
  assertEquals(resetSpy.calls.length, 1);
});

Deno.test("RollbackManager - rollback with explicit version", async () => {
  const config = createTestConfig();
  const manager = new RollbackManager(config);

  // Mock GitOperations methods
  const gitOps = (manager as any).git;
  stub(gitOps, "isGitRepository", () => Promise.resolve(true));
  stub(gitOps, "getLastCommitMessage", () => Promise.resolve("feat: add new feature"));
  stub(gitOps, "getLocalTags", () => Promise.resolve(["v2.0.0", "v1.0.0"]));
  const deleteTagSpy = stub(gitOps, "deleteLocalTag", () => Promise.resolve());
  stub(gitOps, "remoteTagExists", () => Promise.resolve(false));

  const result = await manager.rollback("2.0.0");

  assertEquals(result.success, true);
  assertExists(result.actions);
  assertEquals(result.actions?.includes("Removed local tag v2.0.0"), true);
  assertEquals(deleteTagSpy.calls.length, 1);
  assertEquals(deleteTagSpy.calls[0].args[0], "v2.0.0");
});

Deno.test("RollbackManager - rollback with custom tag prefix", async () => {
  const config = createTestConfig({
    options: {
      skipConfirmation: true,
      tagPrefix: "release-",
    },
  });
  const manager = new RollbackManager(config);

  // Mock GitOperations methods
  const gitOps = (manager as any).git;
  stub(gitOps, "isGitRepository", () => Promise.resolve(true));
  stub(gitOps, "getLastCommitMessage", () => Promise.resolve("chore(release): bump version to 3.0.0"));
  stub(gitOps, "getLocalTags", () => Promise.resolve(["release-3.0.0", "release-2.0.0"]));
  const deleteTagSpy = stub(gitOps, "deleteLocalTag", () => Promise.resolve());
  stub(gitOps, "resetToCommit", () => Promise.resolve());
  stub(gitOps, "remoteTagExists", () => Promise.resolve(false));

  const result = await manager.rollback();

  assertEquals(result.success, true);
  assertEquals(deleteTagSpy.calls[0].args[0], "release-3.0.0");
});

Deno.test("RollbackManager - rollback with remote tag", async () => {
  const config = createTestConfig();
  const manager = new RollbackManager(config);

  // Mock GitOperations methods
  const gitOps = (manager as any).git;
  stub(gitOps, "isGitRepository", () => Promise.resolve(true));
  stub(gitOps, "getLastCommitMessage", () => Promise.resolve("chore(release): bump version to 1.5.0"));
  stub(gitOps, "getLocalTags", () => Promise.resolve(["v1.5.0"]));
  stub(gitOps, "deleteLocalTag", () => Promise.resolve());
  stub(gitOps, "resetToCommit", () => Promise.resolve());
  stub(gitOps, "remoteTagExists", () => Promise.resolve(true));
  const deleteRemoteSpy = stub(gitOps, "deleteRemoteTag", () => Promise.resolve());

  const result = await manager.rollback();

  assertEquals(result.success, true);
  assertExists(result.actions);
  assertEquals(result.actions?.includes("Deleted remote tag v1.5.0"), true);
  assertEquals(deleteRemoteSpy.calls.length, 1);
});

Deno.test("RollbackManager - rollback handles remote tag deletion failure", async () => {
  const config = createTestConfig();
  const manager = new RollbackManager(config);

  // Mock GitOperations methods
  const gitOps = (manager as any).git;
  stub(gitOps, "isGitRepository", () => Promise.resolve(true));
  stub(gitOps, "getLastCommitMessage", () => Promise.resolve("chore(release): bump version to 1.6.0"));
  stub(gitOps, "getLocalTags", () => Promise.resolve(["v1.6.0"]));
  stub(gitOps, "deleteLocalTag", () => Promise.resolve());
  stub(gitOps, "resetToCommit", () => Promise.resolve());
  stub(gitOps, "remoteTagExists", () => Promise.resolve(true));
  stub(gitOps, "deleteRemoteTag", () => Promise.reject(new Error("Permission denied")));

  const result = await manager.rollback();

  // Should still succeed even if remote tag deletion fails
  assertEquals(result.success, true);
  assertExists(result.actions);
  // Should not include the failed remote deletion
  assertEquals(result.actions?.includes("Deleted remote tag v1.6.0"), false);
});

Deno.test("RollbackManager - rollback with non-release commit", async () => {
  const config = createTestConfig();
  const manager = new RollbackManager(config);

  // Mock GitOperations methods
  const gitOps = (manager as any).git;
  stub(gitOps, "isGitRepository", () => Promise.resolve(true));
  stub(gitOps, "getLastCommitMessage", () => Promise.resolve("feat: add new feature"));
  stub(gitOps, "getLocalTags", () => Promise.resolve(["v1.0.0"]));
  stub(gitOps, "deleteLocalTag", () => Promise.resolve());
  const resetSpy = stub(gitOps, "resetToCommit", () => Promise.resolve());
  stub(gitOps, "remoteTagExists", () => Promise.resolve(false));

  const result = await manager.rollback("1.0.0");

  assertEquals(result.success, true);
  // Should not reset when last commit is not a release
  assertEquals(resetSpy.calls.length, 0);
  assertExists(result.actions);
  assertEquals(result.actions?.includes("Reset to previous commit"), false);
});

Deno.test("RollbackManager - rollback with invalid version", async () => {
  const config = createTestConfig();
  const manager = new RollbackManager(config);

  // Mock GitOperations methods
  const gitOps = (manager as any).git;
  stub(gitOps, "isGitRepository", () => Promise.resolve(true));
  stub(gitOps, "getLastCommitMessage", () => Promise.resolve("chore(release): bump version to 1.0.0"));
  stub(gitOps, "getLocalTags", () => Promise.resolve([]));

  // Try with invalid version
  const result = await manager.rollback("not-a-version");

  assertEquals(result.success, false);
  assertExists(result.error);
  assertEquals(result.error?.includes("Invalid version"), true);
});

Deno.test("RollbackManager - rollback with no tags", async () => {
  const config = createTestConfig();
  const manager = new RollbackManager(config);

  // Mock GitOperations methods
  const gitOps = (manager as any).git;
  stub(gitOps, "isGitRepository", () => Promise.resolve(true));
  stub(gitOps, "getLastCommitMessage", () => Promise.resolve("chore(release): bump version to 1.0.0"));
  stub(gitOps, "getLocalTags", () => Promise.resolve([]));
  const deleteTagSpy = stub(gitOps, "deleteLocalTag", () => Promise.resolve());
  stub(gitOps, "resetToCommit", () => Promise.resolve());
  stub(gitOps, "remoteTagExists", () => Promise.resolve(false));

  const result = await manager.rollback();

  assertEquals(result.success, true);
  // Should not try to delete non-existent tag
  assertEquals(deleteTagSpy.calls.length, 0);
});

// =============================================================================
// User Interaction Tests
// =============================================================================

Deno.test("RollbackManager - rollback prompts for version when not detected", async () => {
  const config = createTestConfig({
    options: {
      skipConfirmation: true,
    },
  });
  const manager = new RollbackManager(config);

  // Mock GitOperations methods
  const gitOps = (manager as any).git;
  stub(gitOps, "isGitRepository", () => Promise.resolve(true));
  stub(gitOps, "getLastCommitMessage", () => Promise.resolve("feat: some feature"));
  stub(gitOps, "getLocalTags", () => Promise.resolve([]));

  // Mock prompt to return null (user cancels)
  const originalPrompt = globalThis.prompt;
  globalThis.prompt = () => null;

  try {
    const result = await manager.rollback();

    assertEquals(result.success, false);
    assertEquals(result.error, "No version specified");
  } finally {
    globalThis.prompt = originalPrompt;
  }
});

Deno.test("RollbackManager - rollback with user-provided version", async () => {
  const config = createTestConfig({
    options: {
      skipConfirmation: true,
    },
  });
  const manager = new RollbackManager(config);

  // Mock GitOperations methods
  const gitOps = (manager as any).git;
  stub(gitOps, "isGitRepository", () => Promise.resolve(true));
  stub(gitOps, "getLastCommitMessage", () => Promise.resolve("feat: some feature"));
  stub(gitOps, "getLocalTags", () => Promise.resolve(["v2.5.0"]));
  stub(gitOps, "deleteLocalTag", () => Promise.resolve());
  stub(gitOps, "remoteTagExists", () => Promise.resolve(false));

  // Mock prompt to return a version
  const originalPrompt = globalThis.prompt;
  globalThis.prompt = () => "2.5.0";

  try {
    const result = await manager.rollback();

    assertEquals(result.success, true);
    assertExists(result.actions);
    assertEquals(result.actions?.includes("Removed local tag v2.5.0"), true);
  } finally {
    globalThis.prompt = originalPrompt;
  }
});

// =============================================================================
// Error Handling Tests
// =============================================================================

Deno.test("RollbackManager - handles git operation errors", async () => {
  const config = createTestConfig();
  const manager = new RollbackManager(config);

  // Mock GitOperations to throw an error
  const gitOps = (manager as any).git;
  stub(gitOps, "isGitRepository", () => Promise.resolve(true));
  stub(gitOps, "getLastCommitMessage", () => Promise.reject(new Error("Git command failed")));

  const result = await manager.rollback("1.0.0");

  assertEquals(result.success, false);
  assertExists(result.error);
});

// =============================================================================
// Audit Logging Tests
// =============================================================================

Deno.test("RollbackManager - logs audit events", async () => {
  const config = createTestConfig();
  const manager = new RollbackManager(config);

  // Spy on logger audit method
  const logger = (manager as any).logger;
  const auditSpy = spy(logger, "audit");

  // Mock GitOperations methods
  const gitOps = (manager as any).git;
  stub(gitOps, "isGitRepository", () => Promise.resolve(true));
  stub(gitOps, "getLastCommitMessage", () => Promise.resolve("chore(release): bump version to 1.0.0"));
  stub(gitOps, "getLocalTags", () => Promise.resolve(["v1.0.0"]));
  stub(gitOps, "deleteLocalTag", () => Promise.resolve());
  stub(gitOps, "resetToCommit", () => Promise.resolve());
  stub(gitOps, "remoteTagExists", () => Promise.resolve(false));

  await manager.rollback();

  // Should log start and completion audit events
  assertEquals(auditSpy.calls.length >= 2, true);
  assertEquals(auditSpy.calls[0].args[0], "rollback_started");
  assertEquals(auditSpy.calls[auditSpy.calls.length - 1].args[0], "rollback_completed");
});

// =============================================================================
// Configuration Tests
// =============================================================================

Deno.test("RollbackManager - getConfig returns configuration", () => {
  const config = createTestConfig({
    options: {
      tagPrefix: "custom-",
      skipConfirmation: false,
    },
  });
  const manager = new RollbackManager(config);

  const returnedConfig = manager.getConfig();

  assertEquals(returnedConfig, config);
  assertEquals(returnedConfig.options?.tagPrefix, "custom-");
  assertEquals(returnedConfig.options?.skipConfirmation, false);
});
