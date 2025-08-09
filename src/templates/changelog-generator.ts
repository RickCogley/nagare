/**
 * @module ChangelogGenerator
 * @description CHANGELOG.md management with PR-aware generation.
 *
 * Generates changelogs following "Keep a Changelog" format with automatic
 * PR detection and grouping. Supports both PR-first and traditional layouts
 * based on repository workflow.
 *
 * @example Basic changelog generation
 * ```typescript
 * import { ChangelogGenerator } from "./templates/changelog-generator.ts";
 *
 * const generator = new ChangelogGenerator(config);
 * await generator.updateChangelog(releaseNotes);
 * ```
 *
 * @example PR-aware changelog generation
 * ```typescript
 * const generator = new ChangelogGenerator(config);
 * const releaseNotes = await generator.generateReleaseNotes(version, commits);
 * await generator.updateChangelog(releaseNotes);
 * ```
 *
 * @since 1.0.0
 */

import type { ConventionalCommit, NagareConfig, ReleaseNotes } from "../../types.ts";
import type { PRDetectionResult } from "../changelog/pr-detector.ts";
import { NagareBrand as Brand } from "../core/branded-messages.ts";
import { GitOperations } from "../git/git-operations.ts";
import { PRDetector } from "../changelog/pr-detector.ts";
import { TemplateProcessor } from "./template-processor.ts";
import { Logger } from "../core/logger.ts";

/**
 * Extended release notes with PR information
 */
export interface PRReleaseNotes extends ReleaseNotes {
  /** Pull requests grouped by PR number */
  pullRequests?: Array<{
    number: number;
    title: string;
    features: ConventionalCommit[];
    fixes: ConventionalCommit[];
    changes: ConventionalCommit[];
    other: ConventionalCommit[];
    sha: string;
  }>;
  /** Direct commits not in PRs */
  directCommits?: {
    features: ConventionalCommit[];
    fixes: ConventionalCommit[];
    changes: ConventionalCommit[];
    other: ConventionalCommit[];
  };
  /** Whether PRs were detected */
  hasPRs: boolean;
}

/**
 * ChangelogGenerator - CHANGELOG.md management with PR awareness
 */
export class ChangelogGenerator {
  private config: NagareConfig;
  private git: GitOperations;
  private prDetector: PRDetector;
  private templateProcessor: TemplateProcessor;
  private logger: Logger;

  constructor(config: NagareConfig) {
    this.config = config;
    this.git = new GitOperations(config);
    this.prDetector = new PRDetector(this.git, config);
    this.templateProcessor = new TemplateProcessor(config);
    this.logger = new Logger(config.options?.logLevel);
  }

  /**
   * Generate release notes with PR detection
   */
  async generatePRReleaseNotes(
    version: string,
    commits: ConventionalCommit[],
  ): Promise<PRReleaseNotes> {
    const date = new Date().toISOString().split("T")[0];

    // Check if PR detection is disabled
    if (this.prDetector.isPRDetectionDisabled()) {
      this.logger.info("PR detection disabled, using traditional changelog format");
      return this.generateTraditionalReleaseNotes(version, date, commits);
    }

    // Detect PRs from git history
    const lastTag = await this.git.getLastReleaseTag();
    const prResult = await this.prDetector.detectPRs(lastTag);

    if (!prResult.hasPRs) {
      this.logger.info("No PRs detected, using traditional changelog format");
      return this.generateTraditionalReleaseNotes(version, date, commits);
    }

    // Generate PR-aware release notes
    return this.generatePRGroupedReleaseNotes(version, date, prResult);
  }

  /**
   * Generate traditional release notes (backward compatibility)
   */
  private generateTraditionalReleaseNotes(
    version: string,
    date: string,
    commits: ConventionalCommit[],
  ): PRReleaseNotes {
    const notes: PRReleaseNotes = {
      version,
      date,
      added: [],
      changed: [],
      deprecated: [],
      removed: [],
      fixed: [],
      security: [],
      hasPRs: false,
    };

    for (const commit of commits) {
      const entry = `${commit.description}${commit.scope ? ` (${commit.scope})` : ""} (${commit.hash})`;

      switch (commit.type) {
        case "feat":
          notes.added.push(entry);
          break;
        case "fix":
          notes.fixed.push(entry);
          break;
        case "docs":
        case "style":
        case "refactor":
        case "perf":
        case "test":
        case "chore":
          notes.changed.push(entry);
          break;
        case "security":
          notes.security.push(entry);
          break;
        case "revert":
          notes.removed.push(entry);
          break;
      }

      if (commit.breakingChange) {
        notes.changed.push(`BREAKING CHANGE: ${commit.description} (${commit.hash})`);
      }
    }

    return notes;
  }

  /**
   * Generate PR-grouped release notes
   */
  private generatePRGroupedReleaseNotes(
    version: string,
    date: string,
    prResult: PRDetectionResult,
  ): PRReleaseNotes {
    const notes: PRReleaseNotes = {
      version,
      date,
      added: [],
      changed: [],
      deprecated: [],
      removed: [],
      fixed: [],
      security: [],
      hasPRs: true,
      pullRequests: [],
      directCommits: {
        features: [],
        fixes: [],
        changes: [],
        other: [],
      },
    };

    // Process each PR
    for (const [prNumber, prInfo] of prResult.pullRequests) {
      const prData = {
        number: prNumber,
        title: prInfo.title,
        features: [] as ConventionalCommit[],
        fixes: [] as ConventionalCommit[],
        changes: [] as ConventionalCommit[],
        other: [] as ConventionalCommit[],
        sha: prInfo.mergeCommitSha.substring(0, 7),
      };

      // Group commits by type within the PR
      for (const commit of prInfo.commits) {
        switch (commit.type) {
          case "feat":
            prData.features.push(commit);
            break;
          case "fix":
            prData.fixes.push(commit);
            break;
          case "docs":
          case "style":
          case "refactor":
          case "perf":
          case "test":
          case "chore":
            prData.changes.push(commit);
            break;
          default:
            prData.other.push(commit);
        }
      }

      notes.pullRequests!.push(prData);
    }

    // Process direct commits (not in PRs)
    for (const commit of prResult.directCommits) {
      switch (commit.type) {
        case "feat":
          notes.directCommits!.features.push(commit);
          break;
        case "fix":
          notes.directCommits!.fixes.push(commit);
          break;
        case "docs":
        case "style":
        case "refactor":
        case "perf":
        case "test":
        case "chore":
          notes.directCommits!.changes.push(commit);
          break;
        default:
          notes.directCommits!.other.push(commit);
      }
    }

    return notes;
  }

  /**
   * Update CHANGELOG.md with new release notes
   */
  async updateChangelog(releaseNotes: ReleaseNotes | PRReleaseNotes): Promise<void> {
    const changelogPath = "./CHANGELOG.md";

    try {
      let existingContent = "";
      try {
        existingContent = await Deno.readTextFile(changelogPath);
      } catch {
        // File doesn't exist, create header
        existingContent = this.createChangelogHeader();
      }

      // Generate new entry based on whether we have PR data
      let newEntry: string;
      if ("hasPRs" in releaseNotes && releaseNotes.hasPRs) {
        newEntry = await this.generatePRChangelogEntry(releaseNotes as PRReleaseNotes);
      } else {
        newEntry = this.generateTraditionalChangelogEntry(releaseNotes);
      }

      // Insert new entry after header
      const newContent = this.insertNewEntry(existingContent, newEntry);

      await Deno.writeTextFile(changelogPath, newContent);
      Brand.success("Updated CHANGELOG.md");
    } catch (error) {
      console.error(
        "❌ Error updating CHANGELOG.md:",
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Create changelog header
   */
  private createChangelogHeader(): string {
    return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;
  }

  /**
   * Generate traditional changelog entry (backward compatible)
   */
  private generateTraditionalChangelogEntry(releaseNotes: ReleaseNotes): string {
    let entry = `## [${releaseNotes.version}] - ${releaseNotes.date}\n\n`;

    if (releaseNotes.added.length > 0) {
      entry += `### Added\n${releaseNotes.added.map((item) => `- ${item}`).join("\n")}\n\n`;
    }
    if (releaseNotes.changed.length > 0) {
      entry += `### Changed\n${releaseNotes.changed.map((item) => `- ${item}`).join("\n")}\n\n`;
    }
    if (releaseNotes.deprecated.length > 0) {
      entry += `### Deprecated\n${releaseNotes.deprecated.map((item) => `- ${item}`).join("\n")}\n\n`;
    }
    if (releaseNotes.removed.length > 0) {
      entry += `### Removed\n${releaseNotes.removed.map((item) => `- ${item}`).join("\n")}\n\n`;
    }
    if (releaseNotes.fixed.length > 0) {
      entry += `### Fixed\n${releaseNotes.fixed.map((item) => `- ${item}`).join("\n")}\n\n`;
    }
    if (releaseNotes.security.length > 0) {
      entry += `### Security\n${releaseNotes.security.map((item) => `- ${item}`).join("\n")}\n\n`;
    }

    return entry;
  }

  /**
   * Generate PR-aware changelog entry using Vento template
   */
  private async generatePRChangelogEntry(releaseNotes: PRReleaseNotes): Promise<string> {
    // Check if we have a custom changelog template
    const templatePath = "./templates/changelog-pr.vto";
    let template: string;

    try {
      template = await Deno.readTextFile(templatePath);
      this.logger.debug("Using custom PR changelog template");
    } catch {
      // Use built-in template
      template = this.getBuiltInPRTemplate();
      this.logger.debug("Using built-in PR changelog template");
    }

    // Process template with release notes data
    // Create template data with PR-specific properties in metadata
    const templateData = {
      version: releaseNotes.version,
      buildDate: releaseNotes.date,
      gitCommit: "",
      environment: "production" as const,
      releaseNotes: releaseNotes as ReleaseNotes,
      project: this.config.project, // Add project configuration
      metadata: {
        // PR-specific data for template access
        pullRequests: releaseNotes.pullRequests || [],
        directCommits: releaseNotes.directCommits || {},
        hasPRs: releaseNotes.hasPRs,
        date: releaseNotes.date,
      },
    };

    const entry = await this.templateProcessor.processTemplate(template, templateData);

    return entry;
  }

  /**
   * Get built-in PR changelog template
   */
  private getBuiltInPRTemplate(): string {
    return `## [{{ version }}] - {{ metadata.date }}

{{ for pr of metadata.pullRequests }}
### {{ pr.title }} (#{{ pr.number }})

{{ if pr.features.length > 0 }}
#### Added
{{ for commit of pr.features }}
- {{ commit.description }}{{ if commit.scope }} ({{ commit.scope }}){{ /if }} ({{ commit.hash.slice(0, 7) }})
{{ /for }}
{{ /if }}

{{ if pr.fixes.length > 0 }}
#### Fixed
{{ for commit of pr.fixes }}
- {{ commit.description }}{{ if commit.scope }} ({{ commit.scope }}){{ /if }} ({{ commit.hash.slice(0, 7) }})
{{ /for }}
{{ /if }}

{{ if pr.changes.length > 0 }}
#### Changed
{{ for commit of pr.changes }}
- {{ commit.description }}{{ if commit.scope }} ({{ commit.scope }}){{ /if }} ({{ commit.hash.slice(0, 7) }})
{{ /for }}
{{ /if }}

{{ /for }}

{{ if metadata.directCommits && (metadata.directCommits.features.length > 0 || metadata.directCommits.fixes.length > 0 || metadata.directCommits.changes.length > 0) }}
### Direct Commits

{{ if metadata.directCommits.features.length > 0 }}
#### Added
{{ for commit of metadata.directCommits.features }}
- {{ commit.description }}{{ if commit.scope }} ({{ commit.scope }}){{ /if }} ({{ commit.hash.slice(0, 7) }})
{{ /for }}
{{ /if }}

{{ if metadata.directCommits.fixes.length > 0 }}
#### Fixed
{{ for commit of metadata.directCommits.fixes }}
- {{ commit.description }}{{ if commit.scope }} ({{ commit.scope }}){{ /if }} ({{ commit.hash.slice(0, 7) }})
{{ /for }}
{{ /if }}

{{ if metadata.directCommits.changes.length > 0 }}
#### Changed
{{ for commit of metadata.directCommits.changes }}
- {{ commit.description }}{{ if commit.scope }} ({{ commit.scope }}){{ /if }} ({{ commit.hash.slice(0, 7) }})
{{ /for }}
{{ /if }}
{{ /if }}

`;
  }

  /**
   * Insert new entry into existing changelog
   */
  private insertNewEntry(existingContent: string, newEntry: string): string {
    // Extract version from new entry
    const versionMatch = newEntry.match(/## \[([^\]]+)\]/);
    if (versionMatch) {
      const version = versionMatch[1];

      // Check if this version already exists
      const versionPattern = new RegExp(
        `## \\[${version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]`,
      );
      if (versionPattern.test(existingContent)) {
        // Version already exists, replace it
        const versionStart = existingContent.search(versionPattern);
        const nextVersionStart = existingContent.indexOf("\n## ", versionStart + 1);

        if (nextVersionStart === -1) {
          // This is the last version entry
          return existingContent.slice(0, versionStart) + newEntry;
        } else {
          // There are more versions after this one
          return existingContent.slice(0, versionStart) + newEntry +
            existingContent.slice(nextVersionStart + 1);
        }
      }
    }

    // Version doesn't exist, add it normally
    const headerEnd = existingContent.indexOf("\n## ");

    if (headerEnd === -1) {
      // No existing releases
      return existingContent + newEntry;
    } else {
      // Insert after header
      return existingContent.slice(0, headerEnd + 1) + newEntry +
        existingContent.slice(headerEnd + 1);
    }
  }
}
