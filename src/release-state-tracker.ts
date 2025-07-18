/**
 * @fileoverview Release State Tracker - Comprehensive rollback management
 * @description Tracks all operations during release for complete rollback capability
 * @since 2.10.0
 */

import type { Logger } from "./logger.ts";

/**
 * Types of operations that can be tracked and rolled back
 */
export enum OperationType {
  FILE_BACKUP = "file_backup",
  FILE_UPDATE = "file_update",
  GIT_COMMIT = "git_commit",
  GIT_TAG = "git_tag",
  GIT_PUSH = "git_push",
  GITHUB_RELEASE = "github_release",
  JSR_PUBLISH = "jsr_publish",
}

/**
 * State of a tracked operation
 */
export enum OperationState {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  ROLLED_BACK = "rolled_back",
}

/**
 * Metadata for different operation types
 */
export interface OperationMetadata {
  // File operations
  filePath?: string;
  backupId?: string;

  // Git operations
  commitHash?: string;
  tagName?: string;
  remote?: string;
  branch?: string;
  previousCommit?: string;

  // GitHub operations
  releaseId?: number;
  releaseUrl?: string;

  // JSR operations
  jsrUrl?: string;
  packageName?: string;

  // General
  timestamp: Date;
  version?: string;
  [key: string]: unknown;
}

/**
 * A tracked operation that can be rolled back
 */
export interface TrackedOperation {
  id: string;
  type: OperationType;
  state: OperationState;
  metadata: OperationMetadata;
  rollbackFn?: () => Promise<void>;
  description: string;
}

/**
 * Result of a rollback operation
 */
export interface RollbackResult {
  success: boolean;
  rolledBackOperations: TrackedOperation[];
  failedRollbacks: Array<{
    operation: TrackedOperation;
    error: string;
  }>;
  error?: string;
}

/**
 * Comprehensive release state tracker for complete rollback capability
 *
 * This class tracks EVERY operation during the release process, allowing
 * for complete rollback in case of failure. No more manual cleanup!
 */
export class ReleaseStateTracker {
  private readonly logger: Logger;
  private operations: Map<string, TrackedOperation> = new Map();
  private operationSequence: string[] = []; // Track order for proper rollback sequence
  private releaseId: string;

  constructor(logger: Logger, releaseId?: string) {
    this.logger = logger;
    this.releaseId = releaseId || `release-${Date.now().toString(36)}`;
  }

  /**
   * Track a new operation
   */
  trackOperation(
    type: OperationType,
    description: string,
    metadata: Partial<OperationMetadata> = {},
    rollbackFn?: () => Promise<void>,
  ): string {
    const operationId = `${this.releaseId}-${type}-${Date.now().toString(36)}`;

    const operation: TrackedOperation = {
      id: operationId,
      type,
      state: OperationState.PENDING,
      description,
      metadata: {
        timestamp: new Date(),
        ...metadata,
      },
      rollbackFn,
    };

    this.operations.set(operationId, operation);
    this.operationSequence.push(operationId);

    this.logger.debug(`📝 Tracked operation: ${type} - ${description}`);

    return operationId;
  }

  /**
   * Mark an operation as in progress
   */
  markInProgress(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.state = OperationState.IN_PROGRESS;
      this.logger.debug(`⏳ Operation in progress: ${operation.description}`);
    }
  }

  /**
   * Mark an operation as completed with optional metadata update
   */
  markCompleted(operationId: string, additionalMetadata: Partial<OperationMetadata> = {}): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.state = OperationState.COMPLETED;
      operation.metadata = { ...operation.metadata, ...additionalMetadata };
      this.logger.debug(`✅ Operation completed: ${operation.description}`);
    }
  }

  /**
   * Mark an operation as failed
   */
  markFailed(operationId: string, error: string): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.state = OperationState.FAILED;
      operation.metadata.error = error;
      this.logger.debug(`❌ Operation failed: ${operation.description} - ${error}`);
    }
  }

  /**
   * Get all operations of a specific type
   */
  getOperationsByType(type: OperationType): TrackedOperation[] {
    return Array.from(this.operations.values()).filter((op) => op.type === type);
  }

  /**
   * Get operations in a specific state
   */
  getOperationsByState(state: OperationState): TrackedOperation[] {
    return Array.from(this.operations.values()).filter((op) => op.state === state);
  }

  /**
   * Get summary of all operations
   */
  getSummary(): {
    total: number;
    byType: Record<OperationType, number>;
    byState: Record<OperationState, number>;
  } {
    const operations = Array.from(this.operations.values());

    const byType = {} as Record<OperationType, number>;
    const byState = {} as Record<OperationState, number>;

    for (const op of operations) {
      byType[op.type] = (byType[op.type] || 0) + 1;
      byState[op.state] = (byState[op.state] || 0) + 1;
    }

    return {
      total: operations.length,
      byType,
      byState,
    };
  }

  /**
   * Perform complete rollback of all completed operations
   *
   * CRITICAL: This reverses ALL operations in reverse order, ensuring
   * complete cleanup of the release attempt.
   */
  async performRollback(): Promise<RollbackResult> {
    this.logger.info("🔄 Starting comprehensive rollback...");

    const rolledBackOperations: TrackedOperation[] = [];
    const failedRollbacks: Array<{ operation: TrackedOperation; error: string }> = [];

    // Get completed operations in reverse order (LIFO)
    const operationsToRollback = this.operationSequence
      .filter((id) => {
        const op = this.operations.get(id);
        return op && op.state === OperationState.COMPLETED;
      })
      .reverse() // Critical: reverse order
      .map((id) => this.operations.get(id)!)
      .filter(Boolean);

    this.logger.info(`🎯 Rolling back ${operationsToRollback.length} operations...`);

    for (const operation of operationsToRollback) {
      try {
        this.logger.info(`🔄 Rolling back: ${operation.description}`);

        // Use custom rollback function if provided
        if (operation.rollbackFn) {
          await operation.rollbackFn();
        } else {
          // Use built-in rollback based on operation type
          await this.performBuiltInRollback(operation);
        }

        // Verify the rollback actually worked
        const verificationResult = await this.verifyRollback(operation);
        if (verificationResult.success) {
          operation.state = OperationState.ROLLED_BACK;
          rolledBackOperations.push(operation);
          this.logger.info(`✅ Rolled back: ${operation.description}`);
        } else {
          failedRollbacks.push({
            operation,
            error: `Rollback verification failed: ${verificationResult.error}`,
          });
          this.logger.error(
            `❌ Rollback verification failed: ${operation.description} - ${verificationResult.error}`,
          );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`❌ Failed to rollback: ${operation.description} - ${errorMessage}`);

        failedRollbacks.push({
          operation,
          error: errorMessage,
        });
      }
    }

    const success = failedRollbacks.length === 0;

    if (success) {
      this.logger.info(
        `✅ Rollback completed successfully - ${rolledBackOperations.length} operations reversed`,
      );
    } else {
      this.logger.error(
        `⚠️  Rollback partially failed - ${failedRollbacks.length} operations could not be reversed`,
      );

      // Log failed rollbacks for manual intervention
      for (const failure of failedRollbacks) {
        this.logger.error(`   ❌ ${failure.operation.description}: ${failure.error}`);
      }
    }

    return {
      success,
      rolledBackOperations,
      failedRollbacks,
      error: success ? undefined : `${failedRollbacks.length} operations failed to rollback`,
    };
  }

  /**
   * Built-in rollback implementations for standard operations
   */
  private async performBuiltInRollback(operation: TrackedOperation): Promise<void> {
    switch (operation.type) {
      case OperationType.GIT_TAG:
        await this.rollbackGitTag(operation);
        break;

      case OperationType.GIT_PUSH:
        await this.rollbackGitPush(operation);
        break;

      case OperationType.GIT_COMMIT:
        await this.rollbackGitCommit(operation);
        break;

      case OperationType.GITHUB_RELEASE:
        await this.rollbackGithubRelease(operation);
        break;

      default:
        throw new Error(`No built-in rollback available for operation type: ${operation.type}`);
    }
  }

  /**
   * Rollback git tag (local and remote)
   */
  private async rollbackGitTag(operation: TrackedOperation): Promise<void> {
    const tagName = operation.metadata.tagName;
    if (!tagName) {
      throw new Error("Tag name not found in operation metadata");
    }

    this.logger.debug(`🔄 Rolling back git tag: ${tagName}`);

    // First, check if the tag exists remotely (only if we have remote info)
    let remoteTagExists = false;
    const remote = operation.metadata.remote as string;

    if (remote) {
      try {
        const checkRemoteCmd = new Deno.Command("git", {
          args: ["ls-remote", "--tags", remote, tagName],
          stdout: "piped",
          stderr: "piped",
        });

        const result = await checkRemoteCmd.output();
        const output = new TextDecoder().decode(result.stdout);
        remoteTagExists = output.trim().length > 0 && result.success;

        this.logger.debug(`🔍 Remote tag ${tagName} exists: ${remoteTagExists}`);
      } catch (error) {
        this.logger.debug(`Failed to check remote tag existence: ${error}`);
      }
    }

    // Delete remote tag first (if it exists)
    if (remoteTagExists && remote) {
      try {
        this.logger.debug(`🗑️  Deleting remote tag: ${tagName} from ${remote}`);

        const deleteRemoteCmd = new Deno.Command("git", {
          args: ["push", remote, `:refs/tags/${tagName}`],
          stdout: "piped",
          stderr: "piped",
        });

        const result = await deleteRemoteCmd.output();
        if (!result.success) {
          const error = new TextDecoder().decode(result.stderr);
          // Only warn for actual errors, not "not found"
          if (!error.includes("not found") && !error.includes("unable to delete")) {
            this.logger.warn(`Failed to delete remote tag ${tagName}: ${error}`);
          }
        } else {
          this.logger.debug(`✅ Deleted remote tag: ${tagName}`);
        }
      } catch (error) {
        this.logger.warn(`Failed to delete remote tag ${tagName}: ${error}`);
      }
    }

    // Delete local tag
    try {
      this.logger.debug(`🗑️  Deleting local tag: ${tagName}`);

      const deleteLocalCmd = new Deno.Command("git", {
        args: ["tag", "-d", tagName],
        stdout: "piped",
        stderr: "piped",
      });

      const result = await deleteLocalCmd.output();
      if (!result.success) {
        const error = new TextDecoder().decode(result.stderr);
        // Only warn if tag actually exists (ignore "not found" errors)
        if (!error.includes("not found") && !error.includes("does not exist")) {
          this.logger.warn(`Failed to delete local tag ${tagName}: ${error}`);
        }
      } else {
        this.logger.debug(`✅ Deleted local tag: ${tagName}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete local tag ${tagName}: ${error}`);
    }
  }

  /**
   * Rollback git push (reset remote branch)
   */
  private async rollbackGitPush(operation: TrackedOperation): Promise<void> {
    const remote = operation.metadata.remote || "origin";
    const branch = operation.metadata.branch || "main";
    const previousCommit = operation.metadata.previousCommit;

    if (!previousCommit) {
      this.logger.warn("No previous commit found - cannot rollback git push");
      return;
    }

    // Force push the previous commit to reset remote branch
    const resetCmd = new Deno.Command("git", {
      args: ["push", "--force-with-lease", remote as string, `${previousCommit}:${branch}`],
      stdout: "piped",
      stderr: "piped",
    });

    const result = await resetCmd.output();
    if (!result.success) {
      const error = new TextDecoder().decode(result.stderr);
      throw new Error(`Failed to reset remote branch: ${error}`);
    }

    this.logger.debug(`↩️  Reset remote ${remote}/${branch} to ${previousCommit}`);
  }

  /**
   * Rollback git commit (reset to previous commit)
   */
  private async rollbackGitCommit(operation: TrackedOperation): Promise<void> {
    const previousCommit = operation.metadata.previousCommit;

    if (!previousCommit) {
      throw new Error("No previous commit found in operation metadata");
    }

    // Reset to previous commit (soft reset to preserve working directory)
    const resetCmd = new Deno.Command("git", {
      args: ["reset", "--soft", previousCommit as string],
      stdout: "piped",
      stderr: "piped",
    });

    const result = await resetCmd.output();
    if (!result.success) {
      const error = new TextDecoder().decode(result.stderr);
      throw new Error(`Failed to reset to previous commit: ${error}`);
    }

    this.logger.debug(`↩️  Reset to previous commit: ${previousCommit}`);
  }

  /**
   * Rollback GitHub release
   */
  private async rollbackGithubRelease(operation: TrackedOperation): Promise<void> {
    const releaseId = operation.metadata.releaseId;
    const tagName = operation.metadata.tagName;

    if (!releaseId && !tagName) {
      throw new Error("Neither release ID nor tag name found in operation metadata");
    }

    try {
      // Use GitHub CLI to delete the release
      let deleteArgs: string[];

      if (releaseId) {
        // Delete by release ID (more reliable)
        deleteArgs = ["api", `repos/{owner}/{repo}/releases/${releaseId}`, "-X", "DELETE"];
      } else {
        // Delete by tag name (fallback)
        deleteArgs = ["release", "delete", tagName as string, "--yes"];
      }

      const deleteCmd = new Deno.Command("gh", {
        args: deleteArgs,
        stdout: "piped",
        stderr: "piped",
      });

      const result = await deleteCmd.output();
      if (!result.success) {
        const error = new TextDecoder().decode(result.stderr);
        // Only throw if release actually exists
        if (!error.includes("Not Found") && !error.includes("not found")) {
          throw new Error(`Failed to delete GitHub release: ${error}`);
        }
      }

      this.logger.debug(`🗑️  Deleted GitHub release: ${tagName || releaseId}`);
    } catch (error) {
      // Fallback: try alternative methods or log warning
      this.logger.warn(`Failed to delete GitHub release: ${error}`);
    }
  }

  /**
   * Verify that a rollback operation actually succeeded
   */
  private async verifyRollback(operation: TrackedOperation): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      switch (operation.type) {
        case OperationType.GIT_TAG:
          return await this.verifyTagRollback(operation);

        case OperationType.GIT_PUSH:
          return await this.verifyPushRollback(operation);

        case OperationType.GIT_COMMIT:
          return await this.verifyCommitRollback(operation);

        case OperationType.GITHUB_RELEASE:
          return await this.verifyGithubReleaseRollback(operation);

        default:
          // For operations without specific verification, assume success
          return { success: true };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Verify git tag rollback by checking if tag is actually gone
   */
  private async verifyTagRollback(operation: TrackedOperation): Promise<{
    success: boolean;
    error?: string;
  }> {
    const tagName = operation.metadata.tagName;
    if (!tagName) {
      return { success: false, error: "No tag name in metadata" };
    }

    // Check local tag
    try {
      const checkLocalCmd = new Deno.Command("git", {
        args: ["tag", "-l", tagName as string],
        stdout: "piped",
        stderr: "piped",
      });

      const result = await checkLocalCmd.output();
      const output = new TextDecoder().decode(result.stdout);

      if (result.success && output.trim().length > 0) {
        return { success: false, error: `Local tag ${tagName} still exists` };
      }
    } catch (error) {
      this.logger.warn(`Could not verify local tag deletion: ${error}`);
    }

    // Check remote tag if we have remote info
    const remote = operation.metadata.remote as string;
    if (remote) {
      try {
        const checkRemoteCmd = new Deno.Command("git", {
          args: ["ls-remote", "--tags", remote, tagName as string],
          stdout: "piped",
          stderr: "piped",
        });

        const result = await checkRemoteCmd.output();
        const output = new TextDecoder().decode(result.stdout);

        if (result.success && output.trim().length > 0) {
          return { success: false, error: `Remote tag ${tagName} still exists on ${remote}` };
        }
      } catch (error) {
        this.logger.warn(`Could not verify remote tag deletion: ${error}`);
      }
    }

    return { success: true };
  }

  /**
   * Verify git push rollback by checking remote state
   */
  private async verifyPushRollback(operation: TrackedOperation): Promise<{
    success: boolean;
    error?: string;
  }> {
    const remote = operation.metadata.remote || "origin";
    const branch = operation.metadata.branch || "main";
    const previousCommit = operation.metadata.previousCommit;

    if (!previousCommit) {
      return { success: true }; // Can't verify without previous commit
    }

    try {
      const checkRemoteCmd = new Deno.Command("git", {
        args: ["ls-remote", remote as string, `refs/heads/${branch}`],
        stdout: "piped",
        stderr: "piped",
      });

      const result = await checkRemoteCmd.output();
      if (!result.success) {
        return { success: false, error: "Could not check remote branch state" };
      }

      const output = new TextDecoder().decode(result.stdout);
      const remoteCommit = output.split(/\s+/)[0];

      // Check if remote commit matches our expected previous commit
      if (remoteCommit && remoteCommit.startsWith(previousCommit as string)) {
        return { success: true };
      } else {
        return {
          success: false,
          error: `Remote ${remote}/${branch} is at ${remoteCommit}, expected ${previousCommit}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to verify push rollback: ${error}`,
      };
    }
  }

  /**
   * Verify git commit rollback by checking current HEAD
   */
  private async verifyCommitRollback(operation: TrackedOperation): Promise<{
    success: boolean;
    error?: string;
  }> {
    const previousCommit = operation.metadata.previousCommit;

    if (!previousCommit) {
      return { success: false, error: "No previous commit in metadata" };
    }

    try {
      const getCurrentCmd = new Deno.Command("git", {
        args: ["rev-parse", "HEAD"],
        stdout: "piped",
        stderr: "piped",
      });

      const result = await getCurrentCmd.output();
      if (!result.success) {
        return { success: false, error: "Could not get current HEAD" };
      }

      const currentCommit = new TextDecoder().decode(result.stdout).trim();

      if (currentCommit.startsWith(previousCommit as string)) {
        return { success: true };
      } else {
        return {
          success: false,
          error: `HEAD is at ${currentCommit}, expected ${previousCommit}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to verify commit rollback: ${error}`,
      };
    }
  }

  /**
   * Verify GitHub release rollback by checking if release is gone
   */
  private async verifyGithubReleaseRollback(operation: TrackedOperation): Promise<{
    success: boolean;
    error?: string;
  }> {
    const tagName = operation.metadata.tagName;
    const releaseId = operation.metadata.releaseId;

    if (!tagName && !releaseId) {
      return { success: false, error: "No tag name or release ID in metadata" };
    }

    try {
      // Try to get the release
      let checkArgs: string[];
      if (releaseId) {
        checkArgs = ["api", `repos/{owner}/{repo}/releases/${releaseId}`, "--jq", ".tag_name"];
      } else {
        checkArgs = ["release", "view", tagName as string, "--json", "tagName"];
      }

      const checkCmd = new Deno.Command("gh", {
        args: checkArgs,
        stdout: "piped",
        stderr: "piped",
      });

      const result = await checkCmd.output();
      const errorOutput = new TextDecoder().decode(result.stderr);

      // If command failed and mentions "not found", rollback was successful
      if (
        !result.success && (errorOutput.includes("Not Found") || errorOutput.includes("not found"))
      ) {
        return { success: true };
      } else if (result.success) {
        return {
          success: false,
          error: `GitHub release for ${tagName || releaseId} still exists`,
        };
      } else {
        return {
          success: false,
          error: `Could not verify GitHub release deletion: ${errorOutput}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to verify GitHub release rollback: ${error}`,
      };
    }
  }

  /**
   * Clear all tracked operations (useful for testing)
   */
  clear(): void {
    this.operations.clear();
    this.operationSequence = [];
  }

  /**
   * Get diagnostic information for debugging
   */
  getDiagnostics(): {
    releaseId: string;
    operationCount: number;
    operationSequence: string[];
    operations: TrackedOperation[];
  } {
    return {
      releaseId: this.releaseId,
      operationCount: this.operations.size,
      operationSequence: this.operationSequence,
      operations: Array.from(this.operations.values()),
    };
  }
}
