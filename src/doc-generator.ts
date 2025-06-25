/**
 * @fileoverview Documentation generation using deno doc
 */

import type { NagareConfig } from '../types.ts';

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
      const outputDir = this.config.docs.outputDir || './docs';
      const includePrivate = this.config.docs.includePrivate || false;
      
      // Ensure output directory exists
      await Deno.mkdir(outputDir, { recursive: true });
      
      // Build deno doc command
      const cmd = ['deno', 'doc'];
      
      if (includePrivate) {
        cmd.push('--private');
      }
      
      // Add custom options if provided
      if (this.config.docs.denoDocOptions) {
        cmd.push(...this.config.docs.denoDocOptions);
      }
      
      // Add output format and directory
      cmd.push('--html', '--name', this.config.project.name, '--output', outputDir);
      
      // Add all TypeScript files in current directory
      cmd.push('./mod.ts', './src/');
      
      await this.runCommand(cmd);
      console.log(`✅ Generated documentation in ${outputDir}`);
    } catch (error) {
      console.warn(`⚠️  Failed to generate documentation: ${error instanceof Error ? error.message : String(error)}`);
      // Don't throw - docs generation is optional
    }
  }

  /**
   * Run command helper
   */
  private async runCommand(cmd: string[]): Promise<string> {
    const process = new Deno.Command(cmd[0], {
      args: cmd.slice(1),
      stdout: 'piped',
      stderr: 'piped'
    });

    const result = await process.output();
    
    if (!result.success) {
      const error = new TextDecoder().decode(result.stderr);
      throw new Error(`Command failed: ${cmd.join(' ')}\n${error}`);
    }

    return new TextDecoder().decode(result.stdout);
  }
}