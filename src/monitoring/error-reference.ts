/**
 * @fileoverview Nagare Error Reference Guide
 * @description Comprehensive documentation of all errors that can occur in Nagare
 * @author Rick Cogley
 * @since 1.9.0
 *
 * @module error-reference
 */

/**
 * # Nagare Error Reference
 *
 * This document provides a comprehensive reference for all errors that can occur
 * when using Nagare. Each error includes its code, common causes, and resolution steps.
 *
 * ## Error Structure
 *
 * All Nagare errors follow a consistent structure:
 * - **Error Code**: A unique identifier for the error type
 * - **Message**: A clear description of what went wrong
 * - **Suggestions**: Actionable steps to resolve the error
 * - **Context**: Additional information about the error state
 *
 * ## Common Error Scenarios
 *
 * ### Release Process Errors
 *
 * The most common errors during release:
 *
 * 1. **Uncommitted Changes** (`GIT_UNCOMMITTED_CHANGES`)
 *    - Cause: Local changes not committed before release
 *    - Fix: Commit, stash, or discard changes
 *
 * 2. **Version Not Found** (`VERSION_NOT_FOUND`)
 *    - Cause: Version pattern doesn't match file content
 *    - Fix: Check version file format and patterns
 *
 * 3. **Configuration Missing** (`CONFIG_NOT_FOUND`)
 *    - Cause: No nagare.config.ts file found
 *    - Fix: Run `nagare init` or create config manually
 *
 * ### File Update Errors
 *
 * Errors when updating project files:
 *
 * 1. **No File Handler** (`FILE_HANDLER_NOT_FOUND`)
 *    - Cause: No built-in handler for file type
 *    - Fix: Add custom updateFn in config
 *
 * 2. **Pattern No Match** (`FILE_PATTERN_NO_MATCH`)
 *    - Cause: Update pattern didn't match content
 *    - Fix: Verify pattern with file content
 *
 * 3. **Invalid JSON** (`FILE_JSON_INVALID`)
 *    - Cause: JSON syntax error in file
 *    - Fix: Validate and fix JSON syntax
 *
 * ## Error Code Reference
 *
 * See {@link ErrorCodes} for the complete list of error codes.
 *
 * ## Error Handling Best Practices
 *
 * ### In Application Code
 *
 * ```typescript
 * import { NagareError, ErrorCodes } from "@rick/nagare";
 *
 * try {
 *   await releaseManager.release();
 * } catch (error) {
 *   if (error instanceof NagareError) {
 *     // Nagare errors have structured information
 *     console.error(error.toString()); // Formatted output
 *
 *     // Handle specific error types
 *     switch (error.code) {
 *       case ErrorCodes.GIT_UNCOMMITTED_CHANGES:
 *         // Handle uncommitted changes
 *         break;
 *       case ErrorCodes.CONFIG_NOT_FOUND:
 *         // Handle missing config
 *         break;
 *     }
 *   } else {
 *     // Handle unexpected errors
 *     console.error("Unexpected error:", error);
 *   }
 * }
 * ```
 *
 * ### In Configuration
 *
 * ```typescript
 * export default {
 *   // Proper error handling in custom functions
 *   updateFiles: [{
 *     path: "./custom.json",
 *     updateFn: (content, data) => {
 *       try {
 *         const json = JSON.parse(content);
 *         json.version = data.version;
 *         return JSON.stringify(json, null, 2);
 *       } catch (e) {
 *         // Throw NagareError for better diagnostics
 *         throw new NagareError(
 *           "Failed to parse custom.json",
 *           ErrorCodes.FILE_JSON_INVALID,
 *           ["Check JSON syntax", "Validate at jsonlint.com"],
 *           { parseError: e.message }
 *         );
 *       }
 *     }
 *   }]
 * } as NagareConfig;
 * ```
 *
 * ## Debugging Tips
 *
 * 1. **Enable Debug Logging**
 *    ```bash
 *    nagare release --log-level DEBUG
 *    ```
 *
 * 2. **Use Dry Run Mode**
 *    ```bash
 *    nagare release --dry-run
 *    ```
 *
 * 3. **Check Error Context**
 *    - Error context often contains file paths, patterns, or values
 *    - Use this information to diagnose the issue
 *
 * 4. **Follow Error Suggestions**
 *    - Each error includes specific steps to resolve it
 *    - Try suggestions in order for best results
 *
 * ## Reporting Issues
 *
 * If you encounter an error that:
 * - Has unclear suggestions
 * - Seems to be a bug in Nagare
 * - Is not documented here
 *
 * Please report it at: https://github.com/RickCogley/nagare/issues
 *
 * Include:
 * - The full error output
 * - Your nagare.config.ts (sanitized)
 * - Steps to reproduce
 * - Nagare version (`nagare --version`)
 */

// This file exists primarily for documentation purposes
// All exports are re-exported from enhanced-error.ts
export { ErrorCodes, ErrorFactory, NagareError } from "./core/enhanced-error.ts";
export type { ErrorCode } from "./core/enhanced-error.ts";
