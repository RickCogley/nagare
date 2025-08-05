/**
 * @fileoverview Tests for application context display utilities
 * @description Verify app context functions provide consistent naming and fallback behavior
 *
 * InfoSec: Testing user-controlled display names requires validation of output sanitization
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import type { NagareConfig } from "../../types.ts";
import { TemplateFormat } from "../../types.ts";
import { getAppContext, getAppDisplayName, getAppNameWithRepo, hasAppName } from "../../src/ui/app-context.ts";

// Test helper to create NagareConfig with minimal required fields
function createTestConfig(overrides: Partial<NagareConfig> = {}): NagareConfig {
  return {
    project: {
      name: "Test App",
      repository: "https://github.com/user/test-app",
    },
    versionFile: {
      path: "./version.ts",
      template: TemplateFormat.TYPESCRIPT,
    },
    ...overrides,
  };
}

Deno.test("getAppDisplayName - Basic functionality", async (t) => {
  await t.step("should return configured project name", () => {
    const config = createTestConfig({
      project: {
        name: "Nagare (流れ)",
        repository: "https://github.com/rick/nagare",
      },
    });

    assertEquals(getAppDisplayName(config), "Nagare (流れ)");
  });

  await t.step("should handle simple app names", () => {
    const config = createTestConfig({
      project: {
        name: "My App",
        repository: "https://github.com/user/my-app",
      },
    });

    assertEquals(getAppDisplayName(config), "My App");
  });

  await t.step("should handle app names with special characters", () => {
    const config = createTestConfig({
      project: {
        name: "My-App (Beta) v2.0",
        repository: "https://github.com/user/my-app-beta",
      },
    });

    assertEquals(getAppDisplayName(config), "My-App (Beta) v2.0");
  });

  await t.step("should handle Unicode characters in app names", () => {
    const config = createTestConfig({
      project: {
        name: "アプリ 🌊 流れ",
        repository: "https://github.com/user/unicode-app",
      },
    });

    assertEquals(getAppDisplayName(config), "アプリ 🌊 流れ");
  });
});

Deno.test("getAppDisplayName - Fallback behavior", async (t) => {
  await t.step("should return fallback for empty name", () => {
    const config = createTestConfig({
      project: {
        name: "",
        repository: "https://github.com/user/repo",
      },
    });

    assertEquals(getAppDisplayName(config), "Unknown Project");
  });

  await t.step("should return fallback for whitespace-only name", () => {
    const config = createTestConfig({
      project: {
        name: "   ",
        repository: "https://github.com/user/repo",
      },
    });

    // Note: getAppDisplayName doesn't trim, so this returns the whitespace
    // hasAppName() handles the trimming logic
    assertEquals(getAppDisplayName(config), "   ");
  });

  await t.step("should handle undefined name gracefully", () => {
    const config = createTestConfig({
      project: {
        name: undefined as any, // Force undefined for testing
        repository: "https://github.com/user/repo",
      },
    });

    assertEquals(getAppDisplayName(config), "Unknown Project");
  });
});

Deno.test("getAppContext - Application context formatting", async (t) => {
  await t.step("should return same as getAppDisplayName", () => {
    const config = createTestConfig({
      project: {
        name: "Context Test App",
        repository: "https://github.com/user/context-test",
      },
    });

    const displayName = getAppDisplayName(config);
    const context = getAppContext(config);

    assertEquals(context, displayName);
    assertEquals(context, "Context Test App");
  });

  await t.step("should maintain consistency with fallback behavior", () => {
    const config = createTestConfig({
      project: {
        name: "",
        repository: "https://github.com/user/empty-name",
      },
    });

    const context = getAppContext(config);
    assertEquals(context, "Unknown Project");
  });

  await t.step("should preserve Unicode characters", () => {
    const config = createTestConfig({
      project: {
        name: "流れ Nagare 🌊",
        repository: "https://github.com/user/nagare",
      },
    });

    const context = getAppContext(config);
    assertEquals(context, "流れ Nagare 🌊");
  });
});

Deno.test("hasAppName - Name validation", async (t) => {
  await t.step("should return true for valid app names", () => {
    const config = createTestConfig({
      project: {
        name: "Valid App Name",
        repository: "https://github.com/user/valid-app",
      },
    });

    assertEquals(hasAppName(config), true);
  });

  await t.step("should return true for single character names", () => {
    const config = createTestConfig({
      project: {
        name: "A",
        repository: "https://github.com/user/single-char",
      },
    });

    assertEquals(hasAppName(config), true);
  });

  await t.step("should return true for Unicode names", () => {
    const config = createTestConfig({
      project: {
        name: "流れ",
        repository: "https://github.com/user/unicode",
      },
    });

    assertEquals(hasAppName(config), true);
  });

  await t.step("should return false for empty names", () => {
    const config = createTestConfig({
      project: {
        name: "",
        repository: "https://github.com/user/empty",
      },
    });

    assertEquals(hasAppName(config), false);
  });

  await t.step("should return false for whitespace-only names", () => {
    const config = createTestConfig({
      project: {
        name: "   ",
        repository: "https://github.com/user/whitespace",
      },
    });

    assertEquals(hasAppName(config), false);
  });

  await t.step("should return false for tab/newline whitespace", () => {
    const config = createTestConfig({
      project: {
        name: "\t\n  \r",
        repository: "https://github.com/user/tab-newline",
      },
    });

    assertEquals(hasAppName(config), false);
  });

  await t.step("should return false for undefined names", () => {
    const config = createTestConfig({
      project: {
        name: undefined as any,
        repository: "https://github.com/user/undefined",
      },
    });

    assertEquals(hasAppName(config), false);
  });
});

Deno.test("getAppNameWithRepo - Repository context", async (t) => {
  await t.step("should return app name only by default", () => {
    const config = createTestConfig({
      project: {
        name: "Test App",
        repository: "https://github.com/user/test-app",
      },
    });

    assertEquals(getAppNameWithRepo(config), "Test App");
  });

  await t.step("should return app name only when includeRepo is false", () => {
    const config = createTestConfig({
      project: {
        name: "Test App",
        repository: "https://github.com/user/test-app",
      },
    });

    assertEquals(getAppNameWithRepo(config, false), "Test App");
  });

  await t.step("should include GitHub repository when requested", () => {
    const config = createTestConfig({
      project: {
        name: "Nagare",
        repository: "https://github.com/rick/nagare",
      },
    });

    assertEquals(getAppNameWithRepo(config, true), "Nagare (rick/nagare)");
  });

  await t.step("should include GitHub repository with org names", () => {
    const config = createTestConfig({
      project: {
        name: "Enterprise App",
        repository: "https://github.com/my-org/enterprise-app",
      },
    });

    assertEquals(getAppNameWithRepo(config, true), "Enterprise App (my-org/enterprise-app)");
  });

  await t.step("should handle repository URLs with .git suffix", () => {
    const config = createTestConfig({
      project: {
        name: "Git App",
        repository: "https://github.com/user/git-app.git",
      },
    });

    // The current implementation includes the .git suffix
    assertEquals(getAppNameWithRepo(config, true), "Git App (user/git-app.git)");
  });

  await t.step("should handle non-GitHub repository URLs gracefully", () => {
    const config = createTestConfig({
      project: {
        name: "GitLab App",
        repository: "https://gitlab.com/user/gitlab-app",
      },
    });

    // Should not extract repo info from non-GitHub URLs
    assertEquals(getAppNameWithRepo(config, true), "GitLab App");
  });

  await t.step("should handle missing repository gracefully", () => {
    const config = createTestConfig({
      project: {
        name: "No Repo App",
        repository: "",
      },
    });

    assertEquals(getAppNameWithRepo(config, true), "No Repo App");
  });

  await t.step("should handle undefined repository gracefully", () => {
    const config = createTestConfig({
      project: {
        name: "Undefined Repo App",
        repository: undefined as any,
      },
    });

    assertEquals(getAppNameWithRepo(config, true), "Undefined Repo App");
  });

  await t.step("should work with fallback app names", () => {
    const config = createTestConfig({
      project: {
        name: "",
        repository: "https://github.com/user/unknown-project",
      },
    });

    assertEquals(getAppNameWithRepo(config, true), "Unknown Project (user/unknown-project)");
  });
});

Deno.test("App context - Edge cases and security", async (t) => {
  await t.step("should handle very long app names", () => {
    const longName = "A".repeat(1000);
    const config = createTestConfig({
      project: {
        name: longName,
        repository: "https://github.com/user/long-name",
      },
    });

    assertEquals(getAppDisplayName(config), longName);
    assertEquals(hasAppName(config), true);
  });

  await t.step("should handle app names with potential injection attempts", () => {
    // InfoSec: Test that display functions don't interpret special characters
    const maliciousName = "<script>alert('xss')</script>";
    const config = createTestConfig({
      project: {
        name: maliciousName,
        repository: "https://github.com/user/malicious",
      },
    });

    // Functions should return the name as-is without interpretation
    assertEquals(getAppDisplayName(config), maliciousName);
    assertEquals(hasAppName(config), true);
  });

  await t.step("should handle control characters in app names", () => {
    const nameWithControlChars = "App\x00\x01\x02Name";
    const config = createTestConfig({
      project: {
        name: nameWithControlChars,
        repository: "https://github.com/user/control-chars",
      },
    });

    assertEquals(getAppDisplayName(config), nameWithControlChars);
    assertEquals(hasAppName(config), true);
  });

  await t.step("should handle repository URLs with unusual formats", () => {
    const config = createTestConfig({
      project: {
        name: "Unusual Repo",
        repository: "git@github.com:user/ssh-repo.git",
      },
    });

    // SSH format should not be parsed by the GitHub URL regex
    assertEquals(getAppNameWithRepo(config, true), "Unusual Repo");
  });

  await t.step("should handle repository URLs with subpaths", () => {
    const config = createTestConfig({
      project: {
        name: "Subpath App",
        repository: "https://github.com/user/repo/subpath/deep",
      },
    });

    // Should only extract the first two path segments
    assertEquals(getAppNameWithRepo(config, true), "Subpath App (user/repo)");
  });
});

Deno.test("App context - Marine theme consistency", async (t) => {
  await t.step("should work with Nagare-themed app names", () => {
    const marineThemes = [
      "流れ (Nagare)",
      "Ocean Flow 🌊",
      "Wave Rider",
      "Deep Current",
      "Marine Deploy",
    ];

    for (const name of marineThemes) {
      const config = createTestConfig({
        project: {
          name,
          repository: "https://github.com/user/marine-app",
        },
      });

      assertEquals(getAppDisplayName(config), name);
      assertEquals(hasAppName(config), true);
      assertStringIncludes(getAppNameWithRepo(config, true), name);
    }
  });

  await t.step("should preserve emoji characters in marine-themed names", () => {
    const emojiName = "🌊 Nagare Release Flow 🌊";
    const config = createTestConfig({
      project: {
        name: emojiName,
        repository: "https://github.com/rick/nagare",
      },
    });

    assertEquals(getAppDisplayName(config), emojiName);
    assertEquals(getAppContext(config), emojiName);
    assertEquals(getAppNameWithRepo(config, true), "🌊 Nagare Release Flow 🌊 (rick/nagare)");
  });
});
