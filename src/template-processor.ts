/**
 * @fileoverview Template processing and file generation for version files
 */

import type { NagareConfig, TemplateData } from "../types.ts";
import { BUILT_IN_TEMPLATES, TemplateFormat } from "../config.ts";

/**
 * TemplateProcessor - Template processing and file generation
 */
export class TemplateProcessor {
  private config: NagareConfig;

  constructor(config: NagareConfig) {
    this.config = config;
  }

  /**
   * Process a template string with data
   */
  processTemplate(template: string, data: TemplateData): string {
    let result = template;

    // Simple template replacement (basic mustache-like syntax)
    // Replace {{key}} with values from data
    result = result.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const value = this.getNestedValue(data, key.trim());
      if (value === undefined || value === null) {
        return match; // Keep placeholder if no value found
      }

      // Handle objects by JSON stringifying them
      if (typeof value === "object") {
        return JSON.stringify(value, null, 2);
      }

      return String(value);
    });

    // Handle conditional blocks {{#if key}}...{{/if}}
    result = result.replace(
      /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_match, key, content) => {
        const value = this.getNestedValue(data, key.trim());
        return value ? content : "";
      },
    );

    return result;
  }

  /**
   * Generate version file content using built-in templates
   */
  generateVersionFile(data: TemplateData): string {
    const templateFormat = this.config.versionFile.template;

    if (templateFormat === TemplateFormat.CUSTOM) {
      throw new Error("Custom template should use processTemplate() method instead");
    }

    const template = BUILT_IN_TEMPLATES[templateFormat];

    if (!template) {
      throw new Error(`Unknown template format: ${templateFormat}`);
    }

    return this.processTemplate(template, data);
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: unknown, path: string): unknown {
    const keys = path.split(".");
    let current: unknown = obj;

    for (const key of keys) {
      if (current && typeof current === "object" && current !== null) {
        current = (current as Record<string, unknown>)[key];
      } else {
        return undefined;
      }
    }

    return current;
  }
}
