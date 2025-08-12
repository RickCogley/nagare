#!/usr/bin/env -S deno run --allow-all

/**
 * Generate test coverage reports for Nagare
 *
 * This script runs tests with coverage collection and generates HTML/LCOV reports
 * in the docs/coverage directory structure.
 */

import { exists } from "jsr:@std/fs@^1.0.0";
import { join } from "jsr:@std/path@^1.1.1";

const COVERAGE_DIR = "docs/coverage";
const JSON_DIR = join(COVERAGE_DIR, "json");
const HTML_DIR = join(COVERAGE_DIR, "html");
const REPORTS_DIR = join(COVERAGE_DIR, "reports");

async function ensureDirectories() {
  for (const dir of [JSON_DIR, HTML_DIR, REPORTS_DIR]) {
    await Deno.mkdir(dir, { recursive: true });
  }
}

async function cleanPreviousCoverage() {
  console.log("🧹 Cleaning previous coverage data...");

  // Clean JSON coverage data
  if (await exists(JSON_DIR)) {
    for await (const entry of Deno.readDir(JSON_DIR)) {
      if (entry.name.endsWith(".json")) {
        await Deno.remove(join(JSON_DIR, entry.name));
      }
    }
  }

  // Clean HTML files
  if (await exists(HTML_DIR)) {
    for await (const entry of Deno.readDir(HTML_DIR)) {
      await Deno.remove(join(HTML_DIR, entry.name), { recursive: true });
    }
  }
}

async function runTests() {
  console.log("🧪 Running tests with coverage collection...");

  // Save original version.ts content
  const versionPath = "version.ts";
  const originalVersion = await Deno.readTextFile(versionPath);

  try {
    const testCommand = new Deno.Command("deno", {
      args: [
        "test",
        "--allow-all",
        `--coverage=${JSON_DIR}`,
        "--no-check",
      ],
      stdout: "piped",
      stderr: "piped",
    });

    const result = await testCommand.output();

    if (!result.success) {
      const stderr = new TextDecoder().decode(result.stderr);
      console.error("❌ Tests failed:");
      // Only show first few lines of error
      const errorLines = stderr.split("\n").slice(0, 5);
      console.error(errorLines.join("\n"));
      // Continue anyway to generate coverage for passed tests
    }

    const stdout = new TextDecoder().decode(result.stdout);

    // Extract test summary
    const summaryMatch = stdout.match(/(\d+) passed.*(\d+) failed/);
    if (summaryMatch) {
      console.log(`✅ Tests completed: ${summaryMatch[0]}`);
    }
  } finally {
    // Restore original version.ts
    await Deno.writeTextFile(versionPath, originalVersion);
    console.log("↩️  Restored version.ts to original state");
  }
}

async function generateHtmlReport() {
  console.log("📊 Generating HTML coverage report...");

  const htmlCommand = new Deno.Command("deno", {
    args: [
      "coverage",
      "--html",
      JSON_DIR,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const result = await htmlCommand.output();

  if (!result.success) {
    const stderr = new TextDecoder().decode(result.stderr);
    console.error("❌ Failed to generate HTML report:");
    console.error(stderr);
    return false;
  }

  // Deno generates HTML in JSON_DIR/html, move it to the correct location
  const generatedHtmlDir = join(JSON_DIR, "html");
  if (await exists(generatedHtmlDir)) {
    console.log("📂 Moving HTML files to correct location...");

    // Move all files from generated location to HTML_DIR
    for await (const entry of Deno.readDir(generatedHtmlDir)) {
      const src = join(generatedHtmlDir, entry.name);
      const dest = join(HTML_DIR, entry.name);
      await Deno.rename(src, dest);
    }

    // Remove the now-empty generated directory
    await Deno.remove(generatedHtmlDir);
  }

  return true;
}

async function generateLcovReport() {
  console.log("📄 Generating LCOV coverage report...");

  const lcovCommand = new Deno.Command("deno", {
    args: [
      "coverage",
      JSON_DIR,
      "--lcov",
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const result = await lcovCommand.output();

  if (!result.success) {
    const stderr = new TextDecoder().decode(result.stderr);
    console.error("❌ Failed to generate LCOV report:");
    console.error(stderr);
    return false;
  }

  const lcovContent = new TextDecoder().decode(result.stdout);
  const lcovPath = join(REPORTS_DIR, "coverage.lcov");
  await Deno.writeTextFile(lcovPath, lcovContent);

  console.log(`✅ LCOV report saved to ${lcovPath}`);
  return true;
}

async function generateSummary() {
  console.log("📝 Generating coverage summary...");

  const summaryCommand = new Deno.Command("deno", {
    args: [
      "coverage",
      JSON_DIR,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  const result = await summaryCommand.output();

  if (!result.success) {
    const stderr = new TextDecoder().decode(result.stderr);
    console.error("❌ Failed to generate summary:");
    console.error(stderr);
    return;
  }

  const output = new TextDecoder().decode(result.stdout);

  // Extract coverage percentage from the last line
  const lines = output.split("\n");
  const summaryLine = lines.find((line) => line.includes("All files"));

  if (summaryLine) {
    const match = summaryLine.match(/(\d+\.\d+)/g);
    if (match && match.length >= 2) {
      const lineCoverage = match[0];
      const branchCoverage = match[1];

      console.log(`\n📊 Coverage Summary:`);
      console.log(`   Line Coverage: ${lineCoverage}%`);
      console.log(`   Branch Coverage: ${branchCoverage}%`);

      // Create summary markdown
      const date = new Date().toISOString().split("T")[0];
      const summaryContent = `# Coverage Report Summary

**Date**: ${date}  
**Overall Coverage**: ${branchCoverage}%  
**Line Coverage**: ${lineCoverage}%  

## Coverage Report Locations

- **HTML Report**: \`docs/coverage/html/index.html\`
- **LCOV Report**: \`docs/coverage/reports/coverage.lcov\`
- **JSON Data**: \`docs/coverage/json/\`

## How to View

Open the HTML report in a browser:
\`\`\`bash
open docs/coverage/html/index.html
\`\`\`

Generated by scripts/generate-coverage.ts
`;

      const summaryPath = join(REPORTS_DIR, `coverage-summary-${date}.md`);
      await Deno.writeTextFile(summaryPath, summaryContent);
      console.log(`   Summary saved to ${summaryPath}`);
    }
  }
}

async function main() {
  console.log("🚀 Nagare Coverage Report Generator\n");

  await ensureDirectories();
  await cleanPreviousCoverage();
  await runTests();

  const htmlSuccess = await generateHtmlReport();
  const lcovSuccess = await generateLcovReport();

  if (htmlSuccess && lcovSuccess) {
    await generateSummary();

    console.log("\n✨ Coverage reports generated successfully!");
    console.log(`   HTML Report: file://${Deno.cwd()}/${HTML_DIR}/index.html`);
    console.log(`   LCOV Report: ${REPORTS_DIR}/coverage.lcov`);

    // Open HTML report if not in CI
    if (!Deno.env.get("CI")) {
      console.log("\n🌐 Opening HTML report in browser...");
      const openCommand = new Deno.Command("open", {
        args: [join(HTML_DIR, "index.html")],
      });
      await openCommand.output();
    }
  } else {
    console.error("\n⚠️ Some coverage reports failed to generate");
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
