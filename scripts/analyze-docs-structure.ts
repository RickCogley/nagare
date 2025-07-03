#!/usr/bin/env deno run --allow-read --allow-write --allow-run

/**
 * @fileoverview Analyzes the structure of generated docs to understand the ~ usage
 * @description Helps diagnose and potentially find alternative documentation generation approaches
 */

import { walk } from "https://deno.land/std@0.208.0/fs/walk.ts";
import { relative } from "https://deno.land/std@0.208.0/path/mod.ts";

const DOCS_DIR = "./docs";

async function analyzeDocs() {
  console.log("📊 Analyzing documentation structure...\n");

  const tildeFiles: string[] = [];
  const tildeDirs: string[] = [];
  let totalFiles = 0;
  let totalDirs = 0;

  // Check if docs directory exists
  try {
    await Deno.stat(DOCS_DIR);
  } catch {
    console.error("❌ Documentation directory not found. Run 'deno task docs' first.");
    Deno.exit(1);
  }

  // Walk through all files and directories
  for await (const entry of walk(DOCS_DIR)) {
    const relPath = relative(DOCS_DIR, entry.path);

    if (entry.isDirectory) {
      totalDirs++;
      if (entry.name === "~" || relPath.includes("/~/")) {
        tildeDirs.push(relPath);
      }
    } else if (entry.isFile) {
      totalFiles++;
      if (relPath.includes("/~/")) {
        tildeFiles.push(relPath);
      }
    }
  }

  console.log("📁 Directory Analysis:");
  console.log(`   Total directories: ${totalDirs}`);
  console.log(`   Directories with ~: ${tildeDirs.length}`);

  console.log("\n📄 File Analysis:");
  console.log(`   Total files: ${totalFiles}`);
  console.log(`   Files in ~ directories: ${tildeFiles.length}`);

  if (tildeDirs.length > 0) {
    console.log("\n🔍 Tilde directory locations:");
    tildeDirs.slice(0, 10).forEach((dir) => {
      console.log(`   - ${dir}`);
    });
    if (tildeDirs.length > 10) {
      console.log(`   ... and ${tildeDirs.length - 10} more`);
    }
  }

  // Analyze what types of content are in ~ directories
  if (tildeFiles.length > 0) {
    console.log("\n📋 Sample files in ~ directories:");
    const sampleFiles = tildeFiles.slice(0, 5);
    for (const file of sampleFiles) {
      console.log(`   - ${file}`);
    }
    if (tildeFiles.length > 5) {
      console.log(`   ... and ${tildeFiles.length - 5} more`);
    }
  }

  // Check alternative: JSON output
  console.log("\n🤔 Alternative approach analysis:");
  console.log("   Running 'deno doc --json' to check structure...");

  const docProcess = new Deno.Command("deno", {
    args: ["doc", "--json", "./mod.ts"],
    stdout: "piped",
    stderr: "piped",
  });

  const { success, stdout } = await docProcess.output();

  if (success) {
    const jsonOutput = new TextDecoder().decode(stdout);
    const docData = JSON.parse(jsonOutput);

    console.log(`   ✅ JSON documentation contains ${docData.length} items`);
    console.log("   📝 This could be used to generate custom HTML without ~ characters");

    // Save a sample for inspection
    const samplePath = "./docs-analysis-sample.json";
    await Deno.writeTextFile(
      samplePath,
      JSON.stringify(docData.slice(0, 3), null, 2),
    );
    console.log(`   💾 Saved sample to ${samplePath}`);
  } else {
    console.log("   ❌ Failed to generate JSON documentation");
  }

  console.log("\n📌 Summary:");
  console.log("   The ~ character appears to be used by deno doc for namespacing symbols.");
  console.log("   Options to fix:");
  console.log("   1. Use the fix-docs-urls.ts script to rename ~ directories");
  console.log("   2. Implement URL rewriting in docs-server.ts (already done)");
  console.log("   3. Generate custom HTML from JSON output (more work but full control)");
}

if (import.meta.main) {
  await analyzeDocs();
}
