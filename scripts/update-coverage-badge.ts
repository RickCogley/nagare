#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

/**
 * Script to update coverage badge in README.md
 * Runs tests with coverage, extracts the percentage, and updates the badge
 */

import { exists } from "@std/fs";
import { green, red, yellow } from "@std/fmt/colors";

const COVERAGE_DIR = "coverage";
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

  // Run tests with coverage
  const testCommand = new Deno.Command("deno", {
    args: [
      "test",
      "--unstable-raw-imports",
      "--allow-all",
      "--no-check",
      "--coverage=" + COVERAGE_DIR,
      "--reporter=dot",
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const testResult = await testCommand.output();

  if (!testResult.success) {
    console.warn(yellow("⚠️  Tests failed, but continuing to generate coverage..."));
  }

  // Generate coverage report
  const coverageCommand = new Deno.Command("deno", {
    args: ["coverage", COVERAGE_DIR],
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
  let lineMatch = coverageOutput.match(/Line coverage:\s+([\d.]+)%/);
  if (lineMatch) {
    return parseFloat(lineMatch[1]);
  }

  // If no summary, calculate from the table
  const lines = coverageOutput.split("\n");
  const totalsLine = lines.find((line) => line.includes("| All files") || line.includes("| TOTAL"));
  if (totalsLine) {
    // Format: | All files | branch% | line% |
    const parts = totalsLine.split("|").map((s) => s.trim());
    if (parts.length >= 3) {
      const linePercent = parseFloat(parts[parts.length - 1]);
      if (!isNaN(linePercent)) {
        return linePercent;
      }
    }
  }

  // Try to find the last line with coverage data
  const lastLine = lines[lines.length - 2] || lines[lines.length - 1];
  if (lastLine && lastLine.includes("|")) {
    const parts = lastLine.split("|").map((s) => s.trim());
    if (parts.length >= 3) {
      const linePercent = parseFloat(parts[parts.length - 1]);
      if (!isNaN(linePercent)) {
        return linePercent;
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
  // Run a quick test to count passing tests
  const testCommand = new Deno.Command("deno", {
    args: [
      "test",
      "--unstable-raw-imports",
      "--allow-all",
      "--no-check",
      "--reporter=dot",
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
      await saveCoverageJson(percentage);

      console.log(green("\n🎯 Coverage badge update complete!"));
      console.log(`   Coverage: ${percentage.toFixed(1)}%`);
      console.log(`   Color: ${getBadgeColor(percentage)}`);

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
