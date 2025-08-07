/**
 * @fileoverview RollbackManager for handling release rollbacks
 * Provides safe rollback functionality for failed releases
 */

import type { NagareConfig } from "../../types.ts";
import { GitOperations } from "../git/git-operations.ts";
import { Logger, LogLevel } from "../core/logger.ts";
import { sanitizeErrorMessage, validateVersion } from "../validation/security-utils.ts";
import { ErrorFactory } from "../core/enhanced-error.ts";
import { confirmI18n } from "../utils/cli-utils.ts";
import { t } from "../core/i18n.ts";

/**
 * Result of a rollback operation
 */
export interface RollbackResult {
  /** Whether the rollback was successful */
  success: boolean;
  /** Error message if rollback failed */
  error?: string;
  /** List of actions taken during rollback */
  actions?: string[];
}

/**
 * RollbackManager - Handles release rollbacks
 */
export class RollbackManager {
  private config: NagareConfig;
  private git: GitOperations;
  private logger: Logger;

  constructor(config: NagareConfig) {
    this.config = config;
    this.git = new GitOperations(config);
    this.logger = new Logger(config.options?.logLevel || LogLevel.INFO);
  }

  /**
   * Rollback a release
   */
  async rollback(targetVersion?: string): Promise<RollbackResult> {
    try {
      this.logger.infoI18n("log.rollback.starting", { version: targetVersion || "latest" });

      // Log security audit event
      this.logger.audit("rollback_started", {
        targetVersion: targetVersion || "auto-detect",
        timestamp: new Date().toISOString(),
      });

      // Validate git repository
      if (!await this.git.isGitRepository()) {
        throw ErrorFactory.gitNotInitialized();
      }

      // Get current state
      const lastCommit = await this.git.getLastCommitMessage();
      const localTags = await this.git.getLocalTags();

      this.logger.info(`📝 Last commit: ${lastCommit}`);
      this.logger.info(`🏷️  Local tags: ${localTags.length} found`);

      // Detect if last commit is a release commit
      const isReleaseCommit = lastCommit.includes("chore(release): bump version to");
      let versionToRollback = targetVersion;

      if (!versionToRollback && isReleaseCommit) {
        const versionMatch = lastCommit.match(/bump version to (.+)$/);
        if (versionMatch) {
          versionToRollback = versionMatch[1];
        }
      }

      if (!versionToRollback) {
        this.logger.info("❓ Enter the version to rollback (e.g., 1.1.0):");
        const userInput = prompt("Version:");
        if (!userInput) {
          return { success: false, error: "No version specified" };
        }
        versionToRollback = userInput;
      }

      // Validate version for security
      try {
        versionToRollback = validateVersion(versionToRollback);
      } catch (error) {
        return {
          success: false,
          error: `Invalid version: ${sanitizeErrorMessage(error, false)}`,
        };
      }

      this.logger.info(`\n🎯 Rolling back version: ${versionToRollback}`);

      // Confirm rollback
      if (!this.config.options?.skipConfirmation) {
        const proceed = confirmI18n("prompts.undoRollback");
        if (!proceed) {
          this.logger.infoI18n("prompts.rollbackCancelled");
          return { success: false, error: "User cancelled" };
        }
      }

      const rollbackActions: string[] = [];

      // 1. Remove local tag if it exists
      const tagPrefix = this.config.options?.tagPrefix || "v";
      const tagName = `${tagPrefix}${versionToRollback}`;

      if (localTags.includes(tagName)) {
        this.logger.infoI18n("log.rollback.removingTag", { tag: tagName });
        await this.git.deleteLocalTag(tagName);
        rollbackActions.push(`Removed local tag ${tagName}`);
      }

      // 2. Reset to previous commit if last commit is a release commit
      if (isReleaseCommit) {
        this.logger.info("⏪ Resetting to previous commit (before release)");
        await this.git.resetToCommit("HEAD~1", true);
        rollbackActions.push("Reset to previous commit");
      } else {
        this.logger.info("ℹ️  Last commit is not a release commit, skipping reset");
      }

      // 3. Try to remove remote tag if it exists
      if (await this.git.remoteTagExists(tagName)) {
        const deleteRemote = this.config.options?.skipConfirmation ||
          confirmI18n("prompts.deleteRemoteTag", { tag: tagName });

        if (deleteRemote) {
          try {
            await this.git.deleteRemoteTag(tagName);
            rollbackActions.push(`Deleted remote tag ${tagName}`);
          } catch (error) {
            this.logger.warn(
              `⚠️  Could not delete remote tag: ${sanitizeErrorMessage(error, false)}`,
            );
          }
        }
      }

      this.logger.info(t("log.rollback.success", { version: versionToRollback }));
      this.logger.info("\n📋 Actions taken:");
      rollbackActions.forEach((action) => this.logger.info(`   ✓ ${action}`));

      this.logger.info("\n📌 Next steps:");
      this.logger.info("   1. Verify your files are in the correct state");
      this.logger.info("   2. Fix any issues that caused the release to fail");
      this.logger.info("   3. Try the release again when ready");

      // Log security audit event for successful rollback
      this.logger.audit("rollback_completed", {
        version: versionToRollback,
        actionsCount: rollbackActions.length,
        actions: rollbackActions,
      });

      return {
        success: true,
        actions: rollbackActions,
      };
    } catch (error) {
      this.logger.error("\n❌ Error during rollback:", error as Error);

      // Log security audit event for failed rollback
      this.logger.audit("rollback_failed", {
        error: sanitizeErrorMessage(error, false),
      });

      return {
        success: false,
        error: sanitizeErrorMessage(error, false),
      };
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): NagareConfig {
    return this.config;
  }
}
