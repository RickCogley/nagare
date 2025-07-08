/**
 * @fileoverview Semantic versioning operations for Nagare
 */

import { parse } from "@std/semver";
import { BumpType } from "../types.ts";
import type { ConventionalCommit, NagareConfig } from "../types.ts";
import type { TranslationKey } from "../locales/schema.ts";
import { ErrorCodes, ErrorFactory, NagareError } from "./enhanced-error.ts";
import type { GitOperations } from "./git-operations.ts";

/**
 * VersionUtils - Semantic versioning operations
 */
export class VersionUtils {
  private config: NagareConfig;
  private git: GitOperations;

  constructor(config: NagareConfig, git: GitOperations) {
    this.config = config;
    this.git = git;
  }

  /**
   * Get current version from git tags first, then fall back to version file
   */
  async getCurrentVersion(): Promise<string> {
    // First, try to get version from git tags
    try {
      const lastTag = await this.git.getLastReleaseTag();
      if (lastTag) {
        const tagPrefix = this.config.options?.tagPrefix || "v";
        const version = lastTag.replace(new RegExp(`^${tagPrefix}`), "");
        // Validate it's a valid semver
        try {
          parse(version);
          return version;
        } catch {
          // Invalid version in tag, fall through to file
        }
      }
    } catch {
      // No tags or git error, fall through to file
    }

    // Fall back to reading from version file (for initial release)
    try {
      const content = await Deno.readTextFile(this.config.versionFile.path);

      // Try to extract version using configured pattern or default patterns
      const patterns = this.config.versionFile.patterns?.version || [
        /export const VERSION = "([^"]+)"/, // TypeScript
        /"version":\s*"([^"]+)"/, // JSON
        /version:\s*"([^"]+)"/, // YAML
        /VERSION\s*=\s*"([^"]+)"/, // Generic
      ];

      const patternsArray = Array.isArray(patterns) ? patterns : [patterns];

      for (const pattern of patternsArray) {
        const match = content.match(pattern);
        if (match) {
          return match[1];
        }
      }

      throw ErrorFactory.versionNotFound(
        this.config.versionFile.path,
        patternsArray.map((p) => p.toString()),
      );
    } catch (error) {
      // If it's already a NagareError, re-throw it
      if (error instanceof NagareError) {
        throw error;
      }

      // File not found or other read error
      throw new NagareError(
        "errors.versionFileNotFound" as TranslationKey,
        ErrorCodes.VERSION_FILE_NOT_FOUND,
        {
          context: {
            filePath: this.config.versionFile.path,
            error: error instanceof Error ? error.message : String(error),
          },
          suggestions: [
            "suggestions.checkPath" as TranslationKey,
            "suggestions.checkConfig" as TranslationKey,
            "suggestions.verifyPermissions" as TranslationKey,
          ],
        },
      );
    }
  }

  /**
   * Calculate new version based on commits and bump type
   */
  calculateNewVersion(
    currentVersion: string,
    commits: ConventionalCommit[],
    bumpType?: BumpType,
  ): string {
    const semver = parse(currentVersion);

    // Determine minimum required bump type based on commits
    const hasBreaking = commits.some((c) => c.breakingChange);
    const hasFeatures = commits.some((c) => c.type === "feat");
    const hasFixes = commits.some((c) => c.type === "fix");

    let minimumBumpType: BumpType;
    if (hasBreaking) {
      minimumBumpType = BumpType.MAJOR;
    } else if (hasFeatures) {
      minimumBumpType = BumpType.MINOR;
    } else {
      minimumBumpType = BumpType.PATCH;
    }

    if (bumpType) {
      // Validate that requested bump type meets minimum requirements
      const bumpHierarchy = {
        [BumpType.PATCH]: 0,
        [BumpType.MINOR]: 1,
        [BumpType.MAJOR]: 2,
      };
      const requestedLevel = bumpHierarchy[bumpType];
      const minimumLevel = bumpHierarchy[minimumBumpType];

      if (requestedLevel < minimumLevel) {
        const commitDetails: string[] = [];

        if (hasBreaking) {
          const breakingCommits = commits.filter((c) => c.breakingChange);
          commitDetails.push(
            `Found ${breakingCommits.length} breaking change(s):`,
            ...breakingCommits.map((c) => `  - ${c.raw || `${c.type}: ${c.description}`}`).slice(
              0,
              3,
            ),
            breakingCommits.length > 3 ? `  ... and ${breakingCommits.length - 3} more` : "",
          );
        } else if (hasFeatures) {
          const featureCommits = commits.filter((c) => c.type === "feat");
          commitDetails.push(
            `Found ${featureCommits.length} feature(s):`,
            ...featureCommits.map((c) => `  - ${c.raw || `feat: ${c.description}`}`).slice(0, 3),
            featureCommits.length > 3 ? `  ... and ${featureCommits.length - 3} more` : "",
          );
        }

        throw new NagareError(
          "errors.breakingRequiresMajor" as TranslationKey,
          ErrorCodes.VERSION_BUMP_INVALID,
          {
            context: {
              requestedBumpType: bumpType,
              minimumBumpType,
              hasBreakingChanges: hasBreaking,
              hasFeatures,
              hasFixes,
              commitDetails: commitDetails.filter((line) => line !== ""),
            },
          },
        );
      }

      // Manual version bump (requested type meets minimum requirements)
      switch (bumpType) {
        case BumpType.MAJOR:
          return `${semver.major + 1}.0.0`;
        case BumpType.MINOR:
          return `${semver.major}.${semver.minor + 1}.0`;
        case BumpType.PATCH:
          return `${semver.major}.${semver.minor}.${semver.patch + 1}`;
        default:
          throw new NagareError(
            "errors.versionBumpInvalid" as TranslationKey,
            ErrorCodes.VERSION_BUMP_INVALID,
            {
              context: {
                providedType: bumpType,
                validTypes: ["major", "minor", "patch"],
              },
              suggestions: [
                "suggestions.useValidType" as TranslationKey,
              ],
            },
          );
      }
    }

    // Auto-calculate based on conventional commits (no explicit bump type)
    if (hasBreaking) {
      return `${semver.major + 1}.0.0`;
    } else if (hasFeatures) {
      return `${semver.major}.${semver.minor + 1}.0`;
    } else if (hasFixes) {
      return `${semver.major}.${semver.minor}.${semver.patch + 1}`;
    } else {
      // No significant changes, bump patch
      return `${semver.major}.${semver.minor}.${semver.patch + 1}`;
    }
  }

  /**
   * Parse semantic version into components
   */
  parseVersion(
    version: string,
  ): { major: number; minor: number; patch: number; prerelease: string | null } {
    const semver = parse(version);
    return {
      major: semver.major,
      minor: semver.minor,
      patch: semver.patch,
      prerelease: semver.prerelease && semver.prerelease.length > 0
        ? semver.prerelease.join(".")
        : null,
    };
  }
}
