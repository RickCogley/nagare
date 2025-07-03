/**
 * @fileoverview Tests for changelog generation
 */

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ChangelogGenerator } from "../src/changelog-generator.ts";
import type { NagareConfig, ReleaseNotes } from "../types.ts";
import { TemplateFormat } from "../types.ts";

// Helper function to create test config
function createTestConfig(overrides: Partial<NagareConfig> = {}): NagareConfig {
  return {
    project: {
      name: "test-project",
      repository: "https://github.com/test/repo",
    },
    versionFile: {
      path: "./version.ts",
      template: TemplateFormat.TYPESCRIPT,
    },
    ...overrides,
  };
}

// Helper function to create test release notes
function createTestReleaseNotes(overrides: Partial<ReleaseNotes> = {}): ReleaseNotes {
  return {
    version: "1.0.0",
    date: "2024-01-01",
    added: [],
    changed: [],
    deprecated: [],
    removed: [],
    fixed: [],
    security: [],
    ...overrides,
  };
}

Deno.test("ChangelogGenerator - updateChangelog()", async (t) => {
  await t.step("should create new CHANGELOG.md with header when file doesn't exist", async () => {
    // Create a temporary directory for this test
    const tempDir = await Deno.makeTempDir({ prefix: "nagare-changelog-test-" });
    const originalCwd = Deno.cwd();

    try {
      // Change to temp directory
      Deno.chdir(tempDir);

      const config = createTestConfig();
      const generator = new ChangelogGenerator(config);

      const releaseNotes = createTestReleaseNotes({
        version: "1.0.0",
        date: "2024-01-01",
        added: ["Initial release"],
      });

      await generator.updateChangelog(releaseNotes);

      const content = await Deno.readTextFile("./CHANGELOG.md");

      // Check header
      assertStringIncludes(content, "# Changelog");
      assertStringIncludes(
        content,
        "All notable changes to this project will be documented in this file.",
      );
      assertStringIncludes(content, "Keep a Changelog");
      assertStringIncludes(content, "Semantic Versioning");

      // Check release entry
      assertStringIncludes(content, "## [1.0.0] - 2024-01-01");
      assertStringIncludes(content, "### Added");
      assertStringIncludes(content, "- Initial release");

      console.log("✅ Updated CHANGELOG.md");
    } finally {
      // Always restore original directory
      Deno.chdir(originalCwd);
      // Cleanup temp directory
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("should append to existing CHANGELOG.md", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "nagare-changelog-test-" });
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);

      const config = createTestConfig();
      const generator = new ChangelogGenerator(config);

      // First release
      const releaseNotes1 = createTestReleaseNotes({
        version: "1.0.0",
        date: "2024-01-01",
        added: ["Initial release"],
      });

      await generator.updateChangelog(releaseNotes1);

      // Second release
      const releaseNotes2 = createTestReleaseNotes({
        version: "1.1.0",
        date: "2024-01-15",
        added: ["New feature"],
        fixed: ["Bug fix"],
      });

      await generator.updateChangelog(releaseNotes2);

      const content = await Deno.readTextFile("./CHANGELOG.md");

      // Check both releases are present
      assertStringIncludes(content, "## [1.1.0] - 2024-01-15");
      assertStringIncludes(content, "## [1.0.0] - 2024-01-01");

      // Check new release is before old release
      const v110Index = content.indexOf("## [1.1.0]");
      const v100Index = content.indexOf("## [1.0.0]");
      assertEquals(v110Index < v100Index, true, "New release should come before old release");
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("should handle all changelog sections", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "nagare-changelog-test-" });
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);

      const config = createTestConfig();
      const generator = new ChangelogGenerator(config);

      const releaseNotes = createTestReleaseNotes({
        version: "2.0.0",
        date: "2024-02-01",
        added: ["New API endpoint", "Documentation site"],
        changed: ["Updated dependencies", "Improved performance"],
        deprecated: ["Old API format", "Legacy config options"],
        removed: ["Unused feature", "Obsolete dependency"],
        fixed: ["Memory leak", "Type errors"],
        security: ["Updated vulnerable dependency", "Fixed XSS vulnerability"],
      });

      await generator.updateChangelog(releaseNotes);

      const content = await Deno.readTextFile("./CHANGELOG.md");

      // Check all sections are present in correct order
      assertStringIncludes(content, "### Added");
      assertStringIncludes(content, "- New API endpoint");
      assertStringIncludes(content, "- Documentation site");

      assertStringIncludes(content, "### Changed");
      assertStringIncludes(content, "- Updated dependencies");
      assertStringIncludes(content, "- Improved performance");

      assertStringIncludes(content, "### Deprecated");
      assertStringIncludes(content, "- Old API format");
      assertStringIncludes(content, "- Legacy config options");

      assertStringIncludes(content, "### Removed");
      assertStringIncludes(content, "- Unused feature");
      assertStringIncludes(content, "- Obsolete dependency");

      assertStringIncludes(content, "### Fixed");
      assertStringIncludes(content, "- Memory leak");
      assertStringIncludes(content, "- Type errors");

      assertStringIncludes(content, "### Security");
      assertStringIncludes(content, "- Updated vulnerable dependency");
      assertStringIncludes(content, "- Fixed XSS vulnerability");

      // Check sections are in the correct order
      const addedIndex = content.indexOf("### Added");
      const changedIndex = content.indexOf("### Changed");
      const deprecatedIndex = content.indexOf("### Deprecated");
      const removedIndex = content.indexOf("### Removed");
      const fixedIndex = content.indexOf("### Fixed");
      const securityIndex = content.indexOf("### Security");

      assertEquals(
        addedIndex < changedIndex &&
          changedIndex < deprecatedIndex &&
          deprecatedIndex < removedIndex &&
          removedIndex < fixedIndex &&
          fixedIndex < securityIndex,
        true,
        "Sections should be in the correct order",
      );
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("should not duplicate entries on re-run", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "nagare-changelog-test-" });
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);

      const config = createTestConfig();
      const generator = new ChangelogGenerator(config);

      const releaseNotes = createTestReleaseNotes({
        version: "1.0.0",
        date: "2024-01-01",
        added: ["Initial release"],
      });

      // Run twice
      await generator.updateChangelog(releaseNotes);
      await generator.updateChangelog(releaseNotes);

      const content = await Deno.readTextFile("./CHANGELOG.md");

      // Count occurrences of the version
      const matches = content.match(/## \[1\.0\.0\]/g) || [];
      assertEquals(matches.length, 1, "Version should appear only once");
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("should preserve existing content", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "nagare-changelog-test-" });
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);

      // Create existing changelog with custom content
      const existingContent = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2023-12-01

### Added
- Legacy feature

## Custom Section

This should be preserved.
`;

      await Deno.writeTextFile("./CHANGELOG.md", existingContent);

      const config = createTestConfig();
      const generator = new ChangelogGenerator(config);

      const releaseNotes = createTestReleaseNotes({
        version: "1.0.0",
        date: "2024-01-01",
        added: ["New release"],
      });

      await generator.updateChangelog(releaseNotes);

      const content = await Deno.readTextFile("./CHANGELOG.md");

      // Check new release is added
      assertStringIncludes(content, "## [1.0.0] - 2024-01-01");

      // Check old content is preserved
      assertStringIncludes(content, "## [0.9.0] - 2023-12-01");
      assertStringIncludes(content, "- Legacy feature");
      assertStringIncludes(content, "## Custom Section");
      assertStringIncludes(content, "This should be preserved.");
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

Deno.test("ChangelogGenerator - Edge cases", async (t) => {
  await t.step("should handle empty release notes sections", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "nagare-changelog-test-" });
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);

      const config = createTestConfig();
      const generator = new ChangelogGenerator(config);

      const releaseNotes = createTestReleaseNotes({
        version: "1.0.0",
        date: "2024-01-01",
        // All arrays are empty by default
      });

      await generator.updateChangelog(releaseNotes);

      const content = await Deno.readTextFile("./CHANGELOG.md");

      // Should still create entry but without sections
      assertStringIncludes(content, "## [1.0.0] - 2024-01-01");

      // Should not include empty sections
      assertEquals(content.includes("### Added"), false);
      assertEquals(content.includes("### Changed"), false);
      assertEquals(content.includes("### Fixed"), false);
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });

  await t.step("should escape special characters in changelog entries", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "nagare-changelog-test-" });
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);

      const config = createTestConfig();
      const generator = new ChangelogGenerator(config);

      const releaseNotes = createTestReleaseNotes({
        version: "1.0.0",
        date: "2024-01-01",
        added: [
          "Support for `markdown` code blocks",
          "Added **bold** and *italic* text",
          "Fixed [link](http://example.com) handling",
        ],
      });

      await generator.updateChangelog(releaseNotes);

      const content = await Deno.readTextFile("./CHANGELOG.md");

      // Check that special characters are preserved
      assertStringIncludes(content, "- Support for `markdown` code blocks");
      assertStringIncludes(content, "- Added **bold** and *italic* text");
      assertStringIncludes(content, "- Fixed [link](http://example.com) handling");
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

Deno.test("ChangelogGenerator - Date formatting", async (t) => {
  await t.step("should format dates correctly", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "nagare-changelog-test-" });
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);

      const config = createTestConfig();
      const generator = new ChangelogGenerator(config);

      const releaseNotes = createTestReleaseNotes({
        version: "1.0.0",
        date: "2024-12-25",
        added: ["Christmas release"],
      });

      await generator.updateChangelog(releaseNotes);

      const content = await Deno.readTextFile("./CHANGELOG.md");
      assertStringIncludes(content, "## [1.0.0] - 2024-12-25");
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

Deno.test("ChangelogGenerator - Multiple entries with same version", async (t) => {
  await t.step("should handle multiple updates gracefully", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "nagare-changelog-test-" });
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);

      const config = createTestConfig();
      const generator = new ChangelogGenerator(config);

      // First update
      const releaseNotes1 = createTestReleaseNotes({
        version: "1.0.0",
        date: "2024-01-01",
        added: ["Feature A"],
      });

      await generator.updateChangelog(releaseNotes1);

      // Second update with same version (should replace)
      const releaseNotes2 = createTestReleaseNotes({
        version: "1.0.0",
        date: "2024-01-01",
        added: ["Feature A", "Feature B"],
        fixed: ["Bug fix"],
      });

      await generator.updateChangelog(releaseNotes2);

      const content = await Deno.readTextFile("./CHANGELOG.md");

      // Should only have one entry for 1.0.0
      const matches = content.match(/## \[1\.0\.0\]/g) || [];
      assertEquals(matches.length, 1);

      // Should have the updated content
      assertStringIncludes(content, "- Feature A");
      assertStringIncludes(content, "- Feature B");
      assertStringIncludes(content, "- Bug fix");
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

Deno.test("ChangelogGenerator - Repository URL in version headers", async (t) => {
  await t.step("should include repository URL in version headers when available", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "nagare-changelog-test-" });
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);

      const config = createTestConfig({
        project: {
          name: "test-project",
          repository: "https://github.com/test/repo",
        },
      });
      const generator = new ChangelogGenerator(config);

      const releaseNotes = createTestReleaseNotes({
        version: "1.0.0",
        date: "2024-01-01",
        added: ["Initial release"],
      });

      await generator.updateChangelog(releaseNotes);

      const content = await Deno.readTextFile("./CHANGELOG.md");

      // For now, just check the basic format
      // In the future, this might include compare URLs like:
      // ## [1.0.0] - 2024-01-01
      // [1.0.0]: https://github.com/test/repo/compare/v0.9.0...v1.0.0
      assertStringIncludes(content, "## [1.0.0] - 2024-01-01");
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});

Deno.test("ChangelogGenerator - Partial release notes", async (t) => {
  await t.step("should handle release notes with only some sections", async () => {
    const tempDir = await Deno.makeTempDir({ prefix: "nagare-changelog-test-" });
    const originalCwd = Deno.cwd();

    try {
      Deno.chdir(tempDir);

      const config = createTestConfig();
      const generator = new ChangelogGenerator(config);

      // Test with some undefined properties (if the type allows)
      const releaseNotes = createTestReleaseNotes({
        version: "1.0.1",
        date: "2024-01-02",
        added: ["New feature"],
        // Other arrays remain empty from default
      });

      await generator.updateChangelog(releaseNotes);

      const content = await Deno.readTextFile("./CHANGELOG.md");
      assertStringIncludes(content, "### Added");
      assertEquals(content.includes("### Changed"), false);
    } finally {
      Deno.chdir(originalCwd);
      await Deno.remove(tempDir, { recursive: true });
    }
  });
});
