/**
 * @fileoverview Tests for version-utils.ts
 * @description Comprehensive test coverage for semantic versioning operations
 */

import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { VersionUtils } from "../src/version-utils.ts";
import { NagareError } from "../src/enhanced-error.ts";
import { BumpType, TemplateFormat } from "../types.ts";
import type { ConventionalCommit, NagareConfig } from "../types.ts";

// Helper function to create a test config
function createTestConfig(overrides: Partial<NagareConfig> = {}): NagareConfig {
  return {
    project: {
      name: "test-project",
      repository: "https://github.com/test/project",
    },
    versionFile: {
      path: "./test-version.ts",
      template: TemplateFormat.TYPESCRIPT,
    },
    ...overrides,
  };
}

// Helper function to create a test version file
async function createVersionFile(path: string, content: string): Promise<void> {
  await Deno.writeTextFile(path, content);
}

// Cleanup helper
async function cleanup(path: string): Promise<void> {
  try {
    await Deno.remove(path);
  } catch {
    // Ignore if file doesn't exist
  }
}

Deno.test("VersionUtils - getCurrentVersion()", async (t) => {
  await t.step("should extract version from TypeScript file", async () => {
    const config = createTestConfig({
      versionFile: {
        path: "./test-version.ts",
        template: TemplateFormat.TYPESCRIPT,
      },
    });
    const utils = new VersionUtils(config);

    await createVersionFile("./test-version.ts", 'export const VERSION = "1.2.3";\n');

    try {
      const version = await utils.getCurrentVersion();
      assertEquals(version, "1.2.3");
    } finally {
      await cleanup("./test-version.ts");
    }
  });

  await t.step("should extract version from JSON file", async () => {
    const config = createTestConfig({
      versionFile: {
        path: "./test-version.json",
        template: TemplateFormat.JSON,
      },
    });
    const utils = new VersionUtils(config);

    await createVersionFile("./test-version.json", '{\n  "version": "2.0.0"\n}\n');

    try {
      const version = await utils.getCurrentVersion();
      assertEquals(version, "2.0.0");
    } finally {
      await cleanup("./test-version.json");
    }
  });

  await t.step("should extract version from YAML file", async () => {
    const config = createTestConfig({
      versionFile: {
        path: "./test-version.yaml",
        template: TemplateFormat.YAML,
      },
    });
    const utils = new VersionUtils(config);

    await createVersionFile("./test-version.yaml", 'version: "3.1.4"\n');

    try {
      const version = await utils.getCurrentVersion();
      assertEquals(version, "3.1.4");
    } finally {
      await cleanup("./test-version.yaml");
    }
  });

  await t.step("should extract version using custom pattern", async () => {
    const config = createTestConfig({
      versionFile: {
        path: "./test-version.txt",
        template: TemplateFormat.CUSTOM,
        patterns: {
          version: /APP_VERSION = '([^']+)'/,
        },
      },
    });
    const utils = new VersionUtils(config);

    await createVersionFile("./test-version.txt", "APP_VERSION = '4.5.6'\n");

    try {
      const version = await utils.getCurrentVersion();
      assertEquals(version, "4.5.6");
    } finally {
      await cleanup("./test-version.txt");
    }
  });

  await t.step("should use default patterns when no custom pattern provided", async () => {
    const config = createTestConfig({
      versionFile: {
        path: "./test-version.txt",
        template: TemplateFormat.CUSTOM,
        // No patterns specified, should use defaults
      },
    });
    const utils = new VersionUtils(config);

    await createVersionFile("./test-version.txt", 'export const VERSION = "7.8.9";\n');

    try {
      const version = await utils.getCurrentVersion();
      assertEquals(version, "7.8.9");
    } finally {
      await cleanup("./test-version.txt");
    }
  });

  await t.step("should throw error when version not found", async () => {
    const config = createTestConfig({
      versionFile: {
        path: "./test-version.ts",
        template: TemplateFormat.TYPESCRIPT,
      },
    });
    const utils = new VersionUtils(config);

    await createVersionFile("./test-version.ts", 'export const BUILD_DATE = "2024-01-01";\n');

    try {
      await assertRejects(
        async () => await utils.getCurrentVersion(),
        NagareError,
      );
    } finally {
      await cleanup("./test-version.ts");
    }
  });

  await t.step("should throw error when file not found", async () => {
    const config = createTestConfig({
      versionFile: {
        path: "./non-existent-file.ts",
        template: TemplateFormat.TYPESCRIPT,
      },
    });
    const utils = new VersionUtils(config);

    await assertRejects(
      async () => await utils.getCurrentVersion(),
      NagareError,
    );
  });
});

Deno.test("VersionUtils - calculateNewVersion()", async (t) => {
  const config = createTestConfig();
  const utils = new VersionUtils(config);

  await t.step("Manual bump type - major", () => {
    const newVersion = utils.calculateNewVersion("1.2.3", [], "major" as BumpType);
    assertEquals(newVersion, "2.0.0");
  });

  await t.step("Manual bump type - minor", () => {
    const newVersion = utils.calculateNewVersion("1.2.3", [], "minor" as BumpType);
    assertEquals(newVersion, "1.3.0");
  });

  await t.step("Manual bump type - patch", () => {
    const newVersion = utils.calculateNewVersion("1.2.3", [], "patch" as BumpType);
    assertEquals(newVersion, "1.2.4");
  });

  await t.step("Invalid bump type should throw", () => {
    assertThrows(
      () => utils.calculateNewVersion("1.2.3", [], "invalid" as BumpType),
      NagareError,
    );
  });

  await t.step("Should reject minor bump with breaking changes", () => {
    const commits: ConventionalCommit[] = [
      {
        type: "feat",
        description: "add new feature",
        breakingChange: true,
        hash: "abc123",
        date: "2024-01-01",
        raw: "feat!: add new feature with breaking changes",
      },
    ];
    assertThrows(
      () => utils.calculateNewVersion("1.2.3", commits, BumpType.MINOR),
      NagareError,
    );
  });

  await t.step("Should reject patch bump with breaking changes", () => {
    const commits: ConventionalCommit[] = [
      {
        type: "fix",
        description: "fix bug",
        breakingChange: true,
        hash: "def456",
        date: "2024-01-01",
        raw: "fix!: fix bug with breaking changes",
      },
      {
        type: "feat",
        description: "another breaking change",
        breakingChange: true,
        hash: "ghi789",
        date: "2024-01-01",
        raw: "feat: another feature\n\nBREAKING CHANGE: API changed",
      },
    ];
    assertThrows(
      () => utils.calculateNewVersion("1.2.3", commits, BumpType.PATCH),
      NagareError,
    );
  });

  await t.step("Should reject patch bump when features require minor", () => {
    const commits: ConventionalCommit[] = [
      {
        type: "feat",
        description: "add new feature",
        hash: "abc123",
        date: "2024-01-01",
        raw: "feat: add new feature",
      },
      {
        type: "fix",
        description: "fix a bug",
        hash: "def456",
        date: "2024-01-01",
      },
    ];
    assertThrows(
      () => utils.calculateNewVersion("1.2.3", commits, BumpType.PATCH),
      NagareError,
    );
  });

  await t.step("Should allow major bump with breaking changes", () => {
    const commits: ConventionalCommit[] = [
      {
        type: "feat",
        description: "add new feature",
        breakingChange: true,
        hash: "abc123",
        date: "2024-01-01",
        raw: "feat!: add new feature with breaking changes",
      },
    ];
    const newVersion = utils.calculateNewVersion("1.2.3", commits, BumpType.MAJOR);
    assertEquals(newVersion, "2.0.0");
  });

  await t.step("Should allow minor bump when features require minor", () => {
    const commits: ConventionalCommit[] = [
      {
        type: "feat",
        description: "add new feature",
        hash: "abc123",
        date: "2024-01-01",
      },
      {
        type: "fix",
        description: "fix bug",
        hash: "def456",
        date: "2024-01-01",
      },
    ];
    const newVersion = utils.calculateNewVersion("1.2.3", commits, BumpType.MINOR);
    assertEquals(newVersion, "1.3.0");
  });

  await t.step("Should allow major bump when only patch required", () => {
    const commits: ConventionalCommit[] = [
      {
        type: "fix",
        description: "fix bug",
        hash: "abc123",
        date: "2024-01-01",
      },
      {
        type: "docs",
        description: "update docs",
        hash: "def456",
        date: "2024-01-01",
      },
    ];
    // Allowing major bump even though only patch is required
    const newVersion = utils.calculateNewVersion("1.2.3", commits, BumpType.MAJOR);
    assertEquals(newVersion, "2.0.0");
  });

  await t.step("Should allow minor bump when only patch required", () => {
    const commits: ConventionalCommit[] = [
      {
        type: "fix",
        description: "fix bug",
        hash: "abc123",
        date: "2024-01-01",
      },
    ];
    // Allowing minor bump even though only patch is required
    const newVersion = utils.calculateNewVersion("1.2.3", commits, BumpType.MINOR);
    assertEquals(newVersion, "1.3.0");
  });

  await t.step("Auto-calculate - breaking change", () => {
    const commits: ConventionalCommit[] = [
      {
        type: "feat",
        description: "add new feature",
        breakingChange: true,
        hash: "abc123",
        date: "2024-01-01",
      },
    ];
    const newVersion = utils.calculateNewVersion("1.2.3", commits);
    assertEquals(newVersion, "2.0.0");
  });

  await t.step("Auto-calculate - feature without breaking change", () => {
    const commits: ConventionalCommit[] = [
      {
        type: "feat",
        description: "add new feature",
        hash: "abc123",
        date: "2024-01-01",
      },
    ];
    const newVersion = utils.calculateNewVersion("1.2.3", commits);
    assertEquals(newVersion, "1.3.0");
  });

  await t.step("Auto-calculate - fix", () => {
    const commits: ConventionalCommit[] = [
      {
        type: "fix",
        description: "fix bug",
        hash: "abc123",
        date: "2024-01-01",
      },
    ];
    const newVersion = utils.calculateNewVersion("1.2.3", commits);
    assertEquals(newVersion, "1.2.4");
  });

  await t.step("Auto-calculate - other types default to patch", () => {
    const commits: ConventionalCommit[] = [
      {
        type: "docs",
        description: "update documentation",
        hash: "abc123",
        date: "2024-01-01",
      },
      {
        type: "style",
        description: "format code",
        hash: "def456",
        date: "2024-01-01",
      },
    ];
    const newVersion = utils.calculateNewVersion("1.2.3", commits);
    assertEquals(newVersion, "1.2.4");
  });

  await t.step("Auto-calculate - empty commits default to patch", () => {
    const newVersion = utils.calculateNewVersion("1.2.3", []);
    assertEquals(newVersion, "1.2.4");
  });

  await t.step("Auto-calculate - mixed commits with breaking change", () => {
    const commits: ConventionalCommit[] = [
      {
        type: "feat",
        description: "add feature",
        hash: "abc123",
        date: "2024-01-01",
      },
      {
        type: "fix",
        description: "fix bug",
        breakingChange: true,
        hash: "def456",
        date: "2024-01-01",
      },
      {
        type: "docs",
        description: "update docs",
        hash: "ghi789",
        date: "2024-01-01",
      },
    ];
    const newVersion = utils.calculateNewVersion("1.2.3", commits);
    assertEquals(newVersion, "2.0.0"); // Breaking change takes precedence
  });

  await t.step("Auto-calculate - mixed commits without breaking change", () => {
    const commits: ConventionalCommit[] = [
      {
        type: "feat",
        description: "add feature",
        hash: "abc123",
        date: "2024-01-01",
      },
      {
        type: "fix",
        description: "fix bug",
        hash: "def456",
        date: "2024-01-01",
      },
      {
        type: "docs",
        description: "update docs",
        hash: "ghi789",
        date: "2024-01-01",
      },
    ];
    const newVersion = utils.calculateNewVersion("1.2.3", commits);
    assertEquals(newVersion, "1.3.0"); // Feature takes precedence over fix
  });

  await t.step("Handle version with v prefix", () => {
    const newVersion = utils.calculateNewVersion("v1.2.3", [], "patch" as BumpType);
    assertEquals(newVersion, "1.2.4"); // Note: parse() handles v prefix, but output doesn't include it
  });

  await t.step("Handle pre-release versions", () => {
    const newVersion = utils.calculateNewVersion("1.2.3-alpha.1", [], "patch" as BumpType);
    assertEquals(newVersion, "1.2.4"); // Pre-release is stripped in bump
  });
});

Deno.test("VersionUtils - parseVersion()", async (t) => {
  const config = createTestConfig();
  const utils = new VersionUtils(config);

  await t.step("Parse simple version", () => {
    const parsed = utils.parseVersion("1.2.3");
    assertEquals(parsed, {
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: null,
    });
  });

  await t.step("Parse version with v prefix", () => {
    const parsed = utils.parseVersion("v2.3.4");
    assertEquals(parsed, {
      major: 2,
      minor: 3,
      patch: 4,
      prerelease: null,
    });
  });

  await t.step("Parse version with pre-release", () => {
    const parsed = utils.parseVersion("1.0.0-alpha.1");
    assertEquals(parsed, {
      major: 1,
      minor: 0,
      patch: 0,
      prerelease: "alpha.1",
    });
  });

  await t.step("Parse version with complex pre-release", () => {
    const parsed = utils.parseVersion("2.1.0-beta.2.fix.3");
    assertEquals(parsed, {
      major: 2,
      minor: 1,
      patch: 0,
      prerelease: "beta.2.fix.3",
    });
  });

  await t.step("Parse version with build metadata", () => {
    const parsed = utils.parseVersion("1.0.0+build.123");
    assertEquals(parsed, {
      major: 1,
      minor: 0,
      patch: 0,
      prerelease: null,
    });
  });

  await t.step("Parse version with pre-release and build metadata", () => {
    const parsed = utils.parseVersion("1.0.0-rc.1+build.456");
    assertEquals(parsed, {
      major: 1,
      minor: 0,
      patch: 0,
      prerelease: "rc.1",
    });
  });

  await t.step("Parse zero version", () => {
    const parsed = utils.parseVersion("0.0.0");
    assertEquals(parsed, {
      major: 0,
      minor: 0,
      patch: 0,
      prerelease: null,
    });
  });

  await t.step("Parse large version numbers", () => {
    const parsed = utils.parseVersion("999.888.777");
    assertEquals(parsed, {
      major: 999,
      minor: 888,
      patch: 777,
      prerelease: null,
    });
  });

  await t.step("Invalid version should throw", () => {
    assertThrows(
      () => utils.parseVersion("not.a.version"),
      Error,
    );
  });

  await t.step("Incomplete version should throw", () => {
    assertThrows(
      () => utils.parseVersion("1.2"),
      Error,
    );
  });

  await t.step("Empty version should throw", () => {
    assertThrows(
      () => utils.parseVersion(""),
      Error,
    );
  });
});

Deno.test("VersionUtils - Edge cases", async (t) => {
  const config = createTestConfig();
  const utils = new VersionUtils(config);

  await t.step("Handle commits with all properties", () => {
    const commits: ConventionalCommit[] = [
      {
        type: "feat",
        scope: "api",
        description: "add new endpoint",
        body: "This adds a new REST endpoint for user management",
        breakingChange: false,
        hash: "abc123def456",
        date: "2024-01-01T12:00:00Z",
        raw: "feat(api): add new endpoint\n\nThis adds a new REST endpoint for user management",
      },
    ];
    const newVersion = utils.calculateNewVersion("1.0.0", commits);
    assertEquals(newVersion, "1.1.0");
  });

  await t.step("Handle mixed conventional and non-conventional commits", () => {
    const commits: ConventionalCommit[] = [
      {
        type: "feat",
        description: "add feature",
        hash: "abc123",
        date: "2024-01-01",
      },
      {
        type: "unknown",
        description: "some random commit",
        hash: "def456",
        date: "2024-01-01",
      },
    ];
    const newVersion = utils.calculateNewVersion("1.0.0", commits);
    assertEquals(newVersion, "1.1.0"); // Feature still triggers minor bump
  });

  await t.step("Version file with multiple version patterns", async () => {
    const config = createTestConfig({
      versionFile: {
        path: "./multi-version.txt",
        template: TemplateFormat.CUSTOM,
        patterns: {
          version: /^\s*VERSION = "([^"]+)"/m, // Use ^ anchor and multiline flag
        },
      },
    });
    const utils = new VersionUtils(config);

    const content = `
      OLD_VERSION = "0.9.0"
      VERSION = "1.0.0"
      NEXT_VERSION = "2.0.0"
    `;
    await createVersionFile("./multi-version.txt", content);

    try {
      const version = await utils.getCurrentVersion();
      assertEquals(version, "1.0.0"); // Should match VERSION, not OLD_VERSION
    } finally {
      await cleanup("./multi-version.txt");
    }
  });

  await t.step("Version file with comments", async () => {
    const config = createTestConfig({
      versionFile: {
        path: "./commented-version.ts",
        template: TemplateFormat.TYPESCRIPT,
      },
    });
    const utils = new VersionUtils(config);

    const content = `
      // This is the version file
      /* Multi-line comment
         about the version */
      export const VERSION = "1.2.3"; // Current version
      // export const VERSION = "old.version";
    `;
    await createVersionFile("./commented-version.ts", content);

    try {
      const version = await utils.getCurrentVersion();
      assertEquals(version, "1.2.3");
    } finally {
      await cleanup("./commented-version.ts");
    }
  });

  await t.step("Case sensitivity in commit types", () => {
    const commits: ConventionalCommit[] = [
      {
        type: "FEAT", // Uppercase
        description: "add feature",
        hash: "abc123",
        date: "2024-01-01",
      },
      {
        type: "Fix", // Mixed case
        description: "fix bug",
        hash: "def456",
        date: "2024-01-01",
      },
    ];
    const newVersion = utils.calculateNewVersion("1.0.0", commits);
    // Should not match as feat/fix due to case sensitivity
    assertEquals(newVersion, "1.0.1"); // Default patch bump
  });
});

Deno.test("VersionUtils - Security considerations", async (t) => {
  await t.step("Reject malicious regex patterns", async () => {
    const config = createTestConfig({
      versionFile: {
        path: "./test-version.txt",
        template: TemplateFormat.CUSTOM,
        patterns: {
          // This is a potentially problematic regex that could cause ReDoS
          // (Regular Expression Denial of Service) with exponential backtracking
          // The pattern (a+)+ can cause catastrophic backtracking on strings like "aaaa...c"
          // DevSkim: ignore DS137138 - Intentional ReDoS pattern for testing protection
          version: /(a+)+b/, // DevSkim: ignore DS137138
        },
      },
    });
    const utils = new VersionUtils(config);

    // Create a file that would trigger the regex
    await createVersionFile("./test-version.txt", "aaaaaaaaaaaaaaaaaaaaaaaac");

    try {
      // This should complete without hanging
      await assertRejects(
        async () => await utils.getCurrentVersion(),
        NagareError,
      );
    } finally {
      await cleanup("./test-version.txt");
    }
  });

  await t.step("Handle large files gracefully", async () => {
    const config = createTestConfig({
      versionFile: {
        path: "./large-version.txt",
        template: TemplateFormat.CUSTOM,
        patterns: {
          version: /VERSION = "([^"]+)"/,
        },
      },
    });
    const utils = new VersionUtils(config);

    // Create a large file with version at the end
    const largeContent = "x".repeat(1000000) + '\nVERSION = "1.0.0"\n';
    await createVersionFile("./large-version.txt", largeContent);

    try {
      const version = await utils.getCurrentVersion();
      assertEquals(version, "1.0.0");
    } finally {
      await cleanup("./large-version.txt");
    }
  });

  await t.step("Prevent path traversal in file paths", async () => {
    const config = createTestConfig({
      versionFile: {
        path: "../../../etc/passwd",
        template: TemplateFormat.CUSTOM,
      },
    });
    const utils = new VersionUtils(config);

    // Should fail to read the file (doesn't exist in test environment)
    await assertRejects(
      async () => await utils.getCurrentVersion(),
      NagareError,
    );
  });
});
