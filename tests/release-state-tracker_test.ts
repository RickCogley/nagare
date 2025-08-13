/**
 * @fileoverview Unit tests for ReleaseStateTracker
 * @module release-state-tracker_test
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { spy, stub } from "https://deno.land/std@0.208.0/testing/mock.ts";
import {
  type OperationMetadata,
  OperationState,
  OperationType,
  ReleaseStateTracker,
  type TrackedOperation,
} from "../src/release/release-state-tracker.ts";
import { Logger, LogLevel } from "../src/core/logger.ts";

// Create a test logger
function createTestLogger(): Logger {
  return new Logger(LogLevel.ERROR); // Keep quiet during tests
}

// =============================================================================
// Constructor and Basic Operations Tests
// =============================================================================

Deno.test("ReleaseStateTracker - constructor initializes properly", () => {
  const logger = createTestLogger();
  const tracker = new ReleaseStateTracker(logger);

  assertExists(tracker);
  const diagnostics = tracker.getDiagnostics();
  assertExists(diagnostics.releaseId);
  assertEquals(diagnostics.operationCount, 0);
  assertEquals(diagnostics.operationSequence.length, 0);
});

Deno.test("ReleaseStateTracker - constructor with custom releaseId", () => {
  const logger = createTestLogger();
  const customId = "test-release-123";
  const tracker = new ReleaseStateTracker(logger, customId);

  const diagnostics = tracker.getDiagnostics();
  assertEquals(diagnostics.releaseId, customId);
});

// =============================================================================
// Operation Tracking Tests
// =============================================================================

Deno.test("ReleaseStateTracker - trackOperation creates new operation", () => {
  const logger = createTestLogger();
  const tracker = new ReleaseStateTracker(logger);

  const operationId = tracker.trackOperation(
    OperationType.FILE_UPDATE,
    "Updating version.ts",
    { filePath: "./version.ts" },
  );

  assertExists(operationId);
  const diagnostics = tracker.getDiagnostics();
  assertEquals(diagnostics.operationCount, 1);
  assertEquals(diagnostics.operationSequence.length, 1);

  const operation = diagnostics.operations[0];
  assertEquals(operation.type, OperationType.FILE_UPDATE);
  assertEquals(operation.state, OperationState.PENDING);
  assertEquals(operation.description, "Updating version.ts");
  assertEquals(operation.metadata.filePath, "./version.ts");
});

Deno.test("ReleaseStateTracker - trackOperation with rollback function", async () => {
  const logger = createTestLogger();
  const tracker = new ReleaseStateTracker(logger);

  let rollbackCalled = false;
  const rollbackFn = async () => {
    rollbackCalled = true;
  };

  const operationId = tracker.trackOperation(
    OperationType.GIT_COMMIT,
    "Creating release commit",
    { commitHash: "abc123" },
    rollbackFn,
  );

  tracker.markCompleted(operationId);

  // Trigger rollback
  await tracker.performRollback();

  assertEquals(rollbackCalled, true);
});

// =============================================================================
// State Management Tests
// =============================================================================

Deno.test("ReleaseStateTracker - markInProgress updates state", () => {
  const logger = createTestLogger();
  const tracker = new ReleaseStateTracker(logger);

  const operationId = tracker.trackOperation(
    OperationType.FILE_BACKUP,
    "Backing up files",
  );

  tracker.markInProgress(operationId);

  const diagnostics = tracker.getDiagnostics();
  const operation = diagnostics.operations[0];
  assertEquals(operation.state, OperationState.IN_PROGRESS);
});

Deno.test("ReleaseStateTracker - markCompleted updates state and metadata", () => {
  const logger = createTestLogger();
  const tracker = new ReleaseStateTracker(logger);

  const operationId = tracker.trackOperation(
    OperationType.GIT_TAG,
    "Creating tag v1.0.0",
  );

  tracker.markCompleted(operationId, { tagName: "v1.0.0" });

  const diagnostics = tracker.getDiagnostics();
  const operation = diagnostics.operations[0];
  assertEquals(operation.state, OperationState.COMPLETED);
  assertEquals(operation.metadata.tagName, "v1.0.0");
});

Deno.test("ReleaseStateTracker - markFailed updates state with error", () => {
  const logger = createTestLogger();
  const tracker = new ReleaseStateTracker(logger);

  const operationId = tracker.trackOperation(
    OperationType.GITHUB_RELEASE,
    "Creating GitHub release",
  );

  tracker.markFailed(operationId, "Authentication failed");

  const diagnostics = tracker.getDiagnostics();
  const operation = diagnostics.operations[0];
  assertEquals(operation.state, OperationState.FAILED);
  assertEquals(operation.metadata.error, "Authentication failed");
});

// =============================================================================
// Query Operations Tests
// =============================================================================

Deno.test("ReleaseStateTracker - getOperationsByType filters correctly", async () => {
  const logger = createTestLogger();
  const tracker = new ReleaseStateTracker(logger);

  // Add small delays to ensure unique timestamps in IDs
  tracker.trackOperation(OperationType.FILE_UPDATE, "Update 1");
  await new Promise((resolve) => setTimeout(resolve, 1));
  tracker.trackOperation(OperationType.GIT_COMMIT, "Commit 1");
  await new Promise((resolve) => setTimeout(resolve, 1));
  tracker.trackOperation(OperationType.FILE_UPDATE, "Update 2");
  await new Promise((resolve) => setTimeout(resolve, 1));
  tracker.trackOperation(OperationType.GIT_TAG, "Tag 1");

  const fileOps = tracker.getOperationsByType(OperationType.FILE_UPDATE);
  assertEquals(fileOps.length, 2);

  const gitOps = tracker.getOperationsByType(OperationType.GIT_COMMIT);
  assertEquals(gitOps.length, 1);
  assertEquals(gitOps[0].description, "Commit 1");
});

Deno.test("ReleaseStateTracker - getOperationsByState filters correctly", () => {
  const logger = createTestLogger();
  const tracker = new ReleaseStateTracker(logger);

  const op1 = tracker.trackOperation(OperationType.FILE_UPDATE, "Op 1");
  const op2 = tracker.trackOperation(OperationType.GIT_COMMIT, "Op 2");
  const op3 = tracker.trackOperation(OperationType.GIT_TAG, "Op 3");

  tracker.markInProgress(op1);
  tracker.markCompleted(op2);
  tracker.markFailed(op3, "Error");

  const pending = tracker.getOperationsByState(OperationState.PENDING);
  assertEquals(pending.length, 0);

  const inProgress = tracker.getOperationsByState(OperationState.IN_PROGRESS);
  assertEquals(inProgress.length, 1);
  assertEquals(inProgress[0].description, "Op 1");

  const completed = tracker.getOperationsByState(OperationState.COMPLETED);
  assertEquals(completed.length, 1);
  assertEquals(completed[0].description, "Op 2");

  const failed = tracker.getOperationsByState(OperationState.FAILED);
  assertEquals(failed.length, 1);
  assertEquals(failed[0].description, "Op 3");
});

// =============================================================================
// Summary Tests
// =============================================================================

Deno.test("ReleaseStateTracker - getSummary provides correct counts", async () => {
  const logger = createTestLogger();
  const tracker = new ReleaseStateTracker(logger);

  const op1 = tracker.trackOperation(OperationType.FILE_UPDATE, "Op 1");
  await new Promise((resolve) => setTimeout(resolve, 1));
  const op2 = tracker.trackOperation(OperationType.FILE_UPDATE, "Op 2");
  await new Promise((resolve) => setTimeout(resolve, 1));
  const op3 = tracker.trackOperation(OperationType.GIT_COMMIT, "Op 3");
  await new Promise((resolve) => setTimeout(resolve, 1));
  const op4 = tracker.trackOperation(OperationType.GIT_TAG, "Op 4");

  tracker.markCompleted(op1);
  tracker.markCompleted(op2);
  tracker.markInProgress(op3);
  tracker.markFailed(op4, "Error");

  const summary = tracker.getSummary();

  assertEquals(summary.total, 4);
  assertEquals(summary.byType[OperationType.FILE_UPDATE], 2);
  assertEquals(summary.byType[OperationType.GIT_COMMIT], 1);
  assertEquals(summary.byType[OperationType.GIT_TAG], 1);

  assertEquals(summary.byState[OperationState.COMPLETED], 2);
  assertEquals(summary.byState[OperationState.IN_PROGRESS], 1);
  assertEquals(summary.byState[OperationState.FAILED], 1);
});

// =============================================================================
// Rollback Tests
// =============================================================================

Deno.test("ReleaseStateTracker - performRollback reverses operations in LIFO order", async () => {
  const logger = createTestLogger();
  const tracker = new ReleaseStateTracker(logger);

  const rollbackOrder: string[] = [];

  // Mock git commands for verification
  const originalCommand = (Deno as any).Command;
  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}

    output = async () => {
      const args = this.options?.args || [];

      // Mock git tag verification (check if tag exists)
      if (this.cmd === "git" && args[0] === "tag" && args[1] === "-l") {
        // Return empty to indicate tag doesn't exist (rollback successful)
        return {
          success: true,
          code: 0,
          stdout: new Uint8Array(), // Empty means tag doesn't exist
          stderr: new Uint8Array(),
        };
      }

      // Mock git rev-parse for commit verification
      if (this.cmd === "git" && args[0] === "rev-parse" && args[1] === "HEAD") {
        // Return the expected commit after rollback
        return {
          success: true,
          code: 0,
          stdout: new TextEncoder().encode("abc123\n"),
          stderr: new Uint8Array(),
        };
      }

      // Mock git reset for commit rollback
      if (this.cmd === "git" && args[0] === "reset") {
        return {
          success: true,
          code: 0,
          stdout: new Uint8Array(),
          stderr: new Uint8Array(),
        };
      }

      // Mock git tag delete
      if (this.cmd === "git" && args[0] === "tag" && args[1] === "-d") {
        return {
          success: true,
          code: 0,
          stdout: new Uint8Array(),
          stderr: new Uint8Array(),
        };
      }

      // Default response
      return {
        success: true,
        code: 0,
        stdout: new Uint8Array(),
        stderr: new Uint8Array(),
      };
    };
  };

  try {
    const op1 = tracker.trackOperation(
      OperationType.FILE_UPDATE,
      "First",
      {},
      async () => {
        rollbackOrder.push("First");
      },
    );

    const op2 = tracker.trackOperation(
      OperationType.GIT_COMMIT,
      "Second",
      { previousCommit: "abc123" },
      async () => {
        rollbackOrder.push("Second");
      },
    );

    const op3 = tracker.trackOperation(
      OperationType.GIT_TAG,
      "Third",
      { tagName: "v1.0.0" },
      async () => {
        rollbackOrder.push("Third");
      },
    );

    // Mark all as completed
    tracker.markCompleted(op1);
    tracker.markCompleted(op2);
    tracker.markCompleted(op3);

    const result = await tracker.performRollback();

    assertEquals(result.success, true);
    assertEquals(result.rolledBackOperations.length, 3);
    // Should rollback in reverse order (LIFO)
    assertEquals(rollbackOrder, ["Third", "Second", "First"]);
  } finally {
    // Restore original Command
    (Deno as any).Command = originalCommand;
  }
});

Deno.test("ReleaseStateTracker - performRollback only rolls back completed operations", async () => {
  const logger = createTestLogger();
  const tracker = new ReleaseStateTracker(logger);

  let rollbackCount = 0;
  const rollbackFn = async () => {
    rollbackCount++;
  };

  const op1 = tracker.trackOperation(OperationType.FILE_UPDATE, "Op 1", {}, rollbackFn);
  const op2 = tracker.trackOperation(OperationType.GIT_COMMIT, "Op 2", {}, rollbackFn);
  const op3 = tracker.trackOperation(OperationType.GIT_TAG, "Op 3", {}, rollbackFn);
  const op4 = tracker.trackOperation(OperationType.GIT_PUSH, "Op 4", {}, rollbackFn);

  tracker.markCompleted(op1);
  tracker.markInProgress(op2); // Not completed
  tracker.markFailed(op3, "Error"); // Failed
  tracker.markCompleted(op4);

  const result = await tracker.performRollback();

  assertEquals(result.success, true);
  assertEquals(result.rolledBackOperations.length, 2); // Only op1 and op4
  assertEquals(rollbackCount, 2);
});

Deno.test("ReleaseStateTracker - performRollback handles rollback failures", async () => {
  const logger = createTestLogger();
  const tracker = new ReleaseStateTracker(logger);

  const successfulRollback = async () => {};
  const failingRollback = async () => {
    throw new Error("Rollback failed");
  };

  const op1 = tracker.trackOperation(
    OperationType.FILE_UPDATE,
    "Success",
    {},
    successfulRollback,
  );

  const op2 = tracker.trackOperation(
    OperationType.GIT_COMMIT,
    "Failure",
    {},
    failingRollback,
  );

  tracker.markCompleted(op1);
  tracker.markCompleted(op2);

  const result = await tracker.performRollback();

  assertEquals(result.success, false);
  assertEquals(result.rolledBackOperations.length, 1);
  assertEquals(result.failedRollbacks.length, 1);
  assertEquals(result.failedRollbacks[0].operation.description, "Failure");
  assertExists(result.error);
});

// =============================================================================
// Built-in Rollback Tests (Mocked)
// =============================================================================

Deno.test("ReleaseStateTracker - rollback FILE_BACKUP operation (no-op)", async () => {
  const logger = createTestLogger();
  const tracker = new ReleaseStateTracker(logger);

  const op = tracker.trackOperation(
    OperationType.FILE_BACKUP,
    "Backup operation",
    { backupId: "backup-123" },
  );

  tracker.markCompleted(op);

  const result = await tracker.performRollback();

  // FILE_BACKUP operations don't need rollback
  assertEquals(result.success, true);
  assertEquals(result.rolledBackOperations.length, 1);
});

Deno.test("ReleaseStateTracker - rollback GIT_TAG with mocked git commands", async () => {
  const logger = createTestLogger();
  const tracker = new ReleaseStateTracker(logger);

  // Mock Deno.Command for git operations
  const originalCommand = Deno.Command;
  let deletedLocalTag = false;
  let deletedRemoteTag = false;

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}

    output = async () => {
      const args = this.options?.args || [];

      if (this.cmd === "git" && args[0] === "tag" && args[1] === "-d") {
        deletedLocalTag = true;
        return {
          success: true,
          code: 0,
          stdout: new Uint8Array(),
          stderr: new Uint8Array(),
        };
      }

      if (this.cmd === "git" && args[0] === "push" && args[1]?.includes(":refs/tags/")) {
        deletedRemoteTag = true;
        return {
          success: true,
          code: 0,
          stdout: new Uint8Array(),
          stderr: new Uint8Array(),
        };
      }

      // Default response
      return {
        success: true,
        code: 0,
        stdout: new Uint8Array(),
        stderr: new Uint8Array(),
      };
    };
  };

  try {
    const op = tracker.trackOperation(
      OperationType.GIT_TAG,
      "Create tag v1.0.0",
      { tagName: "v1.0.0", remote: "origin" },
    );

    tracker.markCompleted(op);

    const result = await tracker.performRollback();

    assertEquals(result.success, true);
    assertEquals(deletedLocalTag, true);
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
  }
});

// =============================================================================
// Utility Tests
// =============================================================================

Deno.test("ReleaseStateTracker - clear removes all operations", () => {
  const logger = createTestLogger();
  const tracker = new ReleaseStateTracker(logger);

  tracker.trackOperation(OperationType.FILE_UPDATE, "Op 1");
  tracker.trackOperation(OperationType.GIT_COMMIT, "Op 2");
  tracker.trackOperation(OperationType.GIT_TAG, "Op 3");

  let diagnostics = tracker.getDiagnostics();
  assertEquals(diagnostics.operationCount, 3);

  tracker.clear();

  diagnostics = tracker.getDiagnostics();
  assertEquals(diagnostics.operationCount, 0);
  assertEquals(diagnostics.operationSequence.length, 0);
});

Deno.test("ReleaseStateTracker - getDiagnostics provides complete information", () => {
  const logger = createTestLogger();
  const customId = "test-release";
  const tracker = new ReleaseStateTracker(logger, customId);

  const op1 = tracker.trackOperation(OperationType.FILE_UPDATE, "Op 1");
  const op2 = tracker.trackOperation(OperationType.GIT_COMMIT, "Op 2");

  tracker.markCompleted(op1);
  tracker.markInProgress(op2);

  const diagnostics = tracker.getDiagnostics();

  assertEquals(diagnostics.releaseId, customId);
  assertEquals(diagnostics.operationCount, 2);
  assertEquals(diagnostics.operationSequence.length, 2);
  assertEquals(diagnostics.operations.length, 2);

  // Check operation details
  const [firstOp, secondOp] = diagnostics.operations;
  assertEquals(firstOp.description, "Op 1");
  assertEquals(firstOp.state, OperationState.COMPLETED);
  assertEquals(secondOp.description, "Op 2");
  assertEquals(secondOp.state, OperationState.IN_PROGRESS);
});
