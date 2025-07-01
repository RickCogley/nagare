#!/usr/bin/env -S deno run --allow-read

/**
 * @fileoverview Check for dangerous regex patterns in configuration files
 * @module check-patterns
 */

import { isDangerousPattern } from "../config.ts";

interface PatternCheck {
  file: string;
  line: number;
  pattern: string;
  isDangerous: boolean;
  reason?: string;
}

/**
 * Check all TypeScript files for potentially dangerous regex patterns
 */
async function checkPatterns(): Promise<void> {
  const results: PatternCheck[] = [];
  let hasErrors = false;

  // Find all TypeScript files
  for await (const entry of Deno.readDir(".")) {
    if (entry.isFile && entry.name.endsWith(".ts")) {
      await checkFile(entry.name, results);
    }
  }

  // Also check src directory
  try {
    for await (const entry of Deno.readDir("./src")) {
      if (entry.isFile && entry.name.endsWith(".ts")) {
        await checkFile(`./src/${entry.name}`, results);
      }
    }
  } catch {
    // Src directory might not exist
  }

  // Report results
  console.log("=== Pattern Security Check ===\n");

  const dangerous = results.filter(r => r.isDangerous);
  if (dangerous.length > 0) {
    console.error(`❌ Found ${dangerous.length} dangerous patterns:\n`);
    for (const result of dangerous) {
      console.error(`  ${result.file}:${result.line} - ${result.pattern}`);
      if (result.reason) {
        console.error(`    Reason: ${result.reason}`);
      }
    }
    hasErrors = true;
  } else {
    console.log("✅ No dangerous patterns found!");
  }

  // Check for specific known dangerous patterns
  console.log("\n=== Checking for specific dangerous patterns ===\n");
  
  const knownDangerous = [
    {
      pattern: /"version":\s*"([^"]+)"/,
      description: "Broad JSON version pattern (causes corruption)",
      files: ["deno.json", "package.json"]
    },
    {
      pattern: /version:\s*"?([^"\n]+)"?/,
      description: "Broad YAML version pattern",
      files: [".yaml", ".yml"]
    }
  ];

  for (const check of knownDangerous) {
    console.log(`Checking for: ${check.description}`);
    const found = results.filter(r => 
      r.pattern === check.pattern.source
    );
    
    if (found.length > 0) {
      console.error(`  ❌ FOUND in ${found.length} files - This pattern is known to cause issues!`);
      hasErrors = true;
    } else {
      console.log(`  ✅ Not found - Good!`);
    }
  }

  if (hasErrors) {
    console.error("\n⚠️  Security check failed! Please fix dangerous patterns.");
    Deno.exit(1);
  } else {
    console.log("\n✅ All pattern checks passed!");
  }
}

/**
 * Check a single file for regex patterns
 */
async function checkFile(filePath: string, results: PatternCheck[]): Promise<void> {
  const content = await Deno.readTextFile(filePath);
  const lines = content.split("\n");

  // Regex to find regex patterns in code
  const regexPattern = /\/([^\/\n]+)\/([gimuy]*)/g;
  const regexConstructor = /new\s+RegExp\s*\(\s*["'`]([^"'`]+)["'`]/g;

  lines.forEach((line, index) => {
    // Check for regex literals
    let match;
    while ((match = regexPattern.exec(line)) !== null) {
      const pattern = match[1];
      const flags = match[2];
      
      try {
        const regex = new RegExp(pattern, flags);
        const isDangerous = checkIfDangerous(pattern, filePath);
        
        results.push({
          file: filePath,
          line: index + 1,
          pattern: pattern,
          isDangerous: isDangerous.dangerous,
          reason: isDangerous.reason
        });
      } catch {
        // Invalid regex, skip
      }
    }

    // Check for RegExp constructor
    regexPattern.lastIndex = 0; // Reset regex
    while ((match = regexConstructor.exec(line)) !== null) {
      const pattern = match[1];
      
      try {
        new RegExp(pattern);
        const isDangerous = checkIfDangerous(pattern, filePath);
        
        results.push({
          file: filePath,
          line: index + 1,
          pattern: pattern,
          isDangerous: isDangerous.dangerous,
          reason: isDangerous.reason
        });
      } catch {
        // Invalid regex, skip
      }
    }
  });
}

/**
 * Check if a pattern is dangerous
 */
function checkIfDangerous(pattern: string, filePath: string): { dangerous: boolean; reason?: string } {
  // Check with built-in function
  try {
    const regex = new RegExp(pattern);
    if (isDangerousPattern(regex, filePath)) {
      return { 
        dangerous: true, 
        reason: "Flagged by isDangerousPattern" 
      };
    }
  } catch {
    // Invalid pattern
  }

  // Additional checks
  
  // Check for patterns without anchors in JSON files
  if (filePath.includes(".json") || filePath.includes("json")) {
    if (pattern.includes('"version"') && !pattern.includes("^") && !pattern.includes("$")) {
      return { 
        dangerous: true, 
        reason: "Version pattern without line anchors in JSON context" 
      };
    }
  }

  // Check for overly broad patterns
  if (pattern.includes(".*") && pattern.length < 10) {
    return { 
      dangerous: true, 
      reason: "Overly broad pattern with .*" 
    };
  }

  // Check for patterns that could match across multiple lines unintentionally
  if (pattern.includes("[\\s\\S]*") || pattern.includes("[\\d\\D]*")) {
    return { 
      dangerous: true, 
      reason: "Pattern that matches across newlines" 
    };
  }

  return { dangerous: false };
}

// Run the check
if (import.meta.main) {
  await checkPatterns();
}