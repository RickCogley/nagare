/**
 * @fileoverview Nagare self-hosting configuration
 * @description Configuration for Nagare to manage its own releases
 */

import type { NagareConfig } from "./types.ts";
import { LogLevel } from "./types.ts";

/**
 * Simplified post-release formatting hook (safety net)
 * Only runs if formatting issues are detected after Vento processing
 */
async function postReleaseFormattingCheck(): Promise<void> {
  try {
    // Check if deno fmt would make changes
    const checkCmd = new Deno.Command("deno", {
      args: ["fmt", "--check"],
      stdout: "piped",
      stderr: "piped",
    });

    const checkResult = await checkCmd.output();

    if (checkResult.success) {
      console.log("✅ No formatting issues detected - Vento generated clean code");
      return;
    }

    console.log("🎨 Formatting issues detected, running deno fmt...");

    // Run formatting
    const formatCmd = new Deno.Command("deno", {
      args: ["fmt"],
      stdout: "piped",
      stderr: "piped",
    });

    const formatResult = await formatCmd.output();

    if (!formatResult.success) {
      const error = new TextDecoder().decode(formatResult.stderr);
      console.warn("⚠️  Formatting failed:", error);
      return;
    }

    console.log("✅ Formatting completed");

    // Check if there are changes to commit
    const statusCmd = new Deno.Command("git", {
      args: ["status", "--porcelain"],
      stdout: "piped",
      stderr: "piped",
    });

    const statusResult = await statusCmd.output();
    const statusOutput = new TextDecoder().decode(statusResult.stdout).trim();

    if (statusOutput) {
      console.log("📝 Committing formatting changes...");

      await new Deno.Command("git", { args: ["add", "."] }).output();
      await new Deno.Command("git", {
        args: ["commit", "-m", "style: format generated files after release"],
      }).output();
      await new Deno.Command("git", {
        args: ["push", "origin", "main"],
      }).output();

      console.log("✅ Formatting changes committed and pushed");
    }
  } catch (error) {
    console.warn("⚠️  Post-release formatting check failed:", error);
  }
}

/**
 * Nagare configuration for self-hosting releases
 * Uses built-in TypeScript template with Vento processing
 */
export default {
  /**
   * Project metadata for Nagare
   */
  project: {
    name: "Nagare (流れ)",
    description: "Deno Release Management Library",
    repository: "https://github.com/RickCogley/nagare",
    homepage: "https://jsr.io/@rick/nagare",
    license: "MIT",
    author: "Rick Cogley",
  },

  /**
   * Version file configuration
   * Uses built-in TypeScript template with Vento processing
   */
  versionFile: {
    path: "./version.ts",
    template: "typescript", // Uses built-in Vento template
  },

  /**
   * Release notes configuration
   */
  releaseNotes: {
    includeCommitHashes: true,
    maxDescriptionLength: 100,
  },

  /**
   * GitHub integration configuration
   */
  github: {
    owner: "RickCogley",
    repo: "nagare",
    createRelease: true,
  },

  /**
   * Additional files to update during release
   */
  updateFiles: [
    {
      path: "./deno.json",
      // Using updateFn to work around buildSafeReplacement bug
      // that caused version not to update during 1.0.0 release
      // TODO: Remove once buildSafeReplacement is fixed
      updateFn: (content, data) => {
        return content.replace(
          /^(\s*)"version":\s*"([^"]+)"/m,
          `$1"version": "${data.version}"`,
        );
      },
    },
  ],

  /**
   * Documentation generation configuration
   */
  docs: {
    enabled: true,
    outputDir: "./docs",
    includePrivate: false,
  },

  /**
   * Release options and preferences
   */
  options: {
    tagPrefix: "v",
    gitRemote: "origin",
    logLevel: LogLevel.INFO,
  },

  /**
   * Post-release hooks (simplified safety net)
   * Only runs if Vento didn't generate properly formatted code
   */
  hooks: {
    postRelease: [postReleaseFormattingCheck],
  },
} as NagareConfig;
