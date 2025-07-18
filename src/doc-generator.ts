/**
 * @fileoverview Documentation generation using deno doc
 */

import type { NagareConfig } from "../types.ts";
import type { TranslationKey } from "../locales/schema.ts";
import { ErrorCodes, NagareError } from "./enhanced-error.ts";
import { NagareBrand as Brand } from "./branded-messages.ts";

/**
 * DocGenerator - Documentation generation using deno doc
 */
export class DocGenerator {
  private config: NagareConfig;

  constructor(config: NagareConfig) {
    this.config = config;
  }

  /**
   * Generate documentation using deno doc
   */
  async generateDocs(): Promise<void> {
    if (!this.config.docs?.enabled) {
      return;
    }

    try {
      const outputDir = this.config.docs.outputDir || "./docs";
      const includePrivate = this.config.docs.includePrivate || false;

      // Ensure output directory exists
      await Deno.mkdir(outputDir, { recursive: true });

      // Build deno doc command
      const cmd = ["deno", "doc"];

      if (includePrivate) {
        cmd.push("--private");
      }

      // Add custom options if provided
      if (this.config.docs.denoDocOptions) {
        cmd.push(...this.config.docs.denoDocOptions);
      }

      // In doc-generator.ts, around line 40:
      const docTitle = this.config.project.description
        ? `${this.config.project.name} - ${this.config.project.description}`
        : this.config.project.name;

      cmd.push("--html", "--name=" + docTitle, "--output=" + outputDir);

      // Add all TypeScript files in current directory
      cmd.push("./mod.ts", "./src/");

      await this.runCommand(cmd);
      Brand.success(`Generated documentation in ${outputDir}`);

      // Run enhancement script if it exists
      try {
        const enhanceScriptPath = "./enhance-docs.ts";
        const fileInfo = await Deno.stat(enhanceScriptPath);

        if (fileInfo.isFile) {
          Brand.progress("Enhancing documentation with custom styles...");
          const enhanceCmd = ["deno", "run", "--allow-read", "--allow-write", enhanceScriptPath];
          await this.runCommand(enhanceCmd);
          Brand.success("Documentation enhanced successfully");
        }
      } catch (enhanceError) {
        // Enhancement script doesn't exist or failed - not critical
        if (!(enhanceError instanceof Deno.errors.NotFound)) {
          console.warn(`⚠️  Documentation enhancement failed: ${enhanceError}`);
        }
      }
    } catch (error) {
      console.warn(
        `⚠️  Failed to generate documentation: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // Don't throw - docs generation is optional
    }
  }

  /**
   * Run command helper
   */
  private async runCommand(cmd: string[]): Promise<string> {
    const process = new Deno.Command(cmd[0], {
      args: cmd.slice(1),
      stdout: "piped",
      stderr: "piped",
    });

    const result = await process.output();

    if (!result.success) {
      const error = new TextDecoder().decode(result.stderr);
      throw new NagareError(
        "errors.dependencyNotFound" as TranslationKey,
        ErrorCodes.DEPENDENCY_NOT_FOUND,
        {
          context: {
            command: cmd.join(" "),
            stderr: error,
            hint: "Run 'deno doc --help' to verify deno doc is available",
          },
          suggestions: [
            "suggestions.checkPath" as TranslationKey,
            "suggestions.checkConfig" as TranslationKey,
          ],
        },
      );
    }

    return new TextDecoder().decode(result.stdout);
  }
}
