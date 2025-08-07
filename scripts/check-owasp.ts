#!/usr/bin/env -S deno run --allow-read
/**
 * @fileoverview OWASP compliance checker for Nagare
 * @description Validates code against OWASP Top 10 security risks
 */

import { walk } from "jsr:@std/fs@^1.0.0/walk";
import { relative } from "jsr:@std/path@^1.1.1";

interface SecurityIssue {
  file: string;
  line: number;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  message: string;
  owaspCategory: string;
  recommendation: string;
}

interface OWASPCheckResult {
  passed: boolean;
  issues: SecurityIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  timestamp: string;
}

/**
 * OWASP Top 10 patterns to check
 */
const OWASP_PATTERNS = [
  // A01: Broken Access Control
  {
    category: "A01",
    name: "Broken Access Control",
    patterns: [
      {
        regex: /localStorage\.|sessionStorage\./,
        severity: "medium" as const,
        message: "Sensitive data in browser storage",
        recommendation: "Use secure server-side session management",
      },
      {
        regex: /document\.cookie(?!\s*=\s*["'][^"']*;\s*Secure)/,
        severity: "high" as const,
        message: "Cookie without Secure flag",
        recommendation: "Add Secure and HttpOnly flags to cookies",
      },
    ],
  },
  // A02: Cryptographic Failures
  {
    category: "A02",
    name: "Cryptographic Failures",
    patterns: [
      {
        regex: /Math\.random\(\)/,
        severity: "high" as const,
        message: "Weak random number generation",
        recommendation: "Use crypto.getRandomValues() for security-sensitive operations",
      },
      {
        regex: /password\s*=\s*["'`][^"'`]+["'`]/,
        severity: "critical" as const,
        message: "Hardcoded password detected",
        recommendation: "Use environment variables or secure key management",
      },
      {
        regex: /api[_-]?key\s*=\s*["'`][^"'`]+["'`]/,
        severity: "critical" as const,
        message: "Hardcoded API key detected",
        recommendation: "Use environment variables or secure key management",
      },
      {
        regex: /secret\s*=\s*["'`][^"'`]+["'`]/,
        severity: "critical" as const,
        message: "Hardcoded secret detected",
        recommendation: "Use environment variables or secure key management",
      },
    ],
  },
  // A03: Injection
  {
    category: "A03",
    name: "Injection",
    patterns: [
      {
        regex: /eval\s*\(/,
        severity: "critical" as const,
        message: "eval() usage - potential code injection",
        recommendation: "Avoid eval(), use safer alternatives",
      },
      {
        regex: /new\s+Function\s*\(/,
        severity: "critical" as const,
        message: "Function constructor - potential code injection",
        recommendation: "Use static functions instead of dynamic generation",
      },
      {
        regex: /innerHTML\s*=/,
        severity: "high" as const,
        message: "innerHTML usage - potential XSS",
        recommendation: "Use textContent or sanitize HTML input",
      },
      {
        regex: /document\.write\s*\(/,
        severity: "high" as const,
        message: "document.write - potential XSS",
        recommendation: "Use DOM methods like createElement",
      },
      {
        regex: /\$\{[^}]*\}/,
        severity: "low" as const,
        message: "Template literal - ensure inputs are sanitized",
        recommendation: "Validate and sanitize all template inputs",
      },
      {
        regex: /exec\s*\(|execSync\s*\(/,
        severity: "critical" as const,
        message: "Command execution - potential command injection",
        recommendation: "Sanitize inputs and use parameterized commands",
      },
    ],
  },
  // A04: Insecure Design
  {
    category: "A04",
    name: "Insecure Design",
    patterns: [
      {
        regex: /\/\/\s*TODO:?\s*security/i,
        severity: "medium" as const,
        message: "Security TODO found",
        recommendation: "Address security TODOs before release",
      },
      {
        regex: /\/\/\s*FIXME:?\s*security/i,
        severity: "high" as const,
        message: "Security FIXME found",
        recommendation: "Fix security issues before release",
      },
    ],
  },
  // A05: Security Misconfiguration
  {
    category: "A05",
    name: "Security Misconfiguration",
    patterns: [
      {
        regex: /console\.(log|debug|info|warn|error)\(/,
        severity: "low" as const,
        message: "Console output in production code",
        recommendation: "Remove or conditionally disable console logs",
      },
      {
        regex: /debugger;/,
        severity: "high" as const,
        message: "Debugger statement found",
        recommendation: "Remove debugger statements",
      },
      {
        regex: /allow-all/,
        severity: "medium" as const,
        message: "Overly permissive configuration",
        recommendation: "Use specific permissions instead of allow-all",
      },
    ],
  },
  // A06: Vulnerable Components
  {
    category: "A06",
    name: "Vulnerable and Outdated Components",
    patterns: [
      {
        regex: /require\s*\(\s*["'`][^"'`]*["'`]\s*\)/,
        severity: "low" as const,
        message: "Dynamic require - potential for malicious module loading",
        recommendation: "Use static imports",
      },
    ],
  },
  // A07: Identification and Authentication Failures
  {
    category: "A07",
    name: "Identification and Authentication Failures",
    patterns: [
      {
        regex: /jwt\s*=|token\s*=/,
        severity: "medium" as const,
        message: "Token assignment - ensure secure handling",
        recommendation: "Store tokens securely, use HttpOnly cookies",
      },
      {
        regex: /atob\(|btoa\(/,
        severity: "low" as const,
        message: "Base64 encoding - not encryption",
        recommendation: "Use proper encryption for sensitive data",
      },
    ],
  },
  // A08: Software and Data Integrity Failures
  {
    category: "A08",
    name: "Software and Data Integrity Failures",
    patterns: [
      {
        regex: /JSON\.parse\s*\([^)]+\)/,
        severity: "low" as const,
        message: "JSON parsing - validate input",
        recommendation: "Validate JSON structure before parsing",
      },
      {
        regex: /deserialize|unmarshal|pickle\.loads/,
        severity: "high" as const,
        message: "Deserialization - potential for object injection",
        recommendation: "Validate and sanitize before deserialization",
      },
    ],
  },
  // A09: Security Logging and Monitoring Failures
  {
    category: "A09",
    name: "Security Logging and Monitoring Failures",
    patterns: [
      {
        regex: /catch\s*\([^)]*\)\s*{\s*}/,
        severity: "low" as const,
        message: "Empty catch block",
        recommendation: "Log errors appropriately",
      },
      {
        regex: /password|secret|key|token/i,
        severity: "medium" as const,
        message: "Potential sensitive data in code",
        recommendation: "Ensure sensitive data is not logged",
      },
    ],
  },
  // A10: Server-Side Request Forgery (SSRF)
  {
    category: "A10",
    name: "Server-Side Request Forgery",
    patterns: [
      {
        regex: /fetch\s*\([^)]*\$\{|fetch\s*\([^)]*\+/,
        severity: "high" as const,
        message: "Dynamic URL in fetch - potential SSRF",
        recommendation: "Validate and whitelist URLs",
      },
      {
        regex: /new\s+URL\s*\([^)]*\$\{|new\s+URL\s*\([^)]*\+/,
        severity: "medium" as const,
        message: "Dynamic URL construction",
        recommendation: "Validate URL components",
      },
    ],
  },
];

/**
 * Check if a line should be skipped
 */
function shouldSkipLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*") ||
    trimmed.includes("// DevSkim:") ||
    trimmed.includes("// codeql") ||
    trimmed.includes("// SECURITY:") ||
    trimmed.includes("// InfoSec:") ||
    trimmed.includes("// @ts-ignore") ||
    trimmed.includes("// eslint-disable")
  );
}

/**
 * Check a file for OWASP security issues
 */
async function checkFile(filePath: string): Promise<SecurityIssue[]> {
  const content = await Deno.readTextFile(filePath);
  const lines = content.split("\n");
  const issues: SecurityIssue[] = [];
  const relativePath = relative(Deno.cwd(), filePath);

  // Skip test files for some checks
  const isTestFile = filePath.match(/_test\.ts$|\.test\.ts$|test_.*\.ts$/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip comments and suppressed lines
    if (shouldSkipLine(line)) {
      continue;
    }

    // Check against OWASP patterns
    for (const category of OWASP_PATTERNS) {
      for (const pattern of category.patterns) {
        // Skip some patterns in test files
        if (isTestFile && pattern.severity === "low") {
          continue;
        }

        if (pattern.regex.test(line)) {
          issues.push({
            file: relativePath,
            line: i + 1,
            category: category.name,
            severity: pattern.severity,
            message: pattern.message,
            owaspCategory: category.category,
            recommendation: pattern.recommendation,
          });
        }
      }
    }
  }

  return issues;
}

/**
 * Run OWASP compliance check
 */
async function runOWASPCheck(): Promise<OWASPCheckResult> {
  console.log("🔒 OWASP Top 10 Security Check for Nagare");
  console.log("==========================================\n");

  const allIssues: SecurityIssue[] = [];

  // Walk through source files
  for await (
    const entry of walk(".", {
      exts: [".ts", ".js"],
      skip: [
        /node_modules/,
        /\.git/,
        /docs/,
        /coverage/,
        /\.githooks/,
        /scratch/,
        /\.claude/,
      ],
    })
  ) {
    const issues = await checkFile(entry.path);
    allIssues.push(...issues);
  }

  // Group issues by file
  const issuesByFile = new Map<string, SecurityIssue[]>();
  for (const issue of allIssues) {
    if (!issuesByFile.has(issue.file)) {
      issuesByFile.set(issue.file, []);
    }
    issuesByFile.get(issue.file)!.push(issue);
  }

  // Print issues by file
  if (allIssues.length > 0) {
    console.log("⚠️  Security Issues Found:\n");

    for (const [file, issues] of issuesByFile) {
      console.log(`📄 ${file}:`);
      for (const issue of issues) {
        const icon = issue.severity === "critical"
          ? "🔴"
          : issue.severity === "high"
          ? "🟠"
          : issue.severity === "medium"
          ? "🟡"
          : "🟢";

        console.log(`  ${icon} Line ${issue.line}: ${issue.message}`);
        console.log(`     ${issue.owaspCategory}: ${issue.category}`);
        console.log(`     💡 ${issue.recommendation}`);
      }
      console.log();
    }
  } else {
    console.log("✅ No OWASP security issues detected\n");
  }

  // Calculate summary
  const summary = {
    critical: allIssues.filter((i) => i.severity === "critical").length,
    high: allIssues.filter((i) => i.severity === "high").length,
    medium: allIssues.filter((i) => i.severity === "medium").length,
    low: allIssues.filter((i) => i.severity === "low").length,
    total: allIssues.length,
  };

  // Print summary
  console.log("📊 Summary");
  console.log("==========");
  console.log(`Critical: ${summary.critical} 🔴`);
  console.log(`High:     ${summary.high} 🟠`);
  console.log(`Medium:   ${summary.medium} 🟡`);
  console.log(`Low:      ${summary.low} 🟢`);
  console.log(`Total:    ${summary.total}`);

  // OWASP category breakdown
  const categoryCount = new Map<string, number>();
  for (const issue of allIssues) {
    categoryCount.set(
      issue.owaspCategory,
      (categoryCount.get(issue.owaspCategory) || 0) + 1,
    );
  }

  if (categoryCount.size > 0) {
    console.log("\n📈 By OWASP Category:");
    for (const [category, count] of [...categoryCount.entries()].sort()) {
      const categoryInfo = OWASP_PATTERNS.find((p) => p.category === category);
      console.log(`  ${category}: ${categoryInfo?.name} - ${count} issue(s)`);
    }
  }

  const result: OWASPCheckResult = {
    passed: summary.critical === 0 && summary.high === 0,
    issues: allIssues,
    summary,
    timestamp: new Date().toISOString(),
  };

  // Save results
  try {
    await Deno.mkdir(".security", { recursive: true });
    await Deno.writeTextFile(
      ".security/owasp-check.json",
      JSON.stringify(result, null, 2),
    );
    console.log("\n📄 Results saved to .security/owasp-check.json");
  } catch (error) {
    console.warn(`Could not save results: ${error}`);
  }

  // Exit status
  if (!result.passed) {
    console.error("\n❌ OWASP compliance check failed");
    console.log("ℹ️  Fix critical and high severity issues before release");
    console.log("ℹ️  Add security annotations to suppress false positives:");
    console.log("   - // DevSkim: ignore [rule]");
    console.log("   - // InfoSec: [justification]");
    console.log("   - // SECURITY: [explanation]");
    Deno.exit(1);
  } else {
    console.log("\n✅ OWASP compliance check passed");
    if (summary.medium > 0 || summary.low > 0) {
      console.log("ℹ️  Consider addressing medium and low severity issues");
    }
  }

  return result;
}

// Run if main module
if (import.meta.main) {
  await runOWASPCheck();
}

export { runOWASPCheck };
export type { OWASPCheckResult, SecurityIssue };
