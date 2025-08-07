/**
 * Log parser for extracting errors from CI/CD logs
 * Identifies common error patterns and suggests fixes
 */

export type ErrorType =
  | "lint"
  | "format"
  | "type-check"
  | "security-scan"
  | "test-failure"
  | "version-conflict"
  | "build-error"
  | "unknown";

export interface ParsedError {
  type: ErrorType;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  rule?: string;
  suggestion?: string;
  context?: string;
  fixable?: boolean;
}

export interface LogParseResult {
  errors: ParsedError[];
  summary: string;
  hasFixableErrors: boolean;
}

export class LogParser {
  /**
   * Parse CI/CD logs to extract errors
   */
  parseLog(log: string): LogParseResult {
    const errors: ParsedError[] = [];
    const lines = log.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Deno lint errors
      const lintMatch = this.parseDenoLint(line, lines, i);
      if (lintMatch) {
        errors.push(lintMatch);
        continue;
      }

      // ESLint errors
      const eslintMatch = this.parseESLint(line);
      if (eslintMatch) {
        errors.push(eslintMatch);
        continue;
      }

      // Deno format errors
      const formatMatch = this.parseDenoFormat(line);
      if (formatMatch) {
        errors.push(formatMatch);
        continue;
      }

      // TypeScript errors
      const typeMatch = this.parseTypeScript(line, lines, i);
      if (typeMatch) {
        errors.push(typeMatch);
        continue;
      }

      // DevSkim security scan
      const devSkimMatch = this.parseDevSkim(line);
      if (devSkimMatch) {
        errors.push(devSkimMatch);
        continue;
      }

      // JSR version conflict
      const versionMatch = this.parseVersionConflict(line);
      if (versionMatch) {
        errors.push(versionMatch);
        continue;
      }

      // Test failures
      const testMatch = this.parseTestFailure(line, lines, i);
      if (testMatch) {
        errors.push(testMatch);
        continue;
      }
    }

    const hasFixableErrors = errors.some((e) => e.fixable);
    const summary = this.generateSummary(errors);

    return { errors, summary, hasFixableErrors };
  }

  private parseDenoLint(line: string, lines: string[], index: number): ParsedError | null {
    // Format: (prefer-const) `let` is never reassigned, use `const` instead.
    const match = line.match(/^\(([^)]+)\)\s+(.+)$/);
    if (match && index > 0) {
      const prevLine = lines[index - 1];
      const fileMatch = prevLine.match(/^(.+):(\d+):(\d+)$/);
      if (fileMatch) {
        return {
          type: "lint",
          rule: match[1],
          message: match[2],
          file: fileMatch[1],
          line: parseInt(fileMatch[2]),
          column: parseInt(fileMatch[3]),
          fixable: this.isLintFixable(match[1]),
          suggestion: this.getLintSuggestion(match[1], match[2]),
        };
      }
    }
    return null;
  }

  private parseESLint(line: string): ParsedError | null {
    // Format: /path/to/file.js:10:5  error  'unused' is defined but never used  no-unused-vars
    const match = line.match(/^(.+):(\d+):(\d+)\s+error\s+(.+)\s+([a-z-]+)$/);
    if (match) {
      return {
        type: "lint",
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        message: match[4],
        rule: match[5],
        fixable: this.isLintFixable(match[5]),
        suggestion: this.getLintSuggestion(match[5], match[4]),
      };
    }
    return null;
  }

  private parseDenoFormat(line: string): ParsedError | null {
    if (line.includes("Found") && line.includes("not formatted")) {
      const match = line.match(/Found (\d+) file/);
      if (match) {
        return {
          type: "format",
          message: line,
          fixable: true,
          suggestion: "Run 'deno fmt' to fix formatting issues",
        };
      }
    }
    return null;
  }

  private parseTypeScript(line: string, lines: string[], index: number): ParsedError | null {
    // Format: TS2304 [ERROR]: Cannot find name 'foo'.
    const match = line.match(/^TS(\d+)\s+\[ERROR\]:\s+(.+)$/);
    if (match && index > 0) {
      // Look for file location in previous lines
      for (let i = index - 1; i >= Math.max(0, index - 5); i--) {
        const fileMatch = lines[i].match(/^at\s+(.+):(\d+):(\d+)$/);
        if (fileMatch) {
          return {
            type: "type-check",
            message: match[2],
            file: fileMatch[1],
            line: parseInt(fileMatch[2]),
            column: parseInt(fileMatch[3]),
            rule: `TS${match[1]}`,
            fixable: this.isTypeErrorFixable(`TS${match[1]}`),
            suggestion: this.getTypeErrorSuggestion(`TS${match[1]}`, match[2]),
          };
        }
      }
    }
    return null;
  }

  private parseDevSkim(line: string): ParsedError | null {
    // Format: [HIGH] DS123456: Security issue description
    const match = line.match(/^\[([^\]]+)\]\s+(DS\d+):\s+(.+)$/);
    if (match) {
      return {
        type: "security-scan",
        rule: match[2],
        message: match[3],
        fixable: match[1] !== "HIGH", // Don't auto-fix high severity
        suggestion: `Add suppression comment: // DevSkim: ignore ${match[2]}`,
      };
    }
    return null;
  }

  private parseVersionConflict(line: string): ParsedError | null {
    if (line.includes("version already exists") || line.includes("Version already published")) {
      const versionMatch = line.match(/version\s+([^\s]+)/i);
      return {
        type: "version-conflict",
        message: line,
        fixable: true,
        suggestion: `Bump version in deno.json to next patch/minor version`,
        context: versionMatch ? `Current version: ${versionMatch[1]}` : undefined,
      };
    }
    return null;
  }

  private parseTestFailure(line: string, _lines: string[], _index: number): ParsedError | null {
    if (line.includes("FAILED") && line.includes("test")) {
      // Look for test name and file
      const testMatch = line.match(/(.+)\s+\.\.\.\s+FAILED/);
      if (testMatch) {
        return {
          type: "test-failure",
          message: `Test failed: ${testMatch[1]}`,
          fixable: false,
          suggestion: "Review test implementation and fix failing assertions",
        };
      }
    }
    return null;
  }

  private isLintFixable(rule: string): boolean {
    const fixableRules = [
      "prefer-const",
      "no-unused-vars",
      "no-extra-semi",
      "quotes",
      "indent",
      "comma-dangle",
      "semi",
      "no-trailing-spaces",
    ];
    return fixableRules.includes(rule);
  }

  private isTypeErrorFixable(code: string): boolean {
    const fixableCodes = [
      "TS2304", // Cannot find name
      "TS2339", // Property does not exist
      "TS2551", // Did you mean (typo)
      "TS6133", // Declared but never used
    ];
    return fixableCodes.includes(code);
  }

  private getLintSuggestion(rule: string, _message: string): string {
    const suggestions: Record<string, string> = {
      "prefer-const": "Change 'let' to 'const' for unmodified variables",
      "no-unused-vars": "Remove unused variable or add underscore prefix to ignore",
      "no-extra-semi": "Remove extra semicolons",
      "quotes": "Use consistent quote style (single or double)",
      "indent": "Fix indentation to match project style",
    };
    return suggestions[rule] || `Fix lint rule: ${rule}`;
  }

  private getTypeErrorSuggestion(code: string, _message: string): string {
    const suggestions: Record<string, string> = {
      "TS2304": "Import missing module or declare the variable",
      "TS2339": "Add type annotation or check if property exists",
      "TS2551": "Fix the typo in the identifier name",
      "TS6133": "Remove unused declaration or export it",
    };
    return suggestions[code] || `Fix TypeScript error: ${code}`;
  }

  private generateSummary(errors: ParsedError[]): string {
    if (errors.length === 0) {
      return "No errors found in logs";
    }

    const counts = errors.reduce((acc, err) => {
      acc[err.type] = (acc[err.type] || 0) + 1;
      return acc;
    }, {} as Record<ErrorType, number>);

    const parts = Object.entries(counts).map(([type, count]) => {
      const label = type.replace("-", " ");
      return `${count} ${label} error${count > 1 ? "s" : ""}`;
    });

    const fixable = errors.filter((e) => e.fixable).length;
    if (fixable > 0) {
      parts.push(`(${fixable} auto-fixable)`);
    }

    return `Found ${errors.length} errors: ${parts.join(", ")}`;
  }

  /**
   * Group errors by type for batch fixing
   */
  groupErrorsByType(errors: ParsedError[]): Map<ErrorType, ParsedError[]> {
    const groups = new Map<ErrorType, ParsedError[]>();

    for (const error of errors) {
      const group = groups.get(error.type) || [];
      group.push(error);
      groups.set(error.type, group);
    }

    return groups;
  }
}
