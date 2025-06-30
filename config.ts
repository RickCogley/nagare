/**
 * @fileoverview Configuration schema and defaults for Nagare
 * @description Default configurations, template definitions, and commit type mappings.
 * Runtime-agnostic configuration objects compatible with all JavaScript environments.
 * @author Rick Cogley
 * @since 0.1.0
 */

import type { CommitTypeMapping, NagareConfig } from "./types.ts";
import { BumpType, LogLevel, TemplateFormat } from "./types.ts";

/**
 * Default commit type mappings following conventional commits specification
 *
 * Maps conventional commit types to Keep a Changelog sections.
 * Can be overridden in user configuration for custom commit types.
 *
 * @see {@link https://conventionalcommits.org/} Conventional Commits
 * @see {@link https://keepachangelog.com/} Keep a Changelog
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
 *
 * These patterns are specifically designed to avoid the file corruption bug
 * that occurred when overly broad regex patterns matched unintended content.
 * All patterns use line anchors (^ or $) to ensure precise matching.
 *
 * @example
 * ```typescript
 * // ✅ SAFE: Only matches top-level version field
 * const pattern = SAFE_DEFAULT_UPDATE_PATTERNS.jsonVersion;
 *
 * // ❌ DANGEROUS: Could match task definitions
 * const dangerous = /"version":\s*"([^"]+)"/;
 * ```
 */
export const SAFE_DEFAULT_UPDATE_PATTERNS = {
  /** JSON files - only match top-level version field */
  jsonVersion: /^(\s*)"version":\s*"([^"]+)"/m,

  /** YAML files - only match top-level version field */
  yamlVersion: /^(\s*version:\s*)(['"]?)([^'"\n]+)(['"]?)$/m,

  /** Markdown version badges */
  markdownVersionBadge: /(\[Version\s+)(\d+\.\d+\.\d+)(\])/g,

  /** HTML meta version tags */
  htmlMetaVersion: /(<meta\s+name="version"\s+content=")([^"]+)(")/gi,

  /** TypeScript/JavaScript export const VERSION */
  typescriptVersion: /(export\s+const\s+VERSION\s*=\s*")([^"]+)(")/,
};

/**
 * Default configuration - UPDATED with safer patterns
 *
 * Provides sensible defaults for all configuration options.
 * Users can override any of these values in their nagare.config.ts file.
 *
 * @example
 * ```typescript
 * const config = {
 *   ...DEFAULT_CONFIG,
 *   project: { name: "My App", repository: "..." },
 *   // ... user overrides
 * };
 * ```
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
 *
 * DO NOT USE THESE - they cause file corruption!
 * These patterns are preserved for documentation and migration purposes only.
 *
 * @deprecated These patterns caused the Salty deno.json corruption bug
 * @see {@link https://github.com/esolia/salty.esolia.pro/commit/a7eab84} Bug report
 */
export const DANGEROUS_LEGACY_PATTERNS = {
  /** ❌ This pattern caused the Salty deno.json corruption bug */
  broadJsonVersion: /"version":\s*"([^"]+)"/,

  /** ❌ Other overly broad patterns that should be avoided */
  broadYamlVersion: /version:\s*"?([^"\n]+)"?/,
  broadMarkdownVersion: /version[:\s]+(\d+\.\d+\.\d+)/gi,
};

/**
 * Validate if a pattern is potentially dangerous
 *
 * Checks regex patterns for common issues that could cause file corruption.
 * Used during configuration validation to warn users about risky patterns.
 *
 * @param pattern - Regular expression pattern to validate
 * @param filePath - File path the pattern will be applied to
 * @returns True if pattern is potentially dangerous
 *
 * @example
 * ```typescript
 * const dangerous = isDangerousPattern(/"version":\s*"([^"]+)"/, "deno.json");
 * // Returns: true (no line anchors in JSON file)
 * ```
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
 *
 * Returns a pre-tested safe pattern for common file types and keys.
 * These patterns use line anchors and specific matching to avoid corruption.
 *
 * @param filePath - Path to the file being updated
 * @param key - The key being updated (e.g., "version")
 * @returns Safe regex pattern or null if no recommendation available
 *
 * @example
 * ```typescript
 * const safePattern = getRecommendedSafePattern("deno.json", "version");
 * // Returns: /^(\s*)"version":\s*"([^"]+)"/m
 * ```
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
 *
 * Automatically converts known dangerous patterns to safe equivalents.
 * Used during configuration loading to help users migrate safely.
 *
 * @param pattern - Original regex pattern
 * @param filePath - File path the pattern applies to
 * @param key - The key being updated
 * @returns Migration result with safe pattern and migration status
 *
 * @example
 * ```typescript
 * const result = migrateDangerousPattern(
 *   /"version":\s*"([^"]+)"/,
 *   "deno.json",
 *   "version"
 * );
 * // Returns: { pattern: safe_pattern, migrated: true, warning: "..." }
 * ```
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
 * TypeScript version file template using Vento syntax
 *
 * Generates a comprehensive TypeScript version file with:
 * - Version constant and build information
 * - Application metadata from project config
 * - Optional app-specific metadata
 * - Release notes for the current version
 *
 * @see {@link https://vento.so/} Vento Template Engine
 *
 * @example
 * Template produces output like:
 * ```typescript
 * export const VERSION = "1.2.3";
 * export const BUILD_INFO = { ... };
 * ```
 */
export const TYPESCRIPT_TEMPLATE: string = `/**
 * Version information for {{ project.name }}
 * Generated by Nagare on {{ buildDate }}
 */

export const VERSION = "{{ version }}";

export const BUILD_INFO = {
  buildDate: "{{ buildDate }}",
  gitCommit: "{{ gitCommit }}",
  buildEnvironment: "{{ environment }}",
  versionComponents: {
    major: {{ versionComponents?.major || 0 }},
    minor: {{ versionComponents?.minor || 0 }},
    patch: {{ versionComponents?.patch || 0 }},
    prerelease: {{ versionComponents?.prerelease | jsonStringify }}
  }
} as const;

export const APP_INFO = {
  name: "{{ project.name }}",
  description: "{{ project.description }}",
  repository: "{{ project.repository }}",
  {{- if project.author }}
  author: "{{ project.author }}",
  {{- /if }}
  {{- if project.homepage }}
  homepage: "{{ project.homepage }}",
  {{- /if }}
  {{- if project.license }}
  license: "{{ project.license }}",
  {{- /if }}
} as const;

{{- if metadata }}
export const APP_METADATA = {{ metadata | jsonStringify }} as const;
{{- else }}
export const APP_METADATA = {} as const;
{{- /if }}

{{- if releaseNotes }}
export const RELEASE_NOTES = {{ releaseNotes | jsonStringify }} as const;
{{- else }}
export const RELEASE_NOTES = {} as const;
{{- /if }}
`;

/**
 * JSON version file template using Vento syntax
 *
 * Generates a JSON file suitable for package.json-style version tracking.
 * Includes all metadata in a structured JSON format.
 *
 * @example
 * Template produces output like:
 * ```json
 * {
 *   "version": "1.2.3",
 *   "buildInfo": { ... }
 * }
 * ```
 */
export const JSON_TEMPLATE: string = `{
  "version": "{{ version }}",
  "buildInfo": {
    "buildDate": "{{ buildDate }}",
    "gitCommit": "{{ gitCommit }}",
    "buildEnvironment": "{{ environment }}",
    "versionComponents": {
      "major": {{ versionComponents.major }},
      "minor": {{ versionComponents.minor }},
      "patch": {{ versionComponents.patch }},
      "prerelease": {{ versionComponents.prerelease | jsonStringify }}
    }
  },
  "appInfo": {
    "name": "{{ project.name }}",
    "description": "{{ project.description }}",
    "repository": "{{ project.repository }}"{{- if project.author }},
    "author": "{{ project.author }}"{{- /if }}{{- if project.homepage }},
    "homepage": "{{ project.homepage }}"{{- /if }}{{- if project.license }},
    "license": "{{ project.license }}"{{- /if }}
  }{{- if metadata }},
  "metadata": {{ metadata | jsonStringify }}{{- /if }},
  "releaseNotes": {{ releaseNotes | jsonStringify }}
}`;

/**
 * YAML version file template using Vento syntax
 *
 * Generates a YAML file for configuration-style version tracking.
 * Useful for projects that prefer YAML over JSON.
 *
 * @example
 * Template produces output like:
 * ```yaml
 * version: "1.2.3"
 * buildInfo:
 *   buildDate: "2025-01-01T00:00:00.000Z"
 * ```
 */
export const YAML_TEMPLATE: string = `version: "{{ version }}"
buildInfo:
  buildDate: "{{ buildDate }}"
  gitCommit: "{{ gitCommit }}"
  buildEnvironment: "{{ environment }}"
  versionComponents:
    major: {{ versionComponents.major }}
    minor: {{ versionComponents.minor }}
    patch: {{ versionComponents.patch }}
    prerelease: {{ versionComponents.prerelease | jsonStringify }}
appInfo:
  name: "{{ project.name }}"
  description: "{{ project.description }}"
  repository: "{{ project.repository }}"
  {{- if project.author }}
  author: "{{ project.author }}"
  {{- /if }}
  {{- if project.homepage }}
  homepage: "{{ project.homepage }}"
  {{- /if }}
  {{- if project.license }}
  license: "{{ project.license }}"
  {{- /if }}
{{- if metadata }}
metadata: {{ metadata | jsonStringify }}
{{- /if }}
releaseNotes: {{ releaseNotes | jsonStringify }}
`;

/**
 * Built-in template definitions mapped by format
 *
 * Contains all pre-defined templates that ship with Nagare.
 * Users can reference these by template format in their configuration.
 *
 * @example
 * ```typescript
 * const template = BUILT_IN_TEMPLATES[TemplateFormat.TYPESCRIPT];
 * ```
 */
export const BUILT_IN_TEMPLATES: Partial<Record<TemplateFormat, string>> = {
  [TemplateFormat.TYPESCRIPT]: TYPESCRIPT_TEMPLATE,
  [TemplateFormat.JSON]: JSON_TEMPLATE,
  [TemplateFormat.YAML]: YAML_TEMPLATE,
};

// Re-export types for convenience
export { BumpType, LogLevel, TemplateFormat };
