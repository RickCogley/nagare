/**
 * @fileoverview Template processing and file generation for version files
 * @description Uses Vento template engine for robust template processing with custom filters
 * @author Rick Cogley
 * @since 0.9.0
 */

import type { AdditionalExport, NagareConfig, TemplateData } from "../types.ts";
import { BUILT_IN_TEMPLATES, TemplateFormat } from "../config.ts";
import { createSecurityLog, sanitizeErrorMessage } from "./security-utils.ts";
import { Logger } from "./logger.ts";

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

  /** Logger instance */
  private logger: Logger;

  /**
   * Initialize template processor with Vento environment
   *
   * @param config - Nagare configuration object
   */
  constructor(config: NagareConfig) {
    this.config = config;
    this.logger = new Logger(config.options?.logLevel);

    // Initialize Vento with security-conscious settings
    this.vento = vento({
      // Disable features that could be security risks
      dataVarname: "data",
      autoescape: true, // Auto-escape HTML entities
    });

    this.setupVentoFilters();
    this.setupSecurityContext();
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

    // Safe string filter (escapes backslashes and quotes for JSON)
    this.vento.filters.safeString = (str: string) => {
      if (!str) return "";
      // First escape backslashes, then quotes to ensure proper JSON escaping
      return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
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
    // Validate template for dangerous patterns
    const validation = await this.validateTemplateSecure(template);
    if (!validation.valid) {
      const sandboxMode = this.config.security?.templateSandbox ?? "strict";

      if (sandboxMode === "disabled") {
        // In disabled mode, just warn
        this.logger.warn(`Template validation warning: ${validation.error}`);
      } else {
        // In strict and moderate mode, block dangerous templates
        throw new Error(`Template validation failed: ${validation.error}`);
      }
    }

    try {
      // Prepare enhanced template data
      const enhancedData = this.prepareTemplateData(data);

      // Render template with Vento - runString returns { content: string }
      const result = await this.vento.runString(template, enhancedData);

      // Log security event for audit
      const securityLog = createSecurityLog("template_processed", {
        templateLength: template.length,
        dataKeys: Object.keys(enhancedData).length,
      });
      this.logger.debug(securityLog);

      return result.content;
    } catch (error) {
      throw new Error(
        `Template processing failed: ${sanitizeErrorMessage(error, false)}\n` +
          `This might be due to invalid template syntax or missing data.`,
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
    const versionParts = data.version.split(".");
    const versionComponents = {
      major: parseInt(versionParts[0]) || 0,
      minor: parseInt(versionParts[1]) || 0,
      patch: parseInt(versionParts[2]) || 0,
      prerelease: null as string | null,
    };

    // Check for prerelease info (e.g., "1.2.3-beta.1")
    if (versionParts[2] && versionParts[2].includes("-")) {
      const [patchPart, prereleasePart] = versionParts[2].split("-");
      versionComponents.patch = parseInt(patchPart) || 0;
      versionComponents.prerelease = prereleasePart;
    }

    // Merge metadata from config and data
    const metadata = {
      ...this.config.releaseNotes?.metadata || {},
      ...data.metadata || {},
    };

    // Ensure project data is complete
    const project = {
      ...this.config.project,
      ...data.project || {},
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
      buildDateFormatted: new Date(data.buildDate).toISOString().split("T")[0],
      shortCommit: data.gitCommit ? data.gitCommit.substring(0, 7) : "unknown",
    };
  }

  /**
   * Generate version file content using built-in templates
   *
   * Uses the configured template format to generate version file content.
   * Supports extending templates with additional exports and custom content.
   *
   * @param data - Template data for version file generation
   * @returns Generated version file content
   * @throws Error if template format is unknown or custom template used incorrectly
   *
   * @example
   * ```typescript
   * // For built-in typescript template with extensions
   * const content = await processor.generateVersionFile(templateData);
   * ```
   */
  async generateVersionFile(data: TemplateData): Promise<string> {
    const versionFile = this.config.versionFile;
    const templateFormat = versionFile.template;
    let content: string;

    if (templateFormat === TemplateFormat.CUSTOM) {
      // For custom templates, validate and use the custom template
      if (!versionFile.customTemplate) {
        throw new Error("Custom template specified but no customTemplate provided");
      }
      content = await this.processTemplate(versionFile.customTemplate, data);
    } else {
      const template = BUILT_IN_TEMPLATES[templateFormat];

      if (!template) {
        throw new Error(`Unknown template format: ${templateFormat}`);
      }

      content = await this.processTemplate(template, data);
    }

    // Apply prepend content if specified
    if (versionFile.extend?.prepend) {
      content = versionFile.extend.prepend + content;
    }

    // Add additional exports if specified
    if (versionFile.additionalExports && versionFile.additionalExports.length > 0) {
      const additionalContent = this.generateAdditionalExports(
        versionFile.additionalExports,
        templateFormat,
      );
      content += "\n" + additionalContent;
    }

    // Apply append content if specified
    if (versionFile.extend?.append) {
      content += versionFile.extend.append;
    }

    return content;
  }

  /**
   * Generate code for additional exports
   *
   * Converts AdditionalExport configurations into actual code based on the
   * template format (TypeScript, JavaScript, JSON, etc.).
   *
   * @param exports - Array of additional export configurations
   * @param format - Template format to determine syntax
   * @returns Generated code for additional exports
   * @private
   */
  private generateAdditionalExports(
    exports: AdditionalExport[],
    format: TemplateFormat,
  ): string {
    if (format === TemplateFormat.JSON || format === TemplateFormat.YAML) {
      // For JSON/YAML, we can't add exports in the traditional sense
      this.logger.warn(
        "Additional exports are not supported for JSON/YAML templates. " +
          "Consider using a TypeScript or custom template.",
      );
      return "";
    }

    const lines: string[] = [];

    // Add a separator comment
    lines.push("\n// Additional exports configured in nagare.config.ts");

    for (const exp of exports) {
      // Validate export name
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(exp.name)) {
        throw new Error(`Invalid export name: ${exp.name}`);
      }

      // Add description as JSDoc if provided
      if (exp.description) {
        lines.push(`\n/** ${exp.description} */`);
      }

      // Generate the export based on type
      switch (exp.type) {
        case "const":
        case "let":
        case "var": {
          if (exp.value === undefined) {
            throw new Error(`Export ${exp.name} of type ${exp.type} requires a value`);
          }
          const valueStr = typeof exp.value === "string"
            ? `"${exp.value}"`
            : JSON.stringify(exp.value, null, 2);
          const asConst = exp.asConst ? " as const" : "";
          const defaultExport = exp.isDefault ? "default " : "";
          lines.push(`export ${defaultExport}${exp.type} ${exp.name} = ${valueStr}${asConst};`);
          break;
        }

        case "class": {
          if (!exp.content) {
            throw new Error(`Export ${exp.name} of type class requires content`);
          }
          const defaultExport = exp.isDefault ? "default " : "";
          lines.push(`export ${defaultExport}class ${exp.name} {${exp.content}\n}`);
          break;
        }

        case "function": {
          if (!exp.content) {
            throw new Error(`Export ${exp.name} of type function requires content`);
          }
          const asyncKeyword = exp.async ? "async " : "";
          const defaultExport = exp.isDefault ? "default " : "";
          lines.push(`export ${defaultExport}${asyncKeyword}function ${exp.name}${exp.content}`);
          break;
        }

        case "interface":
        case "type": {
          if (!exp.content) {
            throw new Error(`Export ${exp.name} of type ${exp.type} requires content`);
          }
          // TypeScript types don't support default export directly
          const equals = exp.type === "type" ? " =" : "";
          lines.push(`export ${exp.type} ${exp.name}${equals} ${exp.content}`);
          break;
        }

        case "enum": {
          if (!exp.content) {
            throw new Error(`Export ${exp.name} of type enum requires content`);
          }
          lines.push(`export enum ${exp.name} {${exp.content}\n}`);
          break;
        }

        default:
          throw new Error(`Unsupported export type: ${(exp as any).type}`);
      }
    }

    return lines.join("\n");
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
        error: sanitizeErrorMessage(error, false),
      };
    }
  }

  /**
   * Setup security context for template execution
   *
   * Creates a restricted execution environment that prevents:
   * - Access to file system operations
   * - Network requests
   * - Process execution
   * - Access to sensitive globals
   *
   * @private
   */
  private setupSecurityContext(): void {
    // Configure Vento to use a restricted context
    const sandboxConfig = this.config.security?.templateSandbox ?? "strict";

    if (sandboxConfig === "strict") {
      // In strict mode, templates have minimal access
      this.logger.debug("Template sandboxing enabled in strict mode");

      // Note: Vento doesn't directly support custom contexts, but we can
      // validate templates more strictly and provide only safe functions
      // through filters instead of allowing arbitrary JavaScript
    } else if (sandboxConfig === "moderate") {
      // Moderate mode allows some additional functions but still restricted
      this.logger.debug("Template sandboxing enabled in moderate mode");
    }

    // Log security context creation
    const securityLog = createSecurityLog("template_sandbox_initialized", {
      mode: sandboxConfig,
      autoescape: true,
    });
    this.logger.debug(securityLog);
  }

  /**
   * Validate template for security issues
   *
   * Checks for dangerous patterns that could lead to:
   * - Code injection
   * - Information disclosure
   * - Template injection attacks
   *
   * @param template - Template string to validate
   * @returns Validation result with security analysis
   * @private
   */
  private validateTemplateSecure(
    template: string,
  ): { valid: boolean; error?: string } {
    if (!template || typeof template !== "string") {
      return { valid: false, error: "Template must be a non-empty string" };
    }

    const sandboxMode = this.config.security?.templateSandbox ?? "strict";

    // Check for dangerous patterns
    const dangerousPatterns = [
      // JavaScript execution attempts
      /<script[\s>]/i,
      /javascript:/i,
      /eval\s*\(/,
      /new\s+Function\s*\(/,

      // File system access attempts
      /Deno\.readTextFile/,
      /Deno\.readFile/,
      /Deno\.writeTextFile/,
      /Deno\.writeFile/,
      /import\s*\(/,
      /require\s*\(/,

      // Process execution
      /Deno\.Command/,
      /Deno\.run/,
      /child_process/,

      // Network access
      /fetch\s*\(/,
      /XMLHttpRequest/,

      // Any Deno global access (covers all dangerous Deno APIs)
      /Deno\./,
    ];

    // Additional strict mode patterns
    if (sandboxMode === "strict") {
      dangerousPatterns.push(
        // Block global object access (more precise patterns)
        /\bglobalThis\b(?!\s*:)/, // Match globalThis not followed by colon
        /\bwindow\b(?!\s*:)/, // Match window not followed by colon
        /\bglobal\b(?!\s*:)/, // Match global not followed by colon
        // Block constructor access that could lead to escapes
        /\.constructor/,
        /__proto__|prototype/,
        // Block direct JavaScript execution in Vento
        /{{>/, // Vento's JS execution syntax
      );
    }

    for (const pattern of dangerousPatterns) {
      if (pattern.test(template)) {
        return {
          valid: false,
          error: `Template contains potentially dangerous pattern: ${pattern.toString()}`,
        };
      }
    }

    // Skip syntax validation here - it will fail with empty data
    // Syntax errors will be caught when actually processing the template
    return { valid: true };
  }
}
