import type { NagareConfig } from "./types.ts";
import { LogLevel } from "./types.ts";

/**
 * Helper function to format TypeScript/JSON content using deno fmt
 */
async function formatContent(content: string, filePath: string): Promise<string> {
  try {
    const process = new Deno.Command("deno", {
      args: ["fmt", "--stdin-filepath", filePath, "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped"
    });
    
    const child = process.spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(content));
    await writer.close();
    
    const result = await child.output();
    
    if (result.success) {
      return new TextDecoder().decode(result.stdout);
    } else {
      console.warn(`Warning: Could not format ${filePath}, using unformatted content`);
      return content;
    }
  } catch (error) {
    console.warn(`Warning: Formatting failed for ${filePath}:`, error.message);
    return content;
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
        version: /"version":\s*"([^"]+)"/,
      },
      updateFn: async (content, data) => {
        const updated = content.replace(/"version":\s*"([^"]+)"/, `"version": "${data.version}"`);
        return await formatContent(updated, "./deno.json");
      },
    },
    // Add formatting for version.ts (the main version file)
    {
      path: "./version.ts",
      patterns: {
        // This will match the entire content to trigger formatting
        content: /[\s\S]*/
      },
      updateFn: async (content, data) => {
        // Version.ts is already updated by Nagare's template system,
        // we just need to format it
        return await formatContent(content, "./version.ts");
      },
    },
    // Add formatting for CHANGELOG.md
    {
      path: "./CHANGELOG.md",
      patterns: {
        // This will match the entire content to trigger formatting
        content: /[\s\S]*/
      },
      updateFn: async (content, data) => {
        // CHANGELOG.md is already updated by Nagare,
        // we just need to format it properly
        return await formatContent(content, "./CHANGELOG.md");
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