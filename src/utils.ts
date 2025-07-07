/**
 * Utility functions for Nagare
 * @module
 */

import { NagareError } from "./enhanced-error.ts";

/**
 * Options for running a shell command
 */
export interface RunCommandOptions {
  /** Working directory for the command */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Whether to capture stdout (default: true) */
  stdout?: boolean;
  /** Whether to capture stderr (default: true) */
  stderr?: boolean;
  /** Whether to throw on non-zero exit code (default: true) */
  throwOnError?: boolean;
}

/**
 * Result of running a shell command
 */
export interface RunCommandResult {
  /** Exit code of the command */
  code: number;
  /** Standard output */
  stdout: string;
  /** Standard error output */
  stderr: string;
  /** Whether the command succeeded (exit code 0) */
  success: boolean;
}

/**
 * Executes a shell command and returns its output
 *
 * @param command - The command to execute
 * @param args - Command arguments
 * @param options - Execution options
 * @returns Command execution result
 * @throws {NagareError} If command fails and throwOnError is true
 *
 * @example
 * ```typescript
 * // Simple command
 * const result = await runCommand("git", ["status"]);
 * console.log(result.stdout);
 *
 * // With options
 * const result = await runCommand("npm", ["test"], {
 *   cwd: "/path/to/project",
 *   throwOnError: false
 * });
 * if (!result.success) {
 *   console.error("Tests failed:", result.stderr);
 * }
 * ```
 */
export async function runCommand(
  command: string,
  args: string[] = [],
  options: RunCommandOptions = {},
): Promise<RunCommandResult> {
  const {
    cwd = Deno.cwd(),
    env,
    stdout = true,
    stderr = true,
    throwOnError = true,
  } = options;

  try {
    const cmd = new Deno.Command(command, {
      args,
      cwd,
      env: env ? { ...Deno.env.toObject(), ...env } : undefined,
      stdout: stdout ? "piped" : "null",
      stderr: stderr ? "piped" : "null",
    });

    const output = await cmd.output();

    const result: RunCommandResult = {
      code: output.code,
      stdout: stdout ? new TextDecoder().decode(output.stdout) : "",
      stderr: stderr ? new TextDecoder().decode(output.stderr) : "",
      success: output.code === 0,
    };

    if (!result.success && throwOnError) {
      throw new NagareError(
        `Command failed: ${command} ${args.join(" ")}`,
        "COMMAND_FAILED",
        undefined,
        {
          command,
          args,
          code: result.code,
          stderr: result.stderr,
        },
      );
    }

    return result;
  } catch (error) {
    if (error instanceof NagareError) {
      throw error;
    }

    // Handle Deno.Command errors (e.g., command not found)
    throw new NagareError(
      `Failed to execute command: ${command}`,
      "COMMAND_EXECUTION_ERROR",
      undefined,
      {
        command,
        args,
        error: error instanceof Error ? error.message : String(error),
      },
    );
  }
}

/**
 * Executes a shell command and returns only the stdout
 * Convenience wrapper around runCommand for simple cases
 *
 * @param command - The command to execute
 * @param args - Command arguments
 * @param options - Execution options
 * @returns Command stdout output
 * @throws {NagareError} If command fails
 *
 * @example
 * ```typescript
 * const branch = await runCommandSimple("git", ["branch", "--show-current"]);
 * console.log("Current branch:", branch.trim());
 * ```
 */
export async function runCommandSimple(
  command: string,
  args: string[] = [],
  options: Omit<RunCommandOptions, "throwOnError"> = {},
): Promise<string> {
  const result = await runCommand(command, args, { ...options, throwOnError: true });
  return result.stdout;
}

/**
 * Checks if a command is available in the system PATH
 *
 * @param command - The command to check
 * @returns Whether the command is available
 *
 * @example
 * ```typescript
 * if (await isCommandAvailable("gh")) {
 *   console.log("GitHub CLI is installed");
 * }
 * ```
 */
export async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    const result = await runCommand(
      Deno.build.os === "windows" ? "where" : "which",
      [command],
      { throwOnError: false, stdout: false, stderr: false },
    );
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Sanitizes a string for safe use in shell commands
 *
 * @param input - The string to sanitize
 * @returns Sanitized string
 *
 * @example
 * ```typescript
 * const userInput = "some; malicious && command";
 * const safe = sanitizeForShell(userInput);
 * await runCommand("echo", [safe]);
 * ```
 */
export function sanitizeForShell(input: string): string {
  // Remove potentially dangerous characters
  return input.replace(/[;&|`$()<>\\]/g, "");
}

/**
 * Formats command output for display
 * Removes trailing whitespace and empty lines
 *
 * @param output - Raw command output
 * @returns Formatted output
 */
export function formatCommandOutput(output: string): string {
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, index, arr) => {
      // Keep non-empty lines and single empty lines between content
      return line !== "" || (index > 0 && index < arr.length - 1 && arr[index - 1] !== "");
    })
    .join("\n")
    .trim();
}
