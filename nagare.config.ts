import type { NagareConfig } from "./types.ts";
import { LogLevel } from "./types.ts";

/**
 * Helper function to format TypeScript/JSON content using deno fmt
 * Note: This is a simplified version that skips formatting to avoid complexity
 */
function formatContent(content: string, filePath: string): string {
  // For now, return content as-is to avoid sync/async complexity
  // The formatting will be handled by the CI/manual deno fmt
  console.log(`Skipping formatting for ${filePath} (will be handled by deno fmt)`);
  return content;
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
        version: /"version":\s*"([^"]+)"/,
      },
      updateFn: (content, data) => {
        const updated = content.replace(/"version":\s*"([^"]+)"/, `"version": "${data.version}"`);
        return formatContent(updated, "./deno.json");
      },
    },
    // Add formatting for version.ts (the main version file)
    {
      path: "./version.ts",
      patterns: {
        // This will match the entire content to trigger formatting
        content: /[\s\S]*/
      },
      updateFn: (content, data) => {
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
        content: /[\s\S]*/
      },
      updateFn: (content, data) => {
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
} as NagareConfig;