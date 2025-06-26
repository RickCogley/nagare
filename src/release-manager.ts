/**
 * @fileoverview Core ReleaseManager implementation
 * @description Extracted and generalized from Salty's release system with enhanced file update validation
 */

import type {
  BumpType,
  ConventionalCommit,
  NagareConfig,
  ReleaseNotes,
  ReleaseResult,
  TemplateData,
} from "../types.ts";
import { 
  DEFAULT_COMMIT_TYPES, 
  DEFAULT_CONFIG, 
  LogLevel,
  isDangerousPattern,
  migrateDangerousPattern,
  getRecommendedSafePattern
} from "../config.ts";
import { GitOperations } from "./git-operations.ts";
import { VersionUtils } from "./version-utils.ts";
import { ChangelogGenerator } from "./changelog-generator.ts";
import { GitHubIntegration } from "./github-integration.ts";
import { TemplateProcessor } from "./template-processor.ts";
import { DocGenerator } from "./doc-generator.ts";
import { Logger } from "./logger.ts";

/**
 * Main ReleaseManager class - coordinates the entire release process
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

  constructor(config: NagareConfig) {
    this.config = this.mergeWithDefaults(config);
    this.git = new GitOperations(this.config);
    this.versionUtils = new VersionUtils(this.config);
    this.changelogGenerator = new ChangelogGenerator(this.config);
    this.github = new GitHubIntegration(this.config);
    this.templateProcessor = new TemplateProcessor(this.config);
    this.docGenerator = new DocGenerator(this.config);
    this.logger = new Logger(this.config.options?.logLevel || LogLevel.INFO);
  }

  /**
   * Merge user config with defaults
   * @param config User configuration
   * @returns Merged configuration with defaults
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
   * @returns Validation result with warnings and errors
   */
  private validateFileUpdatePatterns(): { valid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!this.config.updateFiles || this.config.updateFiles.length === 0) {
      return { valid: true, warnings, errors };
    }

    for (const filePattern of this.config.updateFiles) {
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
              `   ${migration.warning || ''}`
            );
          } else {
            warnings.push(
              `⚠️  Potentially dangerous pattern in ${filePattern.path} for key "${key}"\n` +
              `   Pattern: ${pattern.source}\n` +
              `   Consider using more specific patterns with line anchors (^ or $)`
            );
          }
        }

        // Validate pattern will match something reasonable
        if (key === 'version' && !pattern.source.includes('version')) {
          warnings.push(
            `❓ Pattern for "version" key doesn't contain "version" in ${filePattern.path}\n` +
            `   This might not match what you expect: ${pattern.source}`
          );
        }
      }
    }

    return { valid: errors.length === 0, warnings, errors };
  }

  /**
   * Build safe replacement string for regex patterns
   * @param pattern The regex pattern being used
   * @param newValue The new value to insert
   * @returns Safe replacement string
   */
  private buildSafeReplacement(pattern: RegExp, newValue: string): string {
    const source = pattern.source;
    
    // Handle line-anchored JSON patterns (the safe ones)
    if (source.includes('^(\\s*)"version"')) {
      return `$1"version": "${newValue}"`;
    }
    
    // Handle other common JSON patterns
    if (source.includes('"version"') && source.includes('\\s*')) {
      return `"version": "${newValue}"`;
    }
    
    // Handle YAML patterns
    if (source.includes('version:')) {
      return `version: "${newValue}"`;
    }
    
    // Handle markdown badge patterns
    if (source.includes('Version\\s+')) {
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
   * @param templateData Template data for file updates
   */
  private async previewFileUpdates(templateData: TemplateData): Promise<void> {
    if (!this.config.updateFiles || this.config.updateFiles.length === 0) {
      this.logger.info("📄 No additional files configured for updates");
      return;
    }

    this.logger.info("\n📄 File Update Preview:");
    
    for (const filePattern of this.config.updateFiles) {
      try {
        const content = await Deno.readTextFile(filePattern.path);
        this.logger.info(`\n  File: ${filePattern.path}`);
        
        if (filePattern.updateFn) {
          this.logger.info("    ✅ Uses custom update function");
          continue;
        }

        let hasChanges = false;
        for (const [key, pattern] of Object.entries(filePattern.patterns)) {
          const matches = [...content.matchAll(new RegExp(pattern, 'g'))];
          const value = this.getTemplateValue(templateData, key);
          
          if (matches.length === 0) {
            this.logger.warn(`    ❌ ${key}: No matches found`);
          } else if (matches.length === 1) {
            this.logger.info(`    ✅ ${key}: "${matches[0][0]}" → "${this.buildSafeReplacement(pattern, value || 'undefined')}"`);
            hasChanges = true;
          } else {
            this.logger.warn(`    ⚠️  ${key}: ${matches.length} matches found (may cause issues)`);
            matches.forEach((match, index) => {
              this.logger.warn(`      ${index + 1}. "${match[0]}"`);
            });
            hasChanges = true;
          }
        }
        
        if (!hasChanges) {
          this.logger.info("    No changes");
        }
        
      } catch (error) {
        this.logger.error(`    ❌ Cannot read file: ${error}`);
      }
    }
  }

  /**
   * Main release method - orchestrates the entire release process
   * @param bumpType Optional version bump type (patch, minor, major)
   * @returns Release result with success status and details
   */
  async release(bumpType?: BumpType): Promise<ReleaseResult> {
    try {
      this.logger.info("🚀 Starting release process with Nagare...\n");

      // Validate environment and configuration
      await this.validateEnvironment();

      // Get current version
      const currentVersion = await this.versionUtils.getCurrentVersion();
      this.logger.info(`📦 Current version: ${currentVersion}`);

      // Get commits since last release
      const commits = await this.git.getCommitsSinceLastRelease();
      this.logger.info(`📝 Found ${commits.length} commits since last release`);

      if (commits.length === 0 && !bumpType) {
        this.logger.info(
          "ℹ️  No commits found since last release. Use --patch, --minor, or --major to force a release.",
        );
        return { success: false, error: "No commits found" };
      }

      // Calculate new version
      const newVersion = this.versionUtils.calculateNewVersion(currentVersion, commits, bumpType);
      this.logger.info(`📈 New version: ${newVersion}`);

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
        this.logger.info("\n🔍 DRY RUN MODE - Previewing all changes...\n");
        await this.previewFileUpdates(templateData);
      }

      // Confirm release (unless skipped)
      if (!this.config.options?.skipConfirmation && !this.config.options?.dryRun) {
        const proceed = confirm("\n❓ Proceed with release?");
        if (!proceed) {
          this.logger.info("❌ Release cancelled");
          return { success: false, error: "User cancelled" };
        }
      }

      if (this.config.options?.dryRun) {
        this.logger.info("\n🏃 Dry run mode - no changes will be made");
        return {
          success: true,
          version: newVersion,
          previousVersion: currentVersion,
          commitCount: commits.length,
          releaseNotes,
        };
      }

      // Update files
      const updatedFiles = await this.updateFiles(newVersion, releaseNotes);

      // Generate documentation if enabled
      if (this.config.docs?.enabled) {
        await this.docGenerator.generateDocs();
        this.logger.info("📚 Generated documentation");
      }

      // Git operations
      await this.git.commitAndTag(newVersion);

      // Push to remote (including the new tag)
      await this.git.pushToRemote();

      // GitHub release (now that tag exists on remote)
      let githubReleaseUrl: string | undefined;
      if (this.config.github?.createRelease) {
        githubReleaseUrl = await this.github.createRelease(releaseNotes);
      }

      this.logger.info("\n🎉 Release completed successfully!");
      this.logger.info(`   Version: ${newVersion}`);
      this.logger.info("   Next steps:");
      this.logger.info("   1. Push changes: git push origin main --tags");
      this.logger.info("   2. Deploy to production");

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
      this.logger.error("❌ Release failed:", error as Error);
      return {
        success: false,
        error: error instanceof Error
          ? error instanceof Error ? error.message : String(error)
          : String(error),
      };
    }
  }

  /**
   * Validate environment and prerequisites
   */
  private async validateEnvironment(): Promise<void> {
    // Check if we're in a git repository
    if (!await this.git.isGitRepository()) {
      throw new Error("Not in a git repository");
    }

    // Check for uncommitted changes
    if (await this.git.hasUncommittedChanges()) {
      throw new Error(
        "Uncommitted changes detected. Please commit or stash changes before releasing.",
      );
    }

    // Validate version file exists
    try {
      await Deno.stat(this.config.versionFile.path);
    } catch {
      throw new Error(`Version file not found: ${this.config.versionFile.path}`);
    }

    // Check git configuration
    const gitUser = await this.git.getGitUser();
    if (!gitUser.name || !gitUser.email) {
      throw new Error("Git user.name and user.email must be configured");
    }

    // NEW: Add pattern validation
    const patternValidation = this.validateFileUpdatePatterns();
    
    if (patternValidation.warnings.length > 0) {
      this.logger.warn("\n⚠️  File update pattern warnings:");
      for (const warning of patternValidation.warnings) {
        this.logger.warn(warning);
      }
      this.logger.warn("\nConsider updating your patterns to avoid potential file corruption.");
    }
    
    if (!patternValidation.valid) {
      this.logger.error("\n❌ File update pattern errors:");
      for (const error of patternValidation.errors) {
        this.logger.error(error);
      }
      throw new Error("Invalid file update patterns detected");
    }

    this.logger.debug("Environment and pattern validation passed");
  }

  /**
   * Generate release notes from commits
   * @param version Version string for the release
   * @param commits Array of conventional commits
   * @returns Generated release notes
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
   * @param releaseNotes Generated release notes to preview
   */
  private previewRelease(releaseNotes: ReleaseNotes): void {
    this.logger.info("\n📋 Release Notes Preview:");
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
   * @param version New version string
   * @param releaseNotes Generated release notes
   * @returns Array of updated file paths
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
      this.logger.info("\n📄 Processing file updates...");
      
      for (const filePattern of this.config.updateFiles) {
        await this.updateCustomFile(filePattern, templateData);
        updatedFiles.push(filePattern.path);
      }
      
      this.logger.info(`✅ Updated ${this.config.updateFiles.length} additional files`);
    }

    this.logger.info(`✅ Updated ${updatedFiles.length} files total`);
    return updatedFiles;
  }

  /**
   * Update the main version file
   * @param templateData Template data for version file generation
   */
  private async updateVersionFile(templateData: TemplateData): Promise<void> {
    const { versionFile } = this.config;

    if (versionFile.template === "custom" && versionFile.customTemplate) {
      // Use custom template
      const content = this.templateProcessor.processTemplate(
        versionFile.customTemplate,
        templateData,
      );
      await Deno.writeTextFile(versionFile.path, content);
    } else {
      // Use built-in template
      const content = this.templateProcessor.generateVersionFile(templateData);
      await Deno.writeTextFile(versionFile.path, content);
    }

    this.logger.debug(`Updated version file: ${versionFile.path}`);
  }

  /**
   * Update a custom file based on patterns with enhanced validation
   * @param filePattern File update pattern configuration
   * @param templateData Template data for replacements
   */
  private async updateCustomFile(
    filePattern: FileUpdatePattern,
    templateData: TemplateData,
  ): Promise<void> {
    try {
      let content = await Deno.readTextFile(filePattern.path);
      let updatedContent = content;
      const changes: Array<{ key: string; oldValue: string; newValue: string; matches: number }> = [];

      if (filePattern.updateFn) {
        // Use custom update function
        updatedContent = filePattern.updateFn(content, templateData);
        this.logger.debug(`Updated ${filePattern.path} using custom function`);
      } else {
        // Use pattern replacement with enhanced validation
        for (const [key, pattern] of Object.entries(filePattern.patterns)) {
          const value = this.getTemplateValue(templateData, key);
          if (value === undefined) {
            this.logger.warn(`No template value found for key: ${key} in ${filePattern.path}`);
            continue;
          }

          // Count matches before replacement
          const matches = [...content.matchAll(new RegExp(pattern, 'g'))];
          
          if (matches.length === 0) {
            this.logger.warn(`Pattern "${key}" found no matches in ${filePattern.path}`);
            continue;
          }

          if (matches.length > 1) {
            this.logger.warn(
              `Pattern "${key}" found ${matches.length} matches in ${filePattern.path}. ` +
              `This may cause unexpected replacements. Consider using more specific patterns.`
            );
            
            // In dry-run mode, show all matches
            if (this.config.options?.dryRun) {
              this.logger.info(`  Matches found in ${filePattern.path}:`);
              matches.forEach((match, index) => {
                this.logger.info(`    ${index + 1}. "${match[0]}"`);
              });
            }
          }

          // Build replacement based on pattern structure
          const replacement = this.buildSafeReplacement(pattern, value);
          
          // Track the change
          changes.push({
            key,
            oldValue: matches[0][0],
            newValue: replacement,
            matches: matches.length
          });

          // Apply replacement
          updatedContent = updatedContent.replace(pattern, replacement);
        }

        // Show changes in dry-run or debug mode
        if ((this.config.options?.dryRun || this.logger.getLevel() <= LogLevel.DEBUG) && changes.length > 0) {
          this.logger.info(`\n📄 Changes for ${filePattern.path}:`);
          for (const change of changes) {
            const status = change.matches === 1 ? '✅' : '⚠️';
            this.logger.info(`  ${status} ${change.key}: "${change.oldValue}" → "${change.newValue}"`);
            if (change.matches > 1) {
              this.logger.warn(`    Warning: ${change.matches} matches found`);
            }
          }
        }
      }

      // Validate the updated content for JSON files
      if (filePattern.path.endsWith('.json')) {
        try {
          JSON.parse(updatedContent);
        } catch (error) {
          throw new Error(
            `Updated ${filePattern.path} contains invalid JSON: ${error}\n` +
            `This suggests the pattern replacement corrupted the file structure.`
          );
        }
      }

      // Write the updated content (unless dry run)
      if (!this.config.options?.dryRun) {
        await Deno.writeTextFile(filePattern.path, updatedContent);
      }
      
      this.logger.debug(`Updated file: ${filePattern.path}`);
      
    } catch (error) {
      this.logger.error(`Failed to update file ${filePattern.path}:`, error as Error);
      throw error;
    }
  }

  /**
   * Get a value from template data by key path
   * @param data Template data object
   * @param keyPath Dot-separated key path (e.g., "project.name")
   * @returns Value as string or undefined if not found
   */
  private getTemplateValue(data: TemplateData, keyPath: string): string | undefined {
    const keys = keyPath.split(".");
    let value: unknown = data;

    for (const key of keys) {
      if (value && typeof value === "object" && value !== null && key in value) {
        value = (value as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return typeof value === "string" ? value : String(value);
  }

  /**
   * Get the current configuration
   * @returns Current Nagare configuration
   */
  getConfig(): NagareConfig {
    return this.config;
  }

  /**
   * Validate configuration
   * @param config Configuration to validate
   * @returns Validation result with errors
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

// Import statements for the supporting classes
import type { FileUpdatePattern } from "../types.ts";