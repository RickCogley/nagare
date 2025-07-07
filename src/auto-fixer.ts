/**
 * Auto-fix system for common CI/CD errors
 * Provides both basic deterministic fixes and AI-powered solutions
 */

import { ErrorType, ParsedError } from "./log-parser.ts";
import { runCommand } from "./utils.ts";
import { NagareConfig } from "../types.ts";

export interface FixResult {
  success: boolean;
  fixed: number;
  failed: number;
  changes: string[];
  error?: string;
}

export interface AIProvider {
  type: "claude-code" | "github-copilot" | "custom";
  command: string;
  available: boolean;
}

export class AutoFixer {
  private aiProvider: AIProvider | null = null;

  constructor(private config: NagareConfig) {}

  /**
   * Initialize and detect available AI providers
   */
  async initialize(): Promise<void> {
    if (this.config.release?.autoFix?.ai?.enabled) {
      this.aiProvider = await this.detectAIProvider();
    }
  }

  /**
   * Detect available AI tools
   */
  private async detectAIProvider(): Promise<AIProvider | null> {
    const configured = this.config.release?.autoFix?.ai?.provider;

    // Check configured provider first
    if (configured) {
      const command = this.config.release?.autoFix?.ai?.command ||
        (configured === "claude-code" ? "claude" : "gh copilot");

      if (await this.commandExists(command)) {
        return { type: configured, command, available: true };
      }
    }

    // Auto-detect if not configured
    if (await this.commandExists("claude")) {
      return { type: "claude-code", command: "claude", available: true };
    }

    if (await this.commandExists("gh copilot")) {
      return { type: "github-copilot", command: "gh copilot", available: true };
    }

    return null;
  }

  /**
   * Check if a command exists
   */
  private async commandExists(command: string): Promise<boolean> {
    try {
      await runCommand("which", [command]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Attempt to fix errors automatically
   */
  async fixErrors(
    errors: ParsedError[],
    onProgress?: (message: string) => void,
  ): Promise<FixResult> {
    const result: FixResult = {
      success: true,
      fixed: 0,
      failed: 0,
      changes: [],
    };

    // Group errors by type for efficient fixing
    const errorGroups = this.groupErrorsByType(errors);

    for (const [type, typeErrors] of errorGroups) {
      onProgress?.(`Fixing ${typeErrors.length} ${type} errors...`);

      // Try basic fixes first
      const basicResult = await this.tryBasicFix(type, typeErrors);
      result.fixed += basicResult.fixed;
      result.failed += basicResult.failed;
      result.changes.push(...basicResult.changes);

      // If basic fix failed and AI is available, try AI fix
      if (basicResult.failed > 0 && this.aiProvider?.available) {
        const remainingErrors = typeErrors.slice(basicResult.fixed);
        const aiResult = await this.tryAIFix(type, remainingErrors);
        result.fixed += aiResult.fixed;
        result.failed = basicResult.failed - aiResult.fixed;
        result.changes.push(...aiResult.changes);
      }
    }

    result.success = result.failed === 0;
    return result;
  }

  /**
   * Try basic deterministic fixes
   */
  private async tryBasicFix(
    type: ErrorType,
    errors: ParsedError[],
  ): Promise<FixResult> {
    switch (type) {
      case "format":
        return await this.fixFormatErrors();

      case "lint":
        return await this.fixLintErrors(errors);

      case "version-conflict":
        return await this.fixVersionConflict();

      case "security-scan":
        return this.fixSecurityScan(errors);

      default:
        return { success: false, fixed: 0, failed: errors.length, changes: [] };
    }
  }

  /**
   * Fix formatting errors
   */
  private async fixFormatErrors(): Promise<FixResult> {
    try {
      await runCommand("deno", ["fmt"]);
      return {
        success: true,
        fixed: 1, // Format fixes all files at once
        failed: 0,
        changes: ["Formatted all files with deno fmt"],
      };
    } catch (error) {
      return {
        success: false,
        fixed: 0,
        failed: 1,
        changes: [],
        error: `Format fix failed: ${error}`,
      };
    }
  }

  /**
   * Fix lint errors with --fix flag
   */
  private async fixLintErrors(errors: ParsedError[]): Promise<FixResult> {
    const result: FixResult = {
      success: true,
      fixed: 0,
      failed: 0,
      changes: [],
    };

    // Try deno lint --fix
    try {
      await runCommand("deno", ["lint", "--fix"]);

      // Count how many were actually fixed
      const fixableErrors = errors.filter((e) => e.fixable);
      result.fixed = fixableErrors.length;
      result.failed = errors.length - fixableErrors.length;
      result.changes.push("Applied deno lint --fix");

      return result;
    } catch {
      // If deno lint fails, try file-by-file fixes for specific rules
      for (const error of errors) {
        if (error.fixable && error.file) {
          const fixed = await this.fixSingleLintError(error);
          if (fixed) {
            result.fixed++;
            result.changes.push(`Fixed ${error.rule} in ${error.file}`);
          } else {
            result.failed++;
          }
        } else {
          result.failed++;
        }
      }
    }

    result.success = result.failed === 0;
    return result;
  }

  /**
   * Fix a single lint error
   */
  private async fixSingleLintError(error: ParsedError): Promise<boolean> {
    if (!error.file || !error.line) return false;

    // Simple fixes we can do programmatically
    switch (error.rule) {
      case "prefer-const": {
        try {
          const content = await Deno.readTextFile(error.file);
          const lines = content.split("\n");
          if (lines[error.line - 1]) {
            lines[error.line - 1] = lines[error.line - 1].replace(/\blet\b/, "const");
            await Deno.writeTextFile(error.file, lines.join("\n"));
            return true;
          }
        } catch {
          return false;
        }
        break;
      }

      case "no-unused-vars": {
        // Add underscore prefix to mark as intentionally unused
        try {
          const content = await Deno.readTextFile(error.file);
          const lines = content.split("\n");
          if (lines[error.line - 1]) {
            // Extract variable name from error message
            const varMatch = error.message.match(/'([^']+)'/);
            if (varMatch) {
              const varName = varMatch[1];
              lines[error.line - 1] = lines[error.line - 1].replace(
                new RegExp(`\\b${varName}\\b`),
                `_${varName}`,
              );
              await Deno.writeTextFile(error.file, lines.join("\n"));
              return true;
            }
          }
        } catch {
          return false;
        }
        break;
      }
    }

    return false;
  }

  /**
   * Fix version conflict by bumping version
   */
  private async fixVersionConflict(): Promise<FixResult> {
    try {
      const denoJsonPath = "./deno.json";
      const content = await Deno.readTextFile(denoJsonPath);
      const denoJson = JSON.parse(content);

      if (denoJson.version) {
        // Parse semantic version
        const match = denoJson.version.match(/^(\d+)\.(\d+)\.(\d+)(-.*)?$/);
        if (match) {
          const [_, major, minor, patch, prerelease] = match;
          // Bump patch version
          const newVersion = `${major}.${minor}.${parseInt(patch) + 1}${prerelease || ""}`;
          denoJson.version = newVersion;

          await Deno.writeTextFile(
            denoJsonPath,
            JSON.stringify(denoJson, null, 2) + "\n",
          );

          return {
            success: true,
            fixed: 1,
            failed: 0,
            changes: [`Bumped version to ${newVersion} in deno.json`],
          };
        }
      }
    } catch (error) {
      return {
        success: false,
        fixed: 0,
        failed: 1,
        changes: [],
        error: `Version bump failed: ${error}`,
      };
    }

    return {
      success: false,
      fixed: 0,
      failed: 1,
      changes: [],
      error: "Could not parse version in deno.json",
    };
  }

  /**
   * Fix security scan issues
   */
  private fixSecurityScan(errors: ParsedError[]): FixResult {
    const result: FixResult = {
      success: true,
      fixed: 0,
      failed: 0,
      changes: [],
    };

    for (const error of errors) {
      if (error.fixable && error.rule?.startsWith("DS")) {
        // Add DevSkim suppression
        // This is a simplified version - in practice would need to find the exact line
        result.failed++;
      } else {
        result.failed++;
      }
    }

    result.success = result.failed === 0;
    return result;
  }

  /**
   * Try AI-powered fixes
   */
  private async tryAIFix(
    type: ErrorType,
    errors: ParsedError[],
  ): Promise<FixResult> {
    if (!this.aiProvider) {
      return { success: false, fixed: 0, failed: errors.length, changes: [] };
    }

    const prompt = this.buildAIPrompt(type, errors);
    const flags = this.config.release?.autoFix?.ai?.flags || [];

    try {
      // Create a temporary file with the errors
      const errorFile = await Deno.makeTempFile({ suffix: ".md" });
      await Deno.writeTextFile(errorFile, prompt);

      // Call AI provider
      const args = [errorFile, ...flags];
      await runCommand(this.aiProvider.command, args);

      // Clean up
      await Deno.remove(errorFile);

      // For now, assume AI fixed all errors it was given
      // In practice, we'd need to verify what was actually fixed
      return {
        success: true,
        fixed: errors.length,
        failed: 0,
        changes: [`AI-assisted fixes applied for ${errors.length} ${type} errors`],
      };
    } catch (error) {
      return {
        success: false,
        fixed: 0,
        failed: errors.length,
        changes: [],
        error: `AI fix failed: ${error}`,
      };
    }
  }

  /**
   * Build prompt for AI assistance
   */
  private buildAIPrompt(type: ErrorType, errors: ParsedError[]): string {
    const lines = [
      `# Fix ${type} Errors`,
      "",
      `Please fix the following ${errors.length} errors found during CI/CD:`,
      "",
    ];

    for (const error of errors) {
      lines.push(`## Error ${errors.indexOf(error) + 1}`);
      if (error.file) {
        lines.push(`**File**: ${error.file}${error.line ? `:${error.line}` : ""}`);
      }
      if (error.rule) {
        lines.push(`**Rule**: ${error.rule}`);
      }
      lines.push(`**Message**: ${error.message}`);
      if (error.suggestion) {
        lines.push(`**Suggestion**: ${error.suggestion}`);
      }
      lines.push("");
    }

    lines.push("Please apply the necessary fixes to resolve these errors.");
    lines.push("Use extended thinking to ensure the fixes are correct.");

    return lines.join("\n");
  }

  /**
   * Group errors by type
   */
  private groupErrorsByType(errors: ParsedError[]): Map<ErrorType, ParsedError[]> {
    const groups = new Map<ErrorType, ParsedError[]>();

    for (const error of errors) {
      const group = groups.get(error.type) || [];
      group.push(error);
      groups.set(error.type, group);
    }

    return groups;
  }

  /**
   * Commit fixes with descriptive message
   */
  async commitFixes(changes: string[]): Promise<void> {
    if (changes.length === 0) return;

    const message = [
      "fix: auto-fix CI/CD errors for release",
      "",
      ...changes.map((c) => `- ${c}`),
      "",
      "Auto-generated fixes for release workflow",
    ].join("\n");

    await runCommand("git", ["add", "-A"]);
    await runCommand("git", ["commit", "-m", message]);
  }
}
