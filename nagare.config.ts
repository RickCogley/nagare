/**
 * @fileoverview Nagare self-hosting configuration using built-in file handlers
 * @description Configuration for Nagare to manage its own releases with intelligent file detection
 * @since 1.1.0
 */

import type { NagareConfig, TemplateData } from "./types.ts";
import { LogLevel, TemplateFormat } from "./types.ts";

/**
 * Update coverage badges after release
 *
 * @description
 * Runs coverage tests and updates README badges with actual coverage percentage
 *
 * @returns {Promise<void>}
 */
async function updateCoverageBadges(): Promise<void> {
  try {
    console.log("📊 Updating coverage badges...");

    const coverageCmd = new Deno.Command("deno", {
      args: ["task", "coverage:update"],
      stdout: "piped",
      stderr: "piped",
    });

    const result = await coverageCmd.output();

    if (result.success) {
      console.log("✅ Coverage badges updated successfully");

      // Check if there are changes to commit
      const statusCmd = new Deno.Command("git", {
        args: ["status", "--porcelain", "README.md"],
        stdout: "piped",
      });

      const statusResult = await statusCmd.output();
      const statusOutput = new TextDecoder().decode(statusResult.stdout).trim();

      if (statusOutput) {
        console.log("📝 Committing coverage badge updates...");

        await new Deno.Command("git", { args: ["add", "README.md", "coverage-badge.json"] }).output();
        await new Deno.Command("git", {
          args: ["commit", "-m", "docs: update coverage badges after release"],
        }).output();
        await new Deno.Command("git", {
          args: ["push", "origin", "main"],
        }).output();

        console.log("✅ Coverage badge updates committed and pushed");
      }
    } else {
      const error = new TextDecoder().decode(result.stderr);
      console.warn("⚠️  Coverage update failed:", error);
    }
  } catch (error) {
    console.warn("⚠️  Coverage badge update failed:", error);
  }
}

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

    // ✅ Update version in aichaku app description
    {
      path: "./.claude/aichaku/user/app-description.yaml",
      patterns: {
        version: /(version:\s*")([^"]+)(")/,
      },
      updateFn: (content: string, data: TemplateData) => {
        return content.replace(
          /(version:\s*")([^"]+)(")/,
          `$1${data.version}$3`,
        );
      },
    },
  ],

  /**
   * Documentation generation configuration
   *
   * Generates API documentation using deno doc during release process.
   * Docs are not backed up since they're in git and can be regenerated.
   */
  docs: {
    enabled: true,
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
   * 1. Update coverage badges with actual test coverage
   * 2. Format any generated files if needed (safety net)
   */
  hooks: {
    postRelease: [updateCoverageBadges, postReleaseFormattingCheck],
  },

  /**
   * Release workflow configuration
   *
   * @description
   * Enables JSR verification, quality gates, and auto-fix capabilities
   * for ensuring releases complete successfully with high quality standards
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

    // Quality gates configuration
    qualityGates: {
      enabled: true,
      typeChecking: {
        strict: true,
        noAny: true,
        noImplicitAny: true,
        noImplicitReturns: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
      },
      typeCoverage: {
        enabled: true,
        threshold: 95, // Minimum 95% type coverage required
      },
      performance: {
        enabled: true,
        benchmarks: true,
        memoryLimit: 256, // MB
        timeoutThresholds: {
          fileHandler: 50, // ms
          gitOperations: 100, // ms
          releaseManager: 150, // ms
        },
      },
      security: {
        enabled: true,
        owaspCompliance: true,
        scanPatterns: true,
        requireAnnotations: true, // Require InfoSec comments
      },
      testCoverage: {
        enabled: true,
        threshold: 80, // Minimum 80% test coverage
      },
    },

    // Event-driven architecture configuration
    events: {
      enabled: true,
      emitProgress: true,
      emitWarnings: true,
      emitMetrics: true,
    },

    // Permission manager configuration
    permissions: {
      enabled: true,
      strict: true,
      allowList: [
        "read",
        "write",
        "run",
        "env",
      ],
      denyList: [
        "net", // Network access controlled per operation
        "ffi", // Foreign function interface not needed
      ],
    },
  },
};

// Export as default
export default config;
