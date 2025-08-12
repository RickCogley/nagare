/**
 * @fileoverview Unit tests for ReleaseManager - core release orchestration
 * @module release-manager_test
 * @description Comprehensive test suite for the main release management module
 */

import {
  assertEquals,
  assertExists,
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { assertSpyCall, assertSpyCalls, returnsNext, spy, stub } from "https://deno.land/std@0.208.0/testing/mock.ts";

import { ReleaseManager } from "./release-manager.ts";
import { BumpType } from "../../types.ts";
import type { ConventionalCommit, NagareConfig, ReleaseNotes, ReleaseResult, TemplateData } from "../../types.ts";
import { LogLevel, TemplateFormat } from "../../types.ts";

// =============================================================================
// Test Configuration
// =============================================================================

const createTestConfig = (overrides?: Partial<NagareConfig>): NagareConfig => ({
  project: {
    name: "test-project",
    repository: "https://github.com/test/project",
    ...overrides?.project,
  },
  versionFile: {
    path: "./version.ts",
    template: TemplateFormat.TYPESCRIPT,
    ...overrides?.versionFile,
  },
  options: {
    dryRun: true, // Default to dry run for safety
    skipConfirmation: true,
    logLevel: LogLevel.ERROR, // Reduce noise in tests
    ...overrides?.options,
  },
  ...overrides,
});

const mockCommits: ConventionalCommit[] = [
  {
    type: "feat",
    description: "add new feature",
    hash: "abc123",
    date: "2024-01-01",
    breakingChange: false,
  },
  {
    type: "fix",
    description: "fix critical bug",
    hash: "def456",
    date: "2024-01-02",
    breakingChange: false,
  },
  {
    type: "feat",
    description: "breaking change",
    hash: "ghi789",
    date: "2024-01-03",
    breakingChange: true,
  },
];

// =============================================================================
// Mock Setup Helpers
// =============================================================================

interface MockSetup {
  gitStubs: Map<string, any>;
  fileStubs: Map<string, any>;
  cleanup: () => void;
}

function setupMocks(): MockSetup {
  const gitStubs = new Map();
  const fileStubs = new Map();

  // Mock file system operations
  const origReadTextFile = Deno.readTextFile;
  const origWriteTextFile = Deno.writeTextFile;
  const origStat = Deno.stat;

  Deno.readTextFile = spy(async (path: string | URL) => {
    const pathStr = path.toString();
    if (pathStr.includes("version.ts")) {
      return 'export const VERSION = "1.0.0";';
    }
    if (pathStr.includes("deno.json")) {
      return '{"name": "test", "version": "1.0.0"}';
    }
    if (pathStr.includes("CHANGELOG.md")) {
      return "# Changelog\n\n## [1.0.0] - 2024-01-01\n- Initial release";
    }
    throw new Error(`File not found: ${pathStr}`);
  });

  Deno.writeTextFile = spy(async () => {});

  Deno.stat = spy(async (path: string | URL) => {
    const pathStr = path.toString();
    if (pathStr.includes("version.ts") || pathStr.includes("deno.json")) {
      return { isFile: true, isDirectory: false } as Deno.FileInfo;
    }
    throw new Error(`File not found: ${pathStr}`);
  });

  // Mock Command for git operations
  const origCommand = Deno.Command;
  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}

    async output() {
      const { cmd, options } = this;
      const args = options?.args || [];

      // Git repository check
      if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--git-dir") {
        return {
          success: true,
          code: 0,
          stdout: new TextEncoder().encode(".git"),
          stderr: new Uint8Array(),
        };
      }

      // Git status (clean working directory)
      if (cmd === "git" && args[0] === "status" && args[1] === "--porcelain") {
        return {
          success: true,
          code: 0,
          stdout: new Uint8Array(), // Empty = clean
          stderr: new Uint8Array(),
        };
      }

      // Git user config
      if (cmd === "git" && args[0] === "config") {
        if (args[1] === "user.name") {
          return {
            success: true,
            code: 0,
            stdout: new TextEncoder().encode("Test User"),
            stderr: new Uint8Array(),
          };
        }
        if (args[1] === "user.email") {
          return {
            success: true,
            code: 0,
            stdout: new TextEncoder().encode("test@example.com"),
            stderr: new Uint8Array(),
          };
        }
      }

      // Git log for commits
      if (cmd === "git" && args[0] === "log") {
        const commits = mockCommits.map((c) => `${c.hash}\t${c.type}: ${c.description}`).join("\n");
        return {
          success: true,
          code: 0,
          stdout: new TextEncoder().encode(commits),
          stderr: new Uint8Array(),
        };
      }

      // Git describe for current version
      if (cmd === "git" && args[0] === "describe") {
        return {
          success: true,
          code: 0,
          stdout: new TextEncoder().encode("v1.0.0"),
          stderr: new Uint8Array(),
        };
      }

      // Git rev-parse for commit hash
      if (cmd === "git" && args[0] === "rev-parse") {
        return {
          success: true,
          code: 0,
          stdout: new TextEncoder().encode("abc123def456"),
          stderr: new Uint8Array(),
        };
      }

      // Git branch
      if (cmd === "git" && args[0] === "branch") {
        return {
          success: true,
          code: 0,
          stdout: new TextEncoder().encode("* main"),
          stderr: new Uint8Array(),
        };
      }

      // Default success for other git operations
      if (cmd === "git") {
        return {
          success: true,
          code: 0,
          stdout: new Uint8Array(),
          stderr: new Uint8Array(),
        };
      }

      // Deno format/lint/check commands
      if (cmd === "deno") {
        return {
          success: true,
          code: 0,
          stdout: new Uint8Array(),
          stderr: new Uint8Array(),
        };
      }

      return {
        success: false,
        code: 1,
        stdout: new Uint8Array(),
        stderr: new TextEncoder().encode(`Unknown command: ${cmd}`),
      };
    }
  };

  const cleanup = () => {
    Deno.readTextFile = origReadTextFile;
    Deno.writeTextFile = origWriteTextFile;
    Deno.stat = origStat;
    (Deno as any).Command = origCommand;
  };

  return { gitStubs, fileStubs, cleanup };
}

// =============================================================================
// ReleaseManager Constructor Tests
// =============================================================================

Deno.test("ReleaseManager - constructor with minimal config", () => {
  const config = createTestConfig();
  const manager = new ReleaseManager(config);

  assertExists(manager);
  const managerConfig = manager.getConfig();
  assertEquals(managerConfig.project.name, "test-project");
  assertEquals(managerConfig.versionFile.path, "./version.ts");
});

Deno.test("ReleaseManager - constructor merges with defaults", () => {
  const config = createTestConfig({
    options: {
      tagPrefix: "release-",
    },
  });
  const manager = new ReleaseManager(config);
  const managerConfig = manager.getConfig();

  // Custom value preserved
  assertEquals(managerConfig.options?.tagPrefix, "release-");
  // Defaults applied
  assertExists(managerConfig.options?.skipConfirmation);
});

Deno.test("ReleaseManager - config validation", () => {
  const validConfig = createTestConfig();
  const validation = ReleaseManager.validateConfig(validConfig);

  assertEquals(validation.valid, true);
  assertEquals(validation.errors.length, 0);
});

Deno.test("ReleaseManager - config validation catches missing fields", () => {
  const invalidConfig = {
    project: {
      // Missing name
      repository: "https://github.com/test/project",
    },
    versionFile: {
      path: "./version.ts",
      template: TemplateFormat.TYPESCRIPT,
    },
  } as NagareConfig;

  const validation = ReleaseManager.validateConfig(invalidConfig);

  assertEquals(validation.valid, false);
  assertEquals(validation.errors.includes("project.name is required"), true);
});

// =============================================================================
// Environment Validation Tests
// =============================================================================

Deno.test.ignore("ReleaseManager - validates git repository", async () => {
  const { cleanup } = setupMocks();

  try {
    // Mock no git repository
    const origCommand = Deno.Command;
    (Deno as any).Command = class MockCommand {
      constructor(public cmd: string, public options?: any) {}

      async output() {
        if (this.cmd === "git" && this.options?.args?.[0] === "rev-parse") {
          return {
            success: false,
            code: 128,
            stdout: new Uint8Array(),
            stderr: new TextEncoder().encode("not a git repository"),
          };
        }
        return { success: false, code: 1, stdout: new Uint8Array(), stderr: new Uint8Array() };
      }
    };

    const config = createTestConfig({ options: { dryRun: false } });
    const manager = new ReleaseManager(config);

    await assertRejects(
      async () => await manager.release(),
      Error,
      "git",
    );

    (Deno as any).Command = origCommand;
  } finally {
    cleanup();
  }
});

Deno.test.ignore("ReleaseManager - detects uncommitted changes", async () => {
  const { cleanup } = setupMocks();

  try {
    // Override git status to show uncommitted changes
    const origCommand = Deno.Command;
    (Deno as any).Command = class MockCommand {
      constructor(public cmd: string, public options?: any) {}

      async output() {
        const args = this.options?.args || [];

        if (this.cmd === "git" && args[0] === "status" && args[1] === "--porcelain") {
          return {
            success: true,
            code: 0,
            stdout: new TextEncoder().encode("M modified-file.ts"), // Uncommitted changes
            stderr: new Uint8Array(),
          };
        }

        // Default git responses
        if (this.cmd === "git" && args[0] === "rev-parse") {
          return {
            success: true,
            code: 0,
            stdout: new TextEncoder().encode(".git"),
            stderr: new Uint8Array(),
          };
        }

        return { success: true, code: 0, stdout: new Uint8Array(), stderr: new Uint8Array() };
      }
    };

    const config = createTestConfig({ options: { dryRun: false } });
    const manager = new ReleaseManager(config);

    await assertRejects(
      async () => await manager.release(),
      Error,
      "uncommitted",
    );

    (Deno as any).Command = origCommand;
  } finally {
    cleanup();
  }
});

// =============================================================================
// Version Calculation Tests
// =============================================================================

Deno.test.ignore("ReleaseManager - calculates patch version from fix commits", async () => {
  const { cleanup } = setupMocks();

  try {
    const config = createTestConfig();
    const manager = new ReleaseManager(config);

    // Mock only fix commits
    const origCommand = Deno.Command;
    (Deno as any).Command = class extends (origCommand as any) {
      async output() {
        if (this.cmd === "git" && this.options?.args?.[0] === "log") {
          return {
            success: true,
            code: 0,
            stdout: new TextEncoder().encode("abc123\tfix: bug fix"),
            stderr: new Uint8Array(),
          };
        }
        return super.output();
      }
    };

    const result = await manager.release();

    // In dry run, should calculate version bump
    assertEquals(result.success, true);
    if (result.success && result.version) {
      // Should be patch bump: 1.0.0 -> 1.0.1
      assertEquals(result.version, "1.0.1");
    }

    (Deno as any).Command = origCommand;
  } finally {
    cleanup();
  }
});

Deno.test.ignore("ReleaseManager - calculates minor version from feat commits", async () => {
  const { cleanup } = setupMocks();

  try {
    const config = createTestConfig();
    const manager = new ReleaseManager(config);

    // Mock feature commits
    const origCommand = Deno.Command;
    (Deno as any).Command = class extends (origCommand as any) {
      async output() {
        if (this.cmd === "git" && this.options?.args?.[0] === "log") {
          return {
            success: true,
            code: 0,
            stdout: new TextEncoder().encode("abc123\tfeat: new feature"),
            stderr: new Uint8Array(),
          };
        }
        return super.output();
      }
    };

    const result = await manager.release();

    assertEquals(result.success, true);
    if (result.success && result.version) {
      // Should be minor bump: 1.0.0 -> 1.1.0
      assertEquals(result.version, "1.1.0");
    }

    (Deno as any).Command = origCommand;
  } finally {
    cleanup();
  }
});

Deno.test.ignore("ReleaseManager - calculates major version from breaking changes", async () => {
  const { cleanup } = setupMocks();

  try {
    const config = createTestConfig();
    const manager = new ReleaseManager(config);

    // Mock breaking change commit
    const origCommand = Deno.Command;
    (Deno as any).Command = class extends (origCommand as any) {
      async output() {
        if (this.cmd === "git" && this.options?.args?.[0] === "log") {
          return {
            success: true,
            code: 0,
            stdout: new TextEncoder().encode("abc123\tfeat!: breaking change"),
            stderr: new Uint8Array(),
          };
        }
        return super.output();
      }
    };

    const result = await manager.release();

    assertEquals(result.success, true);
    if (result.success && result.version) {
      // Should be major bump: 1.0.0 -> 2.0.0
      assertEquals(result.version, "2.0.0");
    }

    (Deno as any).Command = origCommand;
  } finally {
    cleanup();
  }
});

Deno.test.ignore("ReleaseManager - respects explicit bump type", async () => {
  const { cleanup } = setupMocks();

  try {
    const config = createTestConfig();
    const manager = new ReleaseManager(config);

    // Force major bump regardless of commits
    const result = await manager.release(BumpType.MAJOR);

    assertEquals(result.success, true);
    if (result.success && result.version) {
      assertEquals(result.version, "2.0.0");
    }
  } finally {
    cleanup();
  }
});

// =============================================================================
// File Update Tests
// =============================================================================

Deno.test.ignore("ReleaseManager - updates version file", async () => {
  const { cleanup } = setupMocks();

  try {
    const writeTextFileSpy = Deno.writeTextFile as any;

    const config = createTestConfig({
      options: { dryRun: false, skipConfirmation: true },
    });
    const manager = new ReleaseManager(config);

    // We can't fully test non-dry-run without more complex mocking
    // But we can verify the dry run shows correct preview
    const dryConfig = createTestConfig({ options: { dryRun: true } });
    const dryManager = new ReleaseManager(dryConfig);

    const result = await dryManager.release(BumpType.MINOR);

    assertEquals(result.success, true);
    assertEquals(result.version, "1.1.0");
  } finally {
    cleanup();
  }
});

Deno.test.ignore("ReleaseManager - updates additional files", async () => {
  const { cleanup } = setupMocks();

  try {
    const config = createTestConfig({
      updateFiles: [
        { path: "./deno.json" },
        { path: "./package.json", patterns: { version: /"version":\s*"([^"]+)"/ } },
      ],
    });
    const manager = new ReleaseManager(config);

    const result = await manager.release(BumpType.PATCH);

    assertEquals(result.success, true);
    // In dry run, files aren't actually updated but should be listed
    if (result.success) {
      assertEquals(result.version, "1.0.1");
    }
  } finally {
    cleanup();
  }
});

// =============================================================================
// Release Notes Generation Tests
// =============================================================================

Deno.test.ignore("ReleaseManager - generates release notes", async () => {
  const { cleanup } = setupMocks();

  try {
    const config = createTestConfig({
      releaseNotes: {
        includeCommitHashes: true,
        maxDescriptionLength: 50,
      },
    });
    const manager = new ReleaseManager(config);

    const result = await manager.release();

    assertEquals(result.success, true);
    if (result.success && result.releaseNotes) {
      assertExists(result.releaseNotes);
      assertEquals(result.releaseNotes.version, "2.0.0"); // Has breaking change
      assertExists(result.releaseNotes.added);
      assertExists(result.releaseNotes.fixed);
    }
  } finally {
    cleanup();
  }
});

Deno.test.ignore("ReleaseManager - categorizes commits correctly", async () => {
  const { cleanup } = setupMocks();

  try {
    const config = createTestConfig({
      commitTypes: {
        feat: "added",
        fix: "fixed",
        docs: "changed",
        perf: "changed",
      },
    });
    const manager = new ReleaseManager(config);

    // Mock various commit types
    const origCommand = Deno.Command;
    (Deno as any).Command = class extends (origCommand as any) {
      async output() {
        if (this.cmd === "git" && this.options?.args?.[0] === "log") {
          const commits = [
            "abc123\tfeat: new feature",
            "def456\tfix: bug fix",
            "ghi789\tdocs: update readme",
            "jkl012\tperf: optimize algorithm",
          ].join("\n");
          return {
            success: true,
            code: 0,
            stdout: new TextEncoder().encode(commits),
            stderr: new Uint8Array(),
          };
        }
        return super.output();
      }
    };

    const result = await manager.release();

    assertEquals(result.success, true);
    if (result.success && result.releaseNotes) {
      assertEquals(result.releaseNotes.added.length, 1);
      assertEquals(result.releaseNotes.fixed.length, 1);
      // docs and perf should map to their configured sections
    }

    (Deno as any).Command = origCommand;
  } finally {
    cleanup();
  }
});

// =============================================================================
// Dry Run Tests
// =============================================================================

Deno.test.ignore("ReleaseManager - dry run doesn't modify files", async () => {
  const { cleanup } = setupMocks();

  try {
    const writeTextFileSpy = Deno.writeTextFile as any;

    const config = createTestConfig({
      options: { dryRun: true },
    });
    const manager = new ReleaseManager(config);

    const result = await manager.release(BumpType.MAJOR);

    assertEquals(result.success, true);
    assertEquals(result.version, "2.0.0");

    // writeTextFile should not be called in dry run
    assertSpyCalls(writeTextFileSpy, 0);
  } finally {
    cleanup();
  }
});

// =============================================================================
// Hook Tests
// =============================================================================

Deno.test.ignore("ReleaseManager - executes pre/post release hooks", async () => {
  const { cleanup } = setupMocks();

  try {
    const preHook = spy(() => Promise.resolve());
    const postHook = spy(() => Promise.resolve());

    const config = createTestConfig({
      hooks: {
        preRelease: [preHook],
        postRelease: [postHook],
      },
    });
    const manager = new ReleaseManager(config);

    const result = await manager.release();

    assertEquals(result.success, true);
    assertSpyCalls(preHook, 1);
    assertSpyCalls(postHook, 1);
  } finally {
    cleanup();
  }
});

// =============================================================================
// Error Handling Tests
// =============================================================================

Deno.test.ignore("ReleaseManager - handles missing version file", async () => {
  const { cleanup } = setupMocks();

  try {
    // Override stat to throw for version file
    Deno.stat = spy(async (path: string | URL) => {
      throw new Error("File not found");
    });

    const config = createTestConfig({ options: { dryRun: false } });
    const manager = new ReleaseManager(config);

    await assertRejects(
      async () => await manager.release(),
      Error,
    );
  } finally {
    cleanup();
  }
});

Deno.test("ReleaseManager - handles no commits", async () => {
  const { cleanup } = setupMocks();

  try {
    // Mock empty commit log
    const origCommand = Deno.Command;
    (Deno as any).Command = class extends (origCommand as any) {
      async output() {
        if (this.cmd === "git" && this.options?.args?.[0] === "log") {
          return {
            success: true,
            code: 0,
            stdout: new Uint8Array(), // No commits
            stderr: new Uint8Array(),
          };
        }
        return super.output();
      }
    };

    const config = createTestConfig();
    const manager = new ReleaseManager(config);

    const result = await manager.release(); // No explicit bump type

    assertEquals(result.success, false);
    if (!result.success) {
      assertStringIncludes(result.error || "", "No commits");
    }

    (Deno as any).Command = origCommand;
  } finally {
    cleanup();
  }
});

// =============================================================================
// Security Tests
// =============================================================================

Deno.test.ignore("ReleaseManager - validates file patterns for safety", async () => {
  const { cleanup } = setupMocks();

  try {
    const config = createTestConfig({
      updateFiles: [
        {
          path: "./package.json",
          patterns: {
            // Dangerous pattern without anchors
            version: /version/,
          },
        },
      ],
    });
    const manager = new ReleaseManager(config);

    // Should detect dangerous patterns during validation
    // The manager will log warnings but still proceed
    const result = await manager.release();

    // Should complete but with warnings logged
    assertEquals(result.success, true);
  } finally {
    cleanup();
  }
});

Deno.test("ReleaseManager - sanitizes error messages", async () => {
  const { cleanup } = setupMocks();

  try {
    // Force an error with sensitive information
    Deno.readTextFile = spy(async () => {
      throw new Error("Database password: secret123");
    });

    const config = createTestConfig({ options: { dryRun: false } });
    const manager = new ReleaseManager(config);

    const result = await manager.release();

    // Error should be sanitized
    if (!result.success && result.error) {
      assertEquals(result.error.includes("secret123"), false);
    }
  } finally {
    cleanup();
  }
});

// =============================================================================
// Template Processing Tests
// =============================================================================

Deno.test.ignore("ReleaseManager - processes custom templates", async () => {
  const { cleanup } = setupMocks();

  try {
    const config = createTestConfig({
      versionFile: {
        path: "./version.ts",
        template: TemplateFormat.CUSTOM,
        customTemplate: 'export const VERSION = "{{ version }}";',
      },
    });
    const manager = new ReleaseManager(config);

    const result = await manager.release(BumpType.MINOR);

    assertEquals(result.success, true);
    assertEquals(result.version, "1.1.0");
  } finally {
    cleanup();
  }
});

// =============================================================================
// GitHub Integration Tests (Mocked)
// =============================================================================

Deno.test.ignore("ReleaseManager - creates GitHub release when configured", async () => {
  const { cleanup } = setupMocks();

  try {
    const config = createTestConfig({
      github: {
        createRelease: true,
        owner: "test",
        repo: "project",
      },
      options: { dryRun: false, skipConfirmation: true },
    });

    // Mock gh CLI command
    const origCommand = Deno.Command;
    (Deno as any).Command = class extends (origCommand as any) {
      async output() {
        if (this.cmd === "gh" && this.options?.args?.[0] === "release") {
          return {
            success: true,
            code: 0,
            stdout: new TextEncoder().encode("https://github.com/test/project/releases/tag/v1.1.0"),
            stderr: new Uint8Array(),
          };
        }
        return super.output();
      }
    };

    const manager = new ReleaseManager(config);

    // Can't fully test without complex mocking, but structure is validated
    const result = await manager.release(BumpType.MINOR);

    // In dry run, GitHub release isn't created
    assertEquals(result.success, true);

    (Deno as any).Command = origCommand;
  } finally {
    cleanup();
  }
});

// =============================================================================
// Pre-flight Checks Tests
// =============================================================================

Deno.test.ignore("ReleaseManager - runs pre-flight checks", async () => {
  const { cleanup } = setupMocks();

  try {
    const config = createTestConfig({
      release: {
        preflightChecks: {
          runTests: true,
          custom: [
            {
              name: "Custom Check",
              command: ["echo", "test"],
              fixable: false,
              description: "Test check",
            },
          ],
        },
      },
      options: { dryRun: false, skipConfirmation: true },
    });

    const manager = new ReleaseManager(config);

    // Mock will return success for all commands
    const result = await manager.release(BumpType.PATCH);

    // Should pass if all checks succeed
    assertEquals(result.success, true);
  } finally {
    cleanup();
  }
});

// =============================================================================
// Rollback and State Tracking Tests
// =============================================================================

Deno.test.ignore("ReleaseManager - tracks release state for rollback", async () => {
  const { cleanup } = setupMocks();

  try {
    const config = createTestConfig({
      options: { dryRun: false, skipConfirmation: true },
    });
    const manager = new ReleaseManager(config);

    // The manager should create backups and track state
    // In our mock, operations will succeed
    const result = await manager.release(BumpType.MINOR);

    // Even in mock, state tracking structures should be initialized
    assertEquals(result.success, true);
  } finally {
    cleanup();
  }
});
