/**
 * @fileoverview GitHub release management integration
 */

import type { NagareConfig, ReleaseNotes } from "../types.ts";
import type { TranslationKey } from "../locales/schema.ts";
import { ErrorCodes, ErrorFactory, NagareError } from "./enhanced-error.ts";

/**
 * GitHubIntegration - GitHub release management
 */
export class GitHubIntegration {
  private config: NagareConfig;

  constructor(config: NagareConfig) {
    this.config = config;
  }

  /**
   * Create GitHub release
   */
  async createRelease(releaseNotes: ReleaseNotes): Promise<string | undefined> {
    if (!this.config.github?.createRelease) {
      return undefined;
    }

    // Check if gh CLI is available
    try {
      await this.runCommand(["gh", "--version"]);
    } catch {
      console.log("⚠️  GitHub CLI (gh) not found. Skipping GitHub release creation.");
      console.log("   Install gh CLI to enable automatic GitHub releases.");
      return undefined;
    }

    try {
      const tagName = `${this.config.options?.tagPrefix || "v"}${releaseNotes.version}`;
      const releaseBody = this.formatReleaseBody(releaseNotes);

      // Write release notes to a temporary file to avoid command line issues
      const tempFile = await Deno.makeTempFile({ suffix: ".md" });
      await Deno.writeTextFile(tempFile, releaseBody);

      try {
        // Create GitHub release using notes from file
        await this.runCommand([
          "gh",
          "release",
          "create",
          tagName,
          "--title",
          `Release ${releaseNotes.version}`,
          "--notes-file",
          tempFile,
          "--draft=false",
        ]);

        const releaseUrl = `${this.config.project.repository}/releases/tag/${tagName}`;
        console.log(`✅ Created GitHub release: ${releaseUrl}`);
        return releaseUrl;
      } finally {
        // Clean up temp file
        try {
          await Deno.remove(tempFile);
        } catch {
          // Ignore cleanup errors
        }
      }
    } catch (error) {
      console.error(
        "❌ Error creating GitHub release:",
        error instanceof Error ? error.message : String(error),
      );
      console.log("ℹ️  You can create it manually at your repository releases page");
      return undefined;
    }
  }

  /**
   * Format release body for GitHub
   */
  private formatReleaseBody(notes: ReleaseNotes): string {
    let body = `## What's Changed\n\n`;

    if (notes.added.length > 0) {
      body += `### ✨ Added\n${notes.added.map((item) => `- ${item}`).join("\n")}\n\n`;
    }
    if (notes.changed.length > 0) {
      body += `### 🔄 Changed\n${notes.changed.map((item) => `- ${item}`).join("\n")}\n\n`;
    }
    if (notes.deprecated.length > 0) {
      body += `### ⚠️ Deprecated\n${notes.deprecated.map((item) => `- ${item}`).join("\n")}\n\n`;
    }
    if (notes.removed.length > 0) {
      body += `### 🗑️ Removed\n${notes.removed.map((item) => `- ${item}`).join("\n")}\n\n`;
    }
    if (notes.fixed.length > 0) {
      body += `### 🐛 Fixed\n${notes.fixed.map((item) => `- ${item}`).join("\n")}\n\n`;
    }
    if (notes.security.length > 0) {
      body += `### 🔒 Security\n${notes.security.map((item) => `- ${item}`).join("\n")}\n\n`;
    }

    return body.trim();
  }

  /**
   * Run command helper
   */
  private async runCommand(cmd: string[]): Promise<string> {
    const process = new Deno.Command(cmd[0], {
      args: cmd.slice(1),
      stdout: "piped",
      stderr: "piped",
    });

    const result = await process.output();

    if (!result.success) {
      const error = new TextDecoder().decode(result.stderr);

      // Check for specific GitHub CLI errors
      if (error.includes("gh: command not found") || error.includes("'gh' is not recognized")) {
        throw ErrorFactory.githubCliNotFound();
      }

      if (error.includes("authentication") || error.includes("401") || error.includes("403")) {
        throw new NagareError(
          "errors.githubAuthFailed" as TranslationKey,
          ErrorCodes.GITHUB_AUTH_FAILED,
          {
            context: {
              command: cmd.join(" "),
              error: error,
            },
            suggestions: [
              "suggestions.checkGitHub" as TranslationKey,
            ],
          },
        );
      }

      throw new NagareError(
        "errors.githubReleaseFailed" as TranslationKey,
        ErrorCodes.GITHUB_RELEASE_FAILED,
        {
          context: {
            command: cmd.join(" "),
            stderr: error,
          },
          suggestions: [
            "suggestions.checkGitHub" as TranslationKey,
          ],
        },
      );
    }

    return new TextDecoder().decode(result.stdout);
  }
}
