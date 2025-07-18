/**
 * @fileoverview Core ReleaseManager implementation with intelligent file handlers
 * @description Extracted and generalized from Salty's release system with enhanced file update validation
 * @module release-manager
 * @since 1.0.0
 */

import type {
  BumpType,
  ConventionalCommit,
  FileUpdatePattern,
  NagareConfig,
  PreflightCheck,
  PreflightResult,
  ReleaseNotes,
  ReleaseResult,
  TemplateData,
} from "../types.ts";
import type { TranslationKey } from "../locales/schema.ts";
import {
  DEFAULT_COMMIT_TYPES,
  DEFAULT_CONFIG,
  isDangerousPattern,
  LogLevel,
  migrateDangerousPattern,
} from "../config.ts";
import { GitOperations } from "./git-operations.ts";
import { VersionUtils } from "./version-utils.ts";
import { ChangelogGenerator } from "./changelog-generator.ts";
import { GitHubIntegration } from "./github-integration.ts";
import { TemplateProcessor } from "./template-processor.ts";
import { DocGenerator } from "./doc-generator.ts";
import { Logger } from "./logger.ts";
import { FileHandlerManager } from "./file-handlers.ts";
import { sanitizeErrorMessage } from "./security-utils.ts";
import { ErrorCodes, ErrorFactory, NagareError } from "./enhanced-error.ts";
import { t } from "./i18n.ts";
import { confirmI18n } from "./cli-utils.ts";
import { JsrVerifier } from "./jsr-verifier.ts";
import { GitHubActionsMonitor } from "./github-actions-monitor.ts";
import { LogParser } from "./log-parser.ts";
import { AutoFixer } from "./auto-fixer.ts";
import { ProgressIndicator } from "./progress-indicator.ts";
import { BackupManager } from "./backup-manager.ts";

/**
 * Main ReleaseManager class - coordinates the entire release process
 *
 * @class ReleaseManager
 * @since 1.0.0
 *
 * @description
 * The ReleaseManager orchestrates all aspects of the release process including:
 * - Version calculation based on conventional commits
 * - File updates using intelligent handlers or custom patterns
 * - Changelog generation following Keep a Changelog format
 * - Git operations (tagging, pushing)
 * - GitHub release creation
 * - Documentation generation
 *
 * ## Release Flow
 *
 * 1. **Environment Validation** - Checks git repository, uncommitted changes
 * 2. **Version Calculation** - Analyzes commits to determine version bump
 * 3. **File Updates** - Updates version in configured files
 * 4. **Changelog Generation** - Creates/updates CHANGELOG.md
 * 5. **Git Operations** - Commits changes and creates tag
 * 6. **GitHub Release** - Creates release on GitHub (if configured)
 * 7. **Documentation** - Generates docs (if configured)
 *
 * @example Basic usage with automatic version detection
 * ```typescript
 * const config: NagareConfig = {
 *   project: { name: "My App", repository: "https://github.com/user/app" },
 *   versionFile: { path: "./version.ts", template: "typescript" }
 * };
 *
 * const manager = new ReleaseManager(config);
 * const result = await manager.release(); // Auto-detects version bump
 * if (result.success) {
 *   console.log(`Released version ${result.version}`);
 * }
 * ```
 *
 * @example CI/CD integration with skip confirmation
 * ```typescript
 * const config: NagareConfig = {
 *   project: { name: "My App", repository: "https://github.com/user/app" },
 *   versionFile: { path: "./version.ts", template: "typescript" },
 *   options: {
 *     skipConfirmation: true,  // No interactive prompts
 *     logLevel: LogLevel.DEBUG // Verbose output for CI logs
 *   }
 * };
 *
 * const manager = new ReleaseManager(config);
 * const result = await manager.release("patch");
 * ```
 *
 * @example With intelligent file handlers (v1.1.0+)
 * ```typescript
 * const config: NagareConfig = {
 *   project: { name: "My App", repository: "https://github.com/user/app" },
 *   versionFile: { path: "./version.ts", template: "typescript" },
 *   updateFiles: [
 *     { path: "./deno.json" },     // Auto-detected JSON handler
 *     { path: "./package.json" },  // Auto-detected JSON handler
 *     { path: "./README.md" },     // Auto-detected Markdown handler
 *     {
 *       path: "./custom.yaml",     // Custom pattern for edge cases
 *       patterns: {
 *         version: /^version:\s*['"]?([^'"]+)['"]?$/m
 *       }
 *     }
 *   ]
 * };
 * ```
 *
 * @example Dry run mode for testing
 * ```typescript
 * const config: NagareConfig = {
 *   project: { name: "My App", repository: "https://github.com/user/app" },
 *   versionFile: { path: "./version.ts", template: "typescript" },
 *   options: { dryRun: true }  // Preview without making changes
 * };
 *
 * const manager = new ReleaseManager(config);
 * const result = await manager.release();
 * // Shows what would happen without actually doing it
 * ```
 *
 * @example Custom commit type mappings
 * ```typescript
 * const config: NagareConfig = {
 *   project: { name: "My App", repository: "https://github.com/user/app" },
 *   versionFile: { path: "./version.ts", template: "typescript" },
 *   commitTypes: {
 *     feat: "added",      // New features
 *     fix: "fixed",       // Bug fixes
 *     perf: "improved",   // Performance improvements
 *     docs: "documented", // Documentation changes
 *     enhance: "enhanced" // Custom type
 *   }
 * };
 * ```
 */
export class ReleaseManager {
  private config: NagareConfig;
  private git: GitOperations;
  private versionUtils: VersionUtils;
  private changelogGenerator: ChangelogGenerator;
  private github: GitHubIntegration;
  private templateProcessor: TemplateProcessor;
  private docGenerator: DocGenerator;
  private logger: Logger;
  private fileHandlerManager: FileHandlerManager;
  private backupManager: BackupManager;

  /**
   * Create a new ReleaseManager instance
   *
   * @constructor
   * @param {NagareConfig} config - Release configuration
   *
   * @example
   * ```typescript
   * const manager = new ReleaseManager({
   *   project: { name: "My App", repository: "https://github.com/user/app" },
   *   versionFile: { path: "./version.ts", template: TemplateFormat.TYPESCRIPT }
   * });
   * ```
   */
  constructor(config: NagareConfig) {
    this.config = this.mergeWithDefaults(config);
    this.git = new GitOperations(this.config);
    this.versionUtils = new VersionUtils(this.config, this.git);
    this.changelogGenerator = new ChangelogGenerator(this.config);
    this.github = new GitHubIntegration(this.config);
    this.templateProcessor = new TemplateProcessor(this.config);
    this.docGenerator = new DocGenerator(this.config);
    this.logger = new Logger(this.config.options?.logLevel || LogLevel.INFO);
    this.fileHandlerManager = new FileHandlerManager();
    this.backupManager = new BackupManager(this.logger);
  }

  /**
   * Merge user config with defaults
   *
   * @private
   * @param {NagareConfig} config - User configuration
   * @returns {NagareConfig} Merged configuration with defaults
   */
  private mergeWithDefaults(config: NagareConfig): NagareConfig {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      versionFile: {
        ...DEFAULT_CONFIG.versionFile,
        ...config.versionFile,
      },
      releaseNotes: {
        ...DEFAULT_CONFIG.releaseNotes,
        ...config.releaseNotes,
      },
      github: {
        ...DEFAULT_CONFIG.github,
        ...config.github,
      },
      options: {
        ...DEFAULT_CONFIG.options,
        ...config.options,
      },
      commitTypes: {
        ...DEFAULT_COMMIT_TYPES,
        ...config.commitTypes,
      },
    } as NagareConfig;
  }

  /**
   * Validate file update patterns to detect dangerous configurations
   *
   * @private
   * @returns {Object} Validation result with warnings, errors, and suggestions
   * @returns {boolean} returns.valid - Whether all patterns are safe to use
   * @returns {string[]} returns.warnings - Warning messages about potentially dangerous patterns
   * @returns {string[]} returns.errors - Error messages about invalid patterns
   * @returns {string[]} returns.suggestions - Suggestions for using built-in handlers
   *
   * @since 1.1.0 - Added suggestions for built-in handlers
   */
  private validateFileUpdatePatterns(): {
    valid: boolean;
    warnings: string[];
    errors: string[];
    suggestions: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    const suggestions: string[] = [];

    if (!this.config.updateFiles || this.config.updateFiles.length === 0) {
      return { valid: true, warnings, errors, suggestions };
    }

    for (const filePattern of this.config.updateFiles) {
      // Check if this file has a built-in handler
      const hasHandler = this.fileHandlerManager.hasHandler(filePattern.path);

      if (hasHandler && !filePattern.patterns && !filePattern.updateFn) {
        suggestions.push(
          `✅ ${filePattern.path} will use built-in handler automatically`,
        );
      }

      if (!filePattern.patterns) continue;

      for (const [key, pattern] of Object.entries(filePattern.patterns)) {
        // Check for dangerous patterns
        if (isDangerousPattern(pattern, filePattern.path)) {
          const migration = migrateDangerousPattern(pattern, filePattern.path, key);

          if (migration.migrated) {
            warnings.push(
              `⚠️  Dangerous pattern detected in ${filePattern.path} for key "${key}"\n` +
                `   Pattern: ${pattern.source}\n` +
                `   Issue: This pattern may match unintended content\n` +
                `   Recommended: ${migration.pattern.source}\n` +
                `   ${migration.warning || ""}`,
            );
          } else {
            warnings.push(
              `⚠️  Potentially dangerous pattern in ${filePattern.path} for key "${key}"\n` +
                `   Pattern: ${pattern.source}\n` +
                `   Consider using more specific patterns with line anchors (^ or $)`,
            );
          }
        }

        // Validate pattern will match something reasonable
        if (key === "version" && !pattern.source.includes("version")) {
          warnings.push(
            `❓ Pattern for "version" key doesn't contain "version" in ${filePattern.path}\n` +
              `   This might not match what you expect: ${pattern.source}`,
          );
        }
      }
    }

    return { valid: errors.length === 0, warnings, errors, suggestions };
  }

  /**
   * Build safe replacement string for regex patterns
   *
   * @private
   * @param {RegExp} pattern - The regex pattern being used
   * @param {string} newValue - The new value to insert
   * @returns {string} Safe replacement string
   *
   * @description
   * Analyzes the regex pattern to determine the appropriate replacement format.
   * Handles common patterns for JSON, YAML, Markdown, and other formats.
   */
  private buildSafeReplacement(pattern: RegExp, newValue: string): string {
    const source = pattern.source;

    // Handle line-anchored JSON patterns (the safe ones)
    // This matches patterns like: ^(\s*)"version":\s*"([^"]+)"
    if (source.includes('^(\\s*)"version"') && source.includes(":")) {
      return `$1"version": "${newValue}"`;
    }

    // Handle other common JSON patterns
    if (source.includes('"version"') && source.includes("\\s*")) {
      return `"version": "${newValue}"`;
    }

    // Handle YAML patterns
    if (source.includes("version:")) {
      return `version: "${newValue}"`;
    }

    // Handle markdown badge patterns
    if (source.includes("Version\\s+")) {
      return `$1${newValue}$3`;
    }

    // Generic fallback - try to preserve capture groups
    const captureGroups = (source.match(/\(/g) || []).length;
    if (captureGroups >= 2) {
      return `$1"${newValue}"`;
    }

    // Last resort
    return `"${newValue}"`;
  }

  /**
   * Preview file updates in dry-run mode
   *
   * @private
   * @param {TemplateData} templateData - Template data for file updates
   * @returns {Promise<void>}
   *
   * @description
   * Shows what changes would be made to each file without actually modifying them.
   * Useful for verifying patterns work correctly before committing to changes.
   *
   * @since 1.1.0 - Enhanced with file handler information
   */
  private async previewFileUpdates(templateData: TemplateData): Promise<void> {
    if (!this.config.updateFiles || this.config.updateFiles.length === 0) {
      this.logger.infoI18n("log.release.noFiles");
      return;
    }

    this.logger.infoI18n("log.release.fileUpdatePreview");

    for (const filePattern of this.config.updateFiles) {
      try {
        const content = await Deno.readTextFile(filePattern.path);
        this.logger.info(`\n  ${t("log.release.filePreview", { path: filePattern.path })}`);

        // Check if using built-in handler
        const handler = this.fileHandlerManager.getHandler(filePattern.path);
        if (handler && !filePattern.patterns && !filePattern.updateFn) {
          this.logger.infoI18n("log.release.usingHandler", { handler: handler.name });

          // For built-in handlers, we need to determine which pattern key to use
          // Default to "version" for most handlers
          const keyToPreview = "version";

          // Special handling for different file types
          if (filePattern.path.endsWith(".md") || filePattern.path.endsWith(".markdown")) {
            // For markdown files, try multiple possible patterns
            const markdownKeys = ["shieldsBadge", "versionHeader", "npmInstall"];
            let foundMatch = false;

            for (const key of markdownKeys) {
              if (handler.patterns[key]) {
                const preview = await this.fileHandlerManager.previewChanges(
                  filePattern.path,
                  key,
                  templateData.version,
                );

                if (!preview.error && preview.matches.length > 0) {
                  for (const match of preview.matches) {
                    this.logger.info(
                      `    ✅ Line ${match.line}: "${match.original}" → "${match.updated}"`,
                    );
                  }
                  foundMatch = true;
                }
              }
            }

            if (!foundMatch) {
              this.logger.warnI18n("log.release.noMatches");
            }
            continue;
          }

          // Preview changes using the handler for non-markdown files
          const preview = await this.fileHandlerManager.previewChanges(
            filePattern.path,
            keyToPreview,
            templateData.version,
          );

          if (preview.error) {
            this.logger.error(`    ❌ Preview error: ${preview.error}`);
          } else if (preview.matches.length === 0) {
            this.logger.warn(`    ❌ No version found to update`);
          } else {
            for (const match of preview.matches) {
              this.logger.info(
                `    ✅ Line ${match.line}: "${match.original}" → "${match.updated}"`,
              );
            }
          }
          continue;
        }

        if (filePattern.updateFn) {
          this.logger.infoI18n("log.release.customFunction");
          continue;
        }

        // Handle pattern-based updates
        let hasChanges = false;
        for (const [key, pattern] of Object.entries(filePattern.patterns || {})) {
          const matches = [...content.matchAll(new RegExp(pattern.source, pattern.flags + "g"))];
          const value = this.getTemplateValue(templateData, key);

          if (matches.length === 0) {
            this.logger.warn(`    ❌ ${key}: No matches found`);
          } else if (matches.length === 1) {
            const replacement = this.buildSafeReplacement(pattern, value || "undefined");
            const actualReplacement = matches[0][0].replace(pattern, replacement);
            this.logger.info(
              `    ✅ ${key}: "${matches[0][0]}" → "${actualReplacement}"`,
            );
            hasChanges = true;
          } else {
            this.logger.warn(`    ⚠️  ${key}: ${matches.length} matches found (may cause issues)`);
            matches.forEach((match, index) => {
              this.logger.warn(`      ${index + 1}. "${match[0]}"`);
            });
            hasChanges = true;
          }
        }

        if (!hasChanges && !handler) {
          this.logger.infoI18n("log.release.noChanges");
        }
      } catch (error) {
        this.logger.error(`    ❌ Cannot read file: ${error}`);
      }
    }
  }

  /**
   * Main release method - orchestrates the entire release process
   *
   * @public
   * @param {BumpType} [bumpType] - Optional version bump type (patch, minor, major)
   * @returns {Promise<ReleaseResult>} Release result with success status and details
   *
   * @description
   * Coordinates the entire release workflow:
   * 1. Validates environment and configuration
   * 2. Analyzes commits to determine version bump
   * 3. Generates release notes
   * 4. Updates configured files (with preview in dry-run mode)
   * 5. Creates git commit and tag
   * 6. Pushes to remote repository
   * 7. Creates GitHub release (if configured)
   * 8. Generates documentation (if enabled)
   *
   * @example Basic release
   * ```typescript
   * const result = await manager.release();
   * if (result.success) {
   *   console.log(`Released version ${result.version}`);
   * }
   * ```
   *
   * @example Force specific version bump
   * ```typescript
   * const result = await manager.release(BumpType.MAJOR);
   * // Forces a major version bump regardless of commits
   * ```
   *
   * @throws {Error} If environment validation fails or git operations fail
   */
  async release(bumpType?: BumpType): Promise<ReleaseResult> {
    const startTime = Date.now();

    try {
      this.logger.infoI18n("log.release.starting");

      // Log security audit event for release start
      this.logger.audit("release_started", {
        bumpType: bumpType || "auto",
        user: await this.git.getGitUser(),
        timestamp: new Date().toISOString(),
      });

      // Run pre-release hooks
      if (this.config.hooks?.preRelease) {
        for (const hook of this.config.hooks.preRelease) {
          await hook();
        }
      }

      // Validate environment and configuration
      await this.validateEnvironment();

      // Get current version
      const currentVersion = await this.versionUtils.getCurrentVersion();
      this.logger.infoI18n("log.release.currentVersion", { version: currentVersion });

      // Get commits since last release
      const commits = await this.git.getCommitsSinceLastRelease();
      this.logger.infoI18n("log.release.commitsFound", { count: commits.length });

      if (commits.length === 0 && !bumpType) {
        this.logger.infoI18n("log.release.noCommits");
        return { success: false, error: "No commits found" };
      }

      // Calculate new version
      const newVersion = this.versionUtils.calculateNewVersion(currentVersion, commits, bumpType);
      this.logger.infoI18n("log.release.newVersion", { version: newVersion });

      // Generate release notes
      const releaseNotes = this.generateReleaseNotes(newVersion, commits);

      // Preview changes
      this.previewRelease(releaseNotes);

      // Prepare template data for file updates
      const templateData: TemplateData = {
        version: newVersion,
        buildDate: new Date().toISOString(),
        gitCommit: await this.git.getCurrentCommitHash(),
        environment: Deno.env.get("NODE_ENV") || "production",
        releaseNotes,
        metadata: this.config.releaseNotes?.metadata || {},
        project: this.config.project,
      };

      // Enhanced preview for dry run
      if (this.config.options?.dryRun) {
        this.logger.infoI18n("log.release.dryRunMode");
        await this.previewFileUpdates(templateData);
      }

      // Confirm release (unless skipped)
      if (!this.config.options?.skipConfirmation && !this.config.options?.dryRun) {
        const proceed = confirmI18n("prompts.proceedRelease");
        if (!proceed) {
          this.logger.infoI18n("prompts.releaseCancelled");
          return { success: false, error: "User cancelled" };
        }
      }

      if (this.config.options?.dryRun) {
        this.logger.infoI18n("log.release.dryRunInfo");
        return {
          success: true,
          version: newVersion,
          previousVersion: currentVersion,
          commitCount: commits.length,
          releaseNotes,
        };
      }

      // CRITICAL: Create backup before modifying any files
      const filesToBackup = this.getFilesToBackup(newVersion, releaseNotes);
      this.logger.info(
        `🔒 Creating backup of ${filesToBackup.length} files before modification...`,
      );
      const backupId = await this.backupManager.createBackup(filesToBackup);

      try {
        // Update files
        const updatedFiles = await this.updateFiles(newVersion, releaseNotes);

        // Log security audit event for file updates
        this.logger.audit("files_updated", {
          version: newVersion,
          filesCount: updatedFiles.length,
          files: updatedFiles,
        });

        // CRITICAL: Format all files BEFORE committing
        await this.formatChangedFiles();

        // CRITICAL: Run pre-flight validation BEFORE creating tags
        const preflightResult = await this.performPreflightChecks();
        if (!preflightResult.success) {
          // Try auto-fix if available
          if (preflightResult.fixable && this.config.release?.autoFix?.basic) {
            this.logger.info(`🔧 Attempting to auto-fix ${preflightResult.failedCheck}...`);
            const fixResult = await this.attemptPreflightAutoFix(preflightResult);

            if (fixResult.success) {
              // Re-run pre-flight checks after fix
              const retryResult = await this.performPreflightChecks();
              if (!retryResult.success) {
                throw new NagareError(
                  `Pre-flight check failed after auto-fix: ${retryResult.failedCheck}`,
                  ErrorCodes.RELEASE_FAILED,
                  [retryResult.suggestion || "Fix the issues manually and try again"],
                  {
                    check: retryResult.failedCheck,
                    error: retryResult.error,
                  },
                );
              }
            } else {
              throw new NagareError(
                `Pre-flight check failed: ${preflightResult.failedCheck}`,
                ErrorCodes.RELEASE_FAILED,
                [preflightResult.suggestion || "Run the command manually to see detailed output"],
                {
                  check: preflightResult.failedCheck,
                  error: preflightResult.error,
                },
              );
            }
          } else {
            throw new NagareError(
              `Pre-flight check failed: ${preflightResult.failedCheck}`,
              ErrorCodes.RELEASE_FAILED,
              [preflightResult.suggestion || "Fix the issues and try again"],
              {
                check: preflightResult.failedCheck,
                error: preflightResult.error,
              },
            );
          }
        }

        // Generate documentation if enabled
        if (this.config.docs?.enabled) {
          await this.docGenerator.generateDocs();
          this.logger.infoI18n("log.release.generatingDocs");
        }

        // Git operations
        await this.git.commitAndTag(newVersion);

        // Push to remote (including the new tag)
        await this.git.pushToRemote();

        // Log security audit event for git operations
        this.logger.audit("git_operations_completed", {
          version: newVersion,
          tag: `${this.config.options?.tagPrefix || "v"}${newVersion}`,
          remote: this.config.options?.gitRemote || "origin",
        });

        // GitHub release (now that tag exists on remote)
        let githubReleaseUrl: string | undefined;
        if (this.config.github?.createRelease) {
          githubReleaseUrl = await this.github.createRelease(releaseNotes);
        }

        // JSR verification and CI/CD monitoring for JSR-enabled projects
        if (this.shouldVerifyJsrPublish()) {
          this.logger.info("\n🔍 Verifying JSR publication...");

          // Initialize progress indicator if configured
          const progress = this.createProgressIndicator();
          await progress?.startStage("jsr", "Waiting for JSR publication");

          const jsrResult = await this.verifyJsrPublication(newVersion, progress);

          if (!jsrResult.success) {
            await progress?.errorStage("jsr", jsrResult.error || "JSR verification failed");

            // Log security audit event for JSR failure
            this.logger.audit("jsr_verification_failed", {
              version: newVersion,
              error: jsrResult.error,
              attempts: jsrResult.attempts,
            });

            throw new Error(jsrResult.error || "JSR publication verification failed");
          }

          await progress?.completeStage("jsr");
          this.logger.info(`✅ Package published to JSR: ${jsrResult.jsrUrl}`);
        }

        // Run post-release hooks
        if (this.config.hooks?.postRelease) {
          for (const hook of this.config.hooks.postRelease) {
            await hook();
          }
        }

        this.logger.infoI18n("log.release.releaseSuccess", { version: newVersion });

        // Log security audit event for successful release
        this.logger.audit("release_completed", {
          version: newVersion,
          previousVersion: currentVersion,
          commitCount: commits.length,
          githubRelease: !!githubReleaseUrl,
          jsrPublished: this.shouldVerifyJsrPublish(),
          duration: Date.now() - startTime,
        });

        // CRITICAL: Clean up backup after successful release
        await this.backupManager.cleanupBackup(backupId);
        this.logger.info(`🧹 Cleaned up backup ${backupId} after successful release`);

        return {
          success: true,
          version: newVersion,
          previousVersion: currentVersion,
          commitCount: commits.length,
          releaseNotes,
          updatedFiles,
          githubReleaseUrl,
        };
      } catch (error) {
        // CRITICAL: Restore files from backup before propagating error
        this.logger.error("❌ Release failed, restoring files from backup...", error as Error);
        try {
          await this.backupManager.restoreBackup(backupId);
          this.logger.info(`🔄 Successfully restored files from backup ${backupId}`);

          // Clean up backup after restoration
          await this.backupManager.cleanupBackup(backupId);
          this.logger.info(`🧹 Cleaned up backup ${backupId} after restoration`);
        } catch (restoreError) {
          this.logger.error("💥 CRITICAL: Failed to restore backup:", restoreError as Error);
          this.logger.error(
            "💥 Repository may be in inconsistent state - manual intervention required",
          );

          // Log critical security event
          this.logger.audit("backup_restore_failed", {
            backupId,
            originalError: sanitizeErrorMessage(error, false),
            restoreError: sanitizeErrorMessage(restoreError, false),
          });
        }

        // Log security audit event for failed release
        this.logger.audit("release_failed", {
          error: sanitizeErrorMessage(error, false),
          stage: "unknown",
          backupId,
        });

        return {
          success: false,
          error: sanitizeErrorMessage(error, false),
        };
      }
    } catch (outerError) {
      // Handle any errors from the outer try block (validation, etc.)
      this.logger.error("❌ Release failed during initialization:", outerError as Error);
      return {
        success: false,
        error: sanitizeErrorMessage(outerError, false),
      };
    }
  }

  /**
   * Validate environment and prerequisites
   *
   * @private
   * @returns {Promise<void>}
   *
   * @description
   * Performs comprehensive validation including:
   * - Git repository existence
   * - Uncommitted changes check
   * - Version file existence
   * - Git user configuration
   * - File update pattern safety (with enhanced handler awareness)
   *
   * @throws {Error} If any validation fails
   *
   * @since 1.1.0 - Added file handler awareness and suggestions
   */
  private async validateEnvironment(): Promise<void> {
    // Check if we're in a git repository
    if (!await this.git.isGitRepository()) {
      throw ErrorFactory.gitNotInitialized();
    }

    // Check for uncommitted changes
    if (await this.git.hasUncommittedChanges()) {
      throw ErrorFactory.uncommittedChanges();
    }

    // Validate version file exists
    try {
      await Deno.stat(this.config.versionFile.path);
    } catch {
      throw ErrorFactory.versionNotFound(
        this.config.versionFile.path,
        ["Ensure the file exists", "Check the path in nagare.config.ts"],
      );
    }

    // Check git configuration
    const gitUser = await this.git.getGitUser();
    if (!gitUser.name || !gitUser.email) {
      throw new NagareError(
        "errors.gitUserNotConfigured" as TranslationKey,
        ErrorCodes.GIT_USER_NOT_CONFIGURED,
        {
          suggestions: [
            "suggestions.checkConfig" as TranslationKey,
          ],
        },
      );
    }

    // Enhanced pattern validation with handler awareness
    const patternValidation = this.validateFileUpdatePatternsEnhanced();

    // Show suggestions
    if (patternValidation.suggestions.length > 0) {
      this.logger.infoI18n("log.release.suggestions");
      for (const suggestion of patternValidation.suggestions) {
        this.logger.info(suggestion);
      }
    }

    if (patternValidation.warnings.length > 0) {
      this.logger.warn("\n⚠️  File update pattern warnings:");
      for (const warning of patternValidation.warnings) {
        this.logger.warn(warning);
      }
    }

    if (!patternValidation.valid) {
      this.logger.error("\n❌ File update pattern errors:");
      for (const error of patternValidation.errors) {
        this.logger.error(error);
      }
      throw new NagareError(
        "errors.configInvalid" as TranslationKey,
        ErrorCodes.CONFIG_INVALID,
        {
          context: {
            errors: patternValidation.errors,
          },
          suggestions: [
            "suggestions.checkConfig" as TranslationKey,
          ],
        },
      );
    }

    this.logger.debug("Environment and pattern validation passed");
  }

  /**
   * Generate release notes from commits
   *
   * @private
   * @param {string} version - Version string for the release
   * @param {ConventionalCommit[]} commits - Array of conventional commits
   * @returns {ReleaseNotes} Generated release notes
   *
   * @description
   * Categorizes commits according to conventional commit types and
   * generates release notes following Keep a Changelog format.
   * Handles breaking changes, commit hash inclusion, and description truncation.
   */
  private generateReleaseNotes(version: string, commits: ConventionalCommit[]): ReleaseNotes {
    const notes: ReleaseNotes = {
      version,
      date: new Date().toISOString().split("T")[0],
      added: [],
      changed: [],
      deprecated: [],
      removed: [],
      fixed: [],
      security: [],
    };

    const commitTypes = this.config.commitTypes || DEFAULT_COMMIT_TYPES;
    const includeHashes = this.config.releaseNotes?.includeCommitHashes ?? true;
    const maxLength = this.config.releaseNotes?.maxDescriptionLength ?? 100;

    for (const commit of commits) {
      const section = commitTypes[commit.type] || "changed";
      let entry = commit.description;

      // Truncate if needed
      if (entry.length > maxLength) {
        entry = entry.substring(0, maxLength - 3) + "...";
      }

      // Add commit hash if enabled
      if (includeHashes) {
        entry += ` (${commit.hash})`;
      }

      // Handle breaking changes
      if (commit.breakingChange) {
        entry = `⚠️  BREAKING: ${entry}`;
      }

      notes[section].push(entry);
    }

    return notes;
  }

  /**
   * Preview the release changes
   *
   * @private
   * @param {ReleaseNotes} releaseNotes - Generated release notes to preview
   * @returns {void}
   *
   * @description
   * Displays a summary of the release notes showing counts for each category.
   * Helps users understand what changes are included before confirming release.
   */
  private previewRelease(releaseNotes: ReleaseNotes): void {
    this.logger.infoI18n("log.release.releaseNotes");
    this.logger.info(`Version: ${releaseNotes.version}`);
    this.logger.info(`Date: ${releaseNotes.date}`);

    if (releaseNotes.added.length > 0) {
      this.logger.info(`✨ Added: ${releaseNotes.added.length} items`);
    }
    if (releaseNotes.changed.length > 0) {
      this.logger.info(`🔄 Changed: ${releaseNotes.changed.length} items`);
    }
    if (releaseNotes.fixed.length > 0) {
      this.logger.info(`🐛 Fixed: ${releaseNotes.fixed.length} items`);
    }
    if (releaseNotes.security.length > 0) {
      this.logger.info(`🔒 Security: ${releaseNotes.security.length} items`);
    }
    if (releaseNotes.deprecated.length > 0) {
      this.logger.info(`⚠️  Deprecated: ${releaseNotes.deprecated.length} items`);
    }
    if (releaseNotes.removed.length > 0) {
      this.logger.info(`🗑️  Removed: ${releaseNotes.removed.length} items`);
    }
  }

  /**
   * Update all configured files
   *
   * @private
   * @param {string} version - New version string
   * @param {ReleaseNotes} releaseNotes - Generated release notes
   * @returns {Promise<string[]>} Array of updated file paths
   *
   * @description
   * Updates all files configured in the release configuration:
   * 1. Version file (using template processor)
   * 2. CHANGELOG.md (using changelog generator)
   * 3. Additional files (using file handlers or custom patterns)
   *
   * @since 1.1.0 - Enhanced with intelligent file handler support
   */
  private async updateFiles(version: string, releaseNotes: ReleaseNotes): Promise<string[]> {
    const updatedFiles: string[] = [];

    // Prepare template data
    const templateData: TemplateData = {
      version,
      buildDate: new Date().toISOString(),
      gitCommit: await this.git.getCurrentCommitHash(),
      environment: Deno.env.get("NODE_ENV") || "production",
      releaseNotes,
      metadata: this.config.releaseNotes?.metadata || {},
      project: this.config.project,
    };

    // Update version file
    await this.updateVersionFile(templateData);
    updatedFiles.push(this.config.versionFile.path);

    // Update CHANGELOG.md
    await this.changelogGenerator.updateChangelog(releaseNotes);
    updatedFiles.push("./CHANGELOG.md");

    // Update additional files with enhanced validation
    if (this.config.updateFiles && this.config.updateFiles.length > 0) {
      this.logger.infoI18n("log.release.processingFiles");

      for (const filePattern of this.config.updateFiles) {
        await this.updateCustomFile(filePattern, templateData);
        updatedFiles.push(filePattern.path);
      }

      this.logger.infoI18n("log.release.updatingFiles", { count: this.config.updateFiles.length });
    }

    this.logger.infoI18n("log.release.updatingFiles", { count: updatedFiles.length });
    return updatedFiles;
  }

  /**
   * Update the main version file using template processor
   *
   * @private
   * @param {TemplateData} templateData - Template data for version file generation
   * @returns {Promise<void>}
   *
   * @description
   * Generates and writes the version file using either custom templates
   * or built-in templates. Supports TypeScript, JSON, YAML, and custom formats.
   *
   * @throws {Error} If template processing fails or file write fails
   *
   * @example
   * ```typescript
   * const templateData = {
   *   version: "1.2.0",
   *   buildDate: new Date().toISOString(),
   *   gitCommit: "abc123",
   *   environment: "production",
   *   releaseNotes: generatedNotes,
   *   metadata: {},
   *   project: config.project
   * };
   * await updateVersionFile(templateData);
   * ```
   */
  private async updateVersionFile(templateData: TemplateData): Promise<void> {
    const { versionFile } = this.config;

    try {
      let content: string;

      if (versionFile.template === "custom" && versionFile.customTemplate) {
        // Use custom template with Vento processing
        this.logger.debug(`Processing custom template for ${versionFile.path}`);
        content = await this.templateProcessor.processTemplate(
          versionFile.customTemplate,
          templateData,
        );
      } else {
        // Use built-in template with Vento processing
        this.logger.debug(
          `Processing built-in ${versionFile.template} template for ${versionFile.path}`,
        );
        content = await this.templateProcessor.generateVersionFile(templateData);
      }

      // Write the generated content to the version file
      await Deno.writeTextFile(versionFile.path, content);

      this.logger.debug(`✅ Updated version file: ${versionFile.path}`);
    } catch (error) {
      const errorMessage = `Failed to update version file ${versionFile.path}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logger.error(errorMessage);
      // If it's already a NagareError, re-throw it
      if (error instanceof NagareError) {
        throw error;
      }

      throw new NagareError(
        "errors.fileUpdateFailed" as TranslationKey,
        ErrorCodes.FILE_UPDATE_FAILED,
        {
          context: {
            filePath: versionFile.path,
            template: versionFile.template,
            error: error instanceof Error ? error.message : String(error),
          },
          suggestions: [
            "suggestions.checkPath" as TranslationKey,
            "suggestions.verifyPermissions" as TranslationKey,
            "suggestions.checkConfig" as TranslationKey,
          ],
        },
      );
    }
  }

  /**
   * Update a custom file based on patterns with enhanced file handler support
   *
   * @private
   * @param {FileUpdatePattern} filePattern - File update pattern configuration
   * @param {TemplateData} templateData - Template data for replacements
   * @returns {Promise<void>}
   *
   * @description
   * Updates files using the following priority:
   * 1. Custom updateFn if provided
   * 2. Built-in file handler if available
   * 3. Pattern-based updates as fallback
   *
   * Validates JSON files after update to prevent corruption.
   *
   * @since 1.1.0 - Added intelligent file handler support
   *
   * @example
   * ```typescript
   * // With built-in handler (no patterns needed)
   * await updateCustomFile({ path: "./deno.json" }, templateData);
   *
   * // With custom patterns
   * await updateCustomFile({
   *   path: "./custom.json",
   *   patterns: { version: /^(\s*)"version":\s*"([^"]+)"/m }
   * }, templateData);
   * ```
   */
  private async updateCustomFile(
    filePattern: FileUpdatePattern,
    templateData: TemplateData,
  ): Promise<void> {
    try {
      let updatedContent: string;
      const changes: Array<{ key: string; status: string; message: string }> = [];

      // If custom updateFn provided, use it (highest priority)
      if (filePattern.updateFn) {
        const content = await Deno.readTextFile(filePattern.path);
        updatedContent = filePattern.updateFn(content, templateData);
        this.logger.debug(`Updated ${filePattern.path} using custom function`);
        changes.push({
          key: "custom",
          status: "✅",
          message: "Used custom update function",
        });
      } // Check if we have a built-in handler for this file
      else if (this.fileHandlerManager.hasHandler(filePattern.path)) {
        const handler = this.fileHandlerManager.getHandler(filePattern.path)!;
        this.logger.info(`Using built-in ${handler.name} handler for ${filePattern.path}`);

        // Determine which patterns to use
        const patterns = filePattern.patterns || { version: "version" };

        let fileContent = await Deno.readTextFile(filePattern.path);

        for (const [key, patternOrKey] of Object.entries(patterns)) {
          // If it's just a string, treat it as a key name
          const actualKey = typeof patternOrKey === "string" ? patternOrKey : key;
          const value = this.getTemplateValue(templateData, actualKey);

          if (!value) {
            this.logger.warn(`No template value found for key: ${actualKey}`);
            continue;
          }

          const result = await this.fileHandlerManager.updateFile(
            filePattern.path,
            actualKey,
            value,
          );

          if (result.success && result.content) {
            fileContent = result.content;
            changes.push({
              key: actualKey,
              status: "✅",
              message: `Updated using ${handler.name} handler`,
            });
          } else {
            changes.push({
              key: actualKey,
              status: "⚠️",
              message: result.error || "Update failed",
            });
          }
        }

        updatedContent = fileContent;
      } // Fall back to pattern-based updates
      else if (filePattern.patterns) {
        const content = await Deno.readTextFile(filePattern.path);
        updatedContent = content;

        this.logger.debug(`No built-in handler for ${filePattern.path}, using patterns`);

        for (const [key, pattern] of Object.entries(filePattern.patterns)) {
          const value = this.getTemplateValue(templateData, key);
          if (!value) {
            this.logger.warn(`No template value found for key: ${key}`);
            continue;
          }

          // Count matches before replacement
          const matches = [...updatedContent.matchAll(new RegExp(pattern, "g"))];

          if (matches.length === 0) {
            changes.push({
              key,
              status: "❌",
              message: "No matches found",
            });
            continue;
          }

          // Use the improved buildSafeReplacement
          const replacement = this.buildSafeReplacement(pattern, value);
          updatedContent = updatedContent.replace(pattern, replacement);

          changes.push({
            key,
            status: matches.length === 1 ? "✅" : "⚠️",
            message: `${matches.length} match${matches.length === 1 ? "" : "es"} found`,
          });
        }
      } else {
        throw ErrorFactory.fileHandlerNotFound(filePattern.path);
      }

      // Show update summary
      if (changes.length > 0 && this.config.options?.logLevel === LogLevel.DEBUG) {
        this.logger.debug(`\nUpdate summary for ${filePattern.path}:`);
        for (const change of changes) {
          this.logger.debug(`  ${change.status} ${change.key}: ${change.message}`);
        }
      }

      // Validate JSON files
      if (filePattern.path.endsWith(".json") || filePattern.path.endsWith(".jsonc")) {
        try {
          // For JSONC files, remove comments more carefully to avoid breaking URLs
          let jsonContent = updatedContent;

          if (filePattern.path.endsWith(".jsonc")) {
            // Remove multi-line comments
            jsonContent = jsonContent.replace(/\/\*[\s\S]*?\*\//g, "");
            // Remove single-line comments (but not // in URLs)
            // This regex looks for // that's not preceded by : (as in https://)
            jsonContent = jsonContent.replace(/(?<!:)\/\/.*$/gm, "");
          }

          JSON.parse(jsonContent);
          this.logger.debug(`✅ JSON validation passed for ${filePattern.path}`);
        } catch (_error) {
          throw new NagareError(
            "errors.fileJsonInvalid" as TranslationKey,
            ErrorCodes.FILE_JSON_INVALID,
            {
              context: {
                filePath: filePattern.path,
              },
              suggestions: [
                "suggestions.checkJsonSyntax" as TranslationKey,
                "suggestions.validateJson" as TranslationKey,
                "suggestions.checkJsonCommas" as TranslationKey,
                "suggestions.addCustomUpdateFn" as TranslationKey,
              ],
            },
          );
        }
      }

      // Write the updated content (unless dry run)
      if (!this.config.options?.dryRun) {
        await Deno.writeTextFile(filePattern.path, updatedContent);
      }

      this.logger.debug(`✅ Successfully updated: ${filePattern.path}`);
    } catch (error) {
      this.logger.error(`Failed to update file ${filePattern.path}:`, error as Error);
      throw error;
    }
  }

  /**
   * Get a value from template data by key path
   *
   * @private
   * @param {TemplateData} data - Template data object
   * @param {string} keyPath - Dot-separated key path (e.g., "project.name")
   * @returns {string | undefined} Value as string or undefined if not found
   *
   * @description
   * Navigates nested objects using dot notation to retrieve values.
   * Converts non-string values to strings for replacement.
   *
   * @example
   * ```typescript
   * const data = { project: { name: "My App" }, version: "1.2.3" };
   * getTemplateValue(data, "project.name"); // "My App"
   * getTemplateValue(data, "version"); // "1.2.3"
   * getTemplateValue(data, "missing.key"); // undefined
   * ```
   */
  private getTemplateValue(data: TemplateData, keyPath: string): string | undefined {
    const keys = keyPath.split(".");
    let value: unknown = data;

    for (const key of keys) {
      if (value != null && typeof value === "object" && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return typeof value === "string" ? value : String(value);
  }

  /**
   * Validate file update patterns with handler awareness
   *
   * @private
   * @returns {Object} Validation result with warnings, errors, and suggestions
   * @returns {boolean} returns.valid - Whether configuration is valid
   * @returns {string[]} returns.warnings - Warning messages
   * @returns {string[]} returns.errors - Error messages
   * @returns {string[]} returns.suggestions - Helpful suggestions
   *
   * @description
   * Enhanced validation that checks for:
   * - Files that can use built-in handlers
   * - Dangerous regex patterns
   * - Missing handlers or patterns
   * - Opportunities to simplify configuration
   *
   * @since 1.1.0 - Added file handler awareness
   */
  private validateFileUpdatePatternsEnhanced(): {
    valid: boolean;
    warnings: string[];
    errors: string[];
    suggestions: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];
    const suggestions: string[] = [];

    if (!this.config.updateFiles || this.config.updateFiles.length === 0) {
      return { valid: true, warnings, errors, suggestions };
    }

    for (const filePattern of this.config.updateFiles) {
      const hasHandler = this.fileHandlerManager.hasHandler(filePattern.path);

      if (hasHandler && !filePattern.patterns && !filePattern.updateFn) {
        // Good - using built-in handler
        const handler = this.fileHandlerManager.getHandler(filePattern.path)!;
        suggestions.push(
          `✅ ${filePattern.path} will use built-in ${handler.name} handler automatically`,
        );
      } else if (hasHandler && filePattern.patterns) {
        // Has handler but also custom patterns - might be unnecessary
        suggestions.push(
          `💡 ${filePattern.path} has a built-in handler available. ` +
            `You might be able to remove the custom patterns.`,
        );
      } else if (!hasHandler && !filePattern.patterns && !filePattern.updateFn) {
        // No handler and no patterns - this is an error
        errors.push(
          `❌ ${filePattern.path} has no built-in handler and no patterns or updateFn specified`,
        );
      }

      // Check for dangerous patterns (existing logic)
      if (filePattern.patterns) {
        for (const [key, pattern] of Object.entries(filePattern.patterns)) {
          if (isDangerousPattern(pattern, filePattern.path)) {
            warnings.push(
              `⚠️  Dangerous pattern detected in ${filePattern.path} for key "${key}"\n` +
                `   Pattern: ${pattern.source}\n` +
                `   Consider using built-in handlers or safer patterns.`,
            );
          }
        }
      }
    }

    // Add general suggestion if no built-in handlers are being used
    const usingHandlers = this.config.updateFiles.some((f) =>
      this.fileHandlerManager.hasHandler(f.path) && !f.patterns && !f.updateFn
    );

    if (!usingHandlers && this.config.updateFiles.length > 0) {
      suggestions.push(
        `💡 Tip: Nagare now includes built-in handlers for common files like deno.json, ` +
          `package.json, and README.md. You can simplify your config by removing patterns ` +
          `for these files.`,
      );
    }

    return { valid: errors.length === 0, warnings, errors, suggestions };
  }

  /**
   * Get list of files to backup before modification
   *
   * @private
   * @param {string} newVersion - New version string
   * @param {ReleaseNotes} releaseNotes - Generated release notes
   * @returns {string[]} Array of file paths to backup
   *
   * @description
   * Identifies all files that will be modified during the release process
   * so they can be backed up before any changes are made.
   */
  private getFilesToBackup(_newVersion: string, _releaseNotes: ReleaseNotes): string[] {
    const filesToBackup: string[] = [];

    // Version file (always modified)
    filesToBackup.push(this.config.versionFile.path);

    // CHANGELOG.md (always modified)
    filesToBackup.push("./CHANGELOG.md");

    // Additional configured files
    if (this.config.updateFiles) {
      for (const filePattern of this.config.updateFiles) {
        filesToBackup.push(filePattern.path);
      }
    }

    // Documentation files if enabled
    if (this.config.docs?.enabled) {
      const docsDir = this.config.docs.outputDir || "./docs";
      filesToBackup.push(docsDir);
    }

    // Remove duplicates
    return [...new Set(filesToBackup)];
  }

  /**
   * Get the current configuration
   *
   * @public
   * @returns {NagareConfig} Current Nagare configuration
   */
  getConfig(): NagareConfig {
    return this.config;
  }

  /**
   * Check if JSR publish verification should be performed
   *
   * @private
   * @returns {boolean} Whether to verify JSR publication
   */
  private shouldVerifyJsrPublish(): boolean {
    const jsrConfig = this.config.release?.verifyJsrPublish;
    if (typeof jsrConfig === "boolean") {
      return jsrConfig;
    }
    return jsrConfig?.enabled ?? false;
  }

  /**
   * Create progress indicator instance
   *
   * @private
   * @returns {ProgressIndicator | null} Progress indicator or null if disabled
   */
  private createProgressIndicator(): ProgressIndicator | null {
    const progressConfig = this.config.release?.progress;
    if (progressConfig?.enabled === false) {
      return null;
    }

    return new ProgressIndicator({
      style: progressConfig?.style || "detailed",
      showElapsedTime: progressConfig?.showElapsedTime ?? true,
      showEstimates: progressConfig?.showEstimates ?? true,
    });
  }

  /**
   * Verify JSR publication with monitoring and auto-fix
   *
   * @private
   * @param {string} version - Version to verify
   * @param {ProgressIndicator | null} progress - Progress indicator instance
   * @returns {Promise<Object>} Verification result
   */
  private async verifyJsrPublication(
    version: string,
    progress: ProgressIndicator | null,
  ): Promise<{
    success: boolean;
    jsrUrl?: string;
    error?: string;
    attempts?: number;
  }> {
    try {
      // Initialize components
      const jsrVerifier = new JsrVerifier(this.config);
      const packageInfo = await jsrVerifier.getPackageInfo();

      if (!packageInfo) {
        return {
          success: false,
          error: "No JSR package configuration found in deno.json",
        };
      }

      // Get repo info for GitHub Actions monitoring
      const repoInfo = await GitHubActionsMonitor.getRepoInfo();
      if (!repoInfo) {
        // Fallback to direct JSR verification without CI/CD monitoring
        const result = await jsrVerifier.verifyPublication(
          packageInfo,
          async (attempt, max) => {
            this.logger.info(`Checking JSR... (attempt ${attempt}/${max})`);
            await progress?.updateSubstep("jsr", "verification", "active");
          },
        );

        if (result.success) {
          return {
            success: true,
            jsrUrl: jsrVerifier.getPackageUrl(packageInfo),
            attempts: result.attempts,
          };
        }

        return {
          success: false,
          error: result.error,
          attempts: result.attempts,
        };
      }

      // Monitor GitHub Actions workflow
      const monitor = new GitHubActionsMonitor(repoInfo.owner, repoInfo.repo);
      const workflowFile = this.config.release?.monitoring?.workflowFile ||
        ".github/workflows/publish.yml";

      // Get the latest workflow run
      const latestRun = await monitor.getLatestRun(workflowFile);
      if (!latestRun) {
        // No workflow found, fall back to direct JSR verification
        return await this.directJsrVerification(jsrVerifier, packageInfo, progress);
      }

      // Monitor the workflow
      await progress?.setSubsteps("ci-cd", [
        { name: "workflow-trigger", status: "success" },
        { name: "workflow-running", status: "active" },
        { name: "jsr-publish", status: "pending" },
      ]);

      const monitorResult = await monitor.monitorRun(latestRun.id, {
        pollInterval: this.config.release?.monitoring?.pollInterval || 10000,
        timeout: this.config.release?.monitoring?.timeout || 600000,
        onProgress: async (run, jobs) => {
          if (run.status === "completed") {
            await progress?.updateSubstep(
              "ci-cd",
              "workflow-running",
              run.conclusion === "success" ? "success" : "error",
            );
          }

          // Update job status
          const publishJob = jobs.find((j) => j.name.toLowerCase().includes("publish"));
          if (publishJob) {
            await progress?.updateSubstep(
              "ci-cd",
              "jsr-publish",
              publishJob.status === "completed"
                ? (publishJob.conclusion === "success" ? "success" : "error")
                : "active",
            );
          }
        },
      });

      // Handle workflow results
      if (monitorResult.run.conclusion === "success") {
        // Verify JSR publication
        const jsrResult = await jsrVerifier.verifyPublication(packageInfo);
        if (jsrResult.success) {
          return {
            success: true,
            jsrUrl: jsrVerifier.getPackageUrl(packageInfo),
            attempts: jsrResult.attempts,
          };
        }
        return {
          success: false,
          error: "Workflow succeeded but package not found on JSR",
          attempts: jsrResult.attempts,
        };
      }

      // Workflow failed - attempt auto-fix if configured
      if (monitorResult.run.conclusion === "failure" && monitorResult.logs) {
        return await this.attemptAutoFix(monitorResult.logs, version, monitor, progress);
      }

      return {
        success: false,
        error: `GitHub Actions workflow ${monitorResult.run.conclusion || "failed"}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `JSR verification error: ${sanitizeErrorMessage(error, false)}`,
      };
    }
  }

  /**
   * Direct JSR verification without CI/CD monitoring
   *
   * @private
   */
  private async directJsrVerification(
    verifier: JsrVerifier,
    packageInfo: { scope: string; name: string; version: string },
    _progress: ProgressIndicator | null,
  ): Promise<{ success: boolean; jsrUrl?: string; error?: string; attempts?: number }> {
    const result = await verifier.verifyPublication(
      packageInfo,
      (attempt, max) => {
        this.logger.info(`Checking JSR... (attempt ${attempt}/${max})`);
      },
    );

    if (result.success) {
      return {
        success: true,
        jsrUrl: verifier.getPackageUrl(packageInfo),
        attempts: result.attempts,
      };
    }

    return {
      success: false,
      error: result.error,
      attempts: result.attempts,
    };
  }

  /**
   * Attempt to auto-fix CI/CD errors
   *
   * @private
   */
  private async attemptAutoFix(
    logs: string,
    _version: string,
    monitor: GitHubActionsMonitor,
    progress: ProgressIndicator | null,
  ): Promise<{ success: boolean; jsrUrl?: string; error?: string }> {
    if (!this.config.release?.autoFix?.basic && !this.config.release?.autoFix?.ai?.enabled) {
      // Auto-fix not enabled, return the error
      const parser = new LogParser();
      const parseResult = parser.parseLog(logs);
      return {
        success: false,
        error: `CI/CD failed: ${parseResult.summary}`,
      };
    }

    await progress?.fixingStage("ci-cd", "Attempting to fix CI/CD errors...");

    // Parse the logs
    const parser = new LogParser();
    const parseResult = parser.parseLog(logs);

    if (parseResult.errors.length === 0) {
      return {
        success: false,
        error: "CI/CD failed but no specific errors found in logs",
      };
    }

    // Initialize auto-fixer
    const fixer = new AutoFixer(this.config);
    await fixer.initialize();

    // Attempt fixes
    let fixAttempt = 0;
    const maxAttempts = this.config.release?.autoFix?.ai?.maxAttempts || 3;

    while (fixAttempt < maxAttempts) {
      fixAttempt++;
      this.logger.info(`\n🔧 Auto-fix attempt ${fixAttempt}/${maxAttempts}`);

      const fixResult = await fixer.fixErrors(
        parseResult.errors,
        (msg) => this.logger.info(`  ${msg}`),
      );

      if (fixResult.success && fixResult.fixed > 0) {
        // Commit the fixes
        await fixer.commitFixes(fixResult.changes);

        // Push the fixes
        await this.git.pushToRemote();

        // Trigger workflow again
        const workflowFile = this.config.release?.monitoring?.workflowFile ||
          ".github/workflows/publish.yml";
        const newRunId = await monitor.triggerWorkflow(workflowFile);

        if (!newRunId) {
          return {
            success: false,
            error: "Failed to retrigger workflow after fixes",
          };
        }

        // Monitor the new run
        const retryResult = await monitor.monitorRun(newRunId, {
          onProgress: (run) => {
            this.logger.info(`Workflow status: ${run.status}`);
          },
        });

        if (retryResult.run.conclusion === "success") {
          // Verify JSR publication
          const jsrVerifier = new JsrVerifier(this.config);
          const packageInfo = await jsrVerifier.getPackageInfo();
          if (packageInfo) {
            const jsrResult = await jsrVerifier.verifyPublication(packageInfo);
            if (jsrResult.success) {
              return {
                success: true,
                jsrUrl: jsrVerifier.getPackageUrl(packageInfo),
              };
            }
          }
        }

        // Parse new logs if failed again
        if (retryResult.logs) {
          const newParseResult = parser.parseLog(retryResult.logs);
          if (newParseResult.errors.length > 0) {
            // Update errors for next iteration
            parseResult.errors = newParseResult.errors;
            continue;
          }
        }
      }

      // No more fixable errors
      break;
    }

    return {
      success: false,
      error: `Failed to fix CI/CD errors after ${fixAttempt} attempts: ${parseResult.summary}`,
    };
  }

  /**
   * Get pre-flight checks to run before release
   *
   * @private
   * @returns {PreflightCheck[]} Array of pre-flight checks
   *
   * @description
   * Defines the validation checks to run before creating a release.
   * These checks ensure code quality and prevent failed releases.
   *
   * @since 2.8.0
   */
  private getPreflightChecks(): PreflightCheck[] {
    const checks: PreflightCheck[] = [
      {
        name: "Format Check",
        command: ["deno", "fmt", "--check"],
        fixable: true,
        fixCommand: ["deno", "fmt"],
        description: "Validates code formatting matches project standards",
      },
      {
        name: "Lint Check",
        command: ["deno", "lint"],
        fixable: false,
        description: "Checks for code quality issues and potential bugs",
      },
      {
        name: "Type Check",
        command: ["deno", "check", "--unstable-raw-imports", "**/*.ts"],
        fixable: false,
        description: "Validates TypeScript type correctness",
      },
    ];

    // Add test check if not explicitly disabled
    if (this.config.release?.preflightChecks?.runTests !== false) {
      checks.push({
        name: "Test Suite",
        command: ["deno", "test", "--unstable-raw-imports", "--allow-all"],
        fixable: false,
        description: "Runs all unit and integration tests",
      });
    }

    // Add custom checks if configured
    if (this.config.release?.preflightChecks?.custom) {
      checks.push(...this.config.release.preflightChecks.custom);
    }

    return checks;
  }

  /**
   * Perform pre-flight validation checks
   *
   * @private
   * @returns {Promise<PreflightResult>} Result of pre-flight checks
   *
   * @description
   * Runs all configured pre-flight checks to validate the codebase
   * before creating a release. This prevents common CI/CD failures.
   *
   * @since 2.8.0
   */
  private async performPreflightChecks(): Promise<PreflightResult> {
    const checks = this.getPreflightChecks();

    if (checks.length === 0) {
      return { success: true };
    }

    this.logger.info("\n🔍 Running pre-flight checks...");

    for (const check of checks) {
      this.logger.info(`\n  ▶ ${check.name}`);
      if (check.description) {
        this.logger.debug(`    ${check.description}`);
      }

      try {
        const command = new Deno.Command(check.command[0], {
          args: check.command.slice(1),
          stdout: "piped",
          stderr: "piped",
        });

        const { code, stdout, stderr } = await command.output();

        if (code === 0) {
          this.logger.info(`    ✅ ${check.name} passed`);
        } else {
          const errorOutput = new TextDecoder().decode(stderr) || new TextDecoder().decode(stdout);
          const errorLines = errorOutput.trim().split("\n");
          const errorSummary = errorLines.slice(0, 5).join("\n    ");

          this.logger.error(`    ❌ ${check.name} failed`);
          this.logger.error(`    ${errorSummary}`);
          if (errorLines.length > 5) {
            this.logger.error(`    ... and ${errorLines.length - 5} more errors`);
          }

          // Determine suggestion based on check type
          let suggestion = "Fix the issues and try again";
          if (check.fixable) {
            suggestion = `Run 'deno task fmt' to fix formatting issues automatically`;
          } else if (check.name.includes("Lint")) {
            suggestion = "Fix linting issues manually - check the output above";
          } else if (check.name.includes("Type")) {
            suggestion = "Fix TypeScript type errors - check your type definitions";
          } else if (check.name.includes("Test")) {
            suggestion = "Fix failing tests or skip with --skip-tests flag";
          }

          return {
            success: false,
            failedCheck: check.name,
            fixable: check.fixable || false,
            command: check.command,
            error: errorOutput,
            suggestion,
          };
        }
      } catch (error) {
        this.logger.error(`    ❌ ${check.name} failed to execute`);
        return {
          success: false,
          failedCheck: check.name,
          fixable: false,
          command: check.command,
          error: `Failed to execute command: ${error}`,
          suggestion: `Ensure ${check.command[0]} is installed and available in PATH`,
        };
      }
    }

    this.logger.info("\n✅ All pre-flight checks passed!");
    return { success: true };
  }

  /**
   * Format all changed files after version updates
   *
   * @private
   * @returns {Promise<void>}
   *
   * @description
   * Runs Deno formatter on all files to ensure consistent formatting
   * before committing. This prevents CI failures due to formatting issues.
   *
   * @since 2.8.0
   */
  private async formatChangedFiles(): Promise<void> {
    this.logger.info("\n🎨 Formatting changed files...");

    try {
      const command = new Deno.Command("deno", {
        args: ["fmt"],
        stdout: "piped",
        stderr: "piped",
      });

      const { code, stderr } = await command.output();

      if (code !== 0) {
        const errorOutput = new TextDecoder().decode(stderr);
        this.logger.warn(`⚠️  Formatting completed with warnings: ${errorOutput}`);
      } else {
        this.logger.info("✅ All files formatted successfully");
      }
    } catch (error) {
      this.logger.warn(`⚠️  Could not format files: ${error}`);
      // Don't throw - formatting failure shouldn't block release
    }
  }

  /**
   * Attempt to auto-fix pre-flight check failures
   *
   * @private
   * @param {PreflightResult} result - Pre-flight check result to fix
   * @returns {Promise<PreflightResult>} Result after attempting fix
   *
   * @description
   * Tries to automatically fix issues identified by pre-flight checks.
   * Currently supports auto-formatting for format check failures.
   *
   * @since 2.8.0
   */
  private async attemptPreflightAutoFix(result: PreflightResult): Promise<PreflightResult> {
    if (!result.fixable || !result.failedCheck) {
      return result;
    }

    this.logger.info(`\n🔧 Attempting to auto-fix ${result.failedCheck}...`);

    // Find the check that failed
    const checks = this.getPreflightChecks();
    const failedCheck = checks.find((c) => c.name === result.failedCheck);

    if (!failedCheck || !failedCheck.fixCommand) {
      return result;
    }

    try {
      const command = new Deno.Command(failedCheck.fixCommand[0], {
        args: failedCheck.fixCommand.slice(1),
        stdout: "piped",
        stderr: "piped",
      });

      const { code, stdout, stderr } = await command.output();

      if (code === 0) {
        this.logger.info(`✅ Successfully fixed ${result.failedCheck}`);

        // Add fixed files to git
        const gitAddCommand = new Deno.Command("git", {
          args: ["add", "-A"],
          stdout: "piped",
          stderr: "piped",
        });
        await gitAddCommand.output();

        return { success: true };
      } else {
        const errorOutput = new TextDecoder().decode(stderr) || new TextDecoder().decode(stdout);
        this.logger.error(`❌ Auto-fix failed: ${errorOutput}`);
        return {
          ...result,
          error: `Auto-fix failed: ${errorOutput}`,
          suggestion: "Fix the issues manually and try again",
        };
      }
    } catch (error) {
      this.logger.error(`❌ Auto-fix failed: ${error}`);
      return {
        ...result,
        error: `Auto-fix error: ${error}`,
        suggestion: "Fix the issues manually and try again",
      };
    }
  }

  /**
   * Validate configuration
   *
   * @static
   * @public
   * @param {NagareConfig} config - Configuration to validate
   * @returns {Object} Validation result
   * @returns {boolean} returns.valid - Whether configuration is valid
   * @returns {string[]} returns.errors - List of validation errors
   *
   * @description
   * Validates required fields and configuration consistency.
   * Useful for checking configuration before creating a ReleaseManager.
   *
   * @example
   * ```typescript
   * const validation = ReleaseManager.validateConfig(config);
   * if (!validation.valid) {
   *   console.error("Configuration errors:", validation.errors);
   * }
   * ```
   */
  static validateConfig(config: NagareConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!config.project?.name) {
      errors.push("project.name is required");
    }
    if (!config.project?.repository) {
      errors.push("project.repository is required");
    }
    if (!config.versionFile?.path) {
      errors.push("versionFile.path is required");
    }

    // GitHub config validation
    if (config.github?.createRelease) {
      if (!config.github.owner) {
        errors.push("github.owner is required when createRelease is true");
      }
      if (!config.github.repo) {
        errors.push("github.repo is required when createRelease is true");
      }
    }

    // Version file validation
    if (config.versionFile?.template === "custom" && !config.versionFile.customTemplate) {
      errors.push('customTemplate is required when template is "custom"');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
