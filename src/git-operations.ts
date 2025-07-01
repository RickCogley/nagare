/**
 * @fileoverview Git operations for release management
 * Extracted and enhanced from Salty's git functionality
 */

import type { ConventionalCommit, NagareConfig } from "../types.ts";
import { Logger } from "./logger.ts";
import {
  createSecurityLog,
  sanitizeCommitMessage,
  sanitizeErrorMessage,
  validateGitRef,
  validateVersion,
} from "./security-utils.ts";
import { ErrorCodes, NagareError } from "./enhanced-error.ts";

/**
 * Handles all Git-related operations for releases
 *
 * @class GitOperations
 * @since 1.0.0
 *
 * @description
 * Provides a comprehensive interface for git operations needed during the release process.
 * Handles commit parsing, tag management, and repository state validation.
 *
 * ## Common Git Issues and Solutions
 *
 * ### "No commits found since last release"
 * - Ensure you have commits: `git log --oneline -n 10`
 * - Check last tag: `git describe --tags --abbrev=0`
 * - Verify tag format matches your config (default: "v" prefix)
 *
 * ### "Uncommitted changes detected"
 * - Check status: `git status`
 * - Stash changes: `git stash`
 * - Or commit: `git add . && git commit -m "chore: prepare for release"`
 *
 * ### "Not a git repository"
 * - Initialize: `git init`
 * - Add remote: `git remote add origin <url>`
 *
 * @example Direct usage for custom workflows
 * ```typescript
 * const git = new GitOperations(config);
 *
 * // Check repository state
 * if (!await git.isGitRepository()) {
 *   throw new Error("Not in a git repository");
 * }
 *
 * // Get commits for analysis
 * const commits = await git.getCommitsSinceLastRelease();
 * console.log(`Found ${commits.length} commits`);
 *
 * // Parse a specific commit
 * const parsed = git.parseConventionalCommit("feat(api): add user auth");
 * console.log(`Type: ${parsed.type}, Scope: ${parsed.scope}`);
 * ```
 *
 * @example Tag management
 * ```typescript
 * const git = new GitOperations(config);
 *
 * // Create and push a new tag
 * await git.commitAndTag("1.2.0", ["CHANGELOG.md", "version.ts"]);
 * await git.pushToRemote("v1.2.0");
 *
 * // Check if tag exists on remote
 * const exists = await git.remoteTagExists("v1.2.0");
 * ```
 */
export class GitOperations {
  private config: NagareConfig;
  private logger: Logger;

  constructor(config: NagareConfig) {
    this.config = config;
    this.logger = new Logger(config.options?.logLevel);
  }

  /**
   * Check if current directory is a git repository
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await this.runCommand(["git", "status"]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check for uncommitted changes
   */
  async hasUncommittedChanges(): Promise<boolean> {
    try {
      const result = await this.runCommand(["git", "status", "--porcelain"]);
      return result.trim().length > 0;
    } catch {
      return true; // Assume uncommitted changes if we can't check
    }
  }

  /**
   * Get git user configuration
   */
  async getGitUser(): Promise<{ name: string; email: string }> {
    try {
      const name = await this.runCommand(["git", "config", "user.name"]);
      const email = await this.runCommand(["git", "config", "user.email"]);
      return {
        name: name.trim(),
        email: email.trim(),
      };
    } catch {
      return { name: "", email: "" };
    }
  }

  /**
   * Get current commit hash
   */
  async getCurrentCommitHash(): Promise<string> {
    try {
      const result = await this.runCommand(["git", "rev-parse", "HEAD"]);
      return result.trim().substring(0, 7);
    } catch {
      return "unknown";
    }
  }

  /**
   * Get the last release tag
   */
  async getLastReleaseTag(): Promise<string> {
    try {
      const tagPrefix = this.config.options?.tagPrefix || "v";
      const result = await this.runCommand([
        "git",
        "describe",
        "--tags",
        "--abbrev=0",
        "--match",
        `${tagPrefix}*`,
      ]);
      return result.trim();
    } catch {
      this.logger.debug("No previous tags found, using all commits");
      return ""; // Return empty string to indicate no previous tags
    }
  }

  /**
   * Get commits since last release
   */
  async getCommitsSinceLastRelease(): Promise<ConventionalCommit[]> {
    const lastTag = await this.getLastReleaseTag();
    const range = lastTag ? `${lastTag}..HEAD` : "HEAD";

    try {
      // Use a reliable delimiter and format
      const result = await this.runCommand([
        "git",
        "log",
        range,
        "--pretty=format:%H|||%ci|||%s",
        "--no-merges",
      ]);

      if (!result.trim()) {
        this.logger.info("No commits found since last release");
        return [];
      }

      return result.split("\n")
        .filter((line) => line.trim())
        .map((line) => this.parseConventionalCommit(line))
        .filter((commit) => commit !== null) as ConventionalCommit[];
    } catch (error) {
      this.logger.error("Error getting commits:", error as Error);
      return [];
    }
  }

  /**
   * Parse a git log line into a conventional commit
   */
  private parseConventionalCommit(gitLogLine: string): ConventionalCommit | null {
    if (!gitLogLine || typeof gitLogLine !== "string") {
      this.logger.warn("Invalid git log line:", gitLogLine);
      return null;
    }

    // Split on triple pipe delimiter
    const parts = gitLogLine.split("|||");
    if (parts.length < 3) {
      this.logger.warn("Incomplete git log line:", gitLogLine.substring(0, 100) + "...");
      return null;
    }

    const [hash, date, subject, body = ""] = parts;

    if (!hash || !date || !subject) {
      this.logger.warn("Missing required fields in git log line");
      return null;
    }

    // Clean up the subject line - take only the first line
    const cleanSubject = subject.trim().split("\n")[0];

    // Skip if this looks like a body line (starts with - or whitespace)
    if (cleanSubject.startsWith("-") || cleanSubject.startsWith(" ")) {
      return null; // Skip body lines
    }

    // Parse conventional commit format: type(scope): description
    const conventionalRegex =
      /^(feat|fix|docs|style|refactor|perf|test|chore|build|ci|revert|security)(\([^)]+\))?\!?:\s*(.+)$/;
    const match = cleanSubject.match(conventionalRegex);

    if (!match) {
      // Not a conventional commit, categorize as 'other'
      return {
        type: "chore", // Default to chore for non-conventional commits
        description: cleanSubject.substring(0, 100),
        body: body.trim() || undefined,
        breakingChange: cleanSubject.includes("BREAKING CHANGE") || cleanSubject.includes("!:"),
        hash: hash.substring(0, 7),
        date: date.split(" ")[0],
        raw: cleanSubject,
      };
    }

    const [, type, scopeMatch, description] = match;
    const scope = scopeMatch ? scopeMatch.slice(1, -1) : undefined;
    const breakingChange = cleanSubject.includes("!:") || body.includes("BREAKING CHANGE");

    return {
      type,
      scope,
      description: description.substring(0, 100),
      body: body.trim() || undefined,
      breakingChange,
      hash: hash.substring(0, 7),
      date: date.split(" ")[0],
      raw: cleanSubject,
    };
  }

  /**
   * Create commit and tag for release
   */
  async commitAndTag(version: string): Promise<void> {
    // Validate version input
    const validatedVersion = validateVersion(version);
    const tagPrefix = this.config.options?.tagPrefix || "v";
    const tagName = `${tagPrefix}${validatedVersion}`;

    // Validate the constructed tag
    validateGitRef(tagName, "tag");

    try {
      // Add modified files
      const filesToAdd = [
        this.config.versionFile.path,
        "./CHANGELOG.md",
      ];

      // Add any additional files that were configured to be updated
      if (this.config.updateFiles) {
        filesToAdd.push(...this.config.updateFiles.map((f) => f.path));
      }

      // Add documentation if generated
      if (this.config.docs?.enabled) {
        filesToAdd.push(this.config.docs.outputDir || "./docs");
      }

      await this.runCommand(["git", "add", ...filesToAdd]);

      // Create commit with sanitized message
      const commitMessage = sanitizeCommitMessage(
        `chore(release): bump version to ${validatedVersion}`,
      );
      await this.runCommand(["git", "commit", "-m", commitMessage]);

      // Create tag with sanitized message
      const tagMessage = sanitizeCommitMessage(`Release ${validatedVersion}`);
      await this.runCommand(["git", "tag", "-a", tagName, "-m", tagMessage]);

      this.logger.info(`✅ Created commit and tag: ${tagName}`);

      // Log security event
      const securityLog = createSecurityLog("release_created", {
        version: validatedVersion,
        tag: tagName,
        files: filesToAdd.length,
      });
      this.logger.debug(securityLog);
    } catch (error) {
      this.logger.error("Error creating commit and tag:", error as Error);
      throw new NagareError(
        "Failed to create commit and tag for release",
        ErrorCodes.GIT_REMOTE_ERROR,
        [
          "Check that all files are properly saved",
          "Ensure you have write permissions to the repository",
          "Verify git is configured correctly: git config --list",
          "Try manually: git add . && git commit -m 'message' && git tag -a v1.0.0 -m 'message'",
        ],
        {
          version: validatedVersion,
          tag: tagName,
          error: sanitizeErrorMessage(error, false),
        },
      );
    }
  }

  /**
   * Push changes and tags to remote
   */
  async pushToRemote(): Promise<void> {
    const remote = this.config.options?.gitRemote || "origin";

    // Validate remote name
    validateGitRef(remote, "branch");

    try {
      // Push commits
      await this.runCommand(["git", "push", remote, "HEAD"]);

      // Push tags
      await this.runCommand(["git", "push", remote, "--tags"]);

      this.logger.info(`✅ Pushed changes to ${remote}`);

      // Log security event
      const securityLog = createSecurityLog("push_to_remote", {
        remote: remote,
        includesTags: true,
      });
      this.logger.debug(securityLog);
    } catch (error) {
      this.logger.error("Error pushing to remote:", error as Error);
      throw new NagareError(
        "Failed to push changes to remote repository",
        ErrorCodes.GIT_REMOTE_ERROR,
        [
          "Check your internet connection",
          "Verify you have push permissions: git remote -v",
          "Authenticate if needed: git push --set-upstream origin <branch>",
          "Check if the remote exists: git remote show origin",
          "If using SSH, ensure your SSH key is configured",
        ],
        {
          remote,
          error: sanitizeErrorMessage(error, false),
          hint: "You may need to run 'git push' manually after resolving the issue",
        },
      );
    }
  }

  /**
   * Get list of local tags
   */
  async getLocalTags(): Promise<string[]> {
    try {
      const result = await this.runCommand(["git", "tag", "-l"]);
      return result.trim().split("\n").filter((tag) => tag.trim());
    } catch {
      return [];
    }
  }

  /**
   * Delete a local tag
   */
  async deleteLocalTag(tag: string): Promise<void> {
    // Validate tag input
    const validatedTag = validateGitRef(tag, "tag");

    try {
      await this.runCommand(["git", "tag", "-d", validatedTag]);
      this.logger.info(`Deleted local tag: ${validatedTag}`);
    } catch (error) {
      this.logger.error(`Failed to delete local tag ${validatedTag}:`, error as Error);
      throw new NagareError(
        `Failed to delete local tag: ${validatedTag}`,
        ErrorCodes.GIT_REMOTE_ERROR,
        [
          "Check if the tag exists: git tag -l",
          "Ensure you have permissions to modify tags",
          `Try manually: git tag -d ${validatedTag}`,
        ],
        {
          tag: validatedTag,
          error: sanitizeErrorMessage(error, false),
        },
      );
    }
  }

  /**
   * Delete a remote tag
   */
  async deleteRemoteTag(tag: string): Promise<void> {
    // Validate inputs
    const validatedTag = validateGitRef(tag, "tag");
    const remote = this.config.options?.gitRemote || "origin";
    validateGitRef(remote, "branch");

    try {
      await this.runCommand(["git", "push", remote, "--delete", validatedTag]);
      this.logger.info(`Deleted remote tag: ${validatedTag}`);
    } catch (error) {
      this.logger.error(`Failed to delete remote tag ${validatedTag}:`, error as Error);
      throw new NagareError(
        `Failed to delete remote tag: ${validatedTag}`,
        ErrorCodes.GIT_REMOTE_ERROR,
        [
          "Check if the tag exists on remote: git ls-remote --tags",
          "Verify you have push permissions to the remote",
          `Try manually: git push ${remote} --delete ${validatedTag}`,
          "The tag might have already been deleted",
        ],
        {
          tag: validatedTag,
          remote,
          error: sanitizeErrorMessage(error, false),
        },
      );
    }
  }

  /**
   * Reset to a previous commit (for rollback)
   */
  async resetToCommit(commitish: string, hard = false): Promise<void> {
    // Validate commit reference
    let validatedCommit: string;
    try {
      // Try as commit hash first
      validatedCommit = validateGitRef(commitish, "commit");
    } catch {
      // If not a commit hash, validate as tag/branch
      validatedCommit = validateGitRef(commitish, "tag");
    }

    try {
      const resetType = hard ? "--hard" : "--soft";
      await this.runCommand(["git", "reset", resetType, validatedCommit]);
      this.logger.info(`Reset to ${validatedCommit} (${resetType})`);

      // Log security event
      const securityLog = createSecurityLog("git_reset", {
        target: validatedCommit,
        type: resetType,
      });
      this.logger.debug(securityLog);
    } catch (error) {
      this.logger.error(`Failed to reset to ${validatedCommit}:`, error as Error);
      throw new NagareError(
        `Failed to reset to commit: ${validatedCommit}`,
        ErrorCodes.GIT_REMOTE_ERROR,
        [
          "Check if the commit/tag exists: git log --oneline or git tag -l",
          "Ensure you don't have uncommitted changes if using --hard",
          `Try manually: git reset ${hard ? "--hard" : "--soft"} ${validatedCommit}`,
          "Use 'git reflog' to find lost commits if needed",
        ],
        {
          target: validatedCommit,
          resetType: hard ? "hard" : "soft",
          error: sanitizeErrorMessage(error, false),
          warning: hard ? "Hard reset will discard all uncommitted changes!" : undefined,
        },
      );
    }
  }

  /**
   * Get the last commit message
   */
  async getLastCommitMessage(): Promise<string> {
    try {
      const result = await this.runCommand(["git", "log", "-1", "--pretty=format:%s"]);
      return result.trim();
    } catch {
      return "";
    }
  }

  /**
   * Check if a remote tag exists
   */
  async remoteTagExists(tag: string): Promise<boolean> {
    // Validate inputs
    const validatedTag = validateGitRef(tag, "tag");
    const remote = this.config.options?.gitRemote || "origin";
    validateGitRef(remote, "branch");

    try {
      await this.runCommand(["git", "ls-remote", "--tags", remote, validatedTag]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run a git command and return the output
   */
  private async runCommand(cmd: string[]): Promise<string> {
    this.logger.debug(`Running: ${cmd.join(" ")}`);

    const process = new Deno.Command(cmd[0], {
      args: cmd.slice(1),
      stdout: "piped",
      stderr: "piped",
    });

    const result = await process.output();

    if (!result.success) {
      const error = new TextDecoder().decode(result.stderr);
      throw new NagareError(
        "Git command failed",
        ErrorCodes.GIT_REMOTE_ERROR,
        [
          "Check if git is installed: git --version",
          "Verify you're in a git repository: git status",
          "Check the command output for specific errors",
          "Ensure you have the necessary permissions",
        ],
        {
          command: cmd.join(" "),
          stderr: error,
          hint: "See the stderr output above for the specific git error",
        },
      );
    }

    return new TextDecoder().decode(result.stdout);
  }
}
