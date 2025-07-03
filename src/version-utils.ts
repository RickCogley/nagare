/**
 * @fileoverview Semantic versioning operations for Nagare
 */

import { parse } from "@std/semver";
import { BumpType } from "../types.ts";
import type { ConventionalCommit, NagareConfig } from "../types.ts";
import { ErrorCodes, ErrorFactory, NagareError } from "./enhanced-error.ts";

/**
 * VersionUtils - Semantic versioning operations
 */
export class VersionUtils {
  private config: NagareConfig;

  constructor(config: NagareConfig) {
    this.config = config;
  }

  /**
   * Get current version from version file
   */
  async getCurrentVersion(): Promise<string> {
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
        `Error reading version file: ${this.config.versionFile.path}`,
        ErrorCodes.VERSION_FILE_NOT_FOUND,
        [
          "Check that the version file exists",
          "Verify the file path is correct in nagare.config.ts",
          "Ensure you have read permissions for the file",
          "Run 'ls -la' to check file permissions",
        ],
        {
          filePath: this.config.versionFile.path,
          error: error instanceof Error ? error.message : String(error),
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
          `Cannot use ${bumpType} bump: commits require at least ${minimumBumpType}`,
          ErrorCodes.VERSION_BUMP_INVALID,
          [
            `Your commits indicate a minimum ${minimumBumpType} version bump is required`,
            "",
            ...commitDetails.filter((line) => line !== ""),
            "",
            "Options:",
            `1. Use '${minimumBumpType}' or higher: nagare release ${minimumBumpType}`,
            "2. Let Nagare auto-detect: nagare release",
            minimumBumpType === BumpType.MAJOR
              ? "3. Remove BREAKING CHANGE from commits if not intended"
              : minimumBumpType === BumpType.MINOR
              ? "3. Change feat: to fix: or another type if it's not a new feature"
              : "",
          ].filter((line) => line !== ""),
          {
            requestedBumpType: bumpType,
            minimumBumpType,
            hasBreakingChanges: hasBreaking,
            hasFeatures,
            hasFixes,
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
            `Invalid bump type: ${bumpType}`,
            ErrorCodes.VERSION_BUMP_INVALID,
            [
              "Use one of the valid bump types: major, minor, patch",
              "Check the command line arguments",
              "Example: nagare release --bump minor",
            ],
            {
              providedType: bumpType,
              validTypes: ["major", "minor", "patch"],
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
