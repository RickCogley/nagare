import type { NagareConfig } from "./types.ts";
import { LogLevel } from "./types.ts";

/**
 * Helper function to format TypeScript/JSON content using deno fmt
 * Note: This is a simplified version that skips formatting to avoid complexity
 */
function formatContent(content: string, filePath: string): string {
  // For now, return content as-is to avoid sync/async complexity
  // The formatting will be handled by the post-release hook
  console.log(`Skipping inline formatting for ${filePath} (will be handled by post-release hook)`);
  return content;
}

/**
 * Post-release hook to format generated files
 */
async function postReleaseFormatting(): Promise<void> {
  try {
    console.log("🎨 Formatting generated files...");

    // Run deno fmt
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

    console.log("✅ Files formatted successfully");

    // Check if there are changes to commit
    const statusCmd = new Deno.Command("git", {
      args: ["status", "--porcelain"],
      stdout: "piped",
      stderr: "piped",
    });

    const statusResult = await statusCmd.output();

    if (!statusResult.success) {
      console.warn("⚠️  Could not check git status");
      return;
    }

    const statusOutput = new TextDecoder().decode(statusResult.stdout).trim();

    if (statusOutput) {
      console.log("📝 Committing formatting changes...");
      console.log("Files to commit:", statusOutput);

      // Add all changes
      const addCmd = new Deno.Command("git", {
        args: ["add", "."],
        stdout: "piped",
        stderr: "piped",
      });

      const addResult = await addCmd.output();

      if (!addResult.success) {
        console.warn("⚠️  Could not add files to git");
        return;
      }

      // Commit formatting changes
      const commitCmd = new Deno.Command("git", {
        args: ["commit", "-m", "fix(fmt): format generated files after release"],
        stdout: "piped",
        stderr: "piped",
      });

      const commitResult = await commitCmd.output();

      if (commitResult.success) {
        console.log("✅ Formatting changes committed");

        // Push the formatting commit
        const pushCmd = new Deno.Command("git", {
          args: ["push", "origin", "main"],
          stdout: "piped",
          stderr: "piped",
        });

        const pushResult = await pushCmd.output();

        if (pushResult.success) {
          console.log("✅ Formatting changes pushed to remote");
        } else {
          console.warn("⚠️  Could not push formatting changes");
        }
      } else {
        const commitError = new TextDecoder().decode(commitResult.stderr);
        console.warn("⚠️  Could not commit formatting changes:", commitError);
      }
    } else {
      console.log("✅ No formatting changes needed");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn("⚠️  Post-release formatting failed:", errorMessage);
  }
}

export default {
  project: {
    name: "Nagare (流れ)",
    description: "Deno Release Management Library",
    repository: "https://github.com/RickCogley/nagare",
    homepage: "https://jsr.io/@rick/nagare",
    license: "MIT",
    author: "Rick Cogley",
  },

  versionFile: {
    path: "./version.ts",
    template: "typescript",
  },

  releaseNotes: {
    includeCommitHashes: true,
    maxDescriptionLength: 100,
  },

  github: {
    owner: "RickCogley",
    repo: "nagare",
    createRelease: true,
  },

  updateFiles: [
    {
      path: "./deno.json",
      patterns: {
        // ✅ FIXED: Use line-anchored pattern to avoid matching task definitions
        // OLD (dangerous): /"version":\s*"([^"]+)"/
        // NEW (safe): Only matches when "version" is at start of line
        version: /^(\s*)"version":\s*"([^"]+)"/m,
      },
      updateFn: (content, _data) => {
        // ✅ FIXED: Use the safer pattern with capture groups in replacement
        const updated = content.replace(/^(\s*)"version":\s*"([^"]+)"/m, `$1"version": "${_data.version}"`);
        return formatContent(updated, "./deno.json");
      },
    },
    // Add formatting for version.ts (the main version file)
    {
      path: "./version.ts",
      patterns: {
        // This will match the entire content to trigger formatting
        content: /[\s\S]*/,
      },
      updateFn: (content, _data) => {
        // Version.ts is already updated by Nagare's template system,
        // we just need to format it
        return formatContent(content, "./version.ts");
      },
    },
    // Add formatting for CHANGELOG.md
    {
      path: "./CHANGELOG.md",
      patterns: {
        // This will match the entire content to trigger formatting
        content: /[\s\S]*/,
      },
      updateFn: (content, _data) => {
        // CHANGELOG.md is already updated by Nagare,
        // we just need to format it properly
        return formatContent(content, "./CHANGELOG.md");
      },
    },
  ],

  docs: {
    enabled: true,
    outputDir: "./docs",
    includePrivate: false,
  },

  options: {
    tagPrefix: "v",
    gitRemote: "origin",
    logLevel: LogLevel.INFO,
  },

  // Post-release hooks for automated formatting
  hooks: {
    postRelease: [postReleaseFormatting],
  },
} as NagareConfig;