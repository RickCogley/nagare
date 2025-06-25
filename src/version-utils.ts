/**
 * @fileoverview Semantic versioning operations for Nagare
 */

import { parse } from "@std/semver";
import type { BumpType, ConventionalCommit, NagareConfig } from "../types.ts";

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

      throw new Error(`Could not find version in ${this.config.versionFile.path}`);
    } catch (error) {
      throw new Error(
        `Error reading version: ${error instanceof Error ? error.message : String(error)}`,
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

    if (bumpType) {
      // Manual version bump
      switch (bumpType) {
        case "major":
          return `${semver.major + 1}.0.0`;
        case "minor":
          return `${semver.major}.${semver.minor + 1}.0`;
        case "patch":
          return `${semver.major}.${semver.minor}.${semver.patch + 1}`;
        default:
          throw new Error(`Invalid bump type: ${bumpType}`);
      }
    }

    // Auto-calculate based on conventional commits
    const hasBreaking = commits.some((c) => c.breakingChange);
    const hasFeatures = commits.some((c) => c.type === "feat");
    const hasFixes = commits.some((c) => c.type === "fix");

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
  parseVersion(version: string) {
    const semver = parse(version);
    return {
      major: semver.major,
      minor: semver.minor,
      patch: semver.patch,
      prerelease: semver.prerelease.length > 0 ? semver.prerelease.join(".") : null,
    };
  }
}
