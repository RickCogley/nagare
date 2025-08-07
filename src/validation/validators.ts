/**
 * @module validators
 * @description Type-safe validation functions for CLI arguments and user inputs.
 * Provides runtime validation with TypeScript type guards.
 * InfoSec: All validators include input sanitization to prevent injection attacks.
 *
 * @example
 * ```typescript
 * import { validateReleaseType, validateVersion } from "./validators.ts";
 *
 * const releaseType = validateReleaseType(args[0]);
 * if (!releaseType.success) {
 *   console.error(releaseType.error.message);
 *   Deno.exit(1);
 * }
 *
 * // releaseType.data is now typed as "major" | "minor" | "patch"
 * ```
 *
 * @since 2.18.0
 */

import type { Result } from "../../types.ts";
import { BumpType } from "../../types.ts";

/**
 * Valid release types as a const array for runtime checking
 *
 * @description Used for validating CLI arguments against allowed values.
 * The const assertion ensures the array is readonly and its values are literal types.
 */
export const RELEASE_TYPES = ["major", "minor", "patch"] as const;

/**
 * Type derived from RELEASE_TYPES array
 *
 * @description Creates a union type from the const array values.
 * This ensures runtime and compile-time types stay in sync.
 */
export type ReleaseType = typeof RELEASE_TYPES[number];

/**
 * Valid commands for the CLI
 *
 * @description All supported CLI commands as a const array.
 */
export const COMMANDS = ["init", "release", "rollback", "retry"] as const;

/**
 * Type for CLI commands
 */
export type Command = typeof COMMANDS[number];

/**
 * Validates and parses a release type from unknown input
 *
 * @description Safely validates user input as a release type with detailed error messages.
 * InfoSec: Prevents injection by validating against a fixed set of allowed values.
 *
 * @param input - Unknown input to validate
 * @returns Result with validated ReleaseType or error
 *
 * @example
 * ```typescript
 * const result = validateReleaseType("minor");
 * if (result.success) {
 *   console.log(`Valid type: ${result.data}`); // "minor"
 * }
 * ```
 */
export function validateReleaseType(input: unknown): Result<ReleaseType, Error> {
  // Type guard: ensure input is a string
  if (typeof input !== "string") {
    return {
      success: false,
      error: new TypeError(
        `Release type must be a string, received ${typeof input}`,
      ),
    };
  }

  // Normalize input (trim whitespace, lowercase)
  const normalized = input.trim().toLowerCase();

  // Validate against allowed values
  if (!RELEASE_TYPES.includes(normalized as ReleaseType)) {
    return {
      success: false,
      error: new Error(
        `Invalid release type: "${input}". Must be one of: ${RELEASE_TYPES.join(", ")}`,
      ),
    };
  }

  return {
    success: true,
    data: normalized as ReleaseType,
  };
}

/**
 * Validates a CLI command
 *
 * @description Validates that input is a supported CLI command.
 *
 * @param input - Unknown input to validate
 * @returns Result with validated Command or error
 */
export function validateCommand(input: unknown): Result<Command, Error> {
  if (typeof input !== "string") {
    return {
      success: false,
      error: new TypeError(`Command must be a string, received ${typeof input}`),
    };
  }

  const normalized = input.trim().toLowerCase();

  if (!COMMANDS.includes(normalized as Command)) {
    return {
      success: false,
      error: new Error(
        `Unknown command: "${input}". Available commands: ${COMMANDS.join(", ")}`,
      ),
    };
  }

  return {
    success: true,
    data: normalized as Command,
  };
}

/**
 * Validates a semantic version string
 *
 * @description Validates that input follows semantic versioning format.
 * InfoSec: Prevents version string injection by strict format validation.
 *
 * @param input - Unknown input to validate
 * @returns Result with validated version string or error
 *
 * @example
 * ```typescript
 * const result = validateVersion("1.2.3");
 * if (result.success) {
 *   console.log(`Valid version: ${result.data}`);
 * }
 * ```
 */
export function validateVersion(input: unknown): Result<string, Error> {
  if (typeof input !== "string") {
    return {
      success: false,
      error: new TypeError(`Version must be a string, received ${typeof input}`),
    };
  }

  const trimmed = input.trim();

  // Basic semver regex (supports v prefix and prerelease)
  const semverRegex = /^v?\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;

  if (!semverRegex.test(trimmed)) {
    return {
      success: false,
      error: new Error(
        `Invalid version format: "${input}". Expected format: X.Y.Z or vX.Y.Z`,
      ),
    };
  }

  return {
    success: true,
    data: trimmed,
  };
}

/**
 * Validates a file path
 *
 * @description Validates that a file path is safe and doesn't contain dangerous patterns.
 * InfoSec: Prevents path traversal attacks by checking for dangerous patterns.
 *
 * @param input - Unknown input to validate
 * @returns Result with validated path or error
 */
export function validateFilePath(input: unknown): Result<string, Error> {
  if (typeof input !== "string") {
    return {
      success: false,
      error: new TypeError(`File path must be a string, received ${typeof input}`),
    };
  }

  const trimmed = input.trim();

  // Check for empty path
  if (trimmed.length === 0) {
    return {
      success: false,
      error: new Error("File path cannot be empty"),
    };
  }

  // InfoSec: Check for path traversal attempts
  if (trimmed.includes("..")) {
    return {
      success: false,
      error: new Error("Path traversal patterns (..) are not allowed"),
    };
  }

  // InfoSec: Check for null bytes
  if (trimmed.includes("\0")) {
    return {
      success: false,
      error: new Error("Null bytes are not allowed in file paths"),
    };
  }

  // Check for absolute paths (we typically want relative paths)
  if (trimmed.startsWith("/") || trimmed.match(/^[A-Za-z]:\\/)) {
    return {
      success: false,
      error: new Error("Absolute paths are not allowed. Use relative paths."),
    };
  }

  return {
    success: true,
    data: trimmed,
  };
}

/**
 * Validates a git reference (branch, tag, or commit)
 *
 * @description Validates that input is a safe git reference.
 * InfoSec: Prevents command injection in git operations.
 *
 * @param input - Unknown input to validate
 * @returns Result with validated git ref or error
 */
export function validateGitRef(input: unknown): Result<string, Error> {
  if (typeof input !== "string") {
    return {
      success: false,
      error: new TypeError(`Git ref must be a string, received ${typeof input}`),
    };
  }

  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return {
      success: false,
      error: new Error("Git ref cannot be empty"),
    };
  }

  // InfoSec: Check for shell metacharacters
  const dangerousChars = /[;&|`$()<>\\]/;
  if (dangerousChars.test(trimmed)) {
    return {
      success: false,
      error: new Error("Git ref contains potentially dangerous characters"),
    };
  }

  // Check for valid git ref patterns
  const validGitRef = /^[a-zA-Z0-9._\-\/]+$/;
  if (!validGitRef.test(trimmed)) {
    return {
      success: false,
      error: new Error(
        "Invalid git ref format. Only alphanumeric, dots, dashes, underscores, and slashes allowed",
      ),
    };
  }

  return {
    success: true,
    data: trimmed,
  };
}

/**
 * Type guard to check if a value is a Result success
 *
 * @description Type guard for narrowing Result types in conditionals.
 *
 * @param result - Result to check
 * @returns True if result is successful
 *
 * @example
 * ```typescript
 * const result = validateVersion("1.2.3");
 * if (isSuccess(result)) {
 *   // result.data is available and typed
 *   console.log(result.data);
 * }
 * ```
 */
export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard to check if a value is a Result error
 *
 * @description Type guard for error handling in Result types.
 *
 * @param result - Result to check
 * @returns True if result is an error
 */
export function isError<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false;
}

/**
 * Combines multiple validation results
 *
 * @description Combines multiple Result types into a single Result.
 * If all succeed, returns success with array of data. If any fail, returns first error.
 *
 * @param results - Array of Results to combine
 * @returns Combined Result
 *
 * @example
 * ```typescript
 * const results = [
 *   validateVersion("1.2.3"),
 *   validateReleaseType("minor"),
 * ];
 * const combined = combineResults(results);
 * ```
 */
export function combineResults<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const data: T[] = [];

  for (const result of results) {
    if (!result.success) {
      return { success: false, error: result.error };
    }
    data.push(result.data);
  }

  return { success: true, data };
}

/**
 * Creates a successful Result
 *
 * @description Helper function for creating success Results.
 *
 * @param data - Data for successful result
 * @returns Success Result
 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Creates an error Result
 *
 * @description Helper function for creating error Results.
 *
 * @param error - Error for failed result
 * @returns Error Result
 */
export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}
