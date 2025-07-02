/**
 * @fileoverview Tests for git operations module
 * @description Comprehensive test coverage for GitOperations class
 */

import {
  assertEquals,
  assertExists,
  assertInstanceOf,
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { GitOperations } from "../src/git-operations.ts";
import { ErrorCodes, NagareError } from "../src/enhanced-error.ts";
import type { NagareConfig } from "../types.ts";
import { DEFAULT_CONFIG } from "../config.ts";

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
      template: "typescript",
      ...overrides?.versionFile,
    },
    ...overrides,
  } as NagareConfig;
}

/**
 * Create a temporary git repository for testing
 */
async function createTempGitRepo(): Promise<string> {
  const tempDir = await Deno.makeTempDir({ prefix: "nagare_test_" });

  // Initialize git repo
  const initCmd = new Deno.Command("git", {
    args: ["init", "--initial-branch=main"],
    cwd: tempDir,
  });
  await initCmd.output();

  // Configure git user
  const configNameCmd = new Deno.Command("git", {
    args: ["config", "user.name", "Test User"],
    cwd: tempDir,
  });
  await configNameCmd.output();

  const configEmailCmd = new Deno.Command("git", {
    args: ["config", "user.email", "test@example.com"],
    cwd: tempDir,
  });
  await configEmailCmd.output();

  return tempDir;
}

/**
 * Create a test file and commit it
 */
async function createCommit(
  dir: string,
  filename: string,
  content: string,
  message: string,
): Promise<void> {
  // Create file
  await Deno.writeTextFile(`${dir}/${filename}`, content);

  // Add file
  const addCmd = new Deno.Command("git", {
    args: ["add", filename],
    cwd: dir,
  });
  await addCmd.output();

  // Commit
  const commitCmd = new Deno.Command("git", {
    args: ["commit", "-m", message],
    cwd: dir,
  });
  await commitCmd.output();
}

/**
 * Create a git tag
 */
async function createTag(dir: string, tag: string): Promise<void> {
  const tagCmd = new Deno.Command("git", {
    args: ["tag", tag],
    cwd: dir,
  });
  await tagCmd.output();
}

Deno.test({ 
  ignore: Deno.env.get("CI") === "true",
  name: "GitOperations - isGitRepository"
}, async (t) => {
  await t.step("should return true for valid git repository", async () => {
    const tempDir = await createTempGitRepo();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);
      const git = new GitOperations(createTestConfig());
      const result = await git.isGitRepository();
      assertEquals(result, true);
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("should return false for non-git directory", async () => {
    const tempDir = await Deno.makeTempDir();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);
      const git = new GitOperations(createTestConfig());
      const result = await git.isGitRepository();
      assertEquals(result, false);
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

Deno.test({
  ignore: Deno.env.get("CI") === "true",
  name: "GitOperations - hasUncommittedChanges"
}, async (t) => {
  await t.step("should return false for clean repository", async () => {
    const tempDir = await createTempGitRepo();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);
      await createCommit(tempDir, "test.txt", "initial content", "feat: initial commit");

      const git = new GitOperations(createTestConfig());
      const result = await git.hasUncommittedChanges();
      assertEquals(result, false);
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("should return true for modified files", async () => {
    const tempDir = await createTempGitRepo();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);
      await createCommit(tempDir, "test.txt", "initial content", "feat: initial commit");

      // Modify file
      await Deno.writeTextFile(`${tempDir}/test.txt`, "modified content");

      const git = new GitOperations(createTestConfig());
      const result = await git.hasUncommittedChanges();
      assertEquals(result, true);
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("should return true for untracked files", async () => {
    const tempDir = await createTempGitRepo();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);
      await createCommit(tempDir, "test.txt", "initial content", "feat: initial commit");

      // Create new file
      await Deno.writeTextFile(`${tempDir}/new.txt`, "new content");

      const git = new GitOperations(createTestConfig());
      const result = await git.hasUncommittedChanges();
      assertEquals(result, true);
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

Deno.test({
  ignore: Deno.env.get("CI") === "true",
  name: "GitOperations - getCommitsSinceLastRelease (tests parseConventionalCommit)"
}, async (t) => {
  await t.step("should parse various commit types", async () => {
    const tempDir = await createTempGitRepo();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);

      // Create commits with different conventional commit formats
      await createCommit(tempDir, "feat.txt", "feat", "feat: add new feature");
      await createCommit(tempDir, "feat-scope.txt", "feat-scope", "feat(api): add user endpoint");
      await createCommit(tempDir, "fix.txt", "fix", "fix: resolve memory leak");
      await createCommit(tempDir, "breaking.txt", "breaking", "feat!: change API response format");
      await createCommit(tempDir, "other.txt", "other", "Update readme");

      const git = new GitOperations(createTestConfig());
      const commits = await git.getCommitsSinceLastRelease();

      // Check parsed commits (they'll be in reverse order)
      const otherCommit = commits.find((c) => c.description === "Update readme");
      assertEquals(otherCommit?.type, "other");
      assertEquals(otherCommit?.breakingChange, false);

      const breakingCommit = commits.find((c) => c.description === "change API response format");
      assertEquals(breakingCommit?.type, "feat");
      assertEquals(breakingCommit?.breakingChange, true);

      const fixCommit = commits.find((c) => c.description === "resolve memory leak");
      assertEquals(fixCommit?.type, "fix");
      assertEquals(fixCommit?.breakingChange, false);

      const scopedCommit = commits.find((c) => c.description === "add user endpoint");
      assertEquals(scopedCommit?.type, "feat");
      assertEquals(scopedCommit?.scope, "api");

      const featCommit = commits.find((c) => c.description === "add new feature");
      assertEquals(featCommit?.type, "feat");
      assertEquals(featCommit?.scope, undefined);
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

Deno.test({
  ignore: Deno.env.get("CI") === "true",
  name: "GitOperations - getLastReleaseTag"
}, async (t) => {
  await t.step("should return undefined when no tags exist", async () => {
    const tempDir = await createTempGitRepo();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);
      await createCommit(tempDir, "test.txt", "content", "initial commit");

      const git = new GitOperations(createTestConfig());
      const result = await git.getLastReleaseTag();
      assertEquals(result, undefined);
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("should return latest version tag", async () => {
    const tempDir = await createTempGitRepo();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);
      await createCommit(tempDir, "test.txt", "v1", "feat: v1");
      await createTag(tempDir, "v1.0.0");

      await createCommit(tempDir, "test.txt", "v2", "feat: v2");
      await createTag(tempDir, "v2.0.0");

      await createCommit(tempDir, "test.txt", "v3", "feat: v3");
      await createTag(tempDir, "v1.5.0");

      const git = new GitOperations(createTestConfig());
      const result = await git.getLastReleaseTag();
      assertEquals(result, "v2.0.0"); // Should be v2.0.0, not v1.5.0
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("should handle custom tag prefix", async () => {
    const tempDir = await createTempGitRepo();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);
      await createCommit(tempDir, "test.txt", "v1", "feat: v1");
      await createTag(tempDir, "release-1.0.0");

      const config = createTestConfig({
        options: { tagPrefix: "release-" },
      });
      const git = new GitOperations(config);
      const result = await git.getLastReleaseTag();
      assertEquals(result, "release-1.0.0");
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

Deno.test({
  ignore: Deno.env.get("CI") === "true",
  name: "GitOperations - getCommitsSinceLastRelease"
}, async (t) => {
  await t.step("should get all commits when no release tag exists", async () => {
    const tempDir = await createTempGitRepo();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);
      await createCommit(tempDir, "test1.txt", "content1", "feat: first feature");
      await createCommit(tempDir, "test2.txt", "content2", "fix: bug fix");
      await createCommit(tempDir, "test3.txt", "content3", "docs: update readme");

      const git = new GitOperations(createTestConfig());
      const commits = await git.getCommitsSinceLastRelease();

      assertEquals(commits.length, 3);
      assertEquals(commits[0].type, "docs");
      assertEquals(commits[1].type, "fix");
      assertEquals(commits[2].type, "feat");
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("should get commits since last release tag", async () => {
    const tempDir = await createTempGitRepo();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);
      await createCommit(tempDir, "test1.txt", "content1", "feat: v1 feature");
      await createTag(tempDir, "v1.0.0");

      await createCommit(tempDir, "test2.txt", "content2", "feat: new feature");
      await createCommit(tempDir, "test3.txt", "content3", "fix: bug fix");

      const git = new GitOperations(createTestConfig());
      const commits = await git.getCommitsSinceLastRelease();

      assertEquals(commits.length, 2);
      assertEquals(commits[0].type, "fix");
      assertEquals(commits[1].type, "feat");
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

Deno.test({
  ignore: Deno.env.get("CI") === "true",
  name: "GitOperations - getCurrentCommitHash"
}, async (t) => {
  await t.step("should get current commit hash", async () => {
    const tempDir = await createTempGitRepo();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);
      await createCommit(tempDir, "test.txt", "content", "feat: test commit");

      const git = new GitOperations(createTestConfig());
      const hash = await git.getCurrentCommitHash();

      assertExists(hash);
      assertEquals(hash.length, 40); // Full SHA-1 hash
      assertEquals(/^[0-9a-f]{40}$/.test(hash), true);
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("should throw error in non-git directory", async () => {
    const tempDir = await Deno.makeTempDir();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);
      const git = new GitOperations(createTestConfig());

      await assertRejects(
        async () => await git.getCurrentCommitHash(),
        NagareError,
        "",
      );
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

Deno.test({
  ignore: Deno.env.get("CI") === "true",
  name: "GitOperations - commitAndTag"
}, async (t) => {
  await t.step("should create commit and tag", async () => {
    const tempDir = await createTempGitRepo();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);
      await createCommit(tempDir, "test.txt", "initial", "initial commit");

      // Stage a change
      await Deno.writeTextFile(`${tempDir}/version.txt`, "1.0.0");
      const addCmd = new Deno.Command("git", {
        args: ["add", "version.txt"],
        cwd: tempDir,
      });
      await addCmd.output();

      const git = new GitOperations(createTestConfig());
      await git.commitAndTag("1.0.0");

      // Verify commit
      const logCmd = new Deno.Command("git", {
        args: ["log", "-1", "--pretty=%s"],
        cwd: tempDir,
      });
      const logOutput = await logCmd.output();
      const commitMsg = new TextDecoder().decode(logOutput.stdout).trim();
      assertEquals(commitMsg, "chore(release): release version 1.0.0");

      // Verify tag
      const tagCmd = new Deno.Command("git", {
        args: ["tag", "-l"],
        cwd: tempDir,
      });
      const tagOutput = await tagCmd.output();
      const tags = new TextDecoder().decode(tagOutput.stdout).trim();
      assertStringIncludes(tags, "v1.0.0");
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("should throw error when tag already exists", async () => {
    const tempDir = await createTempGitRepo();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);
      await createCommit(tempDir, "test.txt", "initial", "initial commit");
      await createTag(tempDir, "v1.0.0");

      // Stage a change
      await Deno.writeTextFile(`${tempDir}/version.txt`, "1.0.0");
      const addCmd = new Deno.Command("git", {
        args: ["add", "version.txt"],
        cwd: tempDir,
      });
      await addCmd.output();

      const git = new GitOperations(createTestConfig());

      await assertRejects(
        async () => await git.commitAndTag("1.0.0"),
        NagareError,
        "",
      );
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

Deno.test({
  ignore: Deno.env.get("CI") === "true",
  name: "GitOperations - getGitUser"
}, async (t) => {
  await t.step("should get git user info", async () => {
    const tempDir = await createTempGitRepo();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);
      const git = new GitOperations(createTestConfig());
      const user = await git.getGitUser();

      assertEquals(user.name, "Test User");
      assertEquals(user.email, "test@example.com");
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("should throw error when git user not configured", async () => {
    const tempDir = await Deno.makeTempDir();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);

      // Initialize git without user config
      const initCmd = new Deno.Command("git", {
        args: ["init"],
        cwd: tempDir,
      });
      await initCmd.output();

      const git = new GitOperations(createTestConfig());

      await assertRejects(
        async () => await git.getGitUser(),
        NagareError,
        "",
      );
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

// Test error conditions
Deno.test({
  ignore: Deno.env.get("CI") === "true",
  name: "GitOperations - Error handling"
}, async (t) => {
  await t.step("should throw NagareError for git command failures", async () => {
    const tempDir = await Deno.makeTempDir();
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);
      const git = new GitOperations(createTestConfig());

      // Try to run git command in non-git directory
      const error = await assertRejects(
        async () => await git.getLastReleaseTag(),
        NagareError,
      );

      assertInstanceOf(error, NagareError);
      assertEquals(error.code, ErrorCodes.GIT_NOT_INITIALIZED);
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
