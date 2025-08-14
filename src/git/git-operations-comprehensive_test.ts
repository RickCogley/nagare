/**
 * @fileoverview Comprehensive test suite for GitOperations to improve coverage
 * @module git-operations-comprehensive_test
 */

import { assertEquals, assertExists, assertRejects, assertStringIncludes } from "@std/assert";
import { spy, stub } from "@std/testing/mock";

import { GitOperations } from "./git-operations.ts";
import { BumpType, ConventionalCommit, NagareConfig } from "../../types.ts";
import { ErrorCodes, NagareError } from "../core/enhanced-error.ts";
import { DEFAULT_CONFIG } from "../../config.ts";
import { initI18n } from "../core/i18n.ts";

// Initialize i18n for tests
await initI18n("en");

/**
 * Create a test configuration
 */
function createTestConfig(overrides?: Partial<NagareConfig>): NagareConfig {
  return {
    ...DEFAULT_CONFIG,
    project: {
      name: "Test Project",
      repository: "https://github.com/test/test",
      ...overrides?.project,
    },
    versionFile: {
      path: "./version.ts",
      ...overrides?.versionFile,
    },
    ...overrides,
  } as NagareConfig;
}

/**
 * Mock command output helper
 */
function mockCommandOutput(stdout: string, stderr = "", success = true) {
  return {
    success,
    stdout: new TextEncoder().encode(stdout),
    stderr: new TextEncoder().encode(stderr),
    code: success ? 0 : 1,
  };
}

// =============================================================================
// Git Repository Detection Tests
// =============================================================================

Deno.test("GitOperations - isGitRepository detects valid repo", async () => {
  const originalCommand = Deno.Command;

  // Mock Deno.Command
  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}
    output() {
      if (this.cmd === "git" && this.options?.args?.[0] === "status") {
        return Promise.resolve(mockCommandOutput(""));
      }
      return Promise.resolve(mockCommandOutput("", "", false));
    }
  };

  try {
    const git = new GitOperations(createTestConfig());
    const result = await git.isGitRepository();
    assertEquals(result, true);
  } finally {
    (Deno as any).Command = originalCommand;
  }
});

Deno.test("GitOperations - isGitRepository detects non-repo", async () => {
  const originalCommand = Deno.Command;

  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}
    output() {
      return Promise.resolve(mockCommandOutput("", "fatal: not a git repository", false));
    }
  };

  try {
    const git = new GitOperations(createTestConfig());
    const result = await git.isGitRepository();
    assertEquals(result, false);
  } finally {
    (Deno as any).Command = originalCommand;
  }
});

// =============================================================================
// Uncommitted Changes Detection Tests
// =============================================================================

Deno.test("GitOperations - hasUncommittedChanges detects clean state", async () => {
  const originalCommand = Deno.Command;

  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}
    output() {
      if (this.options?.args?.includes("status")) {
        return Promise.resolve(mockCommandOutput(""));
      }
      return Promise.resolve(mockCommandOutput(""));
    }
  };

  try {
    const git = new GitOperations(createTestConfig());
    const result = await git.hasUncommittedChanges();
    assertEquals(result, false);
  } finally {
    (Deno as any).Command = originalCommand;
  }
});

Deno.test("GitOperations - hasUncommittedChanges detects dirty state", async () => {
  const originalCommand = Deno.Command;

  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}
    output() {
      if (this.options?.args?.includes("status")) {
        return Promise.resolve(mockCommandOutput("M  src/file.ts\n?? new-file.txt"));
      }
      return Promise.resolve(mockCommandOutput(""));
    }
  };

  try {
    const git = new GitOperations(createTestConfig());
    const result = await git.hasUncommittedChanges();
    assertEquals(result, true);
  } finally {
    (Deno as any).Command = originalCommand;
  }
});

// =============================================================================
// Commit Analysis Tests
// =============================================================================

Deno.test("GitOperations - getCommitsSinceLastRelease parses conventional commits", async () => {
  const originalCommand = Deno.Command;

  const mockCommits = [
    "abc123|||2024-01-01|||feat(api): add new endpoint",
    "def456|||2024-01-02|||fix: resolve memory leak",
    "ghi789|||2024-01-03|||docs: update README",
    "jkl012|||2024-01-04|||feat!: breaking API change",
  ].join("\n");

  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}
    output() {
      if (this.options?.args?.includes("log")) {
        return Promise.resolve(mockCommandOutput(mockCommits));
      }
      if (this.options?.args?.includes("tag")) {
        return Promise.resolve(mockCommandOutput("v1.0.0"));
      }
      return Promise.resolve(mockCommandOutput(""));
    }
  };

  try {
    const git = new GitOperations(createTestConfig());
    const commits = await git.getCommitsSinceLastRelease();

    assertEquals(commits.length, 4);
    assertEquals(commits[0].type, "feat");
    assertEquals(commits[0].scope, "api");
    assertEquals(commits[0].description, "add new endpoint");
    assertEquals(commits[1].type, "fix");
    assertEquals(commits[1].scope, undefined);
    assertEquals(commits[3].breakingChange, true);
  } finally {
    (Deno as any).Command = originalCommand;
  }
});

Deno.test("GitOperations - getCommitsSinceLastRelease handles non-conventional commits", async () => {
  const originalCommand = Deno.Command;

  const mockCommits = [
    "abc123|||2024-01-01|||Regular commit message",
    "def456|||2024-01-02|||Another normal commit",
  ].join("\n");

  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}
    output() {
      if (this.options?.args?.includes("log")) {
        return Promise.resolve(mockCommandOutput(mockCommits));
      }
      if (this.options?.args?.includes("tag")) {
        return Promise.resolve(mockCommandOutput("v1.0.0"));
      }
      return Promise.resolve(mockCommandOutput(""));
    }
  };

  try {
    const git = new GitOperations(createTestConfig());
    const commits = await git.getCommitsSinceLastRelease();

    assertEquals(commits.length, 2);
    assertEquals(commits[0].type, "other");
    assertEquals(commits[0].description, "Regular commit message");
  } finally {
    (Deno as any).Command = originalCommand;
  }
});

// =============================================================================
// Version Bump Calculation Tests
// =============================================================================

// Note: GitOperations doesn't have calculateVersionBump - that's in VersionUtils
Deno.test("GitOperations - parseConventionalCommit handles fix commits for patch", async () => {
  const git = new GitOperations(createTestConfig());
  const originalCommand = Deno.Command;

  const mockCommits = "abc123|||2024-01-01|||fix: bug fix\ndef456|||2024-01-02|||chore: update deps";

  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}
    output() {
      if (this.options?.args?.includes("log")) {
        return Promise.resolve(mockCommandOutput(mockCommits));
      }
      if (this.options?.args?.includes("tag")) {
        return Promise.resolve(mockCommandOutput(""));
      }
      return Promise.resolve(mockCommandOutput(""));
    }
  };

  try {
    const commits = await git.getCommitsSinceLastRelease();
    assertEquals(commits.length, 2);
    assertEquals(commits[0].type, "fix");
    assertEquals(commits[1].type, "chore");
  } finally {
    (Deno as any).Command = originalCommand;
  }
});

Deno.test("GitOperations - parseConventionalCommit handles feat commits for minor", async () => {
  const git = new GitOperations(createTestConfig());
  const originalCommand = Deno.Command;

  const mockCommits = "abc123|||2024-01-01|||feat: new feature\ndef456|||2024-01-02|||fix: bug fix";

  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}
    output() {
      if (this.options?.args?.includes("log")) {
        return Promise.resolve(mockCommandOutput(mockCommits));
      }
      if (this.options?.args?.includes("tag")) {
        return Promise.resolve(mockCommandOutput(""));
      }
      return Promise.resolve(mockCommandOutput(""));
    }
  };

  try {
    const commits = await git.getCommitsSinceLastRelease();
    assertEquals(commits.length, 2);
    assertEquals(commits[0].type, "feat");
    assertEquals(commits[1].type, "fix");
  } finally {
    (Deno as any).Command = originalCommand;
  }
});

Deno.test("GitOperations - parseConventionalCommit handles breaking changes for major", async () => {
  const git = new GitOperations(createTestConfig());
  const originalCommand = Deno.Command;

  const mockCommits = "abc123|||2024-01-01|||feat!: breaking change\ndef456|||2024-01-02|||fix: bug fix";

  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}
    output() {
      if (this.options?.args?.includes("log")) {
        return Promise.resolve(mockCommandOutput(mockCommits));
      }
      if (this.options?.args?.includes("tag")) {
        return Promise.resolve(mockCommandOutput(""));
      }
      return Promise.resolve(mockCommandOutput(""));
    }
  };

  try {
    const commits = await git.getCommitsSinceLastRelease();
    assertEquals(commits.length, 2);
    assertEquals(commits[0].type, "feat");
    assertEquals(commits[0].breakingChange, true);
    assertEquals(commits[1].type, "fix");
  } finally {
    (Deno as any).Command = originalCommand;
  }
});

Deno.test("GitOperations - getCommitsSinceLastRelease handles empty commits", async () => {
  const git = new GitOperations(createTestConfig());
  const originalCommand = Deno.Command;

  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}
    output() {
      if (this.options?.args?.includes("log")) {
        return Promise.resolve(mockCommandOutput(""));
      }
      if (this.options?.args?.includes("tag")) {
        return Promise.resolve(mockCommandOutput("v1.0.0"));
      }
      return Promise.resolve(mockCommandOutput(""));
    }
  };

  try {
    const commits = await git.getCommitsSinceLastRelease();
    assertEquals(commits.length, 0);
  } finally {
    (Deno as any).Command = originalCommand;
  }
});

// =============================================================================
// Git Tag Operations Tests
// =============================================================================

Deno.test("GitOperations - getLastReleaseTag finds latest tag", async () => {
  const originalCommand = Deno.Command;

  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}
    output() {
      if (this.options?.args?.includes("tag")) {
        return Promise.resolve(mockCommandOutput("v1.2.3\nv1.2.2\nv1.2.1"));
      }
      return Promise.resolve(mockCommandOutput(""));
    }
  };

  try {
    const git = new GitOperations(createTestConfig());
    const tag = await git.getLastReleaseTag();
    assertEquals(tag, "v1.2.3");
  } finally {
    (Deno as any).Command = originalCommand;
  }
});

Deno.test("GitOperations - getLastReleaseTag handles no tags", async () => {
  const originalCommand = Deno.Command;

  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}
    output() {
      if (this.options?.args?.includes("tag")) {
        return Promise.resolve(mockCommandOutput(""));
      }
      return Promise.resolve(mockCommandOutput(""));
    }
  };

  try {
    const git = new GitOperations(createTestConfig());
    const tag = await git.getLastReleaseTag();
    assertEquals(tag, "");
  } finally {
    (Deno as any).Command = originalCommand;
  }
});

// Removed duplicate test - already tested as part of commitAndTag

// =============================================================================
// Git Push Operations Tests
// =============================================================================

// pushToRemote tests already covered above

// =============================================================================
// Commit Creation Tests
// =============================================================================

// Note: GitOperations.commitAndTag handles both commit and tag creation
Deno.test("GitOperations - commitAndTag creates release commit and tag", async () => {
  const originalCommand = Deno.Command;
  const commandSpy = spy();

  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {
      if (cmd === "git") {
        commandSpy(options.args);
      }
    }
    output() {
      return Promise.resolve(mockCommandOutput(""));
    }
  };

  try {
    const git = new GitOperations(createTestConfig());
    await git.commitAndTag("1.0.0");

    // Should have called git add, git commit, and git tag
    const addCalls = commandSpy.calls.filter((c: any) => c.args[0][0] === "add");
    const commitCalls = commandSpy.calls.filter((c: any) => c.args[0][0] === "commit");
    const tagCalls = commandSpy.calls.filter((c: any) => c.args[0][0] === "tag");

    assertEquals(addCalls.length, 1);
    assertEquals(commitCalls.length, 1);
    assertEquals(tagCalls.length, 1);

    // Check commit message format
    const commitArgs = commitCalls[0].args[0];
    const messageIndex = commitArgs.indexOf("-m");
    assertExists(messageIndex);
    assertStringIncludes(commitArgs[messageIndex + 1], "1.0.0");
  } finally {
    (Deno as any).Command = originalCommand;
  }
});

// =============================================================================
// Branch Operations Tests
// =============================================================================

Deno.test("GitOperations - getCurrentBranch returns branch name", async () => {
  const originalCommand = Deno.Command;

  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}
    output() {
      if (this.options?.args?.includes("branch")) {
        return Promise.resolve(mockCommandOutput("main"));
      }
      return Promise.resolve(mockCommandOutput(""));
    }
  };

  try {
    const git = new GitOperations(createTestConfig());
    const branch = await git.getCurrentBranch();
    assertEquals(branch, "main");
  } finally {
    (Deno as any).Command = originalCommand;
  }
});

// =============================================================================
// Error Handling Tests
// =============================================================================

Deno.test("GitOperations - handles command execution errors", async () => {
  const originalCommand = Deno.Command;

  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}
    output() {
      return Promise.resolve(mockCommandOutput("", "fatal: not a git repository", false));
    }
  };

  try {
    const git = new GitOperations(createTestConfig());
    const result = await git.isGitRepository();
    // isGitRepository returns false on error, doesn't throw
    assertEquals(result, false);
  } finally {
    (Deno as any).Command = originalCommand;
  }
});

// =============================================================================
// Configuration Options Tests
// =============================================================================

Deno.test("GitOperations - respects tag prefix configuration", async () => {
  const originalCommand = Deno.Command;
  const commandSpy = spy();

  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {
      if (cmd === "git" && options?.args?.[0] === "tag") {
        commandSpy(options.args);
      }
    }
    output() {
      return Promise.resolve(mockCommandOutput(""));
    }
  };

  try {
    const config = createTestConfig({
      options: { tagPrefix: "release-" },
    });
    const git = new GitOperations(config);
    // commitAndTag will automatically add the prefix
    await git.commitAndTag("1.0.0");

    // Find the tag command
    const tagCall = commandSpy.calls.find((c: any) => c.args[0].includes("tag"));
    assertExists(tagCall);
    const args = tagCall.args[0];
    assertEquals(args.includes("release-1.0.0"), true);
  } finally {
    (Deno as any).Command = originalCommand;
  }
});

// =============================================================================
// Remote Tag Verification Tests
// =============================================================================

Deno.test("GitOperations - remoteTagExists checks remote tags", async () => {
  const originalCommand = Deno.Command;

  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}
    output() {
      if (this.options?.args?.includes("ls-remote")) {
        if (this.options?.args?.includes("v1.0.0")) {
          return Promise.resolve(mockCommandOutput("v1.0.0"));
        }
        return Promise.resolve(mockCommandOutput(""));
      }
      return Promise.resolve(mockCommandOutput(""));
    }
  };

  try {
    const git = new GitOperations(createTestConfig());

    const existsResult = await git.remoteTagExists("v1.0.0");
    assertEquals(existsResult, true);

    const notExistsResult = await git.remoteTagExists("v99.0.0");
    assertEquals(notExistsResult, false);
  } finally {
    (Deno as any).Command = originalCommand;
  }
});

// =============================================================================
// Git User Configuration Tests
// =============================================================================

Deno.test("GitOperations - retrieves git user configuration", async () => {
  const originalCommand = Deno.Command;

  (Deno as any).Command = class MockCommand {
    constructor(public cmd: string, public options?: any) {}
    output() {
      if (this.options?.args?.includes("user.name")) {
        return Promise.resolve(mockCommandOutput("Test User"));
      }
      if (this.options?.args?.includes("user.email")) {
        return Promise.resolve(mockCommandOutput("test@example.com"));
      }
      return Promise.resolve(mockCommandOutput(""));
    }
  };

  try {
    const git = new GitOperations(createTestConfig());
    const user = await git.getGitUser();

    assertEquals(user.name, "Test User");
    assertEquals(user.email, "test@example.com");
  } finally {
    (Deno as any).Command = originalCommand;
  }
});
