/**
 * @module PRDetector
 * @description Pull Request detection and grouping for changelog generation.
 *
 * Detects PR merge commits from git history and groups related commits together.
 * Supports various GitHub merge strategies including merge commits, squash merges,
 * and rebase merges.
 *
 * @example Basic PR detection
 * ```typescript
 * import { PRDetector } from "./changelog/pr-detector.ts";
 * import { GitOperations } from "./git/git-operations.ts";
 *
 * const git = new GitOperations(config);
 * const detector = new PRDetector(git, config);
 * const prs = await detector.detectPRs("v1.0.0");
 *
 * for (const [prNumber, prInfo] of prs) {
 *   console.log(`PR #${prNumber}: ${prInfo.title}`);
 *   console.log(`  Commits: ${prInfo.commits.length}`);
 *   console.log(`  Types: ${Array.from(prInfo.types).join(", ")}`);
 * }
 * ```
 *
 * @since 2.19.0
 */

import type { ConventionalCommit, NagareConfig } from "../../types.ts";
import type { GitOperations } from "../git/git-operations.ts";
import { Logger } from "../core/logger.ts";

/**
 * Information about a Pull Request
 */
export interface PRInfo {
  /** PR number from GitHub */
  number: number;
  /** PR title extracted from merge commit */
  title: string;
  /** All commits that were part of this PR */
  commits: ConventionalCommit[];
  /** Unique commit types in this PR (feat, fix, etc.) */
  types: Set<string>;
  /** SHA of the merge commit */
  mergeCommitSha: string;
  /** Date of the merge */
  mergeDate: string;
}

/**
 * Result of PR detection including both PR-grouped and direct commits
 */
export interface PRDetectionResult {
  /** Map of PR number to PR information */
  pullRequests: Map<number, PRInfo>;
  /** Commits not associated with any PR */
  directCommits: ConventionalCommit[];
  /** Whether any PRs were detected */
  hasPRs: boolean;
}

/**
 * Detects and groups Pull Requests from git history
 *
 * @class PRDetector
 * @since 2.19.0
 */
export class PRDetector {
  private git: GitOperations;
  private config: NagareConfig;
  private logger: Logger;

  constructor(git: GitOperations, config: NagareConfig) {
    this.git = git;
    this.config = config;
    this.logger = new Logger(config.options?.logLevel);
  }

  /**
   * Detect PRs and group commits accordingly
   *
   * @param since - Git ref to start from (tag, commit hash, etc.)
   * @returns Detection result with PRs and direct commits separated
   */
  async detectPRs(since: string): Promise<PRDetectionResult> {
    this.logger.debug(`Detecting PRs since ${since || "beginning"}`);

    // Get all merge commits
    const mergeCommits = await this.git.getMergeCommits(since);
    const prMap = new Map<number, PRInfo>();
    const prCommitShas = new Set<string>();

    // Process each merge commit
    for (const merge of mergeCommits) {
      const prNumber = this.git.extractPRNumber(merge.message);

      if (prNumber) {
        this.logger.debug(`Found PR #${prNumber} in merge commit ${merge.sha.substring(0, 7)}`);

        // Get commits that were part of this PR
        const commits = await this.git.getCommitsInPR(merge.sha);

        // Track all commit SHAs that belong to PRs
        commits.forEach((c) => prCommitShas.add(c.hash));

        // Extract PR title from merge commit message
        const title = this.extractPRTitle(merge.message, prNumber);

        // Collect unique commit types
        const types = new Set(commits.map((c) => c.type));

        prMap.set(prNumber, {
          number: prNumber,
          title,
          commits,
          types,
          mergeCommitSha: merge.sha,
          mergeDate: merge.date,
        });
      }
    }

    // Get all commits since last release
    const allCommits = await this.git.getCommitsSinceLastRelease();

    // Filter out commits that are part of PRs
    const directCommits = allCommits.filter(
      (commit) => !prCommitShas.has(commit.hash),
    );

    const result: PRDetectionResult = {
      pullRequests: prMap,
      directCommits,
      hasPRs: prMap.size > 0,
    };

    this.logger.info(
      `Detected ${prMap.size} PRs with ${Array.from(prCommitShas).length} commits, ` +
        `${directCommits.length} direct commits`,
    );

    return result;
  }

  /**
   * Extract PR title from merge commit message
   *
   * @param message - Full merge commit message
   * @param prNumber - PR number for fallback
   * @returns Extracted title or fallback
   */
  private extractPRTitle(message: string, prNumber: number): string {
    // Try to extract title from standard GitHub merge commit format
    // Format: "Merge pull request #123 from user/branch\n\nPR Title Here"
    const lines = message.split("\n").filter((line) => line.trim());

    // GitHub typically puts the PR title as the second non-empty line
    // First line: "Merge pull request #123 from user/branch"
    // Second line: "PR Title Here"
    if (lines.length > 1 && lines[1].trim()) {
      // Don't return lines that look like commit metadata
      const secondLine = lines[1].trim();
      if (!secondLine.startsWith("-") && !secondLine.includes("|||")) {
        return secondLine;
      }
    }

    // Try to extract from the first line if it contains more info
    const firstLine = lines[0];

    // Pattern: "Merge pull request #123 from user/branch: Title"
    const colonMatch = firstLine.match(/:\s*(.+)$/);
    if (colonMatch) {
      return colonMatch[1].trim();
    }

    // Pattern: "Merge #123: Title"
    const shortMatch = firstLine.match(/Merge\s+#\d+:\s*(.+)$/);
    if (shortMatch) {
      return shortMatch[1].trim();
    }

    // Fallback to a generic title
    return `Pull Request #${prNumber}`;
  }

  /**
   * Group commits by their type (feat, fix, etc.)
   *
   * @param commits - Array of conventional commits
   * @returns Commits grouped by type
   */
  groupCommitsByType(commits: ConventionalCommit[]): Record<string, ConventionalCommit[]> {
    const grouped: Record<string, ConventionalCommit[]> = {};

    for (const commit of commits) {
      const type = commit.type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(commit);
    }

    return grouped;
  }

  /**
   * Check if PR detection should be disabled
   *
   * @returns True if PR detection is disabled via environment variable
   */
  isPRDetectionDisabled(): boolean {
    const disabled = Deno.env.get("NAGARE_DISABLE_PR_DETECTION");
    return disabled === "true" || disabled === "1";
  }
}
