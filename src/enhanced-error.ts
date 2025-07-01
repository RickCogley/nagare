/**
 * @fileoverview Enhanced error handling for better developer experience
 * @description Provides structured errors with actionable suggestions and context
 * @author Rick Cogley
 * @since 1.9.0
 */

/**
 * Enhanced error class for Nagare with actionable suggestions
 *
 * Provides structured error messages with:
 * - Clear error description
 * - Actionable suggestions for resolution
 * - Contextual information
 * - Error codes for programmatic handling
 *
 * @example
 * ```typescript
 * throw new NagareError(
 *   "Configuration file not found",
 *   "CONFIG_NOT_FOUND",
 *   [
 *     "Run 'nagare init' to create a configuration",
 *     "Create nagare.config.ts manually",
 *     "Specify config path: --config ./path/to/config.ts"
 *   ],
 *   { searchedPaths: ["./nagare.config.ts", "./nagare.config.js"] }
 * );
 * ```
 */
export class NagareError extends Error {
  /**
   * Create an enhanced error with suggestions
   *
   * @param message - Primary error message
   * @param code - Error code for programmatic handling
   * @param suggestions - List of actionable suggestions to resolve the error
   * @param context - Additional context information
   * @param docsUrl - Link to relevant documentation
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly suggestions?: string[],
    public readonly context?: Record<string, unknown>,
    public readonly docsUrl?: string,
  ) {
    super(message);
    this.name = "NagareError";
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, NagareError.prototype);
  }

  /**
   * Format error for CLI output with colors and structure
   *
   * @returns Formatted error string with suggestions and context
   */
  override toString(): string {
    // Main error message
    let output = `\n❌ ${this.message}`;

    // Add suggestions if available
    if (this.suggestions && this.suggestions.length > 0) {
      output += "\n\n💡 To fix this:";
      this.suggestions.forEach((suggestion, index) => {
        output += `\n  ${index + 1}. ${suggestion}`;
      });
    }

    // Add context if available
    if (this.context && Object.keys(this.context).length > 0) {
      output += "\n\n📋 Details:";
      Object.entries(this.context).forEach(([key, value]) => {
        const formattedKey = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase())
          .trim();
        
        // Handle array values
        if (Array.isArray(value)) {
          output += `\n  ${formattedKey}:`;
          value.forEach((item) => {
            output += `\n    - ${item}`;
          });
        } else {
          output += `\n  ${formattedKey}: ${value}`;
        }
      });
    }

    // Add documentation link if available
    if (this.docsUrl) {
      output += `\n\n📚 Learn more: ${this.docsUrl}`;
    }

    // Add error code for reference
    output += `\n\n🔍 Error code: ${this.code}`;

    return output + "\n";
  }

  /**
   * Create a JSON representation for logging
   *
   * @returns JSON object with all error details
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      suggestions: this.suggestions,
      context: this.context,
      docsUrl: this.docsUrl,
      stack: this.stack,
    };
  }
}

/**
 * Standard error codes for common Nagare errors
 *
 * Use these codes for consistent error handling across the codebase
 */
export const ErrorCodes = {
  // Git-related errors
  GIT_NOT_INITIALIZED: "GIT_NOT_INITIALIZED",
  GIT_UNCOMMITTED_CHANGES: "GIT_UNCOMMITTED_CHANGES",
  GIT_USER_NOT_CONFIGURED: "GIT_USER_NOT_CONFIGURED",
  GIT_NO_COMMITS: "GIT_NO_COMMITS",
  GIT_TAG_EXISTS: "GIT_TAG_EXISTS",
  GIT_REMOTE_ERROR: "GIT_REMOTE_ERROR",

  // Configuration errors
  CONFIG_NOT_FOUND: "CONFIG_NOT_FOUND",
  CONFIG_INVALID: "CONFIG_INVALID",
  CONFIG_MISSING_REQUIRED: "CONFIG_MISSING_REQUIRED",

  // Version-related errors
  VERSION_NOT_FOUND: "VERSION_NOT_FOUND",
  VERSION_INVALID_FORMAT: "VERSION_INVALID_FORMAT",
  VERSION_FILE_NOT_FOUND: "VERSION_FILE_NOT_FOUND",
  VERSION_BUMP_INVALID: "VERSION_BUMP_INVALID",

  // File operation errors
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  FILE_UPDATE_FAILED: "FILE_UPDATE_FAILED",
  FILE_PATTERN_NO_MATCH: "FILE_PATTERN_NO_MATCH",
  FILE_HANDLER_NOT_FOUND: "FILE_HANDLER_NOT_FOUND",
  FILE_JSON_INVALID: "FILE_JSON_INVALID",

  // GitHub integration errors
  GITHUB_CLI_NOT_FOUND: "GITHUB_CLI_NOT_FOUND",
  GITHUB_AUTH_FAILED: "GITHUB_AUTH_FAILED",
  GITHUB_RELEASE_FAILED: "GITHUB_RELEASE_FAILED",

  // Template errors
  TEMPLATE_INVALID: "TEMPLATE_INVALID",
  TEMPLATE_PROCESSING_FAILED: "TEMPLATE_PROCESSING_FAILED",
  TEMPLATE_SECURITY_VIOLATION: "TEMPLATE_SECURITY_VIOLATION",

  // General errors
  DEPENDENCY_NOT_FOUND: "DEPENDENCY_NOT_FOUND",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  OPERATION_CANCELLED: "OPERATION_CANCELLED",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

/**
 * Type for error code values
 */
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Helper function to create common errors with consistent formatting
 */
export class ErrorFactory {
  private static readonly DOCS_BASE_URL = "https://nagare.dev/docs/errors";

  /**
   * Create a git not initialized error
   */
  static gitNotInitialized(): NagareError {
    return new NagareError(
      "Not in a git repository",
      ErrorCodes.GIT_NOT_INITIALIZED,
      [
        "Initialize a git repository: git init",
        "Navigate to an existing git repository",
        "If you just cloned, ensure you're in the project directory",
      ],
      undefined,
      `${this.DOCS_BASE_URL}#git-not-initialized`,
    );
  }

  /**
   * Create an uncommitted changes error
   */
  static uncommittedChanges(): NagareError {
    return new NagareError(
      "Uncommitted changes detected. Cannot proceed with release",
      ErrorCodes.GIT_UNCOMMITTED_CHANGES,
      [
        "Commit your changes: git add . && git commit -m \"your message\"",
        "Stash changes temporarily: git stash",
        "Discard changes: git checkout . (⚠️  destructive)",
        "View changes: git status",
      ],
      undefined,
      `${this.DOCS_BASE_URL}#uncommitted-changes`,
    );
  }

  /**
   * Create a configuration not found error
   */
  static configNotFound(searchedPaths: string[]): NagareError {
    return new NagareError(
      "No Nagare configuration file found",
      ErrorCodes.CONFIG_NOT_FOUND,
      [
        "Run 'nagare init' to create a configuration file",
        "Create nagare.config.ts manually",
        "Specify a custom config path: nagare release --config ./path/to/config.ts",
      ],
      {
        searchedPaths,
        exampleConfig: [
          "export default {",
          '  project: { name: "my-app", repository: "https://github.com/user/repo" },',
          '  versionFile: { path: "./version.ts", template: "typescript" }',
          "};",
        ].join("\n"),
      },
      `${this.DOCS_BASE_URL}#config-not-found`,
    );
  }

  /**
   * Create a version not found error
   */
  static versionNotFound(
    filePath: string,
    searchedPatterns?: string[],
  ): NagareError {
    return new NagareError(
      `Could not find version in ${filePath}`,
      ErrorCodes.VERSION_NOT_FOUND,
      [
        "Add a version to your file matching one of the common patterns",
        "Configure a custom pattern in your nagare.config.ts",
        "Ensure the version file exists and is readable",
      ],
      {
        filePath,
        searchedPatterns,
        commonPatterns: [
          'TypeScript: export const VERSION = "1.0.0"',
          'JSON: "version": "1.0.0"',
          'YAML: version: "1.0.0"',
        ],
      },
      `${this.DOCS_BASE_URL}#version-not-found`,
    );
  }

  /**
   * Create a file handler not found error
   */
  static fileHandlerNotFound(filePath: string): NagareError {
    return new NagareError(
      `No file handler found for ${filePath}`,
      ErrorCodes.FILE_HANDLER_NOT_FOUND,
      [
        "Add a custom updateFn in your nagare.config.ts",
        "Use a built-in handler by renaming to a standard file name",
        "Define custom patterns for this file type",
      ],
      {
        filePath,
        supportedTypes: [
          "deno.json",
          "package.json",
          "jsr.json",
          "README.md",
          "*.ts (with VERSION export)",
        ],
      },
      `${this.DOCS_BASE_URL}#file-handler-not-found`,
    );
  }

  /**
   * Create an invalid JSON error
   */
  static invalidJson(filePath: string, parseError: string): NagareError {
    return new NagareError(
      `Invalid JSON in ${filePath}`,
      ErrorCodes.FILE_JSON_INVALID,
      [
        "Check for syntax errors in the JSON file",
        "Validate JSON at jsonlint.com",
        "Ensure no trailing commas or missing quotes",
        "Revert recent changes if the file was working before",
      ],
      {
        filePath,
        parseError,
      },
      `${this.DOCS_BASE_URL}#invalid-json`,
    );
  }

  /**
   * Create a GitHub CLI not found error
   */
  static githubCliNotFound(): NagareError {
    return new NagareError(
      "GitHub CLI (gh) is not installed",
      ErrorCodes.GITHUB_CLI_NOT_FOUND,
      [
        "Install GitHub CLI: https://cli.github.com/manual/installation",
        "macOS: brew install gh",
        "Windows: winget install --id GitHub.cli",
        "Or disable GitHub releases in nagare.config.ts: github.createRelease = false",
      ],
      undefined,
      `${this.DOCS_BASE_URL}#github-cli-not-found`,
    );
  }
}