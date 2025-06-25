/**
 * @fileoverview Core ReleaseManager implementation
 * Extracted and generalized from Salty's release system
 */

// import { parse } from "jsr:@std/semver@1";
import type {
  BumpType,
  ConventionalCommit,
  NagareConfig,
  ReleaseNotes,
  ReleaseResult,
  TemplateData,
} from "../types.ts";
import { DEFAULT_COMMIT_TYPES, DEFAULT_CONFIG, LogLevel } from "../config.ts";
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
   * Main release method - orchestrates the entire release process
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

    this.logger.debug("Environment validation passed");
  }

  /**
   * Generate release notes from commits
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

    // Update additional files
    if (this.config.updateFiles) {
      for (const filePattern of this.config.updateFiles) {
        await this.updateCustomFile(filePattern, templateData);
        updatedFiles.push(filePattern.path);
      }
    }

    this.logger.info(`✅ Updated ${updatedFiles.length} files`);
    return updatedFiles;
  }

  /**
   * Update the main version file
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
   * Update a custom file based on patterns
   */
  private async updateCustomFile(
    filePattern: FileUpdatePattern,
    templateData: TemplateData,
  ): Promise<void> {
    try {
      let content = await Deno.readTextFile(filePattern.path);

      if (filePattern.updateFn) {
        // Use custom update function
        content = filePattern.updateFn(content, templateData);
      } else {
        // Use pattern replacement
        for (const [key, pattern] of Object.entries(filePattern.patterns)) {
          const value = this.getTemplateValue(templateData, key);
          if (value !== undefined) {
            content = content.replace(pattern, `"${value}"`);
          }
        }
      }

      await Deno.writeTextFile(filePattern.path, content);
      this.logger.debug(`Updated file: ${filePattern.path}`);
    } catch (error) {
      this.logger.warn(`Failed to update file ${filePattern.path}:`, error as Error);
    }
  }

  /**
   * Get a value from template data by key path
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
   */
  getConfig(): NagareConfig {
    return this.config;
  }

  /**
   * Validate configuration
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
