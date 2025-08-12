/**
 * @fileoverview Mock implementations of ReleaseManager dependencies for testing
 * @module release-manager_test_mocks
 */

// deno-lint-ignore-file require-await no-unused-vars

import type { ConventionalCommit, NagareConfig, ReleaseNotes, TemplateData } from "../../types.ts";
import type { FileUpdateResult } from "./file-handlers.ts";
import type { ReleaseManagerDeps } from "./release-manager-deps.ts";
import { GitOperations } from "../git/git-operations.ts";
import { VersionUtils } from "./version-utils.ts";
import { ChangelogGenerator, type PRReleaseNotes } from "../templates/changelog-generator.ts";
import { GitHubIntegration } from "../git/github-integration.ts";
import { TemplateProcessor } from "../templates/template-processor.ts";
import { DocGenerator } from "../templates/doc-generator.ts";
import { Logger } from "../core/logger.ts";
import { FileHandlerManager } from "./file-handlers.ts";
import { BackupManager } from "./backup-manager.ts";
import { ReleaseStateTracker } from "./release-state-tracker.ts";
import { LogLevel } from "../../config.ts";

/**
 * Mock GitOperations for testing
 */
export class MockGitOperations extends GitOperations {
  private mockState = {
    isRepo: true,
    hasUncommittedChanges: false,
    commits: [] as ConventionalCommit[],
    currentVersion: "1.0.0",
    tags: [] as string[],
    branch: "main",
    user: { name: "Test User", email: "test@example.com" },
  };

  constructor(config: NagareConfig) {
    super(config);
  }

  setMockState(state: Partial<typeof this.mockState>) {
    Object.assign(this.mockState, state);
  }

  override async isGitRepository(): Promise<boolean> {
    return this.mockState.isRepo;
  }

  override async hasUncommittedChanges(): Promise<boolean> {
    return this.mockState.hasUncommittedChanges;
  }

  override async getCommitsSinceLastRelease(_tagPrefix?: string): Promise<ConventionalCommit[]> {
    return this.mockState.commits;
  }

  override async getLastReleaseTag(): Promise<string> {
    return this.mockState.tags[0] || "";
  }

  override async getCurrentCommitHash(): Promise<string> {
    return "abc123def456";
  }

  override async getGitUser(): Promise<{ name: string; email: string }> {
    return this.mockState.user;
  }

  override async commitAndTag(version: string): Promise<void> {
    // Mock successful commit and tag
    const tagPrefix = "v"; // Use default since config is private
    this.mockState.tags.push(`${tagPrefix}${version}`);
  }

  override async pushToRemote(): Promise<void> {
    // Mock successful push
  }
}

/**
 * Mock VersionUtils for testing
 */
export class MockVersionUtils extends VersionUtils {
  private mockCurrentVersion = "1.0.0";

  constructor(config: NagareConfig, git: GitOperations) {
    super(config, git);
  }

  setMockCurrentVersion(version: string) {
    this.mockCurrentVersion = version;
  }

  override async getCurrentVersion(): Promise<string> {
    return this.mockCurrentVersion;
  }
}

/**
 * Mock FileHandlerManager for testing
 */
export class MockFileHandlerManager extends FileHandlerManager {
  private mockFiles = new Map<string, string>();

  constructor() {
    super();
    this.setupDefaultFiles();
  }

  private setupDefaultFiles() {
    this.mockFiles.set("./version.ts", 'export const VERSION = "1.0.0";');
    this.mockFiles.set(
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
    this.mockFiles.set(
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
    this.mockFiles.set("./CHANGELOG.md", `# Changelog\n\n## [1.0.0] - 2024-01-01\n- Initial release`);
    this.mockFiles.set("./README.md", `# Test Project\n\nVersion: 1.0.0`);
  }

  setMockFile(path: string, content: string) {
    this.mockFiles.set(path, content);
  }

  getMockFile(path: string): string | undefined {
    return this.mockFiles.get(path);
  }

  override async updateFile(
    filePath: string,
    key: string,
    newValue: string,
    customUpdateFn?: (content: string, data: TemplateData) => string,
  ): Promise<FileUpdateResult> {
    const content = this.mockFiles.get(filePath);
    if (!content) {
      return { success: false, error: `File not found: ${filePath}` };
    }

    // Simple mock update - just store the new content
    if (customUpdateFn) {
      // Create a minimal TemplateData for testing
      const templateData: TemplateData = {
        version: newValue,
        buildDate: new Date().toISOString(),
        gitCommit: "test-commit",
        environment: "test",
        releaseNotes: {
          version: newValue,
          date: new Date().toISOString(),
          added: [],
          changed: [],
          deprecated: [],
          removed: [],
          fixed: [],
          security: [],
        },
        metadata: {},
        project: {
          name: "test-project",
          repository: "https://github.com/test/project",
        },
      };
      const updated = customUpdateFn(content, templateData);
      this.mockFiles.set(filePath, updated);
      return { success: true, content: updated };
    }

    // Mock JSON update
    if (filePath.endsWith(".json")) {
      try {
        const json = JSON.parse(content);
        json[key] = newValue;
        const updated = JSON.stringify(json, null, 2);
        this.mockFiles.set(filePath, updated);
        return { success: true, content: updated };
      } catch (e) {
        return { success: false, error: `Invalid JSON in ${filePath}` };
      }
    }

    // Mock TypeScript update
    if (filePath.endsWith(".ts")) {
      const updated = content.replace(/"[^"]+"/g, `"${newValue}"`);
      this.mockFiles.set(filePath, updated);
      return { success: true, content: updated };
    }

    return { success: true, content };
  }
}

/**
 * Mock ChangelogGenerator for testing
 */
export class MockChangelogGenerator extends ChangelogGenerator {
  override async generatePRReleaseNotes(
    version: string,
    commits: ConventionalCommit[],
  ): Promise<PRReleaseNotes> {
    const notes: PRReleaseNotes = {
      version,
      date: new Date().toISOString(),
      added: [],
      changed: [],
      deprecated: [],
      removed: [],
      fixed: [],
      security: [],
      hasPRs: false,
    };

    // Categorize commits
    for (const commit of commits) {
      if (commit.type === "feat") {
        notes.added.push(commit.description);
      } else if (commit.type === "fix") {
        notes.fixed.push(commit.description);
      } else if (commit.type === "docs" || commit.type === "perf") {
        notes.changed.push(commit.description);
      }
    }

    return notes;
  }

  override async updateChangelog(
    _releaseNotes: ReleaseNotes,
    _repository?: string,
    _changelogPath = "./CHANGELOG.md",
  ): Promise<void> {
    // Mock successful changelog update
  }
}

/**
 * Create mock dependencies for testing
 */
export function createMockDeps(
  config: NagareConfig,
  overrides?: Partial<{
    gitState: Parameters<MockGitOperations["setMockState"]>[0];
    currentVersion: string;
    files: Map<string, string>;
  }>,
): ReleaseManagerDeps {
  const logger = new Logger(LogLevel.ERROR); // Quiet logging for tests

  const mockGit = new MockGitOperations(config);
  if (overrides?.gitState) {
    mockGit.setMockState(overrides.gitState);
  }

  const mockVersionUtils = new MockVersionUtils(config, mockGit);
  if (overrides?.currentVersion) {
    mockVersionUtils.setMockCurrentVersion(overrides.currentVersion);
  }

  const mockFileHandler = new MockFileHandlerManager();
  if (overrides?.files) {
    for (const [path, content] of overrides.files) {
      mockFileHandler.setMockFile(path, content);
    }
  }

  return {
    git: mockGit,
    versionUtils: mockVersionUtils,
    changelogGenerator: new MockChangelogGenerator(config),
    github: new GitHubIntegration(config), // Use real one, it doesn't do much in dry-run
    templateProcessor: new TemplateProcessor(config), // Use real one
    docGenerator: new DocGenerator(config), // Use real one
    logger,
    fileHandlerManager: mockFileHandler,
    backupManager: new BackupManager(logger),
    stateTracker: new ReleaseStateTracker(logger),
  };
}
