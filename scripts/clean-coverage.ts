#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Clean up coverage directories and organize coverage data
 */

import { exists } from "@std/fs";
import { green, red, yellow } from "@std/fmt/colors";

const TEMP_COVERAGE_DIRS = [
  "coverage",
  "coverage_all",
  "coverage_final",
  "coverage_improved",
  "coverage_new",
  "coverage_simple",
  "coverage_temp",
  "coverage2",
  "coverage3",
  "coverage_cli_test",
  "coverage_fixed",
  "coverage_final_80",
  "coverage_80_final",
];

async function cleanCoverage() {
  console.log("🧹 Cleaning up coverage directories...");

  let cleaned = 0;
  for (const dir of TEMP_COVERAGE_DIRS) {
    if (await exists(dir)) {
      try {
        await Deno.remove(dir, { recursive: true });
        console.log(yellow(`  Removed ${dir}`));
        cleaned++;
      } catch (error) {
        console.error(red(`  Failed to remove ${dir}: ${error.message}`));
      }
    }
  }

  if (cleaned > 0) {
    console.log(green(`✅ Cleaned up ${cleaned} coverage directories`));
  } else {
    console.log(green("✅ No coverage directories to clean"));
  }
}

if (import.meta.main) {
  await cleanCoverage();
}
