/**
 * @fileoverview Tests for release header display functionality
 * @description Verify release headers show proper application context and marine branding
 *
 * InfoSec: Testing console output for proper formatting and absence of injection vulnerabilities
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { assertSpyCalls, spy } from "@std/testing/mock";
import type { NagareConfig } from "../../types.ts";
import { TemplateFormat } from "../../types.ts";
import {
  showAppCompletion,
  showAppProgress,
  showCompactReleaseHeader,
  showReleaseHeader,
  showReleaseSummary,
} from "../../src/ui/release-header.ts";

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

Deno.test("showReleaseHeader - Full branded header display", async (t) => {
  await t.step("should display complete release header with app context", () => {
    const config = createTestConfig({
      project: {
        name: "Nagare (流れ)",
        repository: "https://github.com/rick/nagare",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showReleaseHeader(config, "2.14.0", "2.15.0");

      // Should make 5 console.log calls: startup message, divider, project, version, divider
      assertSpyCalls(consoleSpy, 5);

      // Verify startup message with marine branding
      assertEquals(consoleSpy.calls[0].args[0], "🌊 Nagare: Starting release current for Nagare (流れ)...");

      // Verify first divider (50 characters)
      assertEquals(consoleSpy.calls[1].args[0], "━".repeat(50));

      // Verify project display
      assertEquals(consoleSpy.calls[2].args[0], "Project: Nagare (流れ)");

      // Verify version transition
      assertEquals(consoleSpy.calls[3].args[0], "Version: 2.14.0 → 2.15.0");

      // Verify closing divider
      assertEquals(consoleSpy.calls[4].args[0], "━".repeat(50));
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should handle fallback app names", () => {
    const config = createTestConfig({
      project: {
        name: "",
        repository: "https://github.com/user/unknown-project",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showReleaseHeader(config, "1.0.0", "1.1.0");

      assertSpyCalls(consoleSpy, 5);

      // Should show "Unknown Project" fallback
      assertEquals(consoleSpy.calls[0].args[0], "🌊 Nagare: Starting release current for Unknown Project...");
      assertEquals(consoleSpy.calls[2].args[0], "Project: Unknown Project");
      assertEquals(consoleSpy.calls[3].args[0], "Version: 1.0.0 → 1.1.0");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should handle different version formats", () => {
    const config = createTestConfig({
      project: {
        name: "Version Test App",
        repository: "https://github.com/user/version-test",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showReleaseHeader(config, "v1.0.0-beta.1", "v1.0.0-beta.2");

      assertSpyCalls(consoleSpy, 5);
      assertEquals(consoleSpy.calls[3].args[0], "Version: v1.0.0-beta.1 → v1.0.0-beta.2");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should maintain consistent divider length", () => {
    const config = createTestConfig({
      project: {
        name: "Very Long Application Name That Might Affect Divider Length",
        repository: "https://github.com/user/long-name-app",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showReleaseHeader(config, "1.0.0", "2.0.0");

      assertSpyCalls(consoleSpy, 5);

      // Dividers should always be 50 characters regardless of app name length
      assertEquals(consoleSpy.calls[1].args[0], "━".repeat(50));
      assertEquals(consoleSpy.calls[4].args[0], "━".repeat(50));
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should handle Unicode characters in app names", () => {
    const config = createTestConfig({
      project: {
        name: "アプリ 🌊 流れ",
        repository: "https://github.com/user/unicode-app",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showReleaseHeader(config, "1.0.0", "1.1.0");

      assertSpyCalls(consoleSpy, 5);
      assertEquals(consoleSpy.calls[0].args[0], "🌊 Nagare: Starting release current for アプリ 🌊 流れ...");
      assertEquals(consoleSpy.calls[2].args[0], "Project: アプリ 🌊 流れ");
    } finally {
      consoleSpy.restore();
    }
  });
});

Deno.test("showCompactReleaseHeader - Minimal header display", async (t) => {
  await t.step("should display compact header format", () => {
    const config = createTestConfig({
      project: {
        name: "Compact App",
        repository: "https://github.com/user/compact-app",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showCompactReleaseHeader(config, "1.0.0", "1.1.0");

      // Should make only 1 console.log call
      assertSpyCalls(consoleSpy, 1);
      assertEquals(consoleSpy.calls[0].args[0], "Releasing Compact App: 1.0.0 → 1.1.0");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should handle fallback app names in compact format", () => {
    const config = createTestConfig({
      project: {
        name: "",
        repository: "https://github.com/user/no-name",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showCompactReleaseHeader(config, "2.0.0", "2.1.0");

      assertSpyCalls(consoleSpy, 1);
      assertEquals(consoleSpy.calls[0].args[0], "Releasing Unknown Project: 2.0.0 → 2.1.0");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should preserve Unicode in compact format", () => {
    const config = createTestConfig({
      project: {
        name: "流れ Nagare",
        repository: "https://github.com/rick/nagare",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showCompactReleaseHeader(config, "2.14.0", "2.15.0");

      assertSpyCalls(consoleSpy, 1);
      assertEquals(consoleSpy.calls[0].args[0], "Releasing 流れ Nagare: 2.14.0 → 2.15.0");
    } finally {
      consoleSpy.restore();
    }
  });
});

Deno.test("showAppProgress - Application progress messages", async (t) => {
  // We need to spy on the NagareBrand.log method, but since it's imported
  // we'll spy on console.log and verify the branded message format
  await t.step("should display progress with app context", () => {
    const config = createTestConfig({
      project: {
        name: "Progress App",
        repository: "https://github.com/user/progress-app",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showAppProgress(config, "Analyzing");

      assertSpyCalls(consoleSpy, 1);
      // NagareBrand.log adds the 🌊 Nagare: prefix
      assertStringIncludes(consoleSpy.calls[0].args[0], "🌊 Nagare: Analyzing Progress App...");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should display progress with details", () => {
    const config = createTestConfig({
      project: {
        name: "Detail App",
        repository: "https://github.com/user/detail-app",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showAppProgress(config, "Analyzing", "commit flow");

      assertSpyCalls(consoleSpy, 1);
      assertStringIncludes(consoleSpy.calls[0].args[0], "🌊 Nagare: Analyzing Detail App commit flow...");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should handle files detail with flow language", () => {
    const config = createTestConfig({
      project: {
        name: "File App",
        repository: "https://github.com/user/file-app",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showAppProgress(config, "Updating", "4 files");

      assertSpyCalls(consoleSpy, 1);
      assertStringIncludes(consoleSpy.calls[0].args[0], "🌊 Nagare: Updating 4 files in File App current...");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should handle current detail with flow language", () => {
    const config = createTestConfig({
      project: {
        name: "Current App",
        repository: "https://github.com/user/current-app",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showAppProgress(config, "Processing", "current branch");

      assertSpyCalls(consoleSpy, 1);
      assertStringIncludes(
        consoleSpy.calls[0].args[0],
        "🌊 Nagare: Processing current branch in Current App current...",
      );
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should work with fallback app names", () => {
    const config = createTestConfig({
      project: {
        name: "",
        repository: "https://github.com/user/unknown",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showAppProgress(config, "Building");

      assertSpyCalls(consoleSpy, 1);
      assertStringIncludes(consoleSpy.calls[0].args[0], "🌊 Nagare: Building Unknown Project...");
    } finally {
      consoleSpy.restore();
    }
  });
});

Deno.test("showAppCompletion - Release completion messages", async (t) => {
  await t.step("should display default release completion", () => {
    const config = createTestConfig({
      project: {
        name: "Complete App",
        repository: "https://github.com/user/complete-app",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showAppCompletion(config, "1.2.0");

      assertSpyCalls(consoleSpy, 1);
      // NagareBrand.celebrate adds celebration emoji and branding
      assertStringIncludes(consoleSpy.calls[0].args[0], "🎉");
      assertStringIncludes(consoleSpy.calls[0].args[0], "Complete App v1.2.0 release flow complete!");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should display custom action completion", () => {
    const config = createTestConfig({
      project: {
        name: "Rollback App",
        repository: "https://github.com/user/rollback-app",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showAppCompletion(config, "1.1.0", "rollback");

      assertSpyCalls(consoleSpy, 1);
      assertStringIncludes(consoleSpy.calls[0].args[0], "🎉");
      assertStringIncludes(consoleSpy.calls[0].args[0], "Rollback App v1.1.0 rollback flow complete!");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should work with fallback app names", () => {
    const config = createTestConfig({
      project: {
        name: "",
        repository: "https://github.com/user/unknown",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showAppCompletion(config, "2.0.0", "deploy");

      assertSpyCalls(consoleSpy, 1);
      assertStringIncludes(consoleSpy.calls[0].args[0], "Unknown Project v2.0.0 deploy flow complete!");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should preserve Unicode in completion messages", () => {
    const config = createTestConfig({
      project: {
        name: "流れ完了",
        repository: "https://github.com/user/unicode-complete",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showAppCompletion(config, "3.0.0");

      assertSpyCalls(consoleSpy, 1);
      assertStringIncludes(consoleSpy.calls[0].args[0], "流れ完了 v3.0.0 release flow complete!");
    } finally {
      consoleSpy.restore();
    }
  });
});

Deno.test("showReleaseSummary - Release summary display", async (t) => {
  await t.step("should display complete release summary", () => {
    const config = createTestConfig({
      project: {
        name: "Summary App",
        repository: "https://github.com/user/summary-app",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showReleaseSummary(config, "1.5.0", 12, 4);

      assertSpyCalls(consoleSpy, 4);
      assertEquals(consoleSpy.calls[0].args[0], "✨ Summary App Release Summary");
      assertEquals(consoleSpy.calls[1].args[0], "Version: 1.5.0");
      assertEquals(consoleSpy.calls[2].args[0], "Commits: 12");
      assertEquals(consoleSpy.calls[3].args[0], "Files Updated: 4");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should handle zero values gracefully", () => {
    const config = createTestConfig({
      project: {
        name: "Zero App",
        repository: "https://github.com/user/zero-app",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showReleaseSummary(config, "1.0.0", 0, 0);

      assertSpyCalls(consoleSpy, 4);
      assertEquals(consoleSpy.calls[0].args[0], "✨ Zero App Release Summary");
      assertEquals(consoleSpy.calls[1].args[0], "Version: 1.0.0");
      assertEquals(consoleSpy.calls[2].args[0], "Commits: 0");
      assertEquals(consoleSpy.calls[3].args[0], "Files Updated: 0");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should handle large numbers", () => {
    const config = createTestConfig({
      project: {
        name: "Big Release",
        repository: "https://github.com/user/big-release",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showReleaseSummary(config, "2.0.0", 1000, 500);

      assertSpyCalls(consoleSpy, 4);
      assertEquals(consoleSpy.calls[2].args[0], "Commits: 1000");
      assertEquals(consoleSpy.calls[3].args[0], "Files Updated: 500");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should work with fallback app names", () => {
    const config = createTestConfig({
      project: {
        name: "",
        repository: "https://github.com/user/unknown",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showReleaseSummary(config, "1.0.0", 5, 2);

      assertSpyCalls(consoleSpy, 4);
      assertEquals(consoleSpy.calls[0].args[0], "✨ Unknown Project Release Summary");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should preserve Unicode in summary headers", () => {
    const config = createTestConfig({
      project: {
        name: "まとめ App 📊",
        repository: "https://github.com/user/unicode-summary",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showReleaseSummary(config, "1.0.0", 8, 3);

      assertSpyCalls(consoleSpy, 4);
      assertEquals(consoleSpy.calls[0].args[0], "✨ まとめ App 📊 Release Summary");
    } finally {
      consoleSpy.restore();
    }
  });
});

Deno.test("Release header - Edge cases and security", async (t) => {
  await t.step("should handle potential injection in app names", () => {
    // InfoSec: Verify that malicious app names don't get interpreted
    const maliciousName = "<script>alert('xss')</script>";
    const config = createTestConfig({
      project: {
        name: maliciousName,
        repository: "https://github.com/user/malicious",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showReleaseHeader(config, "1.0.0", "1.1.0");

      assertSpyCalls(consoleSpy, 5);
      // Should output the string as-is without interpretation
      assertStringIncludes(consoleSpy.calls[0].args[0], maliciousName);
      assertStringIncludes(consoleSpy.calls[2].args[0], maliciousName);
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should handle control characters in versions", () => {
    const config = createTestConfig({
      project: {
        name: "Control Test",
        repository: "https://github.com/user/control-test",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showReleaseHeader(config, "1.0.0\x00", "1.1.0\x01");

      assertSpyCalls(consoleSpy, 5);
      // Should display control characters as-is without special handling
      assertEquals(consoleSpy.calls[3].args[0], "Version: 1.0.0\x00 → 1.1.0\x01");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should handle very long version strings", () => {
    const config = createTestConfig({
      project: {
        name: "Long Version App",
        repository: "https://github.com/user/long-version",
      },
    });

    const longVersion = "1.0.0-beta.1+build.12345.abcdef.very.long.identifier";
    const consoleSpy = spy(console, "log");

    try {
      showReleaseHeader(config, longVersion, "2.0.0");

      assertSpyCalls(consoleSpy, 5);
      assertEquals(consoleSpy.calls[3].args[0], `Version: ${longVersion} → 2.0.0`);
    } finally {
      consoleSpy.restore();
    }
  });
});

Deno.test("Release header - Marine theme consistency", async (t) => {
  await t.step("should maintain marine branding across all functions", () => {
    const config = createTestConfig({
      project: {
        name: "🌊 Ocean App",
        repository: "https://github.com/user/ocean-app",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      // Test all functions maintain marine theme
      showReleaseHeader(config, "1.0.0", "1.1.0");
      showCompactReleaseHeader(config, "1.1.0", "1.2.0");
      showAppProgress(config, "Flowing");
      showAppCompletion(config, "1.2.0");
      showReleaseSummary(config, "1.2.0", 5, 3);

      // Verify marine elements are present
      const allCalls = consoleSpy.calls.map((call) => call.args[0]).join(" ");

      // Should contain wave emoji from startup message
      assertStringIncludes(allCalls, "🌊");

      // Should contain celebration emoji from completion
      assertStringIncludes(allCalls, "🎉");

      // Should contain sparkles emoji from summary
      assertStringIncludes(allCalls, "✨");

      // Should reference "flow" concept
      assertStringIncludes(allCalls, "flow");
    } finally {
      consoleSpy.restore();
    }
  });

  await t.step("should use consistent Unicode dividers", () => {
    const config = createTestConfig({
      project: {
        name: "Divider Test",
        repository: "https://github.com/user/divider-test",
      },
    });

    const consoleSpy = spy(console, "log");

    try {
      showReleaseHeader(config, "1.0.0", "1.1.0");

      // Check that Unicode dividers are used (━ not -)
      const dividers = consoleSpy.calls.filter((call) =>
        typeof call.args[0] === "string" && call.args[0].includes("━")
      );

      assertEquals(dividers.length, 2);
      assertEquals(dividers[0].args[0], "━".repeat(50));
      assertEquals(dividers[1].args[0], "━".repeat(50));
    } finally {
      consoleSpy.restore();
    }
  });
});
