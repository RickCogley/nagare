/**
 * @fileoverview RollbackManager for handling release rollbacks
 * Provides safe rollback functionality for failed releases
 */

import type { NagareConfig } from '../types.ts';
import { GitOperations } from './git-operations.ts';
import { Logger, LogLevel } from './logger.ts';

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
      this.logger.info('🔄 Starting release rollback...\n');

      // Validate git repository
      if (!await this.git.isGitRepository()) {
        throw new Error('Not in a git repository');
      }

      // Get current state
      const lastCommit = await this.git.getLastCommitMessage();
      const localTags = await this.git.getLocalTags();

      this.logger.info(`📝 Last commit: ${lastCommit}`);
      this.logger.info(`🏷️  Local tags: ${localTags.length} found`);

      // Detect if last commit is a release commit
      const isReleaseCommit = lastCommit.includes('chore(release): bump version to');
      let versionToRollback = targetVersion;

      if (!versionToRollback && isReleaseCommit) {
        const versionMatch = lastCommit.match(/bump version to (.+)$/);
        if (versionMatch) {
          versionToRollback = versionMatch[1];
        }
      }

      if (!versionToRollback) {
        this.logger.info('❓ Enter the version to rollback (e.g., 1.1.0):');
        const userInput = prompt('Version:');
        if (!versionToRollback) {
          return { success: false, error: 'No version specified' };
        }
      }

      this.logger.info(`\n🎯 Rolling back version: ${versionToRollback}`);

      // Confirm rollback
      if (!this.config.options?.skipConfirmation) {
        const proceed = confirm('\n❓ This will undo release changes. Continue?');
        if (!proceed) {
          this.logger.info('❌ Rollback cancelled');
          return { success: false, error: 'User cancelled' };
        }
      }

      const rollbackActions: string[] = [];

      // 1. Remove local tag if it exists
      const tagPrefix = this.config.options?.tagPrefix || 'v';
      const tagName = `${tagPrefix}${versionToRollback}`;
      
      if (localTags.includes(tagName)) {
        this.logger.info(`🗑️  Removing local tag: ${tagName}`);
        await this.git.deleteLocalTag(tagName);
        rollbackActions.push(`Removed local tag ${tagName}`);
      }

      // 2. Reset to previous commit if last commit is a release commit
      if (isReleaseCommit) {
        this.logger.info('⏪ Resetting to previous commit (before release)');
        await this.git.resetToCommit('HEAD~1', true);
        rollbackActions.push('Reset to previous commit');
      } else {
        this.logger.info('ℹ️  Last commit is not a release commit, skipping reset');
      }

      // 3. Try to remove remote tag if it exists
      if (await this.git.remoteTagExists(tagName)) {
        const deleteRemote = this.config.options?.skipConfirmation || 
          confirm(`🗑️  Remote tag ${tagName} exists. Delete it?`);
        
        if (deleteRemote) {
          try {
            await this.git.deleteRemoteTag(tagName);
            rollbackActions.push(`Deleted remote tag ${tagName}`);
          } catch (error) {
            this.logger.warn(`⚠️  Could not delete remote tag: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      this.logger.info('\n✅ Rollback completed successfully!');
      this.logger.info('\n📋 Actions taken:');
      rollbackActions.forEach(action => this.logger.info(`   ✓ ${action}`));

      this.logger.info('\n📌 Next steps:');
      this.logger.info('   1. Verify your files are in the correct state');
      this.logger.info('   2. Fix any issues that caused the release to fail');
      this.logger.info('   3. Try the release again when ready');

      return { 
        success: true, 
        actions: rollbackActions 
      };

    } catch (error) {
      this.logger.error('\n❌ Error during rollback:', error as Error);
      return { 
        success: false, 
        error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) 
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