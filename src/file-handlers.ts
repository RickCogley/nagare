/**
 * @fileoverview Intelligent file handlers for automatic version updates
 * @module file-handlers
 *
 * @description
 * Provides built-in handlers for common project files (deno.json, package.json, etc.)
 * that automatically detect and update version strings using safe, tested patterns.
 * This module eliminates the need for custom update functions in most cases.
 *
 * @example Basic usage with auto-detection
 * ```typescript
 * const manager = new FileHandlerManager();
 * const handler = manager.getHandler("./deno.json");
 * if (handler) {
 *   const result = await manager.updateFile("./deno.json", "version", "1.2.3");
 * }
 * ```
 *
 * @example Creating custom handlers
 * ```typescript
 * const customHandler: FileHandler = {
 *   id: "my-config",
 *   name: "My Config Format",
 *   detector: (path) => path.endsWith(".myconfig"),
 *   patterns: {
 *     version: /^version=(.+)$/m
 *   }
 * };
 * manager.registerHandler(customHandler);
 * ```
 *
 * @since 1.1.0
 * @author Rick Cogley
 */

import type { TemplateData } from "../types.ts";

/**
 * File handler definition for intelligent file updates
 *
 * @interface FileHandler
 * @since 1.1.0
 *
 * @property {string} id - Unique identifier for this handler
 * @property {string} name - Human-readable name for logging and debugging
 * @property {function} detector - Function to determine if this handler applies to a file
 * @property {Record<string, RegExp>} patterns - Named patterns for finding values to update
 * @property {Record<string, function>} [validators] - Optional validators for patterns
 * @property {function} [replacer] - Optional custom replacement logic
 * @property {function} [validate] - Optional post-update validation
 *
 * @example
 * ```typescript
 * const jsonHandler: FileHandler = {
 *   id: "json",
 *   name: "JSON Configuration",
 *   detector: (path) => path.endsWith(".json"),
 *   patterns: {
 *     version: /^(\s*)"version":\s*"([^"]+)"/m
 *   },
 *   validate: (content) => {
 *     try {
 *       JSON.parse(content);
 *       return { valid: true };
 *     } catch (e) {
 *       return { valid: false, error: e.message };
 *     }
 *   }
 * };
 * ```
 */
export interface FileHandler {
  /** Unique identifier for this handler */
  id: string;

  /** Human-readable name */
  name: string;

  /** Function to detect if this handler applies to a file */
  detector: (filePath: string) => boolean;

  /** Built-in patterns for common fields */
  patterns: Record<string, RegExp>;

  /** Optional validators to ensure patterns work correctly */
  validators?: Record<string, (content: string) => boolean>;

  /** Optional custom replacement logic if patterns aren't sufficient */
  replacer?: (content: string, key: string, oldValue: string, newValue: string) => string;

  /** Optional post-update validation */
  validate?: (content: string) => { valid: boolean; error?: string };
}

/**
 * Result of a file update operation
 *
 * @interface FileUpdateResult
 * @since 1.1.0
 */
export interface FileUpdateResult {
  /** Whether the update succeeded */
  success: boolean;
  /** Updated file content if successful */
  content?: string;
  /** Error message if failed */
  error?: string;
  /** Warning messages */
  warnings?: string[];
}

/**
 * Preview of changes that would be made to a file
 *
 * @interface FileChangePreview
 * @since 1.1.0
 */
export interface FileChangePreview {
  /** List of matches found */
  matches: Array<{
    /** Line number (1-based) */
    line: number;
    /** Original line content */
    original: string;
    /** Updated line content */
    updated: string;
  }>;
  /** Error message if preview failed */
  error?: string;
}

/**
 * Built-in file handlers for common project files
 *
 * @constant
 * @type {Record<string, FileHandler>}
 * @since 1.1.0
 *
 * @description
 * Contains pre-configured handlers for:
 * - deno.json / deno.jsonc - Deno configuration files
 * - package.json - NPM package configuration
 * - Cargo.toml - Rust package configuration
 * - pyproject.toml / setup.py - Python package configuration
 * - README.md / *.md - Markdown documentation
 * - *.yaml / *.yml - YAML configuration files
 */
export const BUILT_IN_HANDLERS: Record<string, FileHandler> = {
  // ============================================
  // JSON Files (deno.json, package.json, etc.)
  // ============================================
  "deno.json": {
    id: "deno.json",
    name: "Deno Configuration",
    detector: (path: string): boolean => path.endsWith("deno.json") || path.endsWith("deno.jsonc"),
    patterns: {
      // Safe pattern that only matches top-level version field
      version: /^(\s*)"version":\s*"([^"]+)"/m,
    },
    replacer: (content: string, key: string, _oldValue: string, newValue: string): string => {
      if (key === "version") {
        // Use targeted replacement to preserve formatting
        const versionRegex = /^(\s*"version":\s*)"[^"]+"/m;
        return content.replace(versionRegex, `$1"${newValue}"`);
      }
      return content;
    },
    validate: (content: string): { valid: boolean; error?: string } => {
      try {
        // Remove comments for JSONC files (basic comment removal)
        const jsonContent = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, "");
        JSON.parse(jsonContent);
        return { valid: true };
      } catch (e) {
        return {
          valid: false,
          error: `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    },
  },

  "package.json": {
    id: "package.json",
    name: "NPM Package Configuration",
    detector: (path: string): boolean => path.endsWith("package.json"),
    patterns: {
      version: /^(\s*)"version":\s*"([^"]+)"/m,
    },
    replacer: (content: string, key: string, _oldValue: string, newValue: string): string => {
      if (key === "version") {
        return content.replace(/^(\s*"version":\s*)"[^"]+"/m, `$1"${newValue}"`);
      }
      return content;
    },
    validate: (content: string): { valid: boolean; error?: string } => {
      try {
        const pkg = JSON.parse(content);
        if (!pkg.version) {
          return { valid: false, error: "Missing version field" };
        }
        return { valid: true };
      } catch (e) {
        return {
          valid: false,
          error: `Invalid package.json: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    },
  },

  "jsr.json": {
    id: "jsr.json",
    name: "JSR Configuration",
    detector: (path: string): boolean => path.endsWith("jsr.json"),
    patterns: {
      // Safe pattern that only matches top-level version field
      version: /^(\s*)"version":\s*"([^"]+)"/m,
    },
    replacer: (content: string, key: string, _oldValue: string, newValue: string): string => {
      if (key === "version") {
        // Use targeted replacement to preserve formatting
        const versionRegex = /^(\s*"version":\s*)"[^"]+"/m;
        return content.replace(versionRegex, `$1"${newValue}"`);
      }
      return content;
    },
    validate: (content: string): { valid: boolean; error?: string } => {
      try {
        const config = JSON.parse(content);
        if (!config.version) {
          return { valid: false, error: "Missing version field" };
        }
        if (!config.name) {
          return { valid: false, error: "Missing name field (required for JSR)" };
        }
        return { valid: true };
      } catch (e) {
        return {
          valid: false,
          error: `Invalid jsr.json: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    },
  },

  // ============================================
  // TypeScript/JavaScript Files
  // ============================================
  "typescript-version": {
    id: "typescript-version",
    name: "TypeScript Version File",
    detector: (path: string): boolean =>
      (path.endsWith(".ts") || path.endsWith(".js")) &&
      (path.includes("version") || path.includes("constants")),
    patterns: {
      // Various common patterns
      constVersion: /export\s+const\s+VERSION\s*=\s*["']([^"']+)["']/,
      namedExport: /export\s*{\s*VERSION\s*}\s*;\s*const\s+VERSION\s*=\s*["']([^"']+)["']/,
      defaultExport: /export\s+default\s+["']([^"']+)["']/,
      moduleExports: /module\.exports\.version\s*=\s*["']([^"']+)["']/,
    },
    replacer: function (
      this: FileHandler,
      content: string,
      _key: string,
      _oldValue: string,
      newValue: string,
    ): string {
      // Try each pattern
      for (const pattern of Object.values(this.patterns)) {
        if (pattern.test(content)) {
          return content.replace(
            pattern,
            (match: string, _version: string) => match.replace(/["']([^"']+)["']/, `"${newValue}"`),
          );
        }
      }
      return content;
    },
  },

  // ============================================
  // Markdown Files (README.md)
  // ============================================
  "markdown": {
    id: "markdown",
    name: "Markdown Documentation",
    detector: (path: string): boolean => path.endsWith(".md") || path.endsWith(".markdown"),
    patterns: {
      // Version badges
      shieldsBadge: /shields\.io\/badge\/version-([^-]+)-/g,
      imgShieldsBadge: /img\.shields\.io\/badge\/v(?:ersion)?-([^-]+)-/g,
      npmBadge: /npm\/v\/([^/\s)]+)/g,

      // Direct version references
      versionHeader: /^#+\s*(?:Version|Release|v\.?)\s*(\d+\.\d+\.\d+[^\s]*)/gm,

      // Installation instructions
      npmInstall: /npm\s+install\s+([^@\s]+)@(\d+\.\d+\.\d+[^\s]*)/g,
      yarnAdd: /yarn\s+add\s+([^@\s]+)@(\d+\.\d+\.\d+[^\s]*)/g,
      denoAdd: /deno\s+add\s+([^@\s]+)@(\d+\.\d+\.\d+[^\s]*)/g,
    },
    replacer: (_content: string, _key: string, _oldValue: string, newValue: string): string => {
      let result = _content;

      // Replace all version references
      result = result.replace(
        /shields\.io\/badge\/version-([^-]+)-/g,
        `shields.io/badge/version-${newValue}-`,
      );

      result = result.replace(
        /img\.shields\.io\/badge\/v(?:ersion)?-([^-]+)-/g,
        `img.shields.io/badge/version-${newValue}-`,
      );

      // Update version headers
      result = result.replace(
        /^(#+\s*(?:Version|Release|v\.?)\s*)(\d+\.\d+\.\d+[^\s]*)/gm,
        `$1${newValue}`,
      );

      // Update installation commands
      result = result.replace(/(npm\s+install\s+[^@\s]+@)(\d+\.\d+\.\d+[^\s]*)/g, `$1${newValue}`);

      result = result.replace(/(yarn\s+add\s+[^@\s]+@)(\d+\.\d+\.\d+[^\s]*)/g, `$1${newValue}`);

      result = result.replace(/(deno\s+add\s+[^@\s]+@)(\d+\.\d+\.\d+[^\s]*)/g, `$1${newValue}`);

      return result;
    },
  },

  // ============================================
  // YAML Files
  // ============================================
  "yaml": {
    id: "yaml",
    name: "YAML Configuration",
    detector: (path: string): boolean => path.endsWith(".yaml") || path.endsWith(".yml"),
    patterns: {
      version: /^(\s*version:\s*)(['"]?)([^'"\n]+)(['"]?)$/m,
      appVersion: /^(\s*appVersion:\s*)(['"]?)([^'"\n]+)(['"]?)$/m,
    },
    replacer: (content: string, key: string, _oldValue: string, newValue: string): string => {
      const patterns = BUILT_IN_HANDLERS.yaml.patterns;
      const pattern = patterns[key as keyof typeof patterns];

      if (pattern) {
        return content.replace(pattern, `$1$2${newValue}$4`);
      }
      return content;
    },
  },

  // ============================================
  // Rust Files (Cargo.toml)
  // ============================================
  "cargo.toml": {
    id: "cargo.toml",
    name: "Rust Cargo Configuration",
    detector: (path: string): boolean =>
      path.toLowerCase() === "cargo.toml" || path.endsWith("/cargo.toml"),
    patterns: {
      version: /^(\s*version\s*=\s*)"([^"]+)"/m,
    },
    replacer: (content: string, key: string, _oldValue: string, newValue: string): string => {
      if (key === "version") {
        return content.replace(/^(\s*version\s*=\s*)"[^"]+"/m, `$1"${newValue}"`);
      }
      return content;
    },
  },

  // ============================================
  // Python Files (pyproject.toml, setup.py)
  // ============================================
  "pyproject.toml": {
    id: "pyproject.toml",
    name: "Python Project Configuration",
    detector: (path: string): boolean => path.endsWith("pyproject.toml"),
    patterns: {
      version: /^(\s*version\s*=\s*)"([^"]+)"/m,
    },
    replacer: (content: string, key: string, _oldValue: string, newValue: string): string => {
      if (key === "version") {
        return content.replace(/^(\s*version\s*=\s*)"[^"]+"/m, `$1"${newValue}"`);
      }
      return content;
    },
  },

  "setup.py": {
    id: "setup.py",
    name: "Python Setup Script",
    detector: (path: string): boolean => path.endsWith("setup.py"),
    patterns: {
      version: /(\s*version\s*=\s*)["']([^"']+)["']/,
    },
    replacer: (content: string, key: string, _oldValue: string, newValue: string): string => {
      if (key === "version") {
        return content.replace(/(\s*version\s*=\s*)["'][^"']+["']/, `$1"${newValue}"`);
      }
      return content;
    },
  },
};

/**
 * File handler manager for intelligent file updates
 *
 * @class FileHandlerManager
 * @since 1.1.0
 *
 * @description
 * Manages built-in and custom file handlers, providing automatic detection
 * and updating of version strings in project files.
 *
 * @example Basic usage
 * ```typescript
 * const manager = new FileHandlerManager();
 *
 * // Check if a file has a handler
 * const handler = manager.getHandler("./deno.json");
 * if (handler) {
 *   console.log(`Found handler: ${handler.name}`);
 * }
 *
 * // Update a file
 * const result = await manager.updateFile("./deno.json", "version", "1.2.3");
 * if (result.success) {
 *   console.log("File updated successfully");
 * }
 * ```
 *
 * @example Register custom handler
 * ```typescript
 * const customHandler: FileHandler = {
 *   id: "custom-config",
 *   name: "Custom Config",
 *   detector: (path) => path.endsWith(".custom"),
 *   patterns: { version: /version=(.+)/ }
 * };
 *
 * manager.registerHandler(customHandler);
 * ```
 */
export class FileHandlerManager {
  /** Map of registered handlers by ID */
  private handlers: Map<string, FileHandler>;

  /**
   * Create a new FileHandlerManager instance
   *
   * @constructor
   * @description Initializes with all built-in handlers
   */
  constructor() {
    this.handlers = new Map(Object.entries(BUILT_IN_HANDLERS));
  }

  /**
   * Get handler for a specific file path
   *
   * @param {string} filePath - Path to the file
   * @returns {FileHandler | undefined} Matching handler or undefined
   *
   * @example
   * ```typescript
   * const handler = manager.getHandler("./package.json");
   * if (handler) {
   *   console.log(`Handler: ${handler.name}`);
   * }
   * ```
   */
  getHandler(filePath: string): FileHandler | undefined {
    // Check for exact path match first (e.g., "deno.json")
    for (const handler of this.handlers.values()) {
      if (handler.detector(filePath)) {
        return handler;
      }
    }
    return undefined;
  }

  /**
   * Register a custom handler
   *
   * @param {FileHandler} handler - Handler to register
   * @throws {Error} If handler with same ID already exists
   *
   * @example
   * ```typescript
   * manager.registerHandler({
   *   id: "my-format",
   *   name: "My Format",
   *   detector: (path) => path.endsWith(".myformat"),
   *   patterns: { version: /version: (.+)/ }
   * });
   * ```
   */
  registerHandler(handler: FileHandler): void {
    if (this.handlers.has(handler.id)) {
      throw new Error(`Handler with ID "${handler.id}" already exists`);
    }
    this.handlers.set(handler.id, handler);
  }

  /**
   * Update a file using the appropriate handler
   *
   * @param {string} filePath - Path to the file to update
   * @param {string} key - Key to update (e.g., "version")
   * @param {string} newValue - New value to set
   * @param {function} [customUpdateFn] - Optional custom update function
   * @returns {Promise<FileUpdateResult>} Result of the update operation
   *
   * @example
   * ```typescript
   * const result = await manager.updateFile(
   *   "./package.json",
   *   "version",
   *   "2.0.0"
   * );
   *
   * if (result.success) {
   *   await Deno.writeTextFile("./package.json", result.content!);
   * } else {
   *   console.error(result.error);
   * }
   * ```
   */
  async updateFile(
    filePath: string,
    key: string,
    newValue: string,
    customUpdateFn?: (content: string, data: TemplateData) => string,
  ): Promise<FileUpdateResult> {
    // If custom update function provided, use it
    if (customUpdateFn) {
      try {
        const content = await Deno.readTextFile(filePath);
        const updated = customUpdateFn(content, { version: newValue } as TemplateData);
        return { success: true, content: updated };
      } catch (error) {
        return {
          success: false,
          error: `Custom update function failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }
    }

    // Find appropriate handler
    const handler = this.getHandler(filePath);
    if (!handler) {
      return {
        success: false,
        error: `No handler found for file type: ${filePath}`,
      };
    }

    try {
      const content = await Deno.readTextFile(filePath);

      // Check if pattern exists
      const pattern = handler.patterns[key];
      if (!pattern) {
        return {
          success: false,
          error: `No pattern defined for key "${key}" in handler "${handler.id}"`,
        };
      }

      // Find current value
      const match = content.match(pattern);
      if (!match) {
        return {
          success: false,
          error: `Pattern for "${key}" found no matches in ${filePath}`,
        };
      }

      const oldValue = match[match.length === 3 ? 2 : 1] || match[1];
      let updated: string;

      // Use custom replacer if available
      if (handler.replacer) {
        updated = handler.replacer(content, key, oldValue, newValue);
      } else {
        // Generic replacement
        updated = content.replace(pattern, (fullMatch: string) => {
          return fullMatch.replace(oldValue, newValue);
        });
      }

      // Validate if handler has validator
      if (handler.validate) {
        const validation = handler.validate(updated);
        if (!validation.valid) {
          return {
            success: false,
            error: `Validation failed after update: ${validation.error}`,
          };
        }
      }

      return { success: true, content: updated };
    } catch (error) {
      return {
        success: false,
        error: `Failed to update file: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Preview what would change in a file
   *
   * @param {string} filePath - Path to the file
   * @param {string} key - Key to update
   * @param {string} newValue - New value to preview
   * @returns {Promise<FileChangePreview>} Preview of changes
   *
   * @example
   * ```typescript
   * const preview = await manager.previewChanges(
   *   "./README.md",
   *   "version",
   *   "2.0.0"
   * );
   *
   * for (const match of preview.matches) {
   *   console.log(`Line ${match.line}: ${match.original} → ${match.updated}`);
   * }
   * ```
   */
  async previewChanges(
    filePath: string,
    key: string,
    newValue: string,
  ): Promise<FileChangePreview> {
    const handler = this.getHandler(filePath);
    if (!handler) {
      return { matches: [], error: `No handler found for ${filePath}` };
    }

    try {
      const content = await Deno.readTextFile(filePath);
      const lines = content.split("\n");
      const pattern = handler.patterns[key];

      if (!pattern) {
        return { matches: [], error: `No pattern for key "${key}"` };
      }

      const matches: Array<{ line: number; original: string; updated: string }> = [];

      lines.forEach((line, index) => {
        if (pattern.test(line)) {
          const updated = handler.replacer
            ? handler.replacer(line, key, "", newValue)
            : line.replace(pattern, (match: string, ...groups: string[]) => {
              // Try to intelligently replace the version part
              if (groups.length >= 2) {
                return match.replace(groups[1], newValue);
              }
              return match.replace(/\d+\.\d+\.\d+[^\s"']*/, newValue);
            });

          matches.push({
            line: index + 1,
            original: line.trim(),
            updated: updated.trim(),
          });
        }
      });

      return { matches };
    } catch (error) {
      return {
        matches: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get all registered handler IDs
   *
   * @returns {string[]} Array of handler IDs
   *
   * @example
   * ```typescript
   * const handlers = manager.getAllHandlerIds();
   * console.log("Available handlers:", handlers.join(", "));
   * ```
   */
  getAllHandlerIds(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Check if a handler exists for a file
   *
   * @param {string} filePath - Path to check
   * @returns {boolean} True if a handler exists
   *
   * @example
   * ```typescript
   * if (manager.hasHandler("./package.json")) {
   *   console.log("Package.json can be handled automatically");
   * }
   * ```
   */
  hasHandler(filePath: string): boolean {
    return this.getHandler(filePath) !== undefined;
  }
}

/**
 * Pattern builder for creating safe version patterns
 *
 * @class PatternBuilder
 * @since 1.1.0
 *
 * @description
 * Provides factory methods for creating common, safe regex patterns
 * for version matching in various file formats.
 *
 * @example
 * ```typescript
 * // Safe JSON pattern with line anchoring
 * const jsonPattern = PatternBuilder.jsonVersion(true);
 *
 * // YAML pattern that handles quotes
 * const yamlPattern = PatternBuilder.yamlVersion('both');
 *
 * // TypeScript const pattern
 * const tsPattern = PatternBuilder.tsConst('VERSION', true);
 * ```
 */
export class PatternBuilder {
  /**
   * Build a safe JSON version pattern
   *
   * @param {boolean} [indentAware=true] - Whether to anchor at line start
   * @returns {RegExp} Safe regex pattern for JSON version fields
   *
   * @example
   * ```typescript
   * // Safe pattern that won't match nested objects
   * const pattern = PatternBuilder.jsonVersion(true);
   * // Returns: /^(\s*)"version":\s*"([^"]+)"/m
   * ```
   */
  static jsonVersion(indentAware = true): RegExp {
    if (indentAware) {
      // Matches at start of line with optional indentation
      return /^(\s*)"version":\s*"([^"]+)"/m;
    }
    // Matches anywhere (less safe)
    return /"version":\s*"([^"]+)"/;
  }

  /**
   * Build a safe YAML version pattern
   *
   * @param {'single' | 'double' | 'both' | 'none'} [quoted='both'] - Quote style to match
   * @returns {RegExp} Safe regex pattern for YAML version fields
   *
   * @example
   * ```typescript
   * // Matches version with any quote style
   * const pattern = PatternBuilder.yamlVersion('both');
   * // Returns: /^(\s*version:\s*)(['"]?)([^'"\n]+)(['"]?)$/m
   * ```
   */
  static yamlVersion(quoted: "single" | "double" | "both" | "none" = "both"): RegExp {
    switch (quoted) {
      case "single":
        return /^(\s*version:\s*)'([^']+)'$/m;
      case "double":
        return /^(\s*version:\s*)"([^"]+)"$/m;
      case "none":
        return /^(\s*version:\s*)([^\s]+)$/m;
      case "both":
      default:
        return /^(\s*version:\s*)(['"]?)([^'"\n]+)(['"]?)$/m;
    }
  }

  /**
   * Build a TypeScript const pattern
   *
   * @param {string} name - Name of the constant
   * @param {boolean} [exported=true] - Whether the const is exported
   * @returns {RegExp} Pattern for TypeScript const declaration
   *
   * @example
   * ```typescript
   * // Matches: export const VERSION = "1.2.3"
   * const pattern = PatternBuilder.tsConst('VERSION', true);
   * ```
   */
  static tsConst(name: string, exported = true): RegExp {
    const exportPart = exported ? "export\\s+" : "";
    return new RegExp(`${exportPart}const\\s+${name}\\s*=\\s*["']([^"']+)["']`);
  }

  /**
   * Build a generic version badge pattern
   *
   * @param {'shields.io' | 'img.shields.io' | 'any'} [badgeService='any'] - Badge service to match
   * @returns {RegExp} Pattern for version badges in markdown
   *
   * @example
   * ```typescript
   * // Matches shields.io version badges
   * const pattern = PatternBuilder.versionBadge('shields.io');
   * // Returns: /shields\.io\/badge\/version-([^-]+)-/g
   * ```
   */
  static versionBadge(badgeService: "shields.io" | "img.shields.io" | "any" = "any"): RegExp {
    if (badgeService === "shields.io") {
      return /shields\.io\/badge\/version-([^-]+)-/g;
    }
    if (badgeService === "img.shields.io") {
      return /img\.shields\.io\/badge\/v(?:ersion)?-([^-]+)-/g;
    }
    // Match any common badge pattern
    return /badge\/v(?:ersion)?[\-\/]([^\-\/\s]+)[\-\/]/g;
  }
}
