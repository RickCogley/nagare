/**
 * @fileoverview Nagare (流れ) - A comprehensive Deno release management library
 * @description Handles version bumping, changelog generation, and GitHub releases
 * @author Rick Cogley
 * @license MIT
 * @see {@link https://jsr.io/@rick/nagare} for current version and documentation
 * @module
 */

// ==================================================================
// Core Release Management Classes
// ==================================================================

/**
 * Main release management functionality
 */
export { ReleaseManager } from "./src/release-manager.ts";

/**
 * Release rollback functionality
 */
export { RollbackManager } from "./src/rollback-manager.ts";

/**
 * Git operations and parsing
 */
export { GitOperations } from "./src/git-operations.ts";

/**
 * Semantic versioning utilities
 */
export { VersionUtils } from "./src/version-utils.ts";

/**
 * Changelog generation following Keep a Changelog format
 */
export { ChangelogGenerator } from "./src/changelog-generator.ts";

/**
 * GitHub CLI integration for releases
 */
export { GitHubIntegration } from "./src/github-integration.ts";

/**
 * Template processing engine
 */
export { TemplateProcessor } from "./src/template-processor.ts";

/**
 * Documentation generation utilities
 */
export { DocGenerator } from "./src/doc-generator.ts";

// ==================================================================
// File Handlers for Intelligent Updates (New in 1.1.0)
// ==================================================================

/**
 * File handler system for automatic version updates
 * @since 1.1.0
 */
export { FileHandlerManager, PatternBuilder } from "./src/file-handlers.ts";

/**
 * Built-in file handlers for common project files
 * @since 1.1.0
 */
export { BUILT_IN_HANDLERS } from "./src/file-handlers.ts";

// ==================================================================
// Type Definitions
// ==================================================================

/**
 * Type definitions for configuration and data structures
 */
export type {
  /** Mapping of conventional commit types to changelog sections */
  CommitTypeMapping,
  /** Parsed conventional commit structure */
  ConventionalCommit,
  /** Pattern for updating files during release */
  FileUpdatePattern,
  /** GitHub integration configuration */
  GitHubConfig,
  /** Main configuration interface for Nagare */
  NagareConfig,
  /** Release notes structure following Keep a Changelog format */
  ReleaseNotes,
  /** Result of a release operation */
  ReleaseResult,
  /** Template data for processing */
  TemplateData,
  /** Version file configuration */
  VersionFile,
} from "./types.ts";

/**
 * File handler types
 * @since 1.1.0
 */
export type {
  /** File change preview */
  FileChangePreview,
  /** File handler definition */
  FileHandler,
  /** File update result */
  FileUpdateResult,
} from "./src/file-handlers.ts";

// ==================================================================
// Configuration and Constants
// ==================================================================

/**
 * Configuration constants and default values
 */
export {
  /** Version bump types for semantic versioning */
  BumpType,
  /** Default configuration values */
  DEFAULT_CONFIG,
  /** Logging levels */
  LogLevel,
  /** Template format types */
  TemplateFormat,
} from "./config.ts";
