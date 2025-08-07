#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * @fileoverview Type coverage analyzer for Nagare
 * @description Calculates and reports type coverage for TypeScript files
 */

import { walk } from "jsr:@std/fs@^1.0.0/walk";
import { relative } from "jsr:@std/path@^1.1.1";

interface TypeCoverageResult {
  totalLines: number;
  typedLines: number;
  coverage: number;
  files: FileTypeCoverage[];
  timestamp: string;
}

interface FileTypeCoverage {
  path: string;
  totalLines: number;
  typedLines: number;
  coverage: number;
  untypedLines: number[];
}

/**
 * Analyze a single TypeScript file for type coverage
 */
async function analyzeFile(filePath: string): Promise<FileTypeCoverage> {
  const content = await Deno.readTextFile(filePath);
  const lines = content.split("\n");

  let totalLines = 0;
  let typedLines = 0;
  const untypedLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines, comments, and import/export statements
    if (
      !trimmed ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("import ") ||
      trimmed.startsWith("export {") ||
      trimmed === "}" ||
      trimmed === "{" ||
      trimmed === "};" ||
      trimmed === ");" ||
      trimmed === "});"
    ) {
      continue;
    }

    totalLines++;

    // Check if line has type annotations
    const hasTypes = (
      // Type annotations
      trimmed.includes(":") && !trimmed.match(/^(case|default|\w+:)/) ||
      // Type assertions
      trimmed.includes(" as ") ||
      // Generic types
      (trimmed.includes("<") && trimmed.includes(">") && !trimmed.includes("</")) ||
      // Type definitions
      trimmed.startsWith("interface ") ||
      trimmed.startsWith("type ") ||
      trimmed.startsWith("enum ") ||
      trimmed.startsWith("class ") ||
      // Function return types
      trimmed.includes("): ") ||
      trimmed.includes(") => ") ||
      // Type guards
      trimmed.includes(" is ") ||
      // Const assertions
      trimmed.includes("as const") ||
      // Type imports
      trimmed.includes("import type") ||
      trimmed.includes("export type")
    );

    if (hasTypes) {
      typedLines++;
    } else {
      // Check if this line should have types
      const shouldHaveTypes = (
        // Variable declarations
        (trimmed.startsWith("const ") || trimmed.startsWith("let ") || trimmed.startsWith("var ")) &&
          !trimmed.includes("=") && !trimmed.includes(":") ||
        // Function parameters without types
        trimmed.match(/function\s+\w+\([^)]*\)(?!\s*:)/) ||
        // Arrow functions without parameter types
        trimmed.match(/\([^)]*\)\s*=>/) && !trimmed.includes(":") ||
        // Method definitions without return types
        trimmed.match(/^\s*(async\s+)?\w+\([^)]*\)(?!\s*:)\s*{/)
      );

      if (shouldHaveTypes) {
        untypedLines.push(i + 1);
      }
    }
  }

  const coverage = totalLines > 0 ? (typedLines / totalLines) * 100 : 100;

  return {
    path: relative(Deno.cwd(), filePath),
    totalLines,
    typedLines,
    coverage,
    untypedLines,
  };
}

/**
 * Calculate type coverage for the entire project
 */
async function calculateTypeCoverage(): Promise<TypeCoverageResult> {
  console.log("📊 Calculating Type Coverage for Nagare\n");

  const files: FileTypeCoverage[] = [];
  let totalProjectLines = 0;
  let totalTypedLines = 0;

  // Walk through source files
  for await (
    const entry of walk(".", {
      exts: [".ts"],
      skip: [
        /node_modules/,
        /\.git/,
        /docs/,
        /coverage/,
        /\.githooks/,
        /_test\.ts$/,
        /\.test\.ts$/,
        /test_.*\.ts$/,
        /scratch/,
        /\.claude/,
      ],
    })
  ) {
    const fileCoverage = await analyzeFile(entry.path);
    files.push(fileCoverage);
    totalProjectLines += fileCoverage.totalLines;
    totalTypedLines += fileCoverage.typedLines;

    // Print file coverage
    const icon = fileCoverage.coverage >= 95 ? "✅" : fileCoverage.coverage >= 80 ? "⚠️ " : "❌";
    console.log(
      `${icon} ${fileCoverage.path}: ${
        fileCoverage.coverage.toFixed(1)
      }% (${fileCoverage.typedLines}/${fileCoverage.totalLines})`,
    );

    // Show untyped lines for files with low coverage
    if (fileCoverage.coverage < 95 && fileCoverage.untypedLines.length > 0) {
      console.log(
        `   Untyped lines: ${fileCoverage.untypedLines.slice(0, 5).join(", ")}${
          fileCoverage.untypedLines.length > 5 ? "..." : ""
        }`,
      );
    }
  }

  const projectCoverage = totalProjectLines > 0 ? (totalTypedLines / totalProjectLines) * 100 : 100;

  const result: TypeCoverageResult = {
    totalLines: totalProjectLines,
    typedLines: totalTypedLines,
    coverage: projectCoverage,
    files: files.sort((a, b) => a.coverage - b.coverage), // Sort by coverage (lowest first)
    timestamp: new Date().toISOString(),
  };

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("📈 Type Coverage Summary");
  console.log("=".repeat(50));
  console.log(`Total Lines: ${result.totalLines}`);
  console.log(`Typed Lines: ${result.typedLines}`);
  console.log(`Coverage: ${result.coverage.toFixed(2)}%`);

  // Files with lowest coverage
  const lowCoverageFiles = result.files.filter((f) => f.coverage < 95);
  if (lowCoverageFiles.length > 0) {
    console.log("\n⚠️  Files Below 95% Coverage:");
    lowCoverageFiles.slice(0, 10).forEach((file) => {
      console.log(`  - ${file.path}: ${file.coverage.toFixed(1)}%`);
    });
  }

  // Grade
  let grade = "A+";
  if (result.coverage < 100) grade = "A";
  if (result.coverage < 95) grade = "B";
  if (result.coverage < 90) grade = "C";
  if (result.coverage < 85) grade = "D";
  if (result.coverage < 80) grade = "F";

  console.log(`\nGrade: ${grade}`);

  // Save results
  try {
    await Deno.writeTextFile(
      "type-coverage.json",
      JSON.stringify(result, null, 2),
    );
    console.log("\n📄 Results saved to type-coverage.json");
  } catch (error) {
    console.warn(`Could not save results: ${error}`);
  }

  // Create badge data
  const badgeColor = result.coverage >= 95
    ? "brightgreen"
    : result.coverage >= 90
    ? "green"
    : result.coverage >= 80
    ? "yellow"
    : result.coverage >= 70
    ? "orange"
    : "red";

  const badge = {
    schemaVersion: 1,
    label: "type coverage",
    message: `${result.coverage.toFixed(1)}%`,
    color: badgeColor,
  };

  try {
    await Deno.writeTextFile(
      "type-coverage-badge.json",
      JSON.stringify(badge, null, 2),
    );
    console.log("🎖️  Badge data saved to type-coverage-badge.json");
  } catch (error) {
    console.warn(`Could not save badge: ${error}`);
  }

  // Exit with error if coverage is below threshold
  const THRESHOLD = 95;
  if (result.coverage < THRESHOLD) {
    console.error(
      `\n❌ Type coverage ${result.coverage.toFixed(2)}% is below required ${THRESHOLD}%`,
    );
    Deno.exit(1);
  } else {
    console.log(`\n✅ Type coverage meets requirements (>= ${THRESHOLD}%)`);
  }

  return result;
}

// Run if main module
if (import.meta.main) {
  await calculateTypeCoverage();
}

export { calculateTypeCoverage };
export type { FileTypeCoverage, TypeCoverageResult };
