// ==================================================================
// types.ts - TypeScript Interfaces and Types
// ==================================================================

/**
 * @module Types
 * @fileoverview TypeScript interfaces and types for Nagare
 * @description Comprehensive type definitions for configuration, commits, and release management.
 * Compatible with all JavaScript runtimes for type checking and IntelliSense.
 * Enhanced with Vento template engine integration support.
 */

/**
 * Supported template formats for version file generation
 *
 * @description Template formats supported by Nagare's built-in templates.
 * All built-in templates now use Vento syntax for robust processing.
 *
 * @example
 * ```typescript
 * const config: VersionFile = {
 *   path: "./version.ts",
 *   template: TemplateFormat.TYPESCRIPT
 * };
 * ```
 */
export enum TemplateFormat {
  /** TypeScript version file with const exports and type definitions */
  TYPESCRIPT = "typescript",
  /** JSON format suitable for package.json-style version tracking */
  JSON = "json",
  /** YAML format for configuration-style version tracking */
  YAML = "yaml",
  /** Custom template string using Vento syntax */
  CUSTOM = "custom",
}

/**
 * Bump types for version increments
 */
export enum BumpType {
  MAJOR = "major",
  MINOR = "minor",
  PATCH = "patch",
}

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Result type for type-safe error handling
 *
 * @description A discriminated union type that represents either success with data
 * or failure with an error. Used throughout the codebase for consistent error handling.
 *
 * @example
 * ```typescript
 * function parseVersion(input: string): Result<string, Error> {
 *   if (!input) {
 *     return { success: false, error: new Error("Input is empty") };
 *   }
 *   return { success: true, data: input.trim() };
 * }
 *
 * const result = parseVersion("1.2.3");
 * if (result.success) {
 *   console.log(result.data); // Type-safe access to data
 * } else {
 *   console.error(result.error); // Type-safe access to error
 * }
 * ```
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Async Result type for async operations
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Main configuration interface for Nagare
 */
export interface NagareConfig {
  /** Project metadata */
  project: {
    /** Project name */
    name: string;
    /** Project description */
    description?: string;
    /** Repository URL */
    repository: string;
    /** Project homepage */
    homepage?: string;
    /** License */
    license?: string;
    /** Author information */
    author?: string;
  };

  /** Version file configuration */
  versionFile: VersionFile;

  /** Release notes configuration */
  releaseNotes?: ReleaseNotesConfig;

  /** GitHub integration settings */
  github?: GitHubConfig;

  /** Files to update during release */
  updateFiles?: FileUpdatePattern[];

  /** Custom commit type mappings */
  commitTypes?: CommitTypeMapping;

  /** Template configuration */
  templates?: TemplateConfig;

  /** Documentation generation */
  docs?: DocsConfig;

  /** Advanced options */
  options?: ReleaseOptions;

  /**
   * Security configuration
   *
   * @description
   * Security settings for template processing and file operations.
   * Controls sandboxing levels and validation strictness.
   *
   * @example
   * ```typescript
   * security: {
   *   templateSandbox: "strict",
   *   validateFilePaths: true,
   *   auditLog: true
   * }
   * ```
   *
   * @since 1.6.0
   */
  security?: SecurityConfig;

  /**
   * Release workflow configuration
   *
   * @description
   * Advanced release workflow settings including JSR verification,
   * auto-fix capabilities, and progress visualization.
   *
   * @example
   * ```typescript
   * release: {
   *   verifyJsrPublish: true,
   *   autoFix: {
   *     basic: true,
   *     ai: {
   *       enabled: true,
   *       provider: "claude-code"
   *     }
   *   }
   * }
   * ```
   *
   * @since 3.0.0
   */
  release?: ReleaseConfig;

  /**
   * Lifecycle hooks for custom operations
   *
   * @description
   * Hooks allow running custom functions at specific points in the release process.
   * Useful for tasks like formatting, validation, or custom notifications.
   *
   * @example
   * ```typescript
   * hooks: {
   *   preRelease: [
   *     async () => {
   *       // Run tests before release
   *       const result = await runTests();
   *       if (!result.success) throw new Error("Tests failed");
   *     }
   *   ],
   *   postRelease: [
   *     async () => {
   *       // Format generated files
   *       await formatGeneratedFiles();
   *       // Send notification
   *       await notifyTeam();
   *     }
   *   ]
   * }
   * ```
   *
   * @since 1.1.0
   */
  hooks?: {
    /** Functions to run before release */
    preRelease?: Array<() => Promise<void>>;
    /** Functions to run after release */
    postRelease?: Array<() => Promise<void>>;
  };

  /**
   * Locale for messages (e.g., "en", "ja")
   *
   * @description
   * Set the language for all CLI output, error messages, and prompts.
   * If not specified, auto-detects from NAGARE_LOCALE or system locale.
   *
   * @example
   * ```typescript
   * locale: "ja"  // Use Japanese translations
   * locale: "en"  // Use English (default)
   * ```
   *
   * @default Auto-detected from environment
   * @since 2.1.0
   */
  locale?: string;
}

/**
 * Additional export configuration for version files
 *
 * @description Define additional constants, classes, functions, or types to be included
 * in generated version files. Supports various export types with TypeScript compatibility.
 *
 * @example
 * ```typescript
 * const additionalExport: AdditionalExport = {
 *   name: "CONFIG",
 *   type: "const",
 *   value: { apiUrl: "https://api.example.com", timeout: 5000 },
 *   description: "Application configuration",
 *   asConst: true
 * };
 * ```
 */
export interface AdditionalExport {
  /** Export name (must be a valid JavaScript identifier) */
  name: string;

  /** Export type */
  type: "const" | "let" | "var" | "class" | "function" | "interface" | "type" | "enum";

  /**
   * The content of the export (for class, function, interface, type, enum)
   *
   * @description For complex types like classes and functions, provide the body content.
   * The export declaration will be automatically generated based on the type.
   *
   * @example
   * ```typescript
   * // For a class:
   * content: `
   *   static getVersion(): string {
   *     return VERSION;
   *   }
   * `
   *
   * // For a function:
   * content: `(): string {
   *   return \`v\${VERSION}\`;
   * }`
   * ```
   */
  content?: string;

  /**
   * The value of the export (for const, let, var)
   *
   * @description For simple value exports, provide the JavaScript value.
   * Objects and arrays will be JSON stringified automatically.
   *
   * @example
   * ```typescript
   * value: { features: ["auth", "api"], version: 2 }
   * // Results in: export const NAME = { features: ["auth", "api"], version: 2 };
   * ```
   */
  value?: unknown;

  /** Optional JSDoc comment description */
  description?: string;

  /** Whether to add "as const" assertion (for TypeScript const exports) */
  asConst?: boolean;

  /** Whether this export is async (for functions) */
  async?: boolean;

  /** Whether this export is default */
  isDefault?: boolean;
}

/**
 * Version file configuration for template-based version file generation
 *
 * @description Defines how version files are generated using either built-in
 * templates (TypeScript, JSON, YAML) or custom Vento templates.
 *
 * @example Built-in template:
 * ```typescript
 * const versionFile: VersionFile = {
 *   path: "./version.ts",
 *   template: TemplateFormat.TYPESCRIPT
 * };
 * ```
 *
 * @example Custom Vento template:
 * ```typescript
 * const versionFile: VersionFile = {
 *   path: "./version.js",
 *   template: TemplateFormat.CUSTOM,
 *   customTemplate: `export const VERSION = "{{ version }}";`
 * };
 * ```
 */
export interface VersionFile {
  /** Path to the version file relative to project root */
  path: string;

  /** Template format (typescript, json, yaml, custom) */
  template: TemplateFormat;

  /**
   * Custom template string using Vento syntax (required if template is 'custom')
   *
   * @description When using TemplateFormat.CUSTOM, provide a Vento template string.
   * Template has access to all TemplateData properties and custom filters.
   *
   * @example
   * ```typescript
   * customTemplate: `
   *   export const VERSION = "{{ version }}";
   *   export const BUILD_INFO = {{ buildInfo | jsonStringify }};
   * `
   * ```
   */
  customTemplate?: string;

  /**
   * Legacy patterns for extracting/updating version info
   *
   * @deprecated Use template-based generation instead of pattern-based updates.
   * Patterns are only used for backwards compatibility with non-template workflows.
   */
  patterns?: {
    version?: RegExp;
    buildDate?: RegExp;
    gitCommit?: RegExp;
    [key: string]: RegExp | undefined;
  };

  /**
   * Additional exports to include in the generated version file
   *
   * @description Define additional constants, classes, functions, or types to be included
   * in the generated version file. This allows extending the built-in templates with
   * project-specific exports without writing a full custom template.
   *
   * @example
   * ```typescript
   * additionalExports: [
   *   {
   *     name: "API_ENDPOINTS",
   *     type: "const",
   *     value: { users: "/api/users", data: "/api/data" },
   *     description: "Available API endpoints"
   *   },
   *   {
   *     name: "VersionUtils",
   *     type: "class",
   *     content: `
   *       static getFullVersion(): string {
   *         return \`\${VERSION} (\${BUILD_INFO.gitCommit})\`;
   *       }
   *     `
   *   }
   * ]
   * ```
   */
  additionalExports?: AdditionalExport[];

  /**
   * Extend the template with additional content
   *
   * @description Advanced option to prepend or append raw content to the generated file.
   * Useful for adding imports, comments, or complex code that doesn't fit the
   * additionalExports structure.
   *
   * @example
   * ```typescript
   * extend: {
   *   prepend: "// This file is auto-generated, do not edit manually\n",
   *   append: "\n// End of generated content"
   * }
   * ```
   */
  extend?: {
    /** Content to add at the beginning of the file */
    prepend?: string;
    /** Content to add at the end of the file */
    append?: string;
  };
}

/**
 * Release notes configuration for template data and formatting
 *
 * @description Controls how release notes are generated and included in templates.
 * Release notes follow Keep a Changelog format with conventional commit categorization.
 *
 * @example
 * ```typescript
 * const releaseNotes: ReleaseNotesConfig = {
 *   template: `{
 *     version: "{{ version }}",
 *     changes: {{ releaseNotes | jsonStringify }}
 *   }`,
 *   metadata: {
 *     cryptoFeatures: ["AES-GCM", "PBKDF2"],
 *     endpoints: ["/api/encrypt", "/api/decrypt"]
 *   },
 *   includeCommitHashes: true,
 *   maxDescriptionLength: 100
 * };
 * ```
 */
export interface ReleaseNotesConfig {
  /**
   * Custom Vento template for release notes section in version files
   *
   * @description Template for embedding release notes in generated version files.
   * Has access to all TemplateData properties and Vento filters.
   * If not provided, uses default release notes formatting.
   */
  template?: string;

  /**
   * App-specific metadata to include in template data
   *
   * @description Static metadata that gets included in template processing.
   * Useful for including app-specific information like API endpoints,
   * feature lists, or configuration details.
   *
   * @example
   * ```typescript
   * metadata: {
   *   endpoints: ["/api/users", "/api/data"],
   *   features: ["authentication", "encryption"],
   *   supportedFormats: ["json", "xml"]
   * }
   * ```
   */
  metadata?: Record<string, unknown>;

  /** Include git commit hashes in changelog entries (default: true) */
  includeCommitHashes?: boolean;

  /** Maximum description length for commit messages (default: 100) */
  maxDescriptionLength?: number;
}

/**
 * GitHub integration configuration
 */
export interface GitHubConfig {
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** Release template format */
  releaseTemplate?: string;
  /** Create GitHub release */
  createRelease?: boolean;
  /** GitHub token (from environment) */
  tokenEnvVar?: string;
}

/**
 * File update pattern for additional files to update during release
 *
 * @description Defines how additional files are updated during the release process.
 * Can use either regex patterns for find/replace or a custom update function.
 *
 * @example Using patterns:
 * ```typescript
 * {
 *   path: "./package.json",
 *   patterns: {
 *     version: /^(\s*)"version":\s*"([^"]+)"/m
 *   }
 * }
 * ```
 *
 * @example Using custom update function:
 * ```typescript
 * {
 *   path: "./README.md",
 *   updateFn: (content, data) => {
 *     return content.replace(/Version: \d+\.\d+\.\d+/, `Version: ${data.version}`);
 *   }
 * }
 * ```
 */
export interface FileUpdatePattern {
  /** File path relative to project root */
  path: string;

  /**
   * Patterns to find and replace
   * Required if updateFn is not provided
   */
  patterns?: {
    [key: string]: RegExp;
  };

  /**
   * Optional custom update function
   * If provided, overrides patterns
   */
  updateFn?: (content: string, data: TemplateData) => string;
}

/**
 * Template configuration for custom template processing
 *
 * @description Configuration for advanced template features including
 * custom template directories and dynamic data providers.
 *
 * @example
 * ```typescript
 * const templates: TemplateConfig = {
 *   templatesDir: "./templates",
 *   dataProviders: {
 *     buildMetrics: async () => ({
 *       size: await getBundleSize(),
 *       tests: await getTestCount()
 *     }),
 *     gitStats: async () => ({
 *       contributors: await getContributorCount(),
 *       commits: await getTotalCommits()
 *     })
 *   }
 * };
 * ```
 */
export interface TemplateConfig {
  /**
   * Custom templates directory for external template files
   *
   * @description Directory containing external Vento template files.
   * Templates can be referenced by filename without extension.
   */
  templatesDir?: string;

  /**
   * Template data providers for dynamic data injection
   *
   * @description Functions that provide additional data for template processing.
   * Called during template data preparation and merged into template context.
   * Useful for including build metrics, git statistics, or other computed data.
   *
   * @example
   * ```typescript
   * dataProviders: {
   *   buildInfo: async () => ({
   *     bundleSize: await calculateBundleSize(),
   *     testCoverage: await getTestCoverage()
   *   })
   * }
   * ```
   */
  dataProviders?: Record<string, () => Promise<unknown>>;
}

/**
 * Documentation generation configuration
 */
export interface DocsConfig {
  /** Enable documentation generation */
  enabled: boolean;
  /** Output directory for docs */
  outputDir?: string;
  /** Include private API in docs */
  includePrivate?: boolean;
  /** Custom deno doc options */
  denoDocOptions?: string[];
}

/**
 * Security configuration for Nagare
 *
 * @description Controls security features for template processing,
 * file operations, and audit logging.
 *
 * @since 1.6.0
 */
export interface SecurityConfig {
  /**
   * Template sandboxing level
   *
   * @description Controls the strictness of template execution environment:
   * - "strict": Blocks all potentially dangerous operations (default)
   * - "moderate": Allows some safe operations but still restricted
   * - "disabled": No sandboxing (use only with trusted templates)
   *
   * @default "strict"
   */
  templateSandbox?: "strict" | "moderate" | "disabled";

  /**
   * Enable file path validation
   *
   * @description When enabled, validates all file paths to prevent
   * directory traversal attacks and access outside project root.
   *
   * @default true
   */
  validateFilePaths?: boolean;

  /**
   * Enable security audit logging
   *
   * @description When enabled, logs security-relevant events
   * for audit trails and debugging.
   *
   * @default false
   */
  auditLog?: boolean;

  /**
   * Allowed template functions
   *
   * @description In moderate sandbox mode, specify which global
   * functions are allowed in templates.
   *
   * @example ["Date", "Math", "JSON"]
   */
  allowedFunctions?: string[];

  /**
   * Maximum template size in bytes
   *
   * @description Prevents DoS attacks from extremely large templates.
   *
   * @default 1048576 (1MB)
   */
  maxTemplateSize?: number;
}

/**
 * Release options
 */
export interface ReleaseOptions {
  /** Dry run mode */
  dryRun?: boolean;
  /** Skip confirmation prompts */
  skipConfirmation?: boolean;
  /** Git remote name */
  gitRemote?: string;
  /** Custom git tag prefix */
  tagPrefix?: string;
  /** Log level */
  logLevel?: LogLevel;
}

/**
 * Nagare runtime options
 *
 * @description Options that can be passed to Nagare at runtime,
 * typically through CLI arguments or programmatic API calls.
 *
 * @example
 * ```typescript
 * const options: NagareOptions = {
 *   language: "ja",
 *   logLevel: LogLevel.DEBUG
 * };
 * ```
 */
export interface NagareOptions extends ReleaseOptions {
  /**
   * Language for CLI output and messages
   *
   * @description Sets the language for all user-facing text including
   * prompts, error messages, and status updates. Overrides the locale
   * setting in configuration.
   *
   * @example
   * ```typescript
   * language: "en"  // English
   * language: "ja"  // Japanese
   * ```
   *
   * @default Inherited from config locale or system
   */
  language?: "en" | "ja";
}

/**
 * Release workflow configuration
 *
 * @description Advanced settings for release workflow automation including
 * JSR verification, auto-fixing, and progress visualization.
 *
 * @since 3.0.0
 */
export interface ReleaseConfig {
  /**
   * JSR publish verification settings
   *
   * @description Enable verification that packages are successfully published to JSR.
   * Can be a boolean for simple enable/disable or an object for detailed configuration.
   *
   * @example
   * ```typescript
   * verifyJsrPublish: true
   * // or
   * verifyJsrPublish: {
   *   enabled: true,
   *   maxAttempts: 30,
   *   pollInterval: 10000,
   *   timeout: 600000
   * }
   * ```
   */
  verifyJsrPublish?: boolean | JsrVerificationConfig;

  /**
   * Auto-fix configuration for CI/CD errors
   *
   * @description Configure automatic fixing of common CI/CD errors.
   * Includes both deterministic fixes and optional AI-powered solutions.
   *
   * @example
   * ```typescript
   * autoFix: {
   *   basic: true,
   *   ai: {
   *     enabled: true,
   *     provider: "claude-code",
   *     maxAttempts: 3
   *   },
   *   types: ["lint", "format", "version-conflict"]
   * }
   * ```
   */
  autoFix?: AutoFixConfig;

  /**
   * Progress visualization settings
   *
   * @description Configure how progress is displayed during release operations.
   *
   * @example
   * ```typescript
   * progress: {
   *   enabled: true,
   *   style: "detailed",
   *   showElapsedTime: true
   * }
   * ```
   */
  progress?: ProgressConfig;

  /**
   * GitHub Actions monitoring settings
   *
   * @description Configure monitoring of GitHub Actions workflows.
   *
   * @example
   * ```typescript
   * monitoring: {
   *   workflowFile: ".github/workflows/publish.yml",
   *   pollInterval: 10000,
   *   timeout: 600000
   * }
   * ```
   */
  monitoring?: MonitoringConfig;

  /**
   * Pre-flight checks configuration
   *
   * @description Configure validation checks to run before creating releases.
   * Helps prevent CI/CD failures by catching issues early.
   *
   * @example
   * ```typescript
   * preflightChecks: {
   *   runTests: true,
   *   custom: [
   *     {
   *       name: "Security Scan",
   *       command: ["deno", "task", "security"],
   *       fixable: false
   *     }
   *   ]
   * }
   * ```
   *
   * @since 2.8.0
   */
  preflightChecks?: PreflightChecksConfig;

  /**
   * Quality gates configuration
   *
   * @description Configure quality standards that must be met for releases.
   * Enforces TypeScript strictness, type coverage, performance, and security.
   *
   * @example
   * ```typescript
   * qualityGates: {
   *   enabled: true,
   *   typeChecking: {
   *     strict: true,
   *     noAny: true
   *   },
   *   typeCoverage: {
   *     enabled: true,
   *     threshold: 95
   *   }
   * }
   * ```
   *
   * @since 2.18.0
   */
  qualityGates?: QualityGatesConfig;

  /**
   * Event-driven architecture configuration
   *
   * @description Configure event emission for monitoring and integration.
   *
   * @example
   * ```typescript
   * events: {
   *   enabled: true,
   *   emitProgress: true,
   *   emitWarnings: true
   * }
   * ```
   *
   * @since 2.18.0
   */
  events?: EventConfig;

  /**
   * Permission manager configuration
   *
   * @description Configure Deno permission management for security.
   *
   * @example
   * ```typescript
   * permissions: {
   *   enabled: true,
   *   strict: true,
   *   allowList: ["read", "write", "run"]
   * }
   * ```
   *
   * @since 2.18.0
   */
  permissions?: PermissionConfig;
}

/**
 * JSR verification configuration
 */
export interface JsrVerificationConfig {
  /** Enable JSR verification */
  enabled: boolean;
  /** Maximum polling attempts (default: 30) */
  maxAttempts?: number;
  /** Polling interval in milliseconds (default: 10000) */
  pollInterval?: number;
  /** Total timeout in milliseconds (default: 600000) */
  timeout?: number;
  /** Grace period before starting verification in milliseconds (default: 30000) */
  gracePeriod?: number;
}

/**
 * Auto-fix configuration
 */
export interface AutoFixConfig {
  /**
   * Enable basic deterministic fixes
   *
   * @description Enables simple fixes like running formatters with --fix flag,
   * bumping versions for conflicts, and retrying transient failures.
   *
   * @default true
   */
  basic?: boolean;

  /**
   * AI-powered fix configuration
   *
   * @description Configure AI assistance for complex error fixing.
   * Requires an AI tool like Claude Code or GitHub Copilot to be available.
   */
  ai?: AIFixConfig;

  /**
   * Types of errors to auto-fix
   *
   * @description Specify which error types should be automatically fixed.
   * If not specified, all supported types are eligible for fixing.
   *
   * @default ["lint", "format", "security-scan", "type-check", "version-conflict"]
   */
  types?: Array<
    | "lint"
    | "format"
    | "security-scan"
    | "type-check"
    | "version-conflict"
    | "test-failure"
  >;
}

/**
 * AI fix configuration
 */
export interface AIFixConfig {
  /** Enable AI-powered fixes (default: false) */
  enabled: boolean;
  /** AI provider to use */
  provider?: "claude-code" | "github-copilot" | "custom";
  /** Custom command to invoke AI tool */
  command?: string;
  /** Additional flags to pass to AI tool */
  flags?: string[];
  /** Maximum fix attempts (default: 3) */
  maxAttempts?: number;
  /** Timeout for AI operations in milliseconds */
  timeout?: number;
  /**
   * Thinking level for Claude Code (default: "think")
   *
   * @description Controls the depth of analysis and token usage:
   * - "think": Basic analysis, lowest token usage (good for limited plans)
   * - "megathink": Deeper analysis, medium token usage
   * - "ultrathink": Deepest analysis, highest token usage (best for complex issues)
   *
   * @default "think"
   */
  thinkingLevel?: "think" | "megathink" | "ultrathink";
}

/**
 * Progress visualization configuration
 */
export interface ProgressConfig {
  /** Enable progress indicators (default: true) */
  enabled?: boolean;
  /** Progress indicator style */
  style?: "detailed" | "minimal" | "quiet";
  /** Show elapsed time (default: true) */
  showElapsedTime?: boolean;
  /** Show time estimates (default: true) */
  showEstimates?: boolean;
  /** Update interval in milliseconds (default: 100) */
  updateInterval?: number;
}

/**
 * GitHub Actions monitoring configuration
 */
export interface MonitoringConfig {
  /** Workflow file to monitor (e.g., ".github/workflows/publish.yml") */
  workflowFile?: string;
  /** Polling interval in milliseconds (default: 10000) */
  pollInterval?: number;
  /** Monitoring timeout in milliseconds (default: 600000) */
  timeout?: number;
  /** Extract logs for failed jobs (default: true) */
  extractLogs?: boolean;
}

/**
 * Pre-flight checks configuration
 *
 * @description Configure validation checks to run before creating releases
 * @since 2.8.0
 */
export interface PreflightChecksConfig {
  /** Whether to run tests during pre-flight checks (default: true) */
  runTests?: boolean;
  /** Custom pre-flight checks to run in addition to defaults */
  custom?: PreflightCheck[];
}

/**
 * Quality gates configuration
 */
export interface QualityGatesConfig {
  /** Enable quality gates enforcement */
  enabled: boolean;
  /** TypeScript type checking configuration */
  typeChecking?: {
    strict: boolean;
    noAny: boolean;
    noImplicitAny?: boolean;
    noImplicitReturns?: boolean;
    noUnusedLocals?: boolean;
    noUnusedParameters?: boolean;
  };
  /** Type coverage requirements */
  typeCoverage?: {
    enabled: boolean;
    threshold: number; // Percentage (0-100)
  };
  /** Performance benchmarking */
  performance?: {
    enabled: boolean;
    benchmarks: boolean;
    memoryLimit: number; // MB
    timeoutThresholds?: {
      fileHandler: number; // ms
      gitOperations: number; // ms
      releaseManager: number; // ms
    };
  };
  /** Security compliance */
  security?: {
    enabled: boolean;
    owaspCompliance: boolean;
    scanPatterns: boolean;
    requireAnnotations: boolean;
  };
  /** Test coverage requirements */
  testCoverage?: {
    enabled: boolean;
    threshold: number; // Percentage (0-100)
  };
}

/**
 * Event configuration for monitoring
 */
export interface EventConfig {
  /** Enable event emission */
  enabled: boolean;
  /** Emit progress events */
  emitProgress?: boolean;
  /** Emit warning events */
  emitWarnings?: boolean;
  /** Emit metrics events */
  emitMetrics?: boolean;
}

/**
 * Permission configuration for Deno
 */
export interface PermissionConfig {
  /** Enable permission management */
  enabled: boolean;
  /** Use strict permission mode */
  strict?: boolean;
  /** Allowed permissions */
  allowList?: string[];
  /** Denied permissions */
  denyList?: string[];
}

/**
 * Conventional commit structure
 */
export interface ConventionalCommit {
  /** Commit type */
  type: string;
  /** Commit scope */
  scope?: string;
  /** Commit description */
  description: string;
  /** Commit body */
  body?: string;
  /** Breaking change indicator */
  breakingChange?: boolean;
  /** Git commit hash */
  hash: string;
  /** Commit date */
  date: string;
  /** Raw commit message */
  raw?: string;
}

/**
 * Release notes structure
 */
export interface ReleaseNotes {
  /** Release version */
  version: string;
  /** Release date */
  date: string;
  /** Added features */
  added: string[];
  /** Changed/improved items */
  changed: string[];
  /** Deprecated features */
  deprecated: string[];
  /** Removed features */
  removed: string[];
  /** Fixed bugs */
  fixed: string[];
  /** Security updates */
  security: string[];
}

/**
 * Template data for Vento template processing
 *
 * @description Comprehensive data object passed to Vento templates during processing.
 * Contains version information, build metadata, release notes, and custom data.
 * Enhanced with computed properties for easier template access.
 *
 * @example Template usage:
 * ```vento
 * export const VERSION = "{{ version }}";
 * export const BUILD_INFO = {
 *   buildDate: "{{ buildDate }}",
 *   gitCommit: "{{ gitCommit }}",
 *   versionComponents: {{ versionComponents | jsonStringify }}
 * } as const;
 *
 * {{- if metadata.endpoints }}
 * export const ENDPOINTS = {{ metadata.endpoints | jsonStringify }};
 * {{- /if }}
 * ```
 */
export interface TemplateData {
  /** Version information (e.g., "1.2.3") */
  version: string;

  /** Build date in ISO format */
  buildDate: string;

  /** Git commit hash (full or short) */
  gitCommit: string;

  /** Build environment (e.g., "production", "development") */
  environment: string;

  /** Release notes following Keep a Changelog format */
  releaseNotes: ReleaseNotes;

  /**
   * Custom metadata from configuration and data providers
   *
   * @description Merged metadata from releaseNotes.metadata and template dataProviders.
   * Available as individual properties in templates for easier access.
   */
  metadata: Record<string, unknown>;

  /** Project information from configuration */
  project: NagareConfig["project"];

  /**
   * Computed version components (added by TemplateProcessor)
   *
   * @description Automatically parsed from version string during template processing.
   * Includes major, minor, patch numbers and prerelease identifier.
   *
   * @example
   * ```typescript
   * // For version "1.2.3-beta.1"
   * versionComponents: {
   *   major: 1,
   *   minor: 2,
   *   patch: 3,
   *   prerelease: "beta.1"
   * }
   * ```
   */
  versionComponents?: {
    major: number;
    minor: number;
    patch: number;
    prerelease: string | null;
  };

  /**
   * Additional computed helpers (added by TemplateProcessor)
   *
   * @description Helper properties automatically computed during template processing.
   * Provides convenient access to formatted dates, short hashes, etc.
   */
  currentYear?: number;
  buildDateFormatted?: string;
  shortCommit?: string;
}

/**
 * Commit type to changelog section mapping
 */
export interface CommitTypeMapping {
  [commitType: string]: "added" | "changed" | "deprecated" | "removed" | "fixed" | "security";
}

/**
 * Pre-flight check configuration
 *
 * @description Defines a validation check to run before creating releases
 * @since 2.8.0
 */
export interface PreflightCheck {
  /** Display name for the check */
  name: string;
  /** Command and arguments to execute */
  command: string[];
  /** Whether failures can be auto-fixed */
  fixable?: boolean;
  /** Command to run for auto-fix (if fixable) */
  fixCommand?: string[];
  /** Description of what this check validates */
  description?: string;
}

/**
 * Result from pre-flight validation
 *
 * @description Contains the outcome of pre-flight checks
 * @since 2.8.0
 */
export interface PreflightResult {
  /** Whether all checks passed */
  success: boolean;
  /** Name of the check that failed (if any) */
  failedCheck?: string;
  /** Whether the failure can be auto-fixed */
  fixable?: boolean;
  /** The command that failed */
  command?: string[];
  /** Error output from the failed command */
  error?: string;
  /** Suggested fix for the failure */
  suggestion?: string;
}

/**
 * Generic Result type for error handling
 *
 * @description A discriminated union type for handling operations that may fail.
 * Follows the functional programming pattern of explicit error handling.
 * InfoSec: Ensures errors are handled explicitly, preventing uncaught exceptions.
 *
 * @example Success case:
 * ```typescript
 * const result: Result<User, Error> = {
 *   success: true,
 *   data: { id: 1, name: "Alice" }
 * };
 * ```
 *
 * @example Error case:
 * ```typescript
 * const result: Result<User, ValidationError> = {
 *   success: false,
 *   error: new ValidationError("Invalid email format")
 * };
 * ```
 *
 * @since 2.18.0
 */

/**
 * Result of a release operation with comprehensive feedback
 *
 * @description Detailed result information from release operations including
 * success status, version changes, generated artifacts, and error details.
 *
 * @example Successful release:
 * ```typescript
 * const result: ReleaseResult = {
 *   success: true,
 *   version: "1.2.0",
 *   previousVersion: "1.1.5",
 *   commitCount: 12,
 *   releaseNotes: { version: "1.2.0", ... },
 *   updatedFiles: ["./version.ts", "./deno.json", "./CHANGELOG.md"],
 *   githubReleaseUrl: "https://github.com/user/repo/releases/tag/v1.2.0"
 * };
 * ```
 *
 * @example Failed release:
 * ```typescript
 * const result: ReleaseResult = {
 *   success: false,
 *   error: "Template compilation failed: Invalid Vento syntax on line 5"
 * };
 * ```
 */
export interface ReleaseResult {
  /** Whether the release was successful */
  success: boolean;

  /** New version number (if successful) */
  version?: string;

  /** Previous version number (if successful) */
  previousVersion?: string;

  /** Number of commits included in release (if successful) */
  commitCount?: number;

  /** Release notes generated for this version (if successful) */
  releaseNotes?: ReleaseNotes;

  /** Files that were updated during release (if successful) */
  updatedFiles?: string[];

  /** Error message if failed */
  error?: string;

  /** GitHub release URL if created */
  githubReleaseUrl?: string;

  /**
   * Template processing details (if applicable)
   *
   * @description Information about template compilation and processing.
   * Useful for debugging template issues.
   */
  templateInfo?: {
    /** Whether template compilation succeeded */
    compiled: boolean;
    /** Template compilation error (if any) */
    compileError?: string;
    /** Template format used */
    format: TemplateFormat;
    /** Custom template used (if applicable) */
    customTemplate?: boolean;
  };
}
