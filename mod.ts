/**
 * Nagare (流れ) is a comprehensive release management library for JavaScript/TypeScript projects
 * that automates version bumping, changelog generation, and GitHub releases using conventional
 * commits and semantic versioning.
 *
 * | **Nagare** | **Specifications** |
 * | :------- | :------- |
 * | Version | 2.7.0 |
 * | Repository | {@link https://github.com/RickCogley/nagare} |
 * | JSR Package | {@link https://jsr.io/@rick/nagare} |
 * | Documentation | {@link https://nagare.esolia.deno.net} |
 * | License | MIT |
 * | Author | Rick Cogley, eSolia Inc. |
 *
 * ## Core Features
 *
 * - **🚀 Automated Releases** - Version calculation based on conventional commits
 * - **📝 Changelog Generation** - Automatic CHANGELOG.md following Keep a Changelog format
 * - **🏷️ Git Integration** - Smart tagging and commit management
 * - **🐙 GitHub Releases** - Automatic GitHub release creation via CLI
 * - **🤖 Intelligent File Handlers** - Automatic version updates for common file types (v1.1.0+)
 * - **📄 Template System** - Flexible version file templates (TypeScript, JSON, YAML, custom)
 * - **✨ Extensible Version Files** - Add custom exports without full templates (v1.8.0+)
 * - **🔄 Rollback Support** - Safe rollback of failed releases
 * - **🛡️ Type-Safe** - Full TypeScript support with comprehensive types
 * - **🌐 Multi-Language** - English and Japanese interfaces (v2.4.0+)
 *
 * ## Quick Start
 *
 * @example Initialize Nagare in your project
 * ```bash
 * # Quick setup with init command
 * deno run -A jsr:@rick/nagare/cli init
 *
 * # This creates:
 * # - nagare-launcher.ts (handles local config loading)
 * # - nagare.config.ts (minimal configuration)
 * # - Instructions for deno.json tasks
 * ```
 *
 * @example Basic programmatic usage
 * ```typescript
 * import { ReleaseManager } from "jsr:@rick/nagare";
 *
 * const config = {
 *   project: {
 *     name: "My App",
 *     repository: "https://github.com/user/my-app"
 *   },
 *   versionFile: {
 *     path: "./version.ts",
 *     template: "typescript"
 *   }
 * };
 *
 * const releaseManager = new ReleaseManager(config);
 * const result = await releaseManager.release();
 *
 * if (result.success) {
 *   console.log(`Released version ${result.version}`);
 * }
 * ```
 *
 * ## Architecture Overview
 *
 * Nagare follows a layered architecture with clear separation of concerns:
 *
 * ```
 * ┌─────────────────────────────────────────┐
 * │            CLI Interface                │  ← User entry point
 * ├─────────────────────────────────────────┤
 * │          Manager Layer                  │  ← Orchestration
 * │  ReleaseManager  │  RollbackManager     │
 * ├─────────────────────────────────────────┤
 * │        Integration Layer                │  ← External systems
 * │ GitOperations │ GitHubIntegration │ ... │
 * ├─────────────────────────────────────────┤
 * │        Processing Layer                 │  ← Data transformation
 * │ TemplateProcessor │ ChangelogGen │ ...  │
 * ├─────────────────────────────────────────┤
 * │       Infrastructure Layer              │  ← Foundation
 * │    Logger    │   Config   │   Types    │
 * └─────────────────────────────────────────┘
 * ```
 *
 * ## Intelligent File Handlers (v1.1.0+)
 *
 * Nagare includes built-in handlers that automatically detect and update common file types:
 *
 * @example Simple file updates with built-in handlers
 * ```typescript
 * updateFiles: [
 *   { path: "./deno.json" },     // Automatically handled
 *   { path: "./package.json" },  // Automatically handled
 *   { path: "./README.md" },     // Updates badges and version references
 *   { path: "./jsr.json" }       // Automatically handled
 * ]
 * ```
 *
 * ## Conventional Commits
 *
 * Nagare analyzes commit messages to determine version bumps:
 *
 * - `feat:` → Minor version bump (1.0.0 → 1.1.0)
 * - `fix:` → Patch version bump (1.0.0 → 1.0.1)
 * - `feat!:` or `BREAKING CHANGE:` → Major version bump (1.0.0 → 2.0.0)
 * - Other types → Patch version bump
 *
 * ## Extensible Version Files (v1.8.0+)
 *
 * Add custom exports to generated version files without writing full templates:
 *
 * @example Additional exports configuration
 * ```typescript
 * versionFile: {
 *   path: "./version.ts",
 *   template: "typescript",
 *
 *   // Add custom exports
 *   additionalExports: [
 *     {
 *       name: "API_CONFIG",
 *       type: "const",
 *       value: { baseUrl: "https://api.example.com", timeout: 5000 },
 *       description: "API configuration",
 *       asConst: true
 *     },
 *     {
 *       name: "Utils",
 *       type: "class",
 *       content: `
 *   static formatVersion(): string {
 *     return \`v\${VERSION}\`;
 *   }`
 *     }
 *   ],
 *
 *   // Or add raw content
 *   extend: {
 *     prepend: "// Auto-generated file\\n\\n",
 *     append: "\\n// End of generated content"
 *   }
 * }
 * ```
 *
 * ## Advanced Usage
 *
 * @example Custom file handler
 * ```typescript
 * import { FileHandlerManager } from "jsr:@rick/nagare";
 *
 * const fileHandler = new FileHandlerManager();
 * fileHandler.registerHandler({
 *   id: "custom-config",
 *   name: "Custom Config Handler",
 *   detector: (filepath) => filepath.endsWith(".custom"),
 *   patterns: {
 *     version: /version:\s*"([^"]+)"/
 *   }
 * });
 * ```
 *
 * @example Custom version template
 * ```typescript
 * versionFile: {
 *   path: "./version.ts",
 *   template: "custom",
 *   customTemplate: `
 * export const VERSION = "{{version}}";
 * export const BUILD_DATE = "{{buildDate}}";
 * export const FEATURES = {{metadata.features | jsonStringify}};
 * `
 * }
 * ```
 *
 * @example Custom updateFn for complex replacements
 * ```typescript
 * // For files with special formatting like markdown tables
 * updateFiles: [{
 *   path: "./mod.ts",
 *   patterns: {
 *     version: /(\| Version \| )([^\s]+)( \|)/,
 *   },
 *   updateFn: (content: string, data: TemplateData) => {
 *     // Preserve table structure while updating only the version
 *     return content.replace(
 *       /(\| Version \| )([^\s]+)( \|)/,
 *       `$1${data.version}$3`
 *     );
 *   },
 * }]
 * ```
 *
 * ## Migration from Other Tools
 *
 * ### From semantic-release
 * - Nagare uses similar conventional commit analysis
 * - Configuration is TypeScript-based instead of JSON
 * - Built-in file update patterns instead of plugins
 *
 * ### From standard-version
 * - Similar changelog generation following Keep a Changelog
 * - More flexible file update system
 * - Better TypeScript and Deno support
 *
 * @see {@link https://github.com/RickCogley/nagare} - Source code and issues
 * @see {@link https://jsr.io/@rick/nagare} - Package registry
 * @see {@link https://nagare.esolia.deno.net} - API documentation
 *
 * @tags release-management, versioning, changelog, conventional-commits, deno, typescript
 * @file Main entry point for the Nagare release management library
 * @module nagare
 * @author Rick Cogley
 * @license MIT
 */

// ==================================================================
// Core Release Management Classes
// ==================================================================

/**
 * The primary orchestrator for the release process. Coordinates version calculation,
 * file updates, changelog generation, and git operations.
 *
 * @example
 * ```typescript
 * const releaseManager = new ReleaseManager(config);
 * const result = await releaseManager.release("minor");
 * ```
 */
export { ReleaseManager } from "./src/release-manager.ts";

/**
 * Handles safe rollback of releases by reverting git tags, commits, and file changes.
 * Useful for recovering from failed or problematic releases.
 *
 * @example
 * ```typescript
 * const rollback = new RollbackManager(config);
 * await rollback.rollback("1.2.0");
 * ```
 */
export { RollbackManager } from "./src/rollback-manager.ts";

/**
 * Low-level git operations wrapper providing methods for commits, tags, and
 * conventional commit parsing. Used internally by managers but also available
 * for custom workflows.
 */
export { GitOperations } from "./src/git-operations.ts";

/**
 * Utilities for semantic versioning calculations. Determines appropriate version
 * bumps based on conventional commits and provides version parsing capabilities.
 */
export { VersionUtils } from "./src/version-utils.ts";

/**
 * Generates and updates CHANGELOG.md files following the Keep a Changelog format.
 * Automatically categorizes commits into Added, Changed, Fixed, etc. sections.
 */
export { ChangelogGenerator } from "./src/changelog-generator.ts";

/**
 * Integration with GitHub CLI (`gh`) for creating releases. Handles authentication
 * and provides graceful fallback when GitHub CLI is not available.
 */
export { GitHubIntegration } from "./src/github-integration.ts";

/**
 * Vento-based template processing engine for generating version files with custom
 * formats. Supports variables, conditionals, and filters for flexible output.
 */
export { TemplateProcessor } from "./src/template-processor.ts";

/**
 * Generates API documentation using Deno's built-in documentation generator.
 * Creates the static documentation site served at nagare.esolia.deno.net.
 */
export { DocGenerator } from "./src/doc-generator.ts";

/**
 * Enhanced error handling for better developer experience (v1.9.0+)
 * Provides structured errors with actionable suggestions and context.
 *
 * @see {@link ./src/error-reference.ts} for comprehensive error documentation
 */
export { ErrorCodes, ErrorFactory, NagareError } from "./src/enhanced-error.ts";
export type { ErrorCode } from "./src/enhanced-error.ts";

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
  /** Additional export configuration for extending version files (v1.8.0+) */
  AdditionalExport,
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
 * Translation key type for i18n support
 * @since 2.1.0
 */
export type { TranslationKey } from "./locales/schema.ts";

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

// ==================================================================
// Common Patterns and Recipes
// ==================================================================

/**
 * ## Common Configuration Patterns
 *
 * ### Monorepo Setup
 * Create separate config files for each package:
 * ```typescript
 * // packages/core/nagare.config.ts
 * export default {
 *   project: { name: "@myorg/core" },
 *   versionFile: { path: "./version.ts", template: "typescript" },
 *   updateFiles: [
 *     { path: "./package.json" },
 *     { path: "../../README.md", patterns: { version: /@myorg\/core@([^\\s]+)/g } }
 *   ]
 * };
 * ```
 *
 * ### CI/CD Integration
 * ```yaml
 * # .github/workflows/release.yml
 * - name: Release
 *   run: |
 *     deno run -A jsr:@rick/nagare/cli --skip-confirmation
 *   env:
 *     GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
 * ```
 *
 * ### Custom Changelog Sections
 * ```typescript
 * commitTypes: {
 *   feat: "added",
 *   fix: "fixed",
 *   perf: "improved",
 *   docs: "documented",
 *   chore: "maintenance"
 * }
 * ```
 */

/**
 * ## Troubleshooting Guide
 *
 * ### Common Issues
 *
 * **"No commits found since last release"**
 * - Ensure you have commits since the last tag
 * - Check: `git log $(git describe --tags --abbrev=0)..HEAD`
 * - Force release: `nagare.release("patch")`
 *
 * **"File update pattern warnings"**
 * - Use line-anchored patterns: `/^(\\s*)"version":\\s*"([^"]+)"/m`
 * - Or switch to built-in handlers: `{ path: "./deno.json" }`
 *
 * **"GitHub CLI not found"**
 * - Install: `brew install gh` (macOS) or see GitHub CLI docs
 * - Or disable: `github: { createRelease: false }`
 *
 * **"Interactive prompts not working"**
 * - Run `nagare init` to create proper launcher
 * - Or use `--skip-confirmation` flag
 */

/**
 * ## Performance Considerations
 *
 * - Git operations are cached per session
 * - File updates are atomic to prevent corruption
 * - Large changelogs are processed incrementally
 * - Template compilation is cached
 *
 * ## Security Notes
 *
 * - Never commit sensitive data in version files
 * - GitHub tokens should use environment variables
 * - File patterns are validated to prevent injection
 * - All file paths are sanitized
 */
