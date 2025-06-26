/**
 * @module Config
 * @fileoverview Configuration schema and defaults for Nagare
 * @description Default configurations, template definitions, and commit type mappings.
 * Runtime-agnostic configuration objects compatible with all JavaScript environments.
 */

import type { CommitTypeMapping, NagareConfig } from "./types.ts";
import { BumpType, LogLevel, TemplateFormat } from "./types.ts";

/**
 * Default commit type mappings following conventional commits
 */
export const DEFAULT_COMMIT_TYPES: CommitTypeMapping = {
  feat: "added",
  fix: "fixed",
  docs: "changed",
  style: "changed",
  refactor: "changed",
  perf: "changed",
  test: "changed",
  build: "changed",
  ci: "changed",
  chore: "changed",
  revert: "changed",
  security: "security",
};

/**
 * SAFE default file update patterns - replaces dangerous broad patterns
 * These patterns are specifically designed to avoid the file corruption bug
 */
export const SAFE_DEFAULT_UPDATE_PATTERNS = {
  // JSON files - only match top-level version field
  jsonVersion: /^(\s*)"version":\s*"([^"]+)"/m,

  // YAML files - only match top-level version field
  yamlVersion: /^(\s*version:\s*)(['"]?)([^'"\n]+)(['"]?)$/m,

  // Markdown version badges
  markdownVersionBadge: /(\[Version\s+)(\d+\.\d+\.\d+)(\])/g,

  // HTML meta version tags
  htmlMetaVersion: /(<meta\s+name="version"\s+content=")([^"]+)(")/gi,

  // TypeScript/JavaScript export const VERSION
  typescriptVersion: /(export\s+const\s+VERSION\s*=\s*")([^"]+)(")/,
};

/**
 * Default configuration - UPDATED with safer patterns
 */
export const DEFAULT_CONFIG: Partial<NagareConfig> = {
  versionFile: {
    path: "./version.ts",
    template: TemplateFormat.TYPESCRIPT,
  },
  releaseNotes: {
    includeCommitHashes: true,
    maxDescriptionLength: 100,
  },
  github: {
    createRelease: true,
    tokenEnvVar: "GITHUB_TOKEN",
    owner: "", // Will be overridden by user config
    repo: "", // Will be overridden by user config
  },
  commitTypes: DEFAULT_COMMIT_TYPES,
  options: {
    dryRun: false,
    skipConfirmation: false,
    gitRemote: "origin",
    tagPrefix: "v",
    logLevel: LogLevel.INFO,
  },
  docs: {
    enabled: false,
    outputDir: "./docs",
    includePrivate: false,
  },
  // REMOVED: Dangerous default updateFiles patterns
  // The old DEFAULT_CONFIG used to include updateFiles with broad patterns
  // Now users must explicitly configure updateFiles to avoid accidental corruption
  updateFiles: undefined, // Force users to be explicit about file updates
};

/**
 * WARNING: Legacy dangerous patterns (kept for reference and migration)
 * DO NOT USE THESE - they cause file corruption!
 */
export const DANGEROUS_LEGACY_PATTERNS = {
  // ❌ This pattern caused the Salty deno.json corruption bug
  broadJsonVersion: /"version":\s*"([^"]+)"/,

  // ❌ Other overly broad patterns that should be avoided
  broadYamlVersion: /version:\s*"?([^"\n]+)"?/,
  broadMarkdownVersion: /version[:\s]+(\d+\.\d+\.\d+)/gi,
};

/**
 * Validate if a pattern is potentially dangerous
 */
export function isDangerousPattern(pattern: RegExp, filePath: string): boolean {
  const source = pattern.source;

  // Check for the specific pattern that caused the Salty bug
  if (source === '"version":\\s*"([^"]+)"') {
    return true;
  }

  // Check for other dangerous broad patterns in JSON files
  if (filePath.endsWith(".json")) {
    // Patterns without line anchors in JSON files are dangerous
    if (source.includes('"version"') && !source.includes("^") && !source.includes("$")) {
      return true;
    }
  }

  // Check for overly broad wildcards
  if (source.includes(".*") || source.includes(".+")) {
    return true;
  }

  return false;
}

/**
 * Get recommended safe pattern for a file and key
 */
export function getRecommendedSafePattern(filePath: string, key: string): RegExp | null {
  if (key !== "version") return null;

  if (filePath.endsWith(".json")) {
    return SAFE_DEFAULT_UPDATE_PATTERNS.jsonVersion;
  }

  if (filePath.endsWith(".yaml") || filePath.endsWith(".yml")) {
    return SAFE_DEFAULT_UPDATE_PATTERNS.yamlVersion;
  }

  if (filePath.toLowerCase().includes("readme") || filePath.endsWith(".md")) {
    return SAFE_DEFAULT_UPDATE_PATTERNS.markdownVersionBadge;
  }

  if (filePath.endsWith(".html")) {
    return SAFE_DEFAULT_UPDATE_PATTERNS.htmlMetaVersion;
  }

  if (filePath.endsWith(".ts") || filePath.endsWith(".js")) {
    return SAFE_DEFAULT_UPDATE_PATTERNS.typescriptVersion;
  }

  return null;
}

/**
 * Migrate dangerous patterns to safe alternatives
 */
export function migrateDangerousPattern(
  pattern: RegExp,
  filePath: string,
  key: string,
): { pattern: RegExp; migrated: boolean; warning?: string } {
  const source = pattern.source;

  // Fix the specific Salty bug pattern
  if (source === '"version":\\s*"([^"]+)"' && filePath.endsWith(".json")) {
    return {
      pattern: SAFE_DEFAULT_UPDATE_PATTERNS.jsonVersion,
      migrated: true,
      warning: `Migrated dangerous broad pattern to line-anchored pattern for ${filePath}`,
    };
  }

  // Get recommended pattern for this file type
  const recommended = getRecommendedSafePattern(filePath, key);
  if (recommended && isDangerousPattern(pattern, filePath)) {
    return {
      pattern: recommended,
      migrated: true,
      warning: `Migrated potentially dangerous pattern to recommended safe pattern for ${filePath}`,
    };
  }

  return { pattern, migrated: false };
}

/**
 * TypeScript version file template
 */
export const TYPESCRIPT_TEMPLATE: string = `/**
 * Version information for {{project.name}}
 * Generated by Nagare on {{buildDate}}
 */

export const VERSION = "{{version}}";

export const BUILD_INFO = {
  buildDate: "{{buildDate}}",
  gitCommit: "{{gitCommit}}",
  buildEnvironment: "{{environment}}"
} as const;

export const APP_INFO = {
  name: "{{project.name}}",
  description: "{{project.description}}",
  repository: "{{project.repository}}",
  license: "{{project.license}}"
} as const;

{{#if metadata}}
export const APP_METADATA = {{metadata}} as const;
{{/if}}

export const RELEASE_NOTES = {{releaseNotes}} as const;
`;

/**
 * JSON version file template
 */
export const JSON_TEMPLATE: string = `{
  "version": "{{version}}",
  "buildInfo": {
    "buildDate": "{{buildDate}}",
    "gitCommit": "{{gitCommit}}",
    "buildEnvironment": "{{environment}}"
  },
  "appInfo": {
    "name": "{{project.name}}",
    "description": "{{project.description}}",
    "repository": "{{project.repository}}",
    "license": "{{project.license}}"
  }{{#if metadata}},
  "metadata": {{metadata}}{{/if}},
  "releaseNotes": {{releaseNotes}}
}`;

/**
 * YAML version file template
 */
export const YAML_TEMPLATE: string = `version: "{{version}}"
buildInfo:
  buildDate: "{{buildDate}}"
  gitCommit: "{{gitCommit}}"
  buildEnvironment: "{{environment}}"
appInfo:
  name: "{{project.name}}"
  description: "{{project.description}}"
  repository: "{{project.repository}}"
  license: "{{project.license}}"
{{#if metadata}}
metadata: {{metadata}}
{{/if}}
releaseNotes: {{releaseNotes}}
`;

export const BUILT_IN_TEMPLATES: Partial<Record<TemplateFormat, string>> = {
  [TemplateFormat.TYPESCRIPT]: TYPESCRIPT_TEMPLATE,
  [TemplateFormat.JSON]: JSON_TEMPLATE,
  [TemplateFormat.YAML]: YAML_TEMPLATE,
};

// Re-export types for convenience
export { BumpType, LogLevel, TemplateFormat };
