import type { NagareConfig } from "./mod.ts";

const config: NagareConfig = {
  project: {
    name: "@rick/nagare",
    description: "Nagare (流れ) is a comprehensive release management library for Deno with conventional commits and semantic versioning support",
    repository: "https://github.com/RickCogley/nagare",
    author: "Rick Cogley",
    license: "MIT",
  },

  versionFile: {
    path: "./version.ts",
    template: "typescript",
  },

  updateFiles: [
    {
      path: "./deno.json",
      // Use custom function to debug the issue
      updateFn: (content, data) => {
        console.log("=== DEBUG: Original deno.json length:", content.length);
        console.log("=== DEBUG: Checking for special characters...");
        
        // Check for carriage returns
        const crCount = (content.match(/\r/g) || []).length;
        console.log("=== DEBUG: Carriage returns found:", crCount);
        
        // Show character at position 290
        console.log("=== DEBUG: Character at position 290:", content.charCodeAt(290), `"${content[290]}"`);
        console.log("=== DEBUG: Context around 290:", content.substring(280, 300));
        
        // Simple replacement that preserves exact formatting
        const updated = content.replace(
          /"version":\s*"[^"]+"/,
          `"version": "${data.version}"`
        );
        
        console.log("=== DEBUG: Updated deno.json length:", updated.length);
        console.log("=== DEBUG: Length difference:", updated.length - content.length);
        
        // Try to parse to see if it's valid
        try {
          JSON.parse(updated);
          console.log("=== DEBUG: JSON is valid after update");
        } catch (e) {
          console.log("=== DEBUG: JSON parse error:", e);
          console.log("=== DEBUG: First 500 chars of updated:", updated.substring(0, 500));
        }
        
        return updated;
      }
    },
    { path: "./README.md" },
    { path: "./jsr.json" }
  ],

  github: {
    createRelease: true,
    owner: "RickCogley",
    repo: "nagare",
  }
};

export default config;