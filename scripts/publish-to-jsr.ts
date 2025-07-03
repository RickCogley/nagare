#!/usr/bin/env -S deno run --allow-all

/**
 * @fileoverview Automated JSR publishing with template inlining
 * @description Builds and publishes to JSR with text imports converted to constants
 */

import { $ } from "jsr:@david/dax@0.42.0";

async function publishToJSR() {
  console.log("🚀 Starting JSR publish process...\n");

  try {
    // Step 1: Clean previous build
    console.log("🧹 Cleaning previous build...");
    await $`rm -rf ./build`;

    // Step 2: Run template inlining
    console.log("\n📝 Inlining templates...");
    await $`deno run --allow-read --allow-write scripts/inline-templates.ts`;

    // Step 3: Copy additional files that might be needed
    console.log("\n📋 Preparing build directory...");

    // Copy locales directory (if needed)
    await $`cp -r ./locales ./build/locales || true`;

    // Update deno.json in build directory to remove unstable flags
    const denoConfig = JSON.parse(await Deno.readTextFile("./deno.json"));

    // Remove unstable-raw-imports from tasks
    if (denoConfig.tasks) {
      for (const [taskName, taskCommand] of Object.entries(denoConfig.tasks)) {
        if (typeof taskCommand === "string") {
          denoConfig.tasks[taskName] = taskCommand.replace(/--unstable-raw-imports\s*/g, "");
        }
      }
    }

    await Deno.writeTextFile(
      "./build/deno.json",
      JSON.stringify(denoConfig, null, 2),
    );

    // Step 4: Run checks in build directory
    console.log("\n✅ Running checks on build...");
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir("./build");

      // Check TypeScript
      await $`deno check **/*.ts`;

      // Run linter
      await $`deno lint`;

      // Optionally run tests (might need adjustment)
      // await $`deno test --allow-all`;
    } finally {
      Deno.chdir(originalCwd);
    }

    // Step 5: Publish to JSR
    console.log("\n📦 Publishing to JSR...");

    const dryRun = Deno.args.includes("--dry-run");

    Deno.chdir("./build");

    if (dryRun) {
      console.log("🔍 Dry run mode - simulating publish...");
      await $`deno publish --dry-run`;
    } else {
      await $`deno publish`;
    }

    console.log("\n✨ JSR publish completed successfully!");
  } catch (error) {
    console.error("\n❌ JSR publish failed:", error);
    Deno.exit(1);
  } finally {
    // Cleanup can be optional
    if (!Deno.args.includes("--keep-build")) {
      console.log("\n🧹 Cleaning up build directory...");
      await $`rm -rf ./build`;
    }
  }
}

// Show usage
if (Deno.args.includes("--help")) {
  console.log(`
JSR Publishing Script with Template Inlining

Usage:
  deno run --allow-all scripts/publish-to-jsr.ts [options]

Options:
  --dry-run      Simulate the publish without actually publishing
  --keep-build   Keep the build directory after publishing
  --help         Show this help message

This script:
1. Inlines all template files imported with { type: "text" }
2. Creates a JSR-compatible build in ./build/
3. Runs checks to ensure the build is valid
4. Publishes to JSR (or does a dry run)
`);
  Deno.exit(0);
}

// Run if called directly
if (import.meta.main) {
  await publishToJSR();
}
