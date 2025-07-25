/**
 * @fileoverview Nagare self-hosting configuration using built-in file handlers
 * @description Configuration for Nagare to manage its own releases with intelligent file detection
 * @since 1.1.0
 */

import type { NagareConfig, TemplateData } from "./types.ts";
import { LogLevel, TemplateFormat } from "./types.ts";

/**
 * Post-release formatting check (simplified)
 *
 * @description
 * Ensures generated files are properly formatted after Vento processing.
 * This is a safety net - ideally Vento should generate clean code.
 *
 * @returns {Promise<void>}
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
 *
 * @description
 * Uses built-in file handlers for automatic version updates.
 * No custom updateFn required for standard files like deno.json!
 *
 * @type {NagareConfig}
 * @since 1.1.0
 */
const config: NagareConfig = {
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
    template: TemplateFormat.TYPESCRIPT, // Fix: Use enum instead of string
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
   *
   * @description
   * With the new file handler system, we just list the files.
   * No patterns or updateFn needed - Nagare detects the file type
   * and applies the appropriate handler automatically!
   */
  updateFiles: [
    // ✅ Just specify the file - built-in handler takes care of the rest!
    { path: "./deno.json" },

    // ✅ README updates also handled automatically
    { path: "./README.md" },

    // ✅ Even handles JSR configuration
    { path: "./jsr.json" },

    // ✅ Update version in module documentation
    {
      path: "./mod.ts",
      patterns: {
        version: /(\| Version \| )([^\s]+)( \|)/,
      },
      updateFn: (content: string, data: TemplateData) => {
        return content.replace(
          /(\| Version \| )([^\s]+)( \|)/,
          `$1${data.version}$3`,
        );
      },
    },
  ],

  /**
   * Documentation generation configuration
   *
   * Note: Disabled for now due to backup system trying to backup directory
   * API docs are auto-generated during build process instead
   */
  docs: {
    enabled: false,
    outputDir: "./docs/api",
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
   * Post-release hooks
   *
   * @description
   * Only runs if Vento didn't generate properly formatted code.
   * This is a safety net that shouldn't normally be needed.
   */
  hooks: {
    postRelease: [postReleaseFormattingCheck],
  },

  /**
   * Release workflow configuration
   *
   * @description
   * Enables JSR verification and auto-fix capabilities
   * for ensuring releases complete successfully
   */
  release: {
    // Verify package appears on JSR after release with improved configuration
    verifyJsrPublish: {
      enabled: true,
      maxAttempts: 20, // Reduced from 30 for faster feedback
      pollInterval: 8000, // 8 seconds between checks
      timeout: 300000, // 5 minutes total timeout
      gracePeriod: 45000, // 45 second grace period for JSR processing
    },

    // Auto-fix configuration for CI/CD errors
    autoFix: {
      basic: true, // Enable deterministic fixes
      ai: {
        enabled: true, // Enable AI-powered fixes
        provider: "claude-code",
        // Note: Extended thinking is triggered via keywords in the prompt.
        // Claude Code recognizes "think", "megathink", and "ultrathink" keywords
        // with different token allocations. Choose based on your plan limits.
        thinkingLevel: "ultrathink", // Use maximum analysis (for unlimited plans)
        flags: [], // No CLI flags needed
        maxAttempts: 5,
      },
      types: ["lint", "format", "security-scan", "type-check", "version-conflict"],
    },

    // Progress visualization
    progress: {
      enabled: true,
      style: "detailed",
      showElapsedTime: true,
    },

    // GitHub Actions monitoring
    monitoring: {
      workflowFile: ".github/workflows/publish.yml",
      pollInterval: 10000, // 10 seconds
      timeout: 600000, // 10 minutes
    },

    // Pre-flight checks configuration
    preflightChecks: {
      runTests: false, // Disable tests in pre-flight checks
    },
  },
};

// Export as default
export default config;
