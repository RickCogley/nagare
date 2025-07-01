/**
 * @fileoverview Security utilities for input validation and sanitization
 * @module security-utils
 *
 * @description
 * Provides security functions to prevent injection attacks and validate inputs
 * according to OWASP guidelines.
 */

import { NagareError } from "./enhanced-error.ts";

/**
 * Validates and sanitizes a git reference (branch, tag, commit)
 *
 * @param {string} ref - The git reference to validate
 * @param {string} type - Type of reference (tag, branch, commit)
 * @returns {string} Sanitized reference
 * @throws {Error} If reference contains invalid characters
 *
 * @example
 * ```typescript
 * const safeTag = validateGitRef("v1.2.3", "tag");
 * const safeBranch = validateGitRef("feature/new-feature", "branch");
 * ```
 */
export function validateGitRef(ref: string, type: "tag" | "branch" | "commit"): string {
  if (!ref || typeof ref !== "string") {
    throw new NagareError(
      `Invalid ${type}: must be a non-empty string`,
      "SECURITY_INVALID_GIT_REF",
      [
        `Provide a valid ${type} as a string`,
        "Check that the value is not null or undefined",
        "Ensure the value is not a number or object",
      ],
      { providedValue: ref, expectedType: type },
    );
  }

  // Remove any leading/trailing whitespace
  const trimmed = ref.trim();

  // Check for empty after trim
  if (trimmed.length === 0) {
    throw new NagareError(
      `Invalid ${type}: cannot be empty`,
      "SECURITY_EMPTY_GIT_REF",
      [
        `Provide a non-empty ${type} name`,
        "Check for accidental whitespace-only values",
        "Verify the input source is providing the correct value",
      ],
      { type, originalValue: ref },
    );
  }

  // Git ref rules:
  // - Cannot start with -
  // - Cannot contain: space, ~, ^, :, ?, *, [, \, `, .., @{
  // - Cannot end with .
  // - Cannot end with .lock
  const invalidChars = /[\s~^:?*\[\]\\`]/;
  const invalidPatterns = /^-|\.\.|\.$|\.lock$|@{/;

  if (invalidChars.test(trimmed)) {
    throw new NagareError(
      `Invalid ${type}: contains forbidden characters`,
      "SECURITY_INVALID_GIT_REF_CHARS",
      [
        "Remove special characters: space, ~, ^, :, ?, *, [, ], \\, `",
        "Use only alphanumeric characters, hyphens, underscores, and forward slashes",
        "Check Git naming conventions: https://git-scm.com/docs/git-check-ref-format",
      ],
      {
        type,
        value: trimmed,
        forbiddenCharacters: "space, ~, ^, :, ?, *, [, ], \\, `",
      },
    );
  }

  if (invalidPatterns.test(trimmed)) {
    throw new NagareError(
      `Invalid ${type}: contains invalid pattern`,
      "SECURITY_INVALID_GIT_REF_PATTERN",
      [
        "Ensure the name doesn't start with hyphen (-)",
        "Remove any double dots (..) from the name",
        "Ensure the name doesn't end with dot (.) or .lock",
        "Remove any @{ sequences",
      ],
      {
        type,
        value: trimmed,
        invalidPatterns: "starts with -, contains .., ends with . or .lock, contains @{",
      },
    );
  }

  // Additional validation for specific types
  if (type === "tag" && trimmed.length > 255) {
    throw new NagareError(
      "Invalid tag: maximum length exceeded",
      "SECURITY_GIT_TAG_TOO_LONG",
      [
        "Shorten the tag name to 255 characters or less",
        "Use a more concise naming convention",
        "Consider using abbreviated version numbers",
      ],
      {
        currentLength: trimmed.length,
        maxLength: 255,
        value: trimmed,
      },
    );
  }

  if (type === "commit" && !/^[a-fA-F0-9]{7,40}$/.test(trimmed)) {
    throw new NagareError(
      "Invalid commit: must be a valid commit hash",
      "SECURITY_INVALID_COMMIT_HASH",
      [
        "Provide a valid Git commit hash (7-40 hexadecimal characters)",
        "Use 'git rev-parse HEAD' to get the current commit hash",
        "Use 'git log --oneline' to see commit hashes",
      ],
      {
        value: trimmed,
        expectedFormat: "7-40 character hexadecimal string",
        example: "a1b2c3d or a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
      },
    );
  }

  return trimmed;
}

/**
 * Validates and sanitizes a file path
 *
 * @param {string} path - The file path to validate
 * @param {string} basePath - Base directory to restrict access to
 * @returns {string} Sanitized absolute path
 * @throws {Error} If path attempts directory traversal or escapes base
 *
 * @example
 * ```typescript
 * const safePath = validateFilePath("./src/file.ts", Deno.cwd());
 * ```
 */
export function validateFilePath(path: string, basePath: string): string {
  if (!path || typeof path !== "string") {
    throw new NagareError(
      "Invalid path: must be a non-empty string",
      "SECURITY_INVALID_FILE_PATH",
      [
        "Provide a valid file path as a string",
        "Check that the path is not null or undefined",
        "Ensure the path is not a number or object",
      ],
      { providedValue: path, basePath },
    );
  }

  // Normalize paths
  const normalizedBase = normalizePath(basePath);
  const normalizedPath = normalizePath(path);

  // Check for directory traversal attempts
  if (normalizedPath.includes("../") || normalizedPath.includes("..\\")) {
    throw new NagareError(
      "Security violation: directory traversal attempt detected",
      "SECURITY_PATH_TRAVERSAL",
      [
        "Use absolute paths or paths relative to the current directory",
        "Remove any '../' sequences from the path",
        "Ensure the path stays within the project directory",
      ],
      {
        attemptedPath: path,
        normalizedPath,
        basePath,
        securityNote: "This is a potential security vulnerability (OWASP A01)",
      },
    );
  }

  // Resolve to absolute path
  const absolutePath = normalizedPath.startsWith("/") || normalizedPath.match(/^[A-Za-z]:/)
    ? normalizedPath
    : `${normalizedBase}/${normalizedPath}`;

  // Ensure the path is within the base directory
  const resolvedPath = normalizePath(absolutePath);

  // Allow temp directories (they start with /var/folders on macOS, /tmp on Linux)
  const isTempPath = resolvedPath.startsWith("/var/folders/") ||
    resolvedPath.startsWith("/tmp/") ||
    resolvedPath.startsWith("/private/var/folders/");

  if (!isTempPath && !resolvedPath.startsWith(normalizedBase)) {
    throw new NagareError(
      "Security violation: path escapes base directory",
      "SECURITY_PATH_ESCAPE",
      [
        "Ensure the file path is within the project directory",
        "Use relative paths from the project root",
        "Check for symbolic links that might escape the directory",
      ],
      {
        attemptedPath: path,
        resolvedPath,
        basePath: normalizedBase,
        securityNote: "Path access outside base directory is restricted (OWASP A01)",
      },
    );
  }

  return resolvedPath;
}

/**
 * Normalizes a file path for consistent comparison
 *
 * @param {string} path - Path to normalize
 * @returns {string} Normalized path
 */
function normalizePath(path: string): string {
  // Replace backslashes with forward slashes
  let normalized = path.replace(/\\/g, "/");

  // Check if path was absolute
  const isAbsolute = normalized.startsWith("/") || normalized.match(/^[A-Za-z]:/);

  // Remove trailing slashes
  normalized = normalized.replace(/\/$/, "");

  // Resolve . and .. in a simple way (not full resolution)
  const parts = normalized.split("/");
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === "." || part === "") {
      continue;
    }
    if (part === ".." && resolved.length > 0 && resolved[resolved.length - 1] !== "..") {
      resolved.pop();
    } else {
      resolved.push(part);
    }
  }

  const result = resolved.join("/");

  // Restore leading slash for absolute paths
  if (isAbsolute && !result.startsWith("/") && !result.match(/^[A-Za-z]:/)) {
    return "/" + result;
  }

  return result || "/";
}

/**
 * Sanitizes a commit message for safe usage
 *
 * @param {string} message - Commit message to sanitize
 * @returns {string} Sanitized message
 *
 * @example
 * ```typescript
 * const safeMessage = sanitizeCommitMessage("feat: add new feature\n\nDetails here");
 * ```
 */
export function sanitizeCommitMessage(message: string): string {
  if (!message || typeof message !== "string") {
    return "";
  }

  // Remove any null bytes
  let sanitized = message.replace(/\0/g, "");

  // Limit length to prevent DoS
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000) + "... (truncated)";
  }

  // Ensure proper line endings
  sanitized = sanitized.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  return sanitized;
}

/**
 * Validates a version string
 *
 * @param {string} version - Version to validate
 * @returns {string} Valid version string
 * @throws {Error} If version is invalid
 *
 * @example
 * ```typescript
 * const validVersion = validateVersion("1.2.3");
 * ```
 */
export function validateVersion(version: string): string {
  if (!version || typeof version !== "string") {
    throw new NagareError(
      "Invalid version: must be a non-empty string",
      "SECURITY_INVALID_VERSION",
      [
        "Provide a valid semantic version string",
        "Use format: MAJOR.MINOR.PATCH (e.g., 1.2.3)",
        "Check that the version is not null or undefined",
      ],
      { providedValue: version },
    );
  }

  const trimmed = version.trim();

  // Basic semver pattern (simplified)
  const semverPattern = /^v?(\d+)\.(\d+)\.(\d+)(?:-([\w.-]+))?(?:\+([\w.-]+))?$/;

  if (!semverPattern.test(trimmed)) {
    throw new NagareError(
      "Invalid version: must be valid semantic version",
      "SECURITY_INVALID_SEMVER_FORMAT",
      [
        "Use semantic versioning format: MAJOR.MINOR.PATCH",
        "Valid examples: 1.2.3, v1.2.3, 1.2.3-beta.1, 1.2.3+build.123",
        "See https://semver.org for format specification",
      ],
      {
        providedValue: trimmed,
        validFormats: ["1.2.3", "v1.2.3", "1.2.3-beta.1", "1.2.3-rc.1+build.123"],
      },
    );
  }

  return trimmed;
}

/**
 * Sanitizes error messages to prevent information disclosure
 *
 * @param {Error | unknown} error - Error to sanitize
 * @param {boolean} includeStack - Whether to include stack trace (dev only)
 * @returns {string} Sanitized error message
 *
 * @example
 * ```typescript
 * try {
 *   // some operation
 * } catch (error) {
 *   console.error(sanitizeErrorMessage(error, false));
 * }
 * ```
 */
export function sanitizeErrorMessage(error: Error | unknown, includeStack = false): string {
  if (error instanceof Error) {
    // Remove sensitive paths and system information
    const message = error.message
      .replace(/(['"])(\/[^\/\s]+\/[^\/\s]+\/[^\/\s]+[^'"]*)\1/g, "'/***/***/***/***'") // Hide deep paths in quotes
      .replace(/\s(\/[^\/\s]+\/[^\/\s]+\/[^\/\s]+)/g, " /***/***/***/***") // Hide deep paths after space
      .replace(/[A-Za-z]:\\[^\\s]+\\[^\\s]+/g, "***:\\***\\***") // Hide Windows paths
      .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "***.***.***.***") // Hide IPs
      .replace(/:[0-9]{2,5}/g, ":****") // Hide ports
      .replace(/(secret|token|password|key)=\S+/gi, "$1=***"); // Hide secrets

    if (includeStack && error.stack) {
      // Sanitize stack trace too
      const stack = error.stack
        .replace(/\/[^\/\s]+\/[^\/\s]+\/[^\/\s]+/g, "/***/***/***")
        .replace(/[A-Za-z]:\\[^\\s]+\\[^\\s]+/g, "***:\\***\\***");

      return `${message}\n\nStack trace:\n${stack}`;
    }

    return message;
  }

  // For non-Error objects, return generic message
  return "An error occurred";
}

/**
 * Validates command line arguments
 *
 * @param {string[]} args - Arguments to validate
 * @returns {string[]} Validated arguments
 * @throws {Error} If arguments contain shell metacharacters
 *
 * @example
 * ```typescript
 * const safeArgs = validateCliArgs(["--version", "1.2.3"]);
 * ```
 */
export function validateCliArgs(args: string[]): string[] {
  const validated: string[] = [];

  // Shell metacharacters that could be dangerous
  const shellMetachars = /[;&|`$()<>{}[\]!*?#~\n\r]/;

  for (const arg of args) {
    if (typeof arg !== "string") {
      throw new NagareError(
        "Invalid argument: all arguments must be strings",
        "SECURITY_INVALID_CLI_ARG_TYPE",
        [
          "Ensure all command line arguments are strings",
          "Convert numbers to strings before passing",
          "Check for null or undefined values in the arguments array",
        ],
        {
          invalidArg: arg,
          argType: typeof arg,
          allArgs: args,
        },
      );
    }

    // Check for shell metacharacters
    if (shellMetachars.test(arg)) {
      throw new NagareError(
        "Security violation: argument contains shell metacharacters",
        "SECURITY_SHELL_INJECTION",
        [
          "Remove shell metacharacters from the argument",
          "Escape special characters if they are necessary",
          "Use parameter substitution instead of shell expansion",
          "Forbidden characters: ; & | ` $ ( ) < > { } [ ] ! * ? # ~ newline",
        ],
        {
          argument: arg,
          detectedMetachars: arg.match(shellMetachars)?.[0],
          securityNote: "Shell injection vulnerability detected (OWASP A03)",
        },
      );
    }

    // Check for null bytes
    if (arg.includes("\0")) {
      throw new NagareError(
        "Security violation: argument contains null byte",
        "SECURITY_NULL_BYTE_INJECTION",
        [
          "Remove null bytes from the argument",
          "Check the source of the input for corruption",
          "Validate input encoding before processing",
        ],
        {
          argument: arg,
          securityNote: "Null byte injection can bypass security checks (OWASP A03)",
        },
      );
    }

    validated.push(arg);
  }

  return validated;
}

/**
 * Creates a security audit log entry
 *
 * @param {string} action - Action being performed
 * @param {Record<string, unknown>} details - Additional details
 * @returns {string} Formatted log entry
 *
 * @example
 * ```typescript
 * console.log(createSecurityLog("release", { version: "1.2.3", user: "system" }));
 * ```
 */
export function createSecurityLog(action: string, details: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const sanitizedDetails = JSON.stringify(details, null, 2)
    .replace(/(secret|token|password|key)":\s*"[^"]+"/gi, '$1": "***"');

  return `[SECURITY] ${timestamp} - Action: ${action}\nDetails: ${sanitizedDetails}`;
}
