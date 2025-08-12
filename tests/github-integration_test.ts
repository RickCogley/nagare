/**
 * @fileoverview Unit tests for GitHubIntegration
 * @module github-integration_test
 */

import { assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { GitHubIntegration } from "../src/git/github-integration.ts";
import type { NagareConfig, ReleaseNotes } from "../types.ts";

function createTestConfig(overrides?: Partial<NagareConfig>): NagareConfig {
  return {
    project: {
      name: "test-project",
      repository: "https://github.com/test/project",
    },
    versionFile: {
      path: "./version.ts",
      template: "typescript",
    },
    github: {
      createRelease: true,
      ...overrides?.github,
    },
    options: {
      tagPrefix: "v",
      ...overrides?.options,
    },
    ...overrides,
  };
}

function createTestReleaseNotes(overrides?: Partial<ReleaseNotes>): ReleaseNotes {
  return {
    version: "1.0.0",
    date: "2024-01-01",
    added: [],
    changed: [],
    deprecated: [],
    removed: [],
    fixed: [],
    security: [],
    hasPRs: false,
    ...overrides,
  };
}

// =============================================================================
// Constructor Tests
// =============================================================================

Deno.test("GitHubIntegration - constructor initializes properly", () => {
  const config = createTestConfig();
  const integration = new GitHubIntegration(config);

  assertExists(integration);
});

// =============================================================================
// Release Creation Tests
// =============================================================================

Deno.test("GitHubIntegration - skips release when not configured", async () => {
  const config = createTestConfig({
    github: {
      createRelease: false,
    },
  });
  const integration = new GitHubIntegration(config);
  const notes = createTestReleaseNotes();

  const result = await integration.createRelease(notes);

  assertEquals(result, undefined);
});

Deno.test("GitHubIntegration - createRelease with all note types", async () => {
  const config = createTestConfig();
  const integration = new GitHubIntegration(config);

  // Mock the private runCommand method
  const originalCommand = Deno.Command;
  let capturedCommands: string[][] = [];
  let tempFilePath = "";

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(cmd: string, options?: any) {
      const fullCmd = [cmd, ...(options?.args || [])];
      capturedCommands.push(fullCmd);

      // Capture temp file path from gh release create command
      if (cmd === "gh" && options?.args?.includes("release")) {
        const notesFileIndex = options.args.indexOf("--notes-file");
        if (notesFileIndex !== -1) {
          tempFilePath = options.args[notesFileIndex + 1];
        }
      }
    }

    output = async () => ({
      success: true,
      code: 0,
      stdout: new TextEncoder().encode("gh version 2.0.0"),
      stderr: new Uint8Array(),
    });
  };

  // Mock file operations
  const originalMakeTempFile = Deno.makeTempFile;
  const originalWriteTextFile = Deno.writeTextFile;
  const originalRemove = Deno.remove;

  let writtenContent = "";
  Deno.makeTempFile = async () => "/tmp/test-release.md";
  Deno.writeTextFile = async (_path: string, content: string) => {
    writtenContent = content;
  };
  Deno.remove = async () => {};

  try {
    const notes = createTestReleaseNotes({
      version: "2.0.0",
      added: ["New feature", "Another feature"],
      changed: ["Updated API"],
      deprecated: ["Old method"],
      removed: ["Legacy code"],
      fixed: ["Bug fix"],
      security: ["Security patch"],
    });

    const result = await integration.createRelease(notes);

    // Check result
    assertExists(result);
    assertEquals(result, "https://github.com/test/project/releases/tag/v2.0.0");

    // Check gh commands
    assertEquals(capturedCommands.length, 2);
    assertEquals(capturedCommands[0][0], "gh");
    assertEquals(capturedCommands[0][1], "--version");

    assertEquals(capturedCommands[1][0], "gh");
    assertEquals(capturedCommands[1][1], "release");
    assertEquals(capturedCommands[1][2], "create");
    assertEquals(capturedCommands[1][3], "v2.0.0");

    // Check release notes content
    assertStringIncludes(writtenContent, "## What's Changed");
    assertStringIncludes(writtenContent, "### ✨ Added");
    assertStringIncludes(writtenContent, "- New feature");
    assertStringIncludes(writtenContent, "### 🔄 Changed");
    assertStringIncludes(writtenContent, "### ⚠️ Deprecated");
    assertStringIncludes(writtenContent, "### 🗑️ Removed");
    assertStringIncludes(writtenContent, "### 🐛 Fixed");
    assertStringIncludes(writtenContent, "### 🔒 Security");
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
    Deno.makeTempFile = originalMakeTempFile;
    Deno.writeTextFile = originalWriteTextFile;
    Deno.remove = originalRemove;
  }
});

Deno.test("GitHubIntegration - handles gh CLI not found", async () => {
  const config = createTestConfig();
  const integration = new GitHubIntegration(config);

  // Mock Command to simulate gh not found
  const originalCommand = Deno.Command;

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(_cmd: string, _options?: any) {}

    output = async () => ({
      success: false,
      code: 127,
      stdout: new Uint8Array(),
      stderr: new TextEncoder().encode("gh: command not found"),
    });
  };

  try {
    const notes = createTestReleaseNotes();
    const result = await integration.createRelease(notes);

    // Should return undefined when gh is not available
    assertEquals(result, undefined);
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
  }
});

Deno.test("GitHubIntegration - uses custom tag prefix", async () => {
  const config = createTestConfig({
    options: {
      tagPrefix: "release-",
    },
  });
  const integration = new GitHubIntegration(config);

  // Mock Command
  const originalCommand = Deno.Command;
  let capturedTag = "";

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(cmd: string, options?: any) {
      if (cmd === "gh" && options?.args?.includes("create")) {
        // Find the index of "create" and the tag is the next argument
        const createIndex = options.args.indexOf("create");
        if (createIndex !== -1 && createIndex + 1 < options.args.length) {
          capturedTag = options.args[createIndex + 1];
        }
      }
    }

    output = async () => ({
      success: true,
      code: 0,
      stdout: new TextEncoder().encode("gh version 2.0.0"),
      stderr: new Uint8Array(),
    });
  };

  // Mock file operations
  const originalMakeTempFile = Deno.makeTempFile;
  const originalWriteTextFile = Deno.writeTextFile;
  const originalRemove = Deno.remove;

  Deno.makeTempFile = async () => "/tmp/test.md";
  Deno.writeTextFile = async () => {};
  Deno.remove = async () => {};

  try {
    const notes = createTestReleaseNotes({ version: "3.0.0" });
    await integration.createRelease(notes);

    assertEquals(capturedTag, "release-3.0.0");
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
    Deno.makeTempFile = originalMakeTempFile;
    Deno.writeTextFile = originalWriteTextFile;
    Deno.remove = originalRemove;
  }
});

Deno.test("GitHubIntegration - handles release creation failure", async () => {
  const config = createTestConfig();
  const integration = new GitHubIntegration(config);

  // Mock Command to simulate failure
  const originalCommand = Deno.Command;
  let commandCount = 0;

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(_cmd: string, _options?: any) {}

    output = async () => {
      commandCount++;
      if (commandCount === 1) {
        // First call is version check - succeed
        return {
          success: true,
          code: 0,
          stdout: new TextEncoder().encode("gh version 2.0.0"),
          stderr: new Uint8Array(),
        };
      } else {
        // Second call is release creation - fail
        return {
          success: false,
          code: 1,
          stdout: new Uint8Array(),
          stderr: new TextEncoder().encode("Error creating release"),
        };
      }
    };
  };

  // Mock file operations
  const originalMakeTempFile = Deno.makeTempFile;
  const originalWriteTextFile = Deno.writeTextFile;
  const originalRemove = Deno.remove;

  Deno.makeTempFile = async () => "/tmp/test.md";
  Deno.writeTextFile = async () => {};
  Deno.remove = async () => {};

  try {
    const notes = createTestReleaseNotes();
    const result = await integration.createRelease(notes);

    // Should return undefined on failure
    assertEquals(result, undefined);
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
    Deno.makeTempFile = originalMakeTempFile;
    Deno.writeTextFile = originalWriteTextFile;
    Deno.remove = originalRemove;
  }
});

Deno.test("GitHubIntegration - cleans up temp file even on error", async () => {
  const config = createTestConfig();
  const integration = new GitHubIntegration(config);

  // Mock Command
  const originalCommand = Deno.Command;
  let commandCount = 0;

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(_cmd: string, _options?: any) {}

    output = async () => {
      commandCount++;
      if (commandCount === 1) {
        return {
          success: true,
          code: 0,
          stdout: new TextEncoder().encode("gh version 2.0.0"),
          stderr: new Uint8Array(),
        };
      } else {
        throw new Error("Command failed");
      }
    };
  };

  // Mock file operations
  const originalMakeTempFile = Deno.makeTempFile;
  const originalWriteTextFile = Deno.writeTextFile;
  const originalRemove = Deno.remove;

  let removeCallCount = 0;
  const tempPath = "/tmp/test-cleanup.md";

  Deno.makeTempFile = async () => tempPath;
  Deno.writeTextFile = async () => {};
  Deno.remove = async (path) => {
    if (path === tempPath) {
      removeCallCount++;
    }
  };

  try {
    const notes = createTestReleaseNotes();
    await integration.createRelease(notes);

    // Should have attempted to remove temp file
    assertEquals(removeCallCount, 1);
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
    Deno.makeTempFile = originalMakeTempFile;
    Deno.writeTextFile = originalWriteTextFile;
    Deno.remove = originalRemove;
  }
});

// =============================================================================
// Release Body Formatting Tests
// =============================================================================

Deno.test("GitHubIntegration - formats empty release notes", async () => {
  const config = createTestConfig();
  const integration = new GitHubIntegration(config);

  // Mock everything
  const originalCommand = Deno.Command;
  const originalMakeTempFile = Deno.makeTempFile;
  const originalWriteTextFile = Deno.writeTextFile;
  const originalRemove = Deno.remove;

  let writtenContent = "";

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(_cmd: string, _options?: any) {}
    output = async () => ({
      success: true,
      code: 0,
      stdout: new TextEncoder().encode("gh version 2.0.0"),
      stderr: new Uint8Array(),
    });
  };

  Deno.makeTempFile = async () => "/tmp/test.md";
  Deno.writeTextFile = async (_path: string, content: string) => {
    writtenContent = content;
  };
  Deno.remove = async () => {};

  try {
    const notes = createTestReleaseNotes();
    await integration.createRelease(notes);

    // Should have minimal content for empty notes
    assertEquals(writtenContent, "## What's Changed");
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
    Deno.makeTempFile = originalMakeTempFile;
    Deno.writeTextFile = originalWriteTextFile;
    Deno.remove = originalRemove;
  }
});

Deno.test("GitHubIntegration - formats release title correctly", async () => {
  const config = createTestConfig();
  const integration = new GitHubIntegration(config);

  // Mock Command
  const originalCommand = Deno.Command;
  let capturedTitle = "";

  // deno-lint-ignore no-explicit-any
  (Deno as any).Command = class MockCommand {
    constructor(cmd: string, options?: any) {
      if (cmd === "gh" && options?.args?.includes("create")) {
        const titleIndex = options.args.indexOf("--title");
        if (titleIndex !== -1) {
          capturedTitle = options.args[titleIndex + 1];
        }
      }
    }

    output = async () => ({
      success: true,
      code: 0,
      stdout: new TextEncoder().encode("gh version 2.0.0"),
      stderr: new Uint8Array(),
    });
  };

  // Mock file operations
  const originalMakeTempFile = Deno.makeTempFile;
  const originalWriteTextFile = Deno.writeTextFile;
  const originalRemove = Deno.remove;

  Deno.makeTempFile = async () => "/tmp/test.md";
  Deno.writeTextFile = async () => {};
  Deno.remove = async () => {};

  try {
    const notes = createTestReleaseNotes({ version: "4.5.6" });
    await integration.createRelease(notes);

    assertEquals(capturedTitle, "Release 4.5.6");
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = originalCommand;
    Deno.makeTempFile = originalMakeTempFile;
    Deno.writeTextFile = originalWriteTextFile;
    Deno.remove = originalRemove;
  }
});
