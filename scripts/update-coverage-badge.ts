#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

/**
 * Script to update coverage badge in README.md
 * Runs tests with coverage, extracts the percentage, and updates the badge
 */

import { exists } from "@std/fs";
import { green, red, yellow } from "@std/fmt/colors";

const COVERAGE_DIR = "./docs/coverage";
const README_PATH = "./README.md";

/**
 * Run tests with coverage and extract the coverage percentage
 */
async function getCoveragePercentage(): Promise<number | null> {
  console.log("📊 Running tests with coverage...");

  // Clean up old coverage data
  try {
    await Deno.remove(COVERAGE_DIR, { recursive: true });
  } catch {
    // Directory might not exist, that's okay
  }

  // Run tests with coverage - specifically the simple tests
  const testCommand = new Deno.Command("deno", {
    args: [
      "test",
      "--unstable-raw-imports",
      "--allow-all",
      "--no-check",
      "--coverage=" + COVERAGE_DIR,
      "--reporter=dot",
      "tests/*-simple_test.ts",
      "tests/*-extra_test.ts",
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const testResult = await testCommand.output();

  if (!testResult.success) {
    console.warn(yellow("⚠️  Tests failed, but continuing to generate coverage..."));
  }

  // Generate coverage report excluding test files
  const coverageCommand = new Deno.Command("deno", {
    args: [
      "coverage",
      COVERAGE_DIR,
      "--exclude=.*test.*", // Exclude any file with 'test' in the name
      "--exclude=version\\.ts$", // Exclude generated version files
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const coverageResult = await coverageCommand.output();
  const coverageOutput = new TextDecoder().decode(coverageResult.stdout);
  const coverageError = new TextDecoder().decode(coverageResult.stderr);

  // Check for errors
  if (coverageError && !coverageResult.success) {
    console.warn(yellow("⚠️  Coverage generation had issues: " + coverageError.split("\n")[0]));
  }

  // Debug: log the output to see what we're working with
  if (Deno.env.get("DEBUG_COVERAGE")) {
    console.log("Coverage output:", coverageOutput);
  }

  // First try to extract from summary line (e.g., "Line coverage: 51.8%")
  const lineMatch = coverageOutput.match(/Line coverage:\s+([\d.]+)%/);
  if (lineMatch) {
    return parseFloat(lineMatch[1]);
  }

  // If no summary, calculate from the table
  const lines = coverageOutput.split("\n");
  const totalsLine = lines.find((line) => line.includes("| All files") || line.includes("| TOTAL"));
  if (totalsLine) {
    // Remove ANSI color codes
    // deno-lint-ignore no-control-regex
    const cleanLine = totalsLine.replace(/\x1b\[[0-9;]*m/g, "");
    // Format: | All files | branch% | line% |
    const parts = cleanLine.split("|").map((s) => s.trim());
    if (parts.length >= 3) {
      // Try to get branch coverage first (more comprehensive)
      const branchPercent = parseFloat(parts[2]);
      if (!isNaN(branchPercent)) {
        return branchPercent;
      }
      // Fall back to line coverage
      const linePercent = parseFloat(parts[3]);
      if (!isNaN(linePercent)) {
        return linePercent;
      }
    }
  }

  // Try to find the last line with coverage data (usually "All files" line)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line && line.includes("|") && (line.includes("All files") || line.includes("%"))) {
      // Remove ANSI color codes
      // deno-lint-ignore no-control-regex
      const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, "");
      const parts = cleanLine.split("|").map((s) => s.trim());
      if (parts.length >= 3) {
        // Try to get branch coverage first (more comprehensive)
        const branchPercent = parseFloat(parts[2]);
        if (!isNaN(branchPercent)) {
          return branchPercent;
        }
        // Fall back to line coverage
        const linePercent = parseFloat(parts[3]);
        if (!isNaN(linePercent)) {
          return linePercent;
        }
      }
    }
  }

  console.error(red("❌ Could not extract coverage percentage from output"));
  return null;
}

/**
 * Get badge color based on coverage percentage
 */
function getBadgeColor(percentage: number): string {
  if (percentage >= 80) return "brightgreen";
  if (percentage >= 60) return "green";
  if (percentage >= 40) return "yellow";
  if (percentage >= 20) return "orange";
  return "red";
}

/**
 * Update the coverage badge in README.md
 */
async function updateReadmeBadge(percentage: number): Promise<void> {
  if (!await exists(README_PATH)) {
    console.error(red(`❌ ${README_PATH} not found`));
    return;
  }

  const readmeContent = await Deno.readTextFile(README_PATH);

  // Match the coverage badge pattern
  const badgePattern = /\[!\[Test Coverage\]\(https:\/\/img\.shields\.io\/badge\/coverage-[\d.]+%25-\w+\)\]/;
  const oldBadgePattern =
    /\[!\[Test Coverage\]\(https:\/\/img\.shields\.io\/badge\/coverage-[\d.]+%25-\w+\)\]\([^)]+\)/;

  const color = getBadgeColor(percentage);
  const newBadge = `[![Test Coverage](https://img.shields.io/badge/coverage-${
    percentage.toFixed(1)
  }%25-${color})](./docs/coverage/)`;

  let updatedContent: string;

  if (oldBadgePattern.test(readmeContent)) {
    // Update existing badge with link
    updatedContent = readmeContent.replace(oldBadgePattern, newBadge);
  } else if (badgePattern.test(readmeContent)) {
    // Update existing badge without link
    updatedContent = readmeContent.replace(badgePattern, newBadge);
  } else {
    console.warn(yellow("⚠️  Coverage badge not found in README.md"));
    console.log("Add this badge to your README.md:");
    console.log(newBadge);
    return;
  }

  await Deno.writeTextFile(README_PATH, updatedContent);
  console.log(green(`✅ Updated coverage badge to ${percentage.toFixed(1)}% (${color})`));
}

/**
 * Also update the test count badge if present
 */
async function updateTestCountBadge(): Promise<void> {
  // Run a quick test to count passing tests - specifically the simple tests
  const testCommand = new Deno.Command("deno", {
    args: [
      "test",
      "--unstable-raw-imports",
      "--allow-all",
      "--no-check",
      "--reporter=dot",
      "tests/*-simple_test.ts",
      "tests/*-extra_test.ts",
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const result = await testCommand.output();
  const output = new TextDecoder().decode(result.stdout);

  // Extract test counts
  const passMatch = output.match(/(\d+) passed/);
  if (passMatch) {
    const passCount = passMatch[1];

    const readmeContent = await Deno.readTextFile(README_PATH);
    const testBadgePattern = /\[!\[Tests\]\(https:\/\/img\.shields\.io\/badge\/tests-\d+_passing-\w+\)\]/;
    const oldTestBadgePattern = /\[!\[Tests\]\(https:\/\/img\.shields\.io\/badge\/tests-\d+_passing-\w+\)\]\([^)]+\)/;

    const newBadge = `[![Tests](https://img.shields.io/badge/tests-${passCount}_passing-brightgreen)](./tests/)`;

    let updatedContent: string;

    if (oldTestBadgePattern.test(readmeContent)) {
      updatedContent = readmeContent.replace(oldTestBadgePattern, newBadge);
    } else if (testBadgePattern.test(readmeContent)) {
      updatedContent = readmeContent.replace(testBadgePattern, newBadge);
    } else {
      return; // No test badge found
    }

    await Deno.writeTextFile(README_PATH, updatedContent);
    console.log(green(`✅ Updated test badge to ${passCount} passing`));
  }
}

/**
 * Generate HTML coverage report (already created by test command in docs/coverage/html)
 */
async function generateHtmlCoverage(): Promise<void> {
  // The HTML report is already generated by the test command in docs/coverage/html
  // Just verify it exists
  const htmlPath = `${COVERAGE_DIR}/html/index.html`;
  if (await exists(htmlPath)) {
    console.log(green("✅ HTML coverage report available at docs/coverage/html/index.html"));
  } else {
    // If not generated yet, generate it now
    const htmlCommand = new Deno.Command("deno", {
      args: [
        "coverage",
        COVERAGE_DIR,
        "--html",
        "--exclude=.*test.*",
        "--exclude=version\\.ts$",
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const htmlResult = await htmlCommand.output();

    if (htmlResult.success) {
      console.log(green("✅ Generated HTML coverage report in docs/coverage/html"));
    } else {
      const error = new TextDecoder().decode(htmlResult.stderr);
      console.warn(yellow("⚠️  HTML generation failed: " + error));
    }
  }
}

/**
 * Save coverage data to JSON for other tools
 */
async function saveCoverageJson(percentage: number): Promise<void> {
  const coverageData = {
    version: 1,
    coverage: percentage,
    color: getBadgeColor(percentage),
    timestamp: new Date().toISOString(),
  };

  await Deno.writeTextFile(
    "./coverage-badge.json",
    JSON.stringify(coverageData, null, 2),
  );
  console.log(green("✅ Saved coverage data to coverage-badge.json"));
}

// Main execution
if (import.meta.main) {
  try {
    const percentage = await getCoveragePercentage();

    if (percentage !== null) {
      await updateReadmeBadge(percentage);
      await updateTestCountBadge();
      await generateHtmlCoverage();
      await saveCoverageJson(percentage);

      console.log(green("\n🎯 Coverage badge update complete!"));
      console.log(`   Coverage: ${percentage.toFixed(1)}%`);
      console.log(`   Color: ${getBadgeColor(percentage)}`);
      console.log(`   HTML Report: docs/coverage/html/index.html`);

      // Exit with error if coverage is below threshold
      if (percentage < 49) {
        console.error(red(`\n❌ Coverage ${percentage.toFixed(1)}% is below 49% threshold`));
        Deno.exit(1);
      }
    } else {
      console.error(red("❌ Failed to get coverage percentage"));
      Deno.exit(1);
    }
  } catch (error) {
    console.error(red("❌ Error updating coverage badge:"), error);
    Deno.exit(1);
  }
}
