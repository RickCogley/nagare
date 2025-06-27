/**
 * @fileoverview Template processing and file generation for version files
 * @description Uses Vento template engine for robust template processing with custom filters
 * @author Rick Cogley
 * @since 0.9.0
 */

import type { NagareConfig, TemplateData } from "../types.ts";
import { BUILT_IN_TEMPLATES, TemplateFormat } from "../config.ts";

// Import Vento template engine using the alias from deno.json imports
import vento from "vento";

/**
 * TemplateProcessor - Template processing and file generation using Vento
 * 
 * Handles template compilation and rendering with enhanced data preparation.
 * Supports built-in templates (TypeScript, JSON, YAML) and custom templates.
 * 
 * @example
 * ```typescript
 * const processor = new TemplateProcessor(config);
 * const result = processor.processTemplate(template, data);
 * ```
 */
export class TemplateProcessor {
  /** Nagare configuration */
  private config: NagareConfig;
  
  /** Vento template environment instance */
  private vento: ReturnType<typeof vento>;

  /**
   * Initialize template processor with Vento environment
   * 
   * @param config - Nagare configuration object
   */
  constructor(config: NagareConfig) {
    this.config = config;
    this.vento = vento();
    this.setupVentoFilters();
  }

  /**
   * Setup custom Vento filters for release management
   * 
   * Adds specialized filters for common template operations:
   * - jsonStringify: Convert objects to formatted JSON
   * - formatDate: Format dates to ISO date strings
   * - shortHash: Truncate git hashes to specified length
   * - safeString: Escape quotes for JSON embedding
   * 
   * @private
   */
  private setupVentoFilters(): void {
    // JSON stringify filter for objects - using Vento filter syntax
    this.vento.filters.jsonStringify = (value: unknown, indent = 2) => {
      if (value === null || value === undefined) {
        return "null";
      }
      return JSON.stringify(value, null, indent);
    };

    // Format date filter
    this.vento.filters.formatDate = (date: Date | string) => {
      if (typeof date === "string") date = new Date(date);
      return date.toISOString().split("T")[0];
    };

    // Short hash filter for git commits
    this.vento.filters.shortHash = (hash: string, length = 7) => {
      return hash ? hash.substring(0, length) : "unknown";
    };

    // Safe string filter (escapes quotes for JSON)
    this.vento.filters.safeString = (str: string) => {
      return str ? str.replace(/"/g, '\\"') : "";
    };
  }

  /**
   * Process a template string with data using Vento
   * 
   * Compiles and renders a template with enhanced data preparation.
   * Throws descriptive errors for template compilation or rendering failures.
   * 
   * @param template - Template string with Vento syntax
   * @param data - Template data object
   * @returns Rendered template string
   * @throws Error if template processing fails
   * 
   * @example
   * ```typescript
   * const template = 'Version: {{ version }}, Components: {{ versionComponents |> jsonStringify }}';
   * const result = await processor.processTemplate(template, templateData);
   * ```
   */
  async processTemplate(template: string, data: TemplateData): Promise<string> {
    try {
      // Prepare enhanced template data
      const enhancedData = this.prepareTemplateData(data);
      
      // Render template with Vento - runString returns { content: string }
      const result = await this.vento.runString(template, enhancedData);
      return result.content;
    } catch (error) {
      throw new Error(
        `Template processing failed: ${error instanceof Error ? error.message : String(error)}\n` +
        `This might be due to invalid template syntax or missing data.`
      );
    }
  }

  /**
   * Prepare template data with additional computed values
   * 
   * Enhances the base template data with:
   * - Parsed version components (major, minor, patch, prerelease)
   * - Merged metadata from config and data
   * - Complete project information
   * - Computed helper values (currentYear, formatted dates, etc.)
   * 
   * @param data - Base template data
   * @returns Enhanced template data object with computed properties
   * @private
   */
  private prepareTemplateData(data: TemplateData): Record<string, unknown> {
    // Parse version components from the version string
    const versionParts = data.version.split('.');
    const versionComponents = {
      major: parseInt(versionParts[0]) || 0,
      minor: parseInt(versionParts[1]) || 0,
      patch: parseInt(versionParts[2]) || 0,
      prerelease: null as string | null
    };

    // Check for prerelease info (e.g., "1.2.3-beta.1")
    if (versionParts[2] && versionParts[2].includes('-')) {
      const [patchPart, prereleasePart] = versionParts[2].split('-');
      versionComponents.patch = parseInt(patchPart) || 0;
      versionComponents.prerelease = prereleasePart;
    }

    // Merge metadata from config and data
    const metadata = {
      ...this.config.releaseNotes?.metadata || {},
      ...data.metadata || {}
    };

    // Ensure project data is complete
    const project = {
      ...this.config.project,
      ...data.project || {}
    };

    return {
      // Core template data
      version: data.version,
      buildDate: data.buildDate,
      gitCommit: data.gitCommit,
      environment: data.environment,
      releaseNotes: data.releaseNotes,
      
      // Enhanced computed data
      versionComponents,
      metadata,
      project,
      
      // Individual metadata properties at root level for easier access in templates
      ...metadata,
      
      // Additional computed helpers
      currentYear: new Date().getFullYear(),
      buildDateFormatted: new Date(data.buildDate).toISOString().split('T')[0],
      shortCommit: data.gitCommit ? data.gitCommit.substring(0, 7) : "unknown"
    };
  }

  /**
   * Generate version file content using built-in templates
   * 
   * Uses the configured template format to generate version file content.
   * Delegates to processTemplate for custom templates.
   * 
   * @param data - Template data for version file generation
   * @returns Generated version file content
   * @throws Error if template format is unknown or custom template used incorrectly
   * 
   * @example
   * ```typescript
   * // For built-in typescript template
   * const content = await processor.generateVersionFile(templateData);
   * ```
   */
  async generateVersionFile(data: TemplateData): Promise<string> {
    const templateFormat = this.config.versionFile.template;

    if (templateFormat === TemplateFormat.CUSTOM) {
      throw new Error("Custom template should use processTemplate() method instead");
    }

    const template = BUILT_IN_TEMPLATES[templateFormat];

    if (!template) {
      throw new Error(`Unknown template format: ${templateFormat}`);
    }

    return await this.processTemplate(template, data);
  }

  /**
   * Test template compilation (useful for validation)
   * 
   * Validates template syntax without rendering data.
   * Useful for configuration validation and debugging.
   * 
   * @param template - Template string to validate
   * @returns Validation result with error details if invalid
   * 
   * @example
   * ```typescript
   * const result = await processor.validateTemplate('{{ version }}');
   * if (!result.valid) {
   *   console.error('Template error:', result.error);
   * }
   * ```
   */
  async validateTemplate(template: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Try to render template with minimal data
      await this.vento.runString(template, {});
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}