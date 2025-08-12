/**
 * @fileoverview Test helpers and comprehensive mocks for ReleaseManager tests
 * @module release-manager_test_helper
 */

import type { ConventionalCommit, NagareConfig } from "../../types.ts";
import { LogLevel, TemplateFormat } from "../../types.ts";

/**
 * Comprehensive mock setup for ReleaseManager tests
 */
export class MockEnvironment {
  private originalCommand: typeof Deno.Command;
  private originalReadTextFile: typeof Deno.readTextFile;
  private originalWriteTextFile: typeof Deno.writeTextFile;
  private originalStat: typeof Deno.stat;
  private originalEnv: typeof Deno.env.get;

  private fileSystem: Map<string, string> = new Map();
  private gitState = {
    isRepo: true,
    hasUncommittedChanges: false,
    currentVersion: "1.0.0",
    commits: [] as ConventionalCommit[],
    tags: [] as string[],
    branch: "main",
    user: { name: "Test User", email: "test@example.com" },
  };

  constructor() {
    // Store originals
    this.originalCommand = Deno.Command;
    this.originalReadTextFile = Deno.readTextFile;
    this.originalWriteTextFile = Deno.writeTextFile;
    this.originalStat = Deno.stat;
    this.originalEnv = Deno.env.get;

    // Set up default file system
    this.setupDefaultFiles();
  }

  private setupDefaultFiles() {
    this.fileSystem.set("./version.ts", 'export const VERSION = "1.0.0";');
    this.fileSystem.set(
      "./deno.json",
      JSON.stringify(
        {
          name: "@test/project",
          version: "1.0.0",
          exports: "./mod.ts",
        },
        null,
        2,
      ),
    );
    this.fileSystem.set(
      "./package.json",
      JSON.stringify(
        {
          name: "test-project",
          version: "1.0.0",
          description: "Test project",
        },
        null,
        2,
      ),
    );
    this.fileSystem.set(
      "./CHANGELOG.md",
      `# Changelog

## [1.0.0] - 2024-01-01
- Initial release`,
    );
    this.fileSystem.set(
      "./README.md",
      `# Test Project

Version: 1.0.0`,
    );
  }

  /**
   * Configure git state for testing
   */
  configureGit(state: Partial<typeof this.gitState>) {
    Object.assign(this.gitState, state);
  }

  /**
   * Add or update a file in the mock file system
   */
  setFile(path: string, content: string) {
    this.fileSystem.set(path, content);
  }

  /**
   * Get a file from the mock file system
   */
  getFile(path: string): string | undefined {
    return this.fileSystem.get(path);
  }

  /**
   * Add commits to the mock git history
   */
  addCommits(...commits: ConventionalCommit[]) {
    this.gitState.commits.push(...commits);
  }

  /**
   * Install all mocks
   */
  install() {
    const gitState = this.gitState; // Capture in closure

    // Mock Deno.Command for git operations
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = class MockCommand {
      // deno-lint-ignore no-explicit-any
      constructor(public cmd: string, public options?: any) {}

      // deno-lint-ignore require-await
      output = async () => {
        const { cmd, options } = this;
        const args = options?.args || [];

        // Git repository check
        if (cmd === "git" && args[0] === "rev-parse" && args[1] === "--git-dir") {
          return {
            success: gitState.isRepo,
            code: gitState.isRepo ? 0 : 128,
            stdout: gitState.isRepo ? new TextEncoder().encode(".git") : new Uint8Array(),
            stderr: gitState.isRepo ? new Uint8Array() : new TextEncoder().encode("not a git repository"),
          };
        }

        // Git status (uncommitted changes check)
        if (cmd === "git" && args[0] === "status" && args[1] === "--porcelain") {
          return {
            success: true,
            code: 0,
            stdout: gitState.hasUncommittedChanges ? new TextEncoder().encode("M modified-file.ts") : new Uint8Array(),
            stderr: new Uint8Array(),
          };
        }

        // Git user config
        if (cmd === "git" && args[0] === "config") {
          if (args[1] === "user.name") {
            return {
              success: true,
              code: 0,
              stdout: new TextEncoder().encode(gitState.user.name),
              stderr: new Uint8Array(),
            };
          }
          if (args[1] === "user.email") {
            return {
              success: true,
              code: 0,
              stdout: new TextEncoder().encode(gitState.user.email),
              stderr: new Uint8Array(),
            };
          }
        }

        // Git log for commits
        if (cmd === "git" && args[0] === "log") {
          const commitLines = gitState.commits.map((c) =>
            `${c.hash}\t${c.type}${c.scope ? `(${c.scope})` : ""}${c.breakingChange ? "!" : ""}: ${c.description}`
          ).join("\n");

          return {
            success: true,
            code: 0,
            stdout: new TextEncoder().encode(commitLines),
            stderr: new Uint8Array(),
          };
        }

        // Git describe for current version
        if (cmd === "git" && args[0] === "describe") {
          return {
            success: true,
            code: 0,
            stdout: new TextEncoder().encode(`v${gitState.currentVersion}`),
            stderr: new Uint8Array(),
          };
        }

        // Git tag list
        if (cmd === "git" && args[0] === "tag") {
          const tags = gitState.tags.join("\n");
          return {
            success: true,
            code: 0,
            stdout: new TextEncoder().encode(tags),
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
            stdout: new TextEncoder().encode(`* ${gitState.branch}`),
            stderr: new Uint8Array(),
          };
        }

        // Git add, commit, tag, push - all succeed in mock
        if (cmd === "git" && ["add", "commit", "tag", "push"].includes(args[0])) {
          return {
            success: true,
            code: 0,
            stdout: new Uint8Array(),
            stderr: new Uint8Array(),
          };
        }

        // Deno commands (format, lint, test)
        if (cmd === "deno") {
          return {
            success: true,
            code: 0,
            stdout: new Uint8Array(),
            stderr: new Uint8Array(),
          };
        }

        // GitHub CLI commands
        if (cmd === "gh") {
          return {
            success: true,
            code: 0,
            stdout: new TextEncoder().encode("https://github.com/test/project/releases/tag/v2.0.0"),
            stderr: new Uint8Array(),
          };
        }

        // Default failure for unknown commands
        return {
          success: false,
          code: 1,
          stdout: new Uint8Array(),
          stderr: new TextEncoder().encode(`Unknown command: ${cmd}`),
        };
      };
    };

    // Mock file system operations
    const fileSystem = this.fileSystem; // Capture in closure

    // deno-lint-ignore require-await
    Deno.readTextFile = async (path: string | URL) => {
      const pathStr = path.toString();
      const content = fileSystem.get(pathStr);
      if (content !== undefined) {
        return content;
      }
      throw new Error(`File not found: ${pathStr}`);
    };

    // deno-lint-ignore require-await no-explicit-any
    Deno.writeTextFile = async (path: string | URL, data: any) => {
      const pathStr = path.toString();
      const content = typeof data === "string" ? data : data.toString();
      fileSystem.set(pathStr, content);
    };

    // deno-lint-ignore require-await
    Deno.stat = async (path: string | URL) => {
      const pathStr = path.toString();
      if (fileSystem.has(pathStr)) {
        return { isFile: true, isDirectory: false } as Deno.FileInfo;
      }
      throw new Error(`File not found: ${pathStr}`);
    };

    // Mock environment variables
    // deno-lint-ignore no-explicit-any
    (Deno.env as any).get = (key: string) => {
      if (key === "CI") return undefined;
      if (key === "NODE_ENV") return "test";
      return this.originalEnv.call(Deno.env, key);
    };
  }

  /**
   * Restore all original functions
   */
  restore() {
    // deno-lint-ignore no-explicit-any
    (Deno as any).Command = this.originalCommand;
    Deno.readTextFile = this.originalReadTextFile;
    Deno.writeTextFile = this.originalWriteTextFile;
    Deno.stat = this.originalStat;
    // deno-lint-ignore no-explicit-any
    (Deno.env as any).get = this.originalEnv;
  }

  /**
   * Clean up and restore
   */
  cleanup() {
    this.restore();
  }
}

/**
 * Helper to create test configuration
 */
export function createTestConfig(overrides?: Partial<NagareConfig>): NagareConfig {
  return {
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
  };
}

/**
 * Common test commits
 */
export const TEST_COMMITS = {
  fix: {
    type: "fix",
    description: "fix critical bug",
    hash: "abc123",
    date: "2024-01-01",
    breakingChange: false,
  },
  feat: {
    type: "feat",
    description: "add new feature",
    hash: "def456",
    date: "2024-01-02",
    breakingChange: false,
  },
  breaking: {
    type: "feat",
    description: "breaking change",
    hash: "ghi789",
    date: "2024-01-03",
    breakingChange: true,
  },
} as const satisfies Record<string, ConventionalCommit>;
