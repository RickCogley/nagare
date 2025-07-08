/**
 * @fileoverview Enhanced error handling for better developer experience
 * @description Provides structured errors with actionable suggestions and context
 * @author Rick Cogley
 * @since 1.9.0
 */

import { getI18n, t } from "./i18n.ts";
import type { TranslationKey } from "../locales/schema.ts";

/**
 * Helper to check if i18n is available
 */
function hasI18n(): boolean {
  try {
    getI18n();
    return true;
  } catch {
    return false;
  }
}

/**
 * Options for i18n-enabled error creation
 */
export interface ErrorOptions {
  params?: Record<string, unknown>;
  suggestions?: TranslationKey[];
  context?: Record<string, unknown>;
  docsUrl?: string;
}

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
 *
 * @see {@link ErrorCodes} for all available error codes
 * @see {@link ErrorFactory} for pre-built error constructors
 */
export class NagareError extends Error {
  public readonly suggestions?: string[];
  public readonly docsUrl?: string;
  public readonly context?: Record<string, unknown>;

  /**
   * Create an enhanced error (backward compatible string version)
   * @deprecated Use the i18n version with TranslationKey instead
   */
  constructor(
    message: string,
    code: string,
    suggestions?: string[],
    context?: Record<string, unknown>,
    docsUrl?: string,
  );

  /**
   * Create an enhanced error with i18n support
   */
  constructor(
    messageKey: TranslationKey,
    code: string,
    options?: ErrorOptions,
  );

  constructor(
    messageOrKey: string | TranslationKey,
    public readonly code: string,
    suggestionsOrOptions?: string[] | ErrorOptions,
    context?: Record<string, unknown>,
    docsUrl?: string,
  ) {
    // Detect if using i18n based on whether third param is an object (not array)
    const isI18n = typeof suggestionsOrOptions === "object" &&
      !Array.isArray(suggestionsOrOptions);

    // Determine message before calling super
    const message = (isI18n && hasI18n())
      ? t(messageOrKey as TranslationKey, (suggestionsOrOptions as ErrorOptions).params)
      : messageOrKey as string;

    // Call super with determined message
    super(message);

    // Set properties based on API type
    if (isI18n && hasI18n()) {
      // New i18n path
      const options = suggestionsOrOptions as ErrorOptions;
      this.suggestions = options.suggestions?.map((key) => t(key));
      this.context = options.context;
      this.docsUrl = options.docsUrl;
    } else {
      // Legacy path
      this.suggestions = suggestionsOrOptions as string[];
      this.context = context;
      this.docsUrl = docsUrl;
    }

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
 * Use these codes for consistent error handling across the codebase.
 * Each error code represents a specific failure scenario that users may encounter.
 *
 * ## Error Code Categories:
 *
 * ### Git-related errors (GIT_*)
 * - `GIT_NOT_INITIALIZED`: Working directory is not a git repository
 * - `GIT_UNCOMMITTED_CHANGES`: Uncommitted changes prevent release
 * - `GIT_USER_NOT_CONFIGURED`: Git user.name or user.email not set
 * - `GIT_NO_COMMITS`: No commits in repository
 * - `GIT_TAG_EXISTS`: Tag already exists for version
 * - `GIT_REMOTE_ERROR`: Error communicating with remote repository
 *
 * ### Configuration errors (CONFIG_*)
 * - `CONFIG_NOT_FOUND`: No nagare.config.ts file found
 * - `CONFIG_INVALID`: Configuration file has validation errors
 * - `CONFIG_MISSING_REQUIRED`: Required configuration fields missing
 *
 * ### Version errors (VERSION_*)
 * - `VERSION_NOT_FOUND`: Version pattern not found in file
 * - `VERSION_INVALID_FORMAT`: Version doesn't match semver format
 * - `VERSION_FILE_NOT_FOUND`: Specified version file doesn't exist
 * - `VERSION_BUMP_INVALID`: Invalid bump type specified
 *
 * ### File operation errors (FILE_*)
 * - `FILE_NOT_FOUND`: Specified file doesn't exist
 * - `FILE_UPDATE_FAILED`: Failed to update file contents
 * - `FILE_PATTERN_NO_MATCH`: Update pattern didn't match
 * - `FILE_HANDLER_NOT_FOUND`: No handler for file type
 * - `FILE_JSON_INVALID`: JSON file has syntax errors
 *
 * ### GitHub integration errors (GITHUB_*)
 * - `GITHUB_CLI_NOT_FOUND`: GitHub CLI (gh) not installed
 * - `GITHUB_AUTH_FAILED`: GitHub authentication failed
 * - `GITHUB_RELEASE_FAILED`: Failed to create GitHub release
 *
 * ### Template errors (TEMPLATE_*)
 * - `TEMPLATE_INVALID`: Template syntax error
 * - `TEMPLATE_PROCESSING_FAILED`: Template rendering failed
 * - `TEMPLATE_SECURITY_VIOLATION`: Template contains unsafe code
 *
 * ### Security errors (SECURITY_*)
 * - `SECURITY_INVALID_GIT_REF`: Invalid git reference format
 * - `SECURITY_EMPTY_GIT_REF`: Empty git reference provided
 * - `SECURITY_INVALID_GIT_REF_CHARS`: Git reference contains forbidden characters
 * - `SECURITY_INVALID_GIT_REF_PATTERN`: Git reference has invalid pattern
 * - `SECURITY_GIT_TAG_TOO_LONG`: Git tag exceeds maximum length
 * - `SECURITY_INVALID_COMMIT_HASH`: Invalid git commit hash format
 * - `SECURITY_INVALID_FILE_PATH`: Invalid file path format
 * - `SECURITY_PATH_TRAVERSAL`: Directory traversal attempt detected
 * - `SECURITY_PATH_ESCAPE`: Path escapes base directory
 * - `SECURITY_INVALID_VERSION`: Invalid version string
 * - `SECURITY_INVALID_SEMVER_FORMAT`: Version doesn't match semver format
 * - `SECURITY_INVALID_CLI_ARG_TYPE`: CLI argument has wrong type
 * - `SECURITY_SHELL_INJECTION`: Shell metacharacters detected
 * - `SECURITY_NULL_BYTE_INJECTION`: Null byte injection attempt
 *
 * ### General errors
 * - `DEPENDENCY_NOT_FOUND`: Required dependency missing
 * - `PERMISSION_DENIED`: Insufficient permissions
 * - `OPERATION_CANCELLED`: User cancelled operation
 * - `UNKNOWN_ERROR`: Unexpected error occurred
 *
 * @example
 * ```typescript
 * import { ErrorCodes, NagareError } from "@rick/nagare";
 *
 * throw new NagareError(
 *   "Git repository not initialized",
 *   ErrorCodes.GIT_NOT_INITIALIZED,
 *   ["Run 'git init' to initialize repository"]
 * );
 * ```
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

  // Security-related errors
  SECURITY_INVALID_GIT_REF: "SECURITY_INVALID_GIT_REF",
  SECURITY_EMPTY_GIT_REF: "SECURITY_EMPTY_GIT_REF",
  SECURITY_INVALID_GIT_REF_CHARS: "SECURITY_INVALID_GIT_REF_CHARS",
  SECURITY_INVALID_GIT_REF_PATTERN: "SECURITY_INVALID_GIT_REF_PATTERN",
  SECURITY_GIT_TAG_TOO_LONG: "SECURITY_GIT_TAG_TOO_LONG",
  SECURITY_INVALID_COMMIT_HASH: "SECURITY_INVALID_COMMIT_HASH",
  SECURITY_INVALID_FILE_PATH: "SECURITY_INVALID_FILE_PATH",
  SECURITY_PATH_TRAVERSAL: "SECURITY_PATH_TRAVERSAL",
  SECURITY_PATH_ESCAPE: "SECURITY_PATH_ESCAPE",
  SECURITY_INVALID_VERSION: "SECURITY_INVALID_VERSION",
  SECURITY_INVALID_SEMVER_FORMAT: "SECURITY_INVALID_SEMVER_FORMAT",
  SECURITY_INVALID_CLI_ARG_TYPE: "SECURITY_INVALID_CLI_ARG_TYPE",
  SECURITY_SHELL_INJECTION: "SECURITY_SHELL_INJECTION",
  SECURITY_NULL_BYTE_INJECTION: "SECURITY_NULL_BYTE_INJECTION",

  // General errors
  DEPENDENCY_NOT_FOUND: "DEPENDENCY_NOT_FOUND",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  OPERATION_CANCELLED: "OPERATION_CANCELLED",
  RELEASE_FAILED: "RELEASE_FAILED",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

/**
 * Type for error code values
 */
export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Factory class for creating common Nagare errors with consistent formatting
 *
 * Provides pre-configured error constructors for common failure scenarios.
 * Each method returns a fully-configured NagareError with appropriate
 * error code, message, and recovery suggestions.
 *
 * @example
 * ```typescript
 * import { ErrorFactory } from "@rick/nagare";
 *
 * // Check git repository state
 * if (!await isGitRepository()) {
 *   throw ErrorFactory.gitNotInitialized();
 * }
 *
 * // Handle configuration errors
 * if (!configFound) {
 *   throw ErrorFactory.configNotFound(searchedPaths);
 * }
 * ```
 *
 * @see {@link NagareError} for the error class structure
 * @see {@link ErrorCodes} for all available error codes
 */
export class ErrorFactory {
  // Note: Documentation URLs removed as they don't exist in auto-generated docs
  // The error codes and suggestions provide sufficient guidance

  /**
   * Create a git not initialized error
   *
   * @returns {NagareError} Error indicating the current directory is not a git repository
   *
   * @example
   * ```typescript
   * if (!await git.isGitRepository()) {
   *   throw ErrorFactory.gitNotInitialized();
   * }
   * ```
   */
  static gitNotInitialized(): NagareError {
    if (hasI18n()) {
      return new NagareError(
        "errors.gitNotRepo" as TranslationKey,
        ErrorCodes.GIT_NOT_INITIALIZED,
        {
          suggestions: [
            "suggestions.runGitInit" as TranslationKey,
            "suggestions.navigateToRepo" as TranslationKey,
            "suggestions.checkProjectDir" as TranslationKey,
          ],
        },
      );
    }

    // Fallback to hardcoded (backward compatible)
    return new NagareError(
      "Not in a git repository",
      ErrorCodes.GIT_NOT_INITIALIZED,
      [
        "Initialize a git repository: git init",
        "Navigate to an existing git repository",
        "Check that you're in the correct project directory",
      ],
    );
  }

  /**
   * Create an uncommitted changes error
   *
   * @returns {NagareError} Error indicating uncommitted changes prevent release
   *
   * @example
   * ```typescript
   * if (await git.hasUncommittedChanges()) {
   *   throw ErrorFactory.uncommittedChanges();
   * }
   * ```
   */
  static uncommittedChanges(): NagareError {
    if (hasI18n()) {
      return new NagareError(
        "errors.gitNotClean" as TranslationKey,
        ErrorCodes.GIT_UNCOMMITTED_CHANGES,
        {
          suggestions: [
            "suggestions.commitChanges" as TranslationKey,
            "suggestions.stashChanges" as TranslationKey,
            "suggestions.discardChanges" as TranslationKey,
            "suggestions.viewChanges" as TranslationKey,
          ],
        },
      );
    }

    // Fallback to hardcoded (backward compatible)
    return new NagareError(
      "Uncommitted changes in repository",
      ErrorCodes.GIT_UNCOMMITTED_CHANGES,
      [
        "Commit all changes: git add . && git commit -m 'message'",
        "Stash changes temporarily: git stash",
        "Discard all changes: git reset --hard (WARNING: destructive)",
        "View changes: git status",
      ],
    );
  }

  /**
   * Create a configuration not found error
   *
   * @param searchedPaths - Array of file paths that were searched
   * @returns {NagareError} Error with configuration setup instructions
   *
   * @example
   * ```typescript
   * const paths = ["./nagare.config.ts", "./nagare.config.js"];
   * throw ErrorFactory.configNotFound(paths);
   * ```
   */
  static configNotFound(searchedPaths: string[]): NagareError {
    if (hasI18n()) {
      return new NagareError(
        "errors.configNotFound" as TranslationKey,
        ErrorCodes.CONFIG_NOT_FOUND,
        {
          params: { path: searchedPaths.join(", ") },
          suggestions: [
            "suggestions.runNagareInit" as TranslationKey,
            "suggestions.createConfigManually" as TranslationKey,
            "suggestions.specifyConfigPath" as TranslationKey,
          ],
          context: {
            searchedPaths,
            exampleConfig: [
              "export default {",
              '  project: { name: "my-app", repository: "https://github.com/user/repo" },',
              '  versionFile: { path: "./version.ts", template: "typescript" }',
              "};",
            ].join("\n"),
          },
        },
      );
    }

    // Fallback to hardcoded (backward compatible)
    return new NagareError(
      `Configuration file not found. Searched: ${searchedPaths.join(", ")}`,
      ErrorCodes.CONFIG_NOT_FOUND,
      [
        "Run 'nagare init' to create a configuration file",
        "Create nagare.config.ts manually in the project root",
        "Specify config path: nagare release --config ./path/to/config.ts",
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
    );
  }

  /**
   * Create a version not found error
   *
   * @param filePath - Path to the file where version was not found
   * @param searchedPatterns - Optional array of patterns that were searched
   * @returns {NagareError} Error with version pattern examples
   *
   * @example
   * ```typescript
   * throw ErrorFactory.versionNotFound(
   *   "./version.ts",
   *   ['export const VERSION']
   * );
   * ```
   */
  static versionNotFound(
    filePath: string,
    searchedPatterns?: string[],
  ): NagareError {
    if (hasI18n()) {
      return new NagareError(
        "errors.versionNotFound" as TranslationKey,
        ErrorCodes.VERSION_NOT_FOUND,
        {
          params: { file: filePath },
          suggestions: [
            "suggestions.addVersionPattern" as TranslationKey,
            "suggestions.configureCustomPattern" as TranslationKey,
            "suggestions.ensureFileReadable" as TranslationKey,
          ],
          context: {
            filePath,
            searchedPatterns,
            commonPatterns: [
              'TypeScript: export const VERSION = "1.0.0"',
              'JSON: "version": "1.0.0"',
              'YAML: version: "1.0.0"',
            ],
          },
        },
      );
    }

    // Fallback to hardcoded (backward compatible)
    return new NagareError(
      `Version pattern not found in ${filePath}`,
      ErrorCodes.VERSION_NOT_FOUND,
      [
        "Add a version pattern to the file (e.g., 'export const VERSION = \"1.0.0\"')",
        "Configure a custom pattern in fileHandlers section of config",
        "Ensure the file exists and is readable",
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
    );
  }

  /**
   * Create a file handler not found error
   *
   * @param filePath - Path to the file that has no handler
   * @returns {NagareError} Error with handler configuration suggestions
   *
   * @example
   * ```typescript
   * if (!handler) {
   *   throw ErrorFactory.fileHandlerNotFound("./custom.cfg");
   * }
   * ```
   */
  static fileHandlerNotFound(filePath: string): NagareError {
    if (hasI18n()) {
      return new NagareError(
        "errors.fileHandlerNotFound" as TranslationKey,
        ErrorCodes.FILE_HANDLER_NOT_FOUND,
        {
          params: { file: filePath },
          suggestions: [
            "suggestions.addCustomUpdateFn" as TranslationKey,
            "suggestions.useBuiltInHandler" as TranslationKey,
            "suggestions.defineCustomPatterns" as TranslationKey,
          ],
          context: {
            filePath,
            supportedTypes: [
              "deno.json",
              "package.json",
              "jsr.json",
              "README.md",
              "*.ts (with VERSION export)",
            ],
          },
        },
      );
    }

    // Fallback to hardcoded (backward compatible)
    return new NagareError(
      `No file handler found for ${filePath}`,
      ErrorCodes.FILE_HANDLER_NOT_FOUND,
      [
        "Add a custom updateFn in fileHandlers configuration",
        "Use a built-in handler by naming the file appropriately",
        "Define custom patterns in fileHandlers.defaultPatterns",
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
    );
  }

  /**
   * Create an invalid JSON error
   *
   * @param filePath - Path to the JSON file with syntax error
   * @param parseError - The JSON parse error message
   * @returns {NagareError} Error with JSON debugging suggestions
   *
   * @example
   * ```typescript
   * try {
   *   JSON.parse(content);
   * } catch (e) {
   *   throw ErrorFactory.invalidJson("./config.json", e.message);
   * }
   * ```
   */
  static invalidJson(filePath: string, parseError: string): NagareError {
    if (hasI18n()) {
      return new NagareError(
        "errors.fileJsonInvalid" as TranslationKey,
        ErrorCodes.FILE_JSON_INVALID,
        {
          params: { file: filePath },
          suggestions: [
            "suggestions.checkJsonSyntax" as TranslationKey,
            "suggestions.validateJson" as TranslationKey,
            "suggestions.checkJsonCommas" as TranslationKey,
            "suggestions.revertRecentChanges" as TranslationKey,
          ],
          context: {
            filePath,
            parseError,
          },
        },
      );
    }

    // Fallback to hardcoded (backward compatible)
    return new NagareError(
      `Invalid JSON in ${filePath}`,
      ErrorCodes.FILE_JSON_INVALID,
      [
        "Check JSON syntax (trailing commas, missing quotes)",
        "Validate with a JSON linter or formatter",
        "Look for missing or extra commas between elements",
        "Revert recent changes and apply them incrementally",
      ],
      {
        filePath,
        parseError,
      },
    );
  }

  /**
   * Create a GitHub CLI not found error
   *
   * @returns {NagareError} Error with GitHub CLI installation instructions
   *
   * @example
   * ```typescript
   * if (!await isGitHubCliInstalled()) {
   *   throw ErrorFactory.githubCliNotFound();
   * }
   * ```
   */
  static githubCliNotFound(): NagareError {
    if (hasI18n()) {
      return new NagareError(
        "errors.githubCliNotFound" as TranslationKey,
        ErrorCodes.GITHUB_CLI_NOT_FOUND,
        {
          suggestions: [
            "suggestions.installGitHubCli" as TranslationKey,
            "suggestions.installGitHubCliMac" as TranslationKey,
            "suggestions.installGitHubCliWindows" as TranslationKey,
            "suggestions.disableGitHubReleases" as TranslationKey,
          ],
        },
      );
    }

    // Fallback to hardcoded (backward compatible)
    return new NagareError(
      "GitHub CLI (gh) not found",
      ErrorCodes.GITHUB_CLI_NOT_FOUND,
      [
        "Install GitHub CLI from https://cli.github.com",
        "On macOS: brew install gh",
        "On Windows: winget install GitHub.cli",
        "Disable GitHub releases: set github.createRelease = false",
      ],
    );
  }
}
