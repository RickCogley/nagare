#!/usr/bin/env -S deno run --allow-read --allow-write --allow-net

/**
 * @fileoverview Check SARIF security scan results from DevSkim and other tools
 * @module check-sarif
 * 
 * @description
 * Downloads and analyzes SARIF files from GitHub Actions artifacts.
 * Can be used in CI/CD pipelines or locally to review security findings.
 * 
 * Usage:
 *   deno run --allow-read --allow-write --allow-net scripts/check-sarif.ts
 *   deno run --allow-read scripts/check-sarif.ts path/to/file.sarif
 */

interface SarifLog {
  version: string;
  runs: SarifRun[];
}

interface SarifRun {
  tool: {
    driver: {
      name: string;
      version?: string;
      rules?: SarifRule[];
    };
  };
  results: SarifResult[];
}

interface SarifRule {
  id: string;
  name?: string;
  shortDescription?: { text: string };
  fullDescription?: { text: string };
  defaultConfiguration?: {
    level?: "error" | "warning" | "note";
  };
}

interface SarifResult {
  ruleId: string;
  ruleIndex?: number;
  level?: "error" | "warning" | "note";
  message: {
    text: string;
  };
  locations?: SarifLocation[];
  fingerprints?: Record<string, string>;
}

interface SarifLocation {
  physicalLocation?: {
    artifactLocation?: {
      uri?: string;
    };
    region?: {
      startLine?: number;
      startColumn?: number;
      endLine?: number;
      endColumn?: number;
    };
  };
}

/**
 * Parse SARIF file and extract security findings
 */
async function parseSarifFile(filePath: string): Promise<SarifLog> {
  const content = await Deno.readTextFile(filePath);
  return JSON.parse(content) as SarifLog;
}

/**
 * Analyze SARIF results and categorize by severity
 */
function analyzeSarifResults(sarif: SarifLog): {
  errors: SarifResult[];
  warnings: SarifResult[];
  notes: SarifResult[];
  summary: string;
} {
  const errors: SarifResult[] = [];
  const warnings: SarifResult[] = [];
  const notes: SarifResult[] = [];

  for (const run of sarif.runs) {
    const toolName = run.tool.driver.name;
    console.log(`\n🔍 Analyzing results from ${toolName}...`);

    for (const result of run.results) {
      const level = result.level || "warning";
      
      switch (level) {
        case "error":
          errors.push(result);
          break;
        case "warning":
          warnings.push(result);
          break;
        case "note":
          notes.push(result);
          break;
      }
    }
  }

  const summary = `Found ${errors.length} errors, ${warnings.length} warnings, ${notes.length} notes`;
  return { errors, warnings, notes, summary };
}

/**
 * Display results in a human-readable format
 */
function displayResults(results: ReturnType<typeof analyzeSarifResults>): void {
  console.log("\n📊 Summary:", results.summary);

  if (results.errors.length > 0) {
    console.log("\n❌ ERRORS:");
    for (const error of results.errors) {
      displayResult(error, "error");
    }
  }

  if (results.warnings.length > 0) {
    console.log("\n⚠️  WARNINGS:");
    for (const warning of results.warnings) {
      displayResult(warning, "warning");
    }
  }

  if (results.notes.length > 0) {
    console.log("\n📝 NOTES:");
    for (const note of results.notes) {
      displayResult(note, "note");
    }
  }
}

/**
 * Display a single result
 */
function displayResult(result: SarifResult, level: string): void {
  const location = result.locations?.[0]?.physicalLocation;
  const file = location?.artifactLocation?.uri || "unknown";
  const line = location?.region?.startLine || "?";
  
  console.log(`\n  ${level.toUpperCase()}: ${result.ruleId}`);
  console.log(`  File: ${file}:${line}`);
  console.log(`  Message: ${result.message.text}`);
}

/**
 * Check if results contain critical security issues
 */
function hasSecurityIssues(results: ReturnType<typeof analyzeSarifResults>): boolean {
  // Define critical security rule IDs that should fail the check
  const criticalRules = [
    "DS162092", // Hardcoded secret/token
    "DS126858", // SQL injection
    "DS141863", // XSS vulnerability
    "DS149435", // Command injection
  ];

  return results.errors.some(error => 
    criticalRules.includes(error.ruleId)
  );
}

/**
 * Download SARIF artifact from GitHub Actions (if running in CI)
 */
async function downloadSarifFromGitHub(): Promise<string | null> {
  // This would need GitHub API integration to download artifacts
  // For now, return null to indicate manual file path is needed
  return null;
}

/**
 * Main function
 */
async function main() {
  console.log("🔒 SARIF Security Results Checker\n");

  let sarifPath: string | null = null;

  // Check if file path was provided as argument
  if (Deno.args.length > 0) {
    sarifPath = Deno.args[0];
  } else if (Deno.env.get("GITHUB_ACTIONS") === "true") {
    // Try to download from GitHub Actions
    sarifPath = await downloadSarifFromGitHub();
  }

  if (!sarifPath) {
    console.error("❌ Error: Please provide a SARIF file path as argument");
    console.error("Usage: deno run --allow-read scripts/check-sarif.ts path/to/file.sarif");
    Deno.exit(1);
  }

  try {
    // Check if file exists
    await Deno.stat(sarifPath);
  } catch {
    console.error(`❌ Error: File not found: ${sarifPath}`);
    Deno.exit(1);
  }

  try {
    // Parse and analyze SARIF file
    const sarif = await parseSarifFile(sarifPath);
    const results = analyzeSarifResults(sarif);
    
    // Display results
    displayResults(results);

    // Check for critical issues
    if (hasSecurityIssues(results)) {
      console.error("\n❌ Critical security issues found!");
      Deno.exit(1);
    } else if (results.errors.length > 0) {
      console.warn("\n⚠️  Non-critical errors found");
      Deno.exit(0);
    } else {
      console.log("\n✅ No critical security issues found");
      Deno.exit(0);
    }
  } catch (error) {
    console.error("❌ Error parsing SARIF file:", error);
    Deno.exit(1);
  }
}

// Run main function
if (import.meta.main) {
  await main();
}