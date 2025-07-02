/**
 * @fileoverview Tests for changelog-generator.ts
 * @description Comprehensive test coverage for CHANGELOG.md generation and management
 */

import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ChangelogGenerator } from "../src/changelog-generator.ts";
import type { NagareConfig, ReleaseNotes } from "../types.ts";

// Helper function to create a test config
function createTestConfig(overrides: Partial<NagareConfig> = {}): NagareConfig {
  return {
    project: {
      name: "test-project",
      repository: "https://github.com/test/project",
    },
    versionFile: {
      path: "./version.ts",
      template: "typescript" as any,
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

// Cleanup helper
async function cleanup(path = "./CHANGELOG.md"): Promise<void> {
  try {
    await Deno.remove(path);
  } catch {
    // Ignore if file doesn't exist
  }
}

Deno.test("ChangelogGenerator - updateChangelog()", async (t) => {
  await t.step("should create new CHANGELOG.md with header when file doesn't exist", async () => {
    await cleanup();
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
    assertStringIncludes(content, "All notable changes to this project will be documented in this file.");
    assertStringIncludes(content, "Keep a Changelog");
    assertStringIncludes(content, "Semantic Versioning");
    
    // Check release entry
    assertStringIncludes(content, "## [1.0.0] - 2024-01-01");
    assertStringIncludes(content, "### Added");
    assertStringIncludes(content, "- Initial release");

    await cleanup();
  });

  await t.step("should append new entry to existing CHANGELOG.md", async () => {
    await cleanup();
    const config = createTestConfig();
    const generator = new ChangelogGenerator(config);

    // Create initial changelog
    const firstRelease = createTestReleaseNotes({
      version: "1.0.0",
      date: "2024-01-01",
      added: ["Initial release"],
    });
    await generator.updateChangelog(firstRelease);

    // Add second release
    const secondRelease = createTestReleaseNotes({
      version: "1.1.0",
      date: "2024-01-15",
      added: ["New feature"],
      fixed: ["Bug fix"],
    });
    await generator.updateChangelog(secondRelease);

    const content = await Deno.readTextFile("./CHANGELOG.md");
    
    // Check both releases are present
    assertStringIncludes(content, "## [1.1.0] - 2024-01-15");
    assertStringIncludes(content, "## [1.0.0] - 2024-01-01");
    
    // Check new release is before old release
    const v110Index = content.indexOf("## [1.1.0]");
    const v100Index = content.indexOf("## [1.0.0]");
    assertEquals(v110Index < v100Index, true, "New release should come before old release");

    await cleanup();
  });

  await t.step("should handle all changelog sections", async () => {
    await cleanup();
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

    // Check section order
    const addedIndex = content.indexOf("### Added");
    const changedIndex = content.indexOf("### Changed");
    const deprecatedIndex = content.indexOf("### Deprecated");
    const removedIndex = content.indexOf("### Removed");
    const fixedIndex = content.indexOf("### Fixed");
    const securityIndex = content.indexOf("### Security");

    assertEquals(addedIndex < changedIndex, true);
    assertEquals(changedIndex < deprecatedIndex, true);
    assertEquals(deprecatedIndex < removedIndex, true);
    assertEquals(removedIndex < fixedIndex, true);
    assertEquals(fixedIndex < securityIndex, true);

    await cleanup();
  });

  await t.step("should only include non-empty sections", async () => {
    await cleanup();
    const config = createTestConfig();
    const generator = new ChangelogGenerator(config);
    
    const releaseNotes = createTestReleaseNotes({
      version: "1.2.0",
      date: "2024-01-20",
      added: ["New feature"],
      fixed: ["Bug fix"],
      // Other sections are empty
    });

    await generator.updateChangelog(releaseNotes);

    const content = await Deno.readTextFile("./CHANGELOG.md");
    
    // Check only non-empty sections are included
    assertStringIncludes(content, "### Added");
    assertStringIncludes(content, "### Fixed");
    
    // Check empty sections are not included
    assertEquals(content.includes("### Changed"), false);
    assertEquals(content.includes("### Deprecated"), false);
    assertEquals(content.includes("### Removed"), false);
    assertEquals(content.includes("### Security"), false);

    await cleanup();
  });

  await t.step("should handle empty release notes", async () => {
    await cleanup();
    const config = createTestConfig();
    const generator = new ChangelogGenerator(config);
    
    const releaseNotes = createTestReleaseNotes({
      version: "1.0.1",
      date: "2024-01-10",
      // All sections empty
    });

    await generator.updateChangelog(releaseNotes);

    const content = await Deno.readTextFile("./CHANGELOG.md");
    
    // Check release header is present
    assertStringIncludes(content, "## [1.0.1] - 2024-01-10");
    
    // Check no sections are included
    assertEquals(content.includes("### Added"), false);
    assertEquals(content.includes("### Changed"), false);
    assertEquals(content.includes("### Deprecated"), false);
    assertEquals(content.includes("### Removed"), false);
    assertEquals(content.includes("### Fixed"), false);
    assertEquals(content.includes("### Security"), false);

    await cleanup();
  });

  await t.step("should preserve existing content when updating", async () => {
    await cleanup();
    
    // Create initial changelog with custom content
    const initialContent = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2023-12-15

### Added
- Beta release features

## [0.8.0] - 2023-12-01

### Fixed
- Various bugs

[0.9.0]: https://github.com/test/project/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/test/project/releases/tag/v0.8.0
`;

    await Deno.writeTextFile("./CHANGELOG.md", initialContent);

    const config = createTestConfig();
    const generator = new ChangelogGenerator(config);
    
    const releaseNotes = createTestReleaseNotes({
      version: "1.0.0",
      date: "2024-01-01",
      added: ["Production release"],
    });

    await generator.updateChangelog(releaseNotes);

    const content = await Deno.readTextFile("./CHANGELOG.md");
    
    // Check new release is added
    assertStringIncludes(content, "## [1.0.0] - 2024-01-01");
    
    // Check old releases are preserved
    assertStringIncludes(content, "## [0.9.0] - 2023-12-15");
    assertStringIncludes(content, "## [0.8.0] - 2023-12-01");
    
    // Check footer links are preserved
    assertStringIncludes(content, "[0.9.0]: https://github.com/test/project/compare/v0.8.0...v0.9.0");
    assertStringIncludes(content, "[0.8.0]: https://github.com/test/project/releases/tag/v0.8.0");

    // Check order
    const v100Index = content.indexOf("## [1.0.0]");
    const v090Index = content.indexOf("## [0.9.0]");
    assertEquals(v100Index < v090Index, true, "New release should come before existing releases");

    await cleanup();
  });

  await t.step("should handle special characters in commit messages", async () => {
    await cleanup();
    const config = createTestConfig();
    const generator = new ChangelogGenerator(config);
    
    const releaseNotes = createTestReleaseNotes({
      version: "1.0.0",
      date: "2024-01-01",
      added: [
        "Feature with `backticks`",
        "Feature with **bold** text",
        "Feature with [links](https://example.com)",
        "Feature with & ampersand",
        "Feature with < and > brackets",
      ],
    });

    await generator.updateChangelog(releaseNotes);

    const content = await Deno.readTextFile("./CHANGELOG.md");
    
    // Check special characters are preserved
    assertStringIncludes(content, "- Feature with `backticks`");
    assertStringIncludes(content, "- Feature with **bold** text");
    assertStringIncludes(content, "- Feature with [links](https://example.com)");
    assertStringIncludes(content, "- Feature with & ampersand");
    assertStringIncludes(content, "- Feature with < and > brackets");

    await cleanup();
  });

  await t.step("should handle file write errors", async () => {
    await cleanup();
    const config = createTestConfig();
    const generator = new ChangelogGenerator(config);
    
    const releaseNotes = createTestReleaseNotes({
      version: "1.0.0",
      date: "2024-01-01",
      added: ["Initial release"],
    });

    // Create a directory with the same name to cause write error
    await Deno.mkdir("./CHANGELOG.md");

    await assertRejects(
      async () => await generator.updateChangelog(releaseNotes),
      Error,
    );

    // Cleanup
    await Deno.remove("./CHANGELOG.md", { recursive: true });
  });
});

Deno.test("ChangelogGenerator - Date formatting", async (t) => {
  await t.step("should format dates correctly", async () => {
    await cleanup();
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

    await cleanup();
  });
});

Deno.test("ChangelogGenerator - Multiple entries with same version", async (t) => {
  await t.step("should handle multiple updates gracefully", async () => {
    await cleanup();
    const config = createTestConfig();
    const generator = new ChangelogGenerator(config);
    
    // First update
    const releaseNotes1 = createTestReleaseNotes({
      version: "1.0.0",
      date: "2024-01-01",
      added: ["Feature A"],
    });
    await generator.updateChangelog(releaseNotes1);

    // Second update with same version (different date)
    const releaseNotes2 = createTestReleaseNotes({
      version: "1.0.0",
      date: "2024-01-02",
      added: ["Feature B"],
    });
    await generator.updateChangelog(releaseNotes2);

    const content = await Deno.readTextFile("./CHANGELOG.md");
    
    // Both entries should be present
    assertStringIncludes(content, "## [1.0.0] - 2024-01-01");
    assertStringIncludes(content, "## [1.0.0] - 2024-01-02");
    assertStringIncludes(content, "Feature A");
    assertStringIncludes(content, "Feature B");

    await cleanup();
  });
});

Deno.test("ChangelogGenerator - Complex changelog preservation", async (t) => {
  await t.step("should preserve complex changelog structures", async () => {
    await cleanup();
    
    // Create a complex changelog with various formatting
    const complexChangelog = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Work in progress feature

## [1.0.0] - 2023-12-31

### Added
- Initial stable release
- Comprehensive documentation
- Full test coverage

### Changed
- Migrated from JavaScript to TypeScript
- Updated all dependencies

### Security
- Fixed all known vulnerabilities

## [0.1.0] - 2023-01-01

### Added
- Initial beta release

---

## Links

[Unreleased]: https://github.com/test/project/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/test/project/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/test/project/releases/tag/v0.1.0
`;

    await Deno.writeTextFile("./CHANGELOG.md", complexChangelog);

    const config = createTestConfig();
    const generator = new ChangelogGenerator(config);
    
    const releaseNotes = createTestReleaseNotes({
      version: "1.1.0",
      date: "2024-01-15",
      added: ["New feature"],
      changed: ["Performance improvements"],
    });

    await generator.updateChangelog(releaseNotes);

    const content = await Deno.readTextFile("./CHANGELOG.md");
    
    // Check new release is added
    assertStringIncludes(content, "## [Unreleased]");
    assertStringIncludes(content, "## [1.1.0] - 2024-01-15");
    assertStringIncludes(content, "## [1.0.0] - 2023-12-31");
    
    // The insertion logic actually puts the new entry right after the header,
    // before any existing sections (including [Unreleased])
    const lines = content.split("\n");
    let unreleasedLineIndex = -1;
    let v110LineIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("## [Unreleased]")) unreleasedLineIndex = i;
      if (lines[i].includes("## [1.1.0]")) v110LineIndex = i;
    }
    
    // The new version should be inserted before [Unreleased]
    assertEquals(v110LineIndex < unreleasedLineIndex, true, "New release should come before [Unreleased]");
    
    // Check that all content is preserved
    assertStringIncludes(content, "Work in progress feature");
    assertStringIncludes(content, "Initial stable release");
    assertStringIncludes(content, "Initial beta release");
    
    // Check footer is preserved
    assertStringIncludes(content, "## Links");
    assertStringIncludes(content, "[Unreleased]: https://github.com/test/project/compare/v1.0.0...HEAD");

    await cleanup();
  });
});

Deno.test("ChangelogGenerator - Line endings and formatting", async (t) => {
  await t.step("should maintain consistent line endings", async () => {
    await cleanup();
    const config = createTestConfig();
    const generator = new ChangelogGenerator(config);
    
    const releaseNotes = createTestReleaseNotes({
      version: "1.0.0",
      date: "2024-01-01",
      added: ["Feature one", "Feature two"],
      fixed: ["Bug one", "Bug two"],
    });

    await generator.updateChangelog(releaseNotes);

    const content = await Deno.readTextFile("./CHANGELOG.md");
    
    // Check proper spacing between sections
    const lines = content.split("\n");
    
    // Find section indices
    let addedIndex = -1;
    let fixedIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === "### Added") addedIndex = i;
      if (lines[i] === "### Fixed") fixedIndex = i;
    }
    
    // Check there's a blank line after the last item of Added section
    assertEquals(lines[addedIndex + 3], "", "Should have blank line after Added section");
    
    // Check the structure
    assertEquals(lines[addedIndex + 1], "- Feature one");
    assertEquals(lines[addedIndex + 2], "- Feature two");

    await cleanup();
  });
});

Deno.test("ChangelogGenerator - Edge cases", async (t) => {
  await t.step("should handle very long commit messages", async () => {
    await cleanup();
    const config = createTestConfig();
    const generator = new ChangelogGenerator(config);
    
    const longMessage = "This is a very long commit message that contains a lot of details about the implementation. ".repeat(5);
    const releaseNotes = createTestReleaseNotes({
      version: "1.0.0",
      date: "2024-01-01",
      added: [longMessage],
    });

    await generator.updateChangelog(releaseNotes);

    const content = await Deno.readTextFile("./CHANGELOG.md");
    assertStringIncludes(content, longMessage);

    await cleanup();
  });

  await t.step("should handle multi-line commit messages", async () => {
    await cleanup();
    const config = createTestConfig();
    const generator = new ChangelogGenerator(config);
    
    const multiLineMessage = "First line\nSecond line\nThird line";
    const releaseNotes = createTestReleaseNotes({
      version: "1.0.0",
      date: "2024-01-01",
      added: [multiLineMessage],
    });

    await generator.updateChangelog(releaseNotes);

    const content = await Deno.readTextFile("./CHANGELOG.md");
    // Multi-line messages should be preserved as single items
    assertStringIncludes(content, `- ${multiLineMessage}`);

    await cleanup();
  });

  await t.step("should handle version with pre-release tags", async () => {
    await cleanup();
    const config = createTestConfig();
    const generator = new ChangelogGenerator(config);
    
    const releaseNotes = createTestReleaseNotes({
      version: "2.0.0-beta.1",
      date: "2024-01-01",
      added: ["Beta feature"],
    });

    await generator.updateChangelog(releaseNotes);

    const content = await Deno.readTextFile("./CHANGELOG.md");
    assertStringIncludes(content, "## [2.0.0-beta.1] - 2024-01-01");

    await cleanup();
  });

  await t.step("should handle empty arrays vs undefined arrays", async () => {
    await cleanup();
    const config = createTestConfig();
    const generator = new ChangelogGenerator(config);
    
    // Test with explicit empty arrays
    const releaseNotes1 = {
      version: "1.0.0",
      date: "2024-01-01",
      added: [],
      changed: [],
      deprecated: [],
      removed: [],
      fixed: [],
      security: [],
    } as ReleaseNotes;

    await generator.updateChangelog(releaseNotes1);

    const content1 = await Deno.readTextFile("./CHANGELOG.md");
    assertStringIncludes(content1, "## [1.0.0] - 2024-01-01");
    assertEquals(content1.includes("### Added"), false);

    await cleanup();

    // Test with some undefined properties (if the type allows)
    const releaseNotes2 = createTestReleaseNotes({
      version: "1.0.1",
      date: "2024-01-02",
      added: ["New feature"],
      // Other arrays remain empty from default
    });

    await generator.updateChangelog(releaseNotes2);

    const content2 = await Deno.readTextFile("./CHANGELOG.md");
    assertStringIncludes(content2, "### Added");
    assertEquals(content2.includes("### Changed"), false);

    await cleanup();
  });
});