// ==================================================================
// types.ts - TypeScript Interfaces and Types
// ==================================================================

/**
 * @fileoverview TypeScript interfaces and types for Nagare
 */

/**
 * Supported template formats
 */
export enum TemplateFormat {
  TYPESCRIPT = "typescript",
  JSON = "json",
  YAML = "yaml",
  CUSTOM = "custom",
}

/**
 * Bump types for version increments
 */
export enum BumpType {
  MAJOR = "major",
  MINOR = "minor",
  PATCH = "patch",
}

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * Main configuration interface for Nagare
 */
export interface NagareConfig {
  /** Project metadata */
  project: {
    /** Project name */
    name: string;
    /** Project description */
    description?: string;
    /** Repository URL */
    repository: string;
    /** Project homepage */
    homepage?: string;
    /** License */
    license?: string;
    /** Author information */
    author?: string;
  };

  /** Version file configuration */
  versionFile: VersionFile;

  /** Release notes configuration */
  releaseNotes?: ReleaseNotesConfig;

  /** GitHub integration settings */
  github?: GitHubConfig;

  /** Files to update during release */
  updateFiles?: FileUpdatePattern[];

  /** Custom commit type mappings */
  commitTypes?: CommitTypeMapping;

  /** Template configuration */
  templates?: TemplateConfig;

  /** Documentation generation */
  docs?: DocsConfig;

  /** Advanced options */
  options?: ReleaseOptions;
}

/**
 * Version file configuration
 */
export interface VersionFile {
  /** Path to the version file */
  path: string;
  /** Template format (typescript, json, yaml, custom) */
  template: TemplateFormat;
  /** Custom template string (if template is 'custom') */
  customTemplate?: string;
  /** Patterns for extracting/updating version info */
  patterns?: {
    version?: RegExp;
    buildDate?: RegExp;
    gitCommit?: RegExp;
    [key: string]: RegExp | undefined;
  };
}

/**
 * Release notes configuration
 */
export interface ReleaseNotesConfig {
  /** Custom template for release notes section */
  template?: string;
  /** App-specific metadata to include */
  metadata?: Record<string, any>;
  /** Include git commit hashes */
  includeCommitHashes?: boolean;
  /** Maximum description length */
  maxDescriptionLength?: number;
}

/**
 * GitHub integration configuration
 */
export interface GitHubConfig {
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** Release template format */
  releaseTemplate?: string;
  /** Create GitHub release */
  createRelease?: boolean;
  /** GitHub token (from environment) */
  tokenEnvVar?: string;
}

/**
 * File update pattern
 */
export interface FileUpdatePattern {
  /** File path */
  path: string;
  /** Patterns to find and replace */
  patterns: {
    [key: string]: RegExp;
  };
  /** Optional custom update function */
  updateFn?: (content: string, data: TemplateData) => string;
}

/**
 * Template configuration
 */
export interface TemplateConfig {
  /** Custom templates directory */
  templatesDir?: string;
  /** Template data providers */
  dataProviders?: Record<string, () => Promise<any>>;
}

/**
 * Documentation generation configuration
 */
export interface DocsConfig {
  /** Enable documentation generation */
  enabled: boolean;
  /** Output directory for docs */
  outputDir?: string;
  /** Include private API in docs */
  includePrivate?: boolean;
  /** Custom deno doc options */
  denoDocOptions?: string[];
}

/**
 * Release options
 */
export interface ReleaseOptions {
  /** Dry run mode */
  dryRun?: boolean;
  /** Skip confirmation prompts */
  skipConfirmation?: boolean;
  /** Git remote name */
  gitRemote?: string;
  /** Custom git tag prefix */
  tagPrefix?: string;
  /** Log level */
  logLevel?: LogLevel;
}

/**
 * Conventional commit structure
 */
export interface ConventionalCommit {
  /** Commit type */
  type: string;
  /** Commit scope */
  scope?: string;
  /** Commit description */
  description: string;
  /** Commit body */
  body?: string;
  /** Breaking change indicator */
  breakingChange?: boolean;
  /** Git commit hash */
  hash: string;
  /** Commit date */
  date: string;
  /** Raw commit message */
  raw?: string;
}

/**
 * Release notes structure
 */
export interface ReleaseNotes {
  /** Release version */
  version: string;
  /** Release date */
  date: string;
  /** Added features */
  added: string[];
  /** Changed/improved items */
  changed: string[];
  /** Deprecated features */
  deprecated: string[];
  /** Removed features */
  removed: string[];
  /** Fixed bugs */
  fixed: string[];
  /** Security updates */
  security: string[];
}

/**
 * Template data for processing
 */
export interface TemplateData {
  /** Version information */
  version: string;
  /** Build date */
  buildDate: string;
  /** Git commit hash */
  gitCommit: string;
  /** Build environment */
  environment: string;
  /** Release notes */
  releaseNotes: ReleaseNotes;
  /** Custom metadata */
  metadata: Record<string, any>;
  /** Project information */
  project: NagareConfig["project"];
}

/**
 * Commit type to changelog section mapping
 */
export interface CommitTypeMapping {
  [commitType: string]: "added" | "changed" | "deprecated" | "removed" | "fixed" | "security";
}

/**
 * Result of a release operation
 */
export interface ReleaseResult {
  /** Whether the release was successful */
  success: boolean;
  /** New version number */
  version?: string;
  /** Previous version number */
  previousVersion?: string;
  /** Number of commits included */
  commitCount?: number;
  /** Release notes generated */
  releaseNotes?: ReleaseNotes;
  /** Files that were updated */
  updatedFiles?: string[];
  /** Error message if failed */
  error?: string;
  /** GitHub release URL if created */
  githubReleaseUrl?: string;
}
