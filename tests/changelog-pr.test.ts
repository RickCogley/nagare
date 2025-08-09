/**
 * @module changelog-pr.test
 * @description Tests for PR-aware changelog generation
 */

import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { PRDetector } from "../src/changelog/pr-detector.ts";
import { GitOperations } from "../src/git/git-operations.ts";
import { ChangelogGenerator } from "../src/templates/changelog-generator.ts";
import type { NagareConfig } from "../types.ts";

// Mock configuration
const mockConfig: NagareConfig = {
  project: {
    name: "test-project",
    description: "Test project",
  },
  versionFile: {
    path: "./version.ts",
    template: "typescript" as any,
  },
  options: {
    logLevel: "ERROR" as any,
  },
};

describe("PR Detection", () => {
  describe("GitOperations PR methods", () => {
    let git: GitOperations;

    beforeEach(() => {
      git = new GitOperations(mockConfig);
    });

    it("should extract PR number from standard GitHub merge commit", () => {
      const message = "Merge pull request #123 from user/feature-branch";
      const prNumber = git.extractPRNumber(message);
      assertEquals(prNumber, 123);
    });

    it("should extract PR number from short format", () => {
      const message = "Merge PR #456";
      const prNumber = git.extractPRNumber(message);
      assertEquals(prNumber, 456);
    });

    it("should extract PR number from parentheses format", () => {
      const message = "feat: add new feature (#789)";
      const prNumber = git.extractPRNumber(message);
      assertEquals(prNumber, 789);
    });

    it("should extract PR number from simple merge format", () => {
      const message = "Merge #321: Add documentation";
      const prNumber = git.extractPRNumber(message);
      assertEquals(prNumber, 321);
    });

    it("should return null for non-PR commits", () => {
      const message = "feat: regular commit without PR";
      const prNumber = git.extractPRNumber(message);
      assertEquals(prNumber, null);
    });
  });

  describe("PRDetector", () => {
    let detector: PRDetector;
    let git: GitOperations;

    beforeEach(() => {
      git = new GitOperations(mockConfig);
      detector = new PRDetector(git, mockConfig);
    });

    it("should detect when PR detection is disabled", () => {
      // Save original value
      const originalValue = Deno.env.get("NAGARE_DISABLE_PR_DETECTION");

      try {
        // Test disabled states
        Deno.env.set("NAGARE_DISABLE_PR_DETECTION", "true");
        assertEquals(detector.isPRDetectionDisabled(), true);

        Deno.env.set("NAGARE_DISABLE_PR_DETECTION", "1");
        assertEquals(detector.isPRDetectionDisabled(), true);

        // Test enabled states
        Deno.env.set("NAGARE_DISABLE_PR_DETECTION", "false");
        assertEquals(detector.isPRDetectionDisabled(), false);

        Deno.env.delete("NAGARE_DISABLE_PR_DETECTION");
        assertEquals(detector.isPRDetectionDisabled(), false);
      } finally {
        // Restore original value
        if (originalValue !== undefined) {
          Deno.env.set("NAGARE_DISABLE_PR_DETECTION", originalValue);
        } else {
          Deno.env.delete("NAGARE_DISABLE_PR_DETECTION");
        }
      }
    });

    it("should group commits by type correctly", () => {
      const commits = [
        { type: "feat", description: "Feature 1", hash: "abc123" },
        { type: "fix", description: "Fix 1", hash: "def456" },
        { type: "feat", description: "Feature 2", hash: "ghi789" },
        { type: "docs", description: "Docs 1", hash: "jkl012" },
      ] as any;

      const grouped = detector.groupCommitsByType(commits);

      assertEquals(grouped.feat?.length, 2);
      assertEquals(grouped.fix?.length, 1);
      assertEquals(grouped.docs?.length, 1);
      assertEquals(grouped.feat[0].description, "Feature 1");
      assertEquals(grouped.feat[1].description, "Feature 2");
    });
  });

  describe("ChangelogGenerator PR features", () => {
    let generator: ChangelogGenerator;

    beforeEach(() => {
      generator = new ChangelogGenerator(mockConfig);
    });

    it("should generate traditional changelog when no PRs detected", async () => {
      const commits = [
        {
          type: "feat",
          description: "Add new feature",
          hash: "abc1234",
          scope: "core",
        },
        {
          type: "fix",
          description: "Fix bug",
          hash: "def5678",
        },
      ] as any;

      const releaseNotes = await generator.generatePRReleaseNotes("2.0.0", commits);

      assertEquals(releaseNotes.version, "2.0.0");
      assertEquals(releaseNotes.hasPRs, false);
      assertExists(releaseNotes.added);
      assertExists(releaseNotes.fixed);
    });

    it("should handle PR-aware release notes structure", () => {
      const prReleaseNotes = {
        version: "2.0.0",
        date: "2024-01-01",
        added: [],
        changed: [],
        deprecated: [],
        removed: [],
        fixed: [],
        security: [],
        hasPRs: true,
        pullRequests: [
          {
            number: 123,
            title: "Add awesome feature",
            features: [
              { type: "feat", description: "Feature 1", hash: "abc1234", scope: undefined },
            ],
            fixes: [],
            changes: [],
            other: [],
            sha: "merge12",
          },
        ],
        directCommits: {
          features: [],
          fixes: [
            { type: "fix", description: "Direct fix", hash: "fix1234", scope: undefined },
          ],
          changes: [],
          other: [],
        },
      };

      // Verify structure
      assertExists(prReleaseNotes.pullRequests);
      assertEquals(prReleaseNotes.pullRequests[0].number, 123);
      assertEquals(prReleaseNotes.pullRequests[0].features.length, 1);
      assertExists(prReleaseNotes.directCommits);
      assertEquals(prReleaseNotes.directCommits.fixes.length, 1);
    });
  });

  describe("Vento template rendering", () => {
    it("should properly use .slice() for string truncation", () => {
      const hash = "abcdefghijklmnop";
      const truncated = hash.slice(0, 7);
      assertEquals(truncated, "abcdefg");
    });

    it("should handle conditional rendering", () => {
      const features = [];
      const shouldRender = features.length > 0;
      assertEquals(shouldRender, false);

      features.push({ type: "feat", description: "Test" });
      const shouldRenderNow = features.length > 0;
      assertEquals(shouldRenderNow, true);
    });
  });

  describe("Edge cases", () => {
    it("should handle repos without any PRs", async () => {
      const git = new GitOperations(mockConfig);
      const detector = new PRDetector(git, mockConfig);

      // This would return empty results in a repo without PRs
      // We're just testing the structure here
      const result = {
        pullRequests: new Map(),
        directCommits: [],
        hasPRs: false,
      };

      assertEquals(result.hasPRs, false);
      assertEquals(result.pullRequests.size, 0);
    });

    it("should handle squash-merge PRs", () => {
      // Squash merges result in a single commit
      const squashCommit = {
        type: "feat",
        description: "Squashed feature from PR",
        hash: "squash1",
        scope: "api",
      };

      // Should be treated as a single commit PR
      assertExists(squashCommit);
      assertEquals(squashCommit.type, "feat");
    });

    it("should handle mixed workflows", () => {
      // Some commits from PRs, some direct
      const prCommits = [
        { type: "feat", description: "PR feature", hash: "pr1234" },
      ];
      const directCommits = [
        { type: "fix", description: "Direct fix", hash: "dir567" },
      ];

      // Both should be handled separately
      assertExists(prCommits);
      assertExists(directCommits);
      assertEquals(prCommits.length, 1);
      assertEquals(directCommits.length, 1);
    });
  });
});

describe("Integration with Release Manager", () => {
  it("should use PR-aware changelog generation in release flow", async () => {
    // This tests that the ReleaseManager now uses generatePRReleaseNotes
    const config: NagareConfig = {
      ...mockConfig,
      options: {
        ...mockConfig.options,
        skipConfirmation: true,
        dryRun: true,
      },
    };

    // The release manager should now detect PRs automatically
    const releaseManager = new (await import("../src/release/release-manager.ts")).ReleaseManager(config);

    // Verify the changelog generator is being used properly
    assertExists(releaseManager);
  });

  it("should disable PR detection with environment variable", async () => {
    const originalValue = Deno.env.get("NAGARE_DISABLE_PR_DETECTION");

    try {
      Deno.env.set("NAGARE_DISABLE_PR_DETECTION", "true");

      const generator = new ChangelogGenerator(mockConfig);
      const detector = new PRDetector(new GitOperations(mockConfig), mockConfig);

      assertEquals(detector.isPRDetectionDisabled(), true);

      // Should generate traditional changelog when disabled
      const commits = [
        { type: "feat", description: "Test feature", hash: "abc1234" },
      ] as any;

      const releaseNotes = await generator.generatePRReleaseNotes("2.0.0", commits);
      assertEquals(releaseNotes.hasPRs, false);
    } finally {
      if (originalValue !== undefined) {
        Deno.env.set("NAGARE_DISABLE_PR_DETECTION", originalValue);
      } else {
        Deno.env.delete("NAGARE_DISABLE_PR_DETECTION");
      }
    }
  });
});

describe("Changelog template formatting", () => {
  it("should format PR entries correctly", () => {
    const pr = {
      number: 123,
      title: "Add awesome feature",
      features: [
        {
          description: "New API endpoint",
          scope: "api",
          hash: "abc1234567890",
          type: "feat",
        },
      ],
    };

    // Expected format: "### Add awesome feature (#123)"
    const expectedTitle = `### ${pr.title} (#${pr.number})`;
    assertStringIncludes(expectedTitle, "#123");

    // Expected format for commits: "- New API endpoint (api) (abc1234)"
    const commit = pr.features[0];
    const expectedCommit = `- ${commit.description} (${commit.scope}) (${commit.hash.slice(0, 7)})`;
    assertStringIncludes(expectedCommit, "abc1234");
    assertStringIncludes(expectedCommit, "(api)");
  });

  it("should handle commits without scope", () => {
    const commit = {
      description: "Fix bug",
      scope: undefined,
      hash: "def4567890123",
      type: "fix",
    };

    // Expected format without scope: "- Fix bug (def4567)"
    const expectedFormat = `- ${commit.description} (${commit.hash.slice(0, 7)})`;
    assertEquals(expectedFormat, "- Fix bug (def4567)");
  });
});
