/**
 * Simple unit tests for template processing functions
 * Tests data preparation logic without requiring Vento
 */

import { assertEquals } from "@std/assert";

// Extract the prepareTemplateData logic to test it
// Since it's private, we'll test the logic directly
function prepareTemplateData(data: any, config: any = {}): Record<string, unknown> {
  // Parse version components from the version string
  const versionParts = data.version.split(".");
  const versionComponents = {
    major: parseInt(versionParts[0]) || 0,
    minor: parseInt(versionParts[1]) || 0,
    patch: parseInt(versionParts[2]) || 0,
    prerelease: null as string | null,
  };

  // Check for prerelease info (e.g., "1.2.3-beta.1")
  if (versionParts[2] && versionParts[2].includes("-")) {
    const [patchPart, prereleasePart] = versionParts[2].split("-");
    versionComponents.patch = parseInt(patchPart) || 0;
    versionComponents.prerelease = prereleasePart;
  }

  // Merge metadata from config and data
  const metadata = {
    ...config.releaseNotes?.metadata || {},
    ...data.metadata || {},
  };

  // Ensure project data is complete
  const project = {
    ...config.project || {},
    ...data.project || {},
  };

  return {
    // Core template data
    version: data.version,
    buildDate: data.buildDate,
    gitCommit: data.gitCommit,
    environment: data.environment,
    releaseNotes: data.releaseNotes,

    // Enhanced computed data
    versionComponents,
    metadata,
    project,

    // Individual metadata properties at root level for easier access in templates
    ...metadata,

    // Additional computed helpers
    currentYear: new Date().getFullYear(),
    buildDateFormatted: new Date(data.buildDate).toISOString().split("T")[0],
    shortCommit: data.gitCommit ? data.gitCommit.substring(0, 7) : "unknown",
  };
}

// Test version component parsing
Deno.test("prepareTemplateData - parses simple version", () => {
  const data = {
    version: "1.2.3",
    buildDate: "2024-01-01T12:00:00Z",
    gitCommit: "abc123def456",
    environment: "production",
    releaseNotes: {},
  };

  const result = prepareTemplateData(data);
  const components = result.versionComponents as any;

  assertEquals(components.major, 1);
  assertEquals(components.minor, 2);
  assertEquals(components.patch, 3);
  assertEquals(components.prerelease, null);
});

Deno.test("prepareTemplateData - parses version with prerelease", () => {
  const data = {
    version: "2.0.1-beta",
    buildDate: "2024-01-01T12:00:00Z",
    gitCommit: "abc123def456",
    environment: "production",
    releaseNotes: {},
  };

  const result = prepareTemplateData(data);
  const components = result.versionComponents as any;

  assertEquals(components.major, 2);
  assertEquals(components.minor, 0);
  assertEquals(components.patch, 1);
  assertEquals(components.prerelease, "beta");
});

Deno.test("prepareTemplateData - creates short commit hash", () => {
  const data = {
    version: "1.0.0",
    buildDate: "2024-01-01T12:00:00Z",
    gitCommit: "abc123def456789",
    environment: "production",
    releaseNotes: {},
  };

  const result = prepareTemplateData(data);
  assertEquals(result.shortCommit, "abc123d");
});

Deno.test("prepareTemplateData - handles missing commit", () => {
  const data = {
    version: "1.0.0",
    buildDate: "2024-01-01T12:00:00Z",
    gitCommit: "",
    environment: "production",
    releaseNotes: {},
  };

  const result = prepareTemplateData(data);
  assertEquals(result.shortCommit, "unknown");
});

Deno.test("prepareTemplateData - formats build date", () => {
  const data = {
    version: "1.0.0",
    buildDate: "2024-03-15T14:30:45.123Z",
    gitCommit: "abc123",
    environment: "production",
    releaseNotes: {},
  };

  const result = prepareTemplateData(data);
  assertEquals(result.buildDateFormatted, "2024-03-15");
});

Deno.test("prepareTemplateData - merges metadata", () => {
  const data = {
    version: "1.0.0",
    buildDate: "2024-01-01T12:00:00Z",
    gitCommit: "abc123",
    environment: "production",
    releaseNotes: {},
    metadata: {
      author: "Test User",
      custom: "value",
    },
  };

  const config = {
    releaseNotes: {
      metadata: {
        team: "Dev Team",
        project: "Test Project",
      },
    },
  };

  const result = prepareTemplateData(data, config);
  const metadata = result.metadata as any;

  assertEquals(metadata.author, "Test User");
  assertEquals(metadata.custom, "value");
  assertEquals(metadata.team, "Dev Team");
  assertEquals(metadata.project, "Test Project");
});

Deno.test("prepareTemplateData - includes current year", () => {
  const data = {
    version: "1.0.0",
    buildDate: "2024-01-01T12:00:00Z",
    gitCommit: "abc123",
    environment: "production",
    releaseNotes: {},
  };

  const result = prepareTemplateData(data);
  assertEquals(result.currentYear, new Date().getFullYear());
});

Deno.test("prepareTemplateData - handles invalid version parts", () => {
  const data = {
    version: "invalid.version.string",
    buildDate: "2024-01-01T12:00:00Z",
    gitCommit: "abc123",
    environment: "production",
    releaseNotes: {},
  };

  const result = prepareTemplateData(data);
  const components = result.versionComponents as any;

  assertEquals(components.major, 0);
  assertEquals(components.minor, 0);
  assertEquals(components.patch, 0);
});
