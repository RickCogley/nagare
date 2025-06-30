# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-06-30

### Added
- add init subcommand for easy project setup (e23f998)

### Changed
- format generated files after release (5d07ee4)

## [1.1.2] - 2025-06-30

### Changed

- apply deno fmt to documentation and config files (a5bcc18)
- add some settings for claude (a38006b)
- update documentation for v1.1.0 intelligent file handlers (17a9b89)
- add research template and CLAUDE.md usage findings (6c564c2)
- add Claude Code configuration files (b8bcc84)
- format generated files after release (f458670)

## [1.1.1] - 2025-06-29

### Changed

- format generated files after release (72c8cf1)

### Fixed

- critical - fix config file resolution when imported from JSR (6f2d2a4)

## [1.1.0] - 2025-06-29

### Added

- add intelligent file handler system for automatic version updates (b86ec5c)

### Changed

- temporary debug section (0865b8a)
- add JSR badges to readme (05a40de)
- fix file handler tests for proper temp file detection and error handling (3b80a3e)
- add comprehensive test coverage for file handler system (9d7a9ce)
- update plans (7100c6b)
- add template based file generation proposal (79c3d24)

### Fixed

- avoid clobbering urls (c22787c)
- temporary debug (7090a35)
- simplify deno.json handler (581d3d8)
- suppress lint errors about control characters (0a6f445)
- change let to const (ebd6e13)
- remove comment removal regex in file-handlers.ts (ed391b8)
- handle default case where no specific key is provided (5b51e58)
- add version string (0422f24)
- add logic to preview changes for built-in handlers (df909ca)
- add file handler for jsr.json (6f89946)

## [1.0.1] - 2025-06-27

### Changed

- exclude scratch folder for quick tests (b56569b)
- deno fmt (220ff0e)

### Fixed

- make patterns optional in FileUpdatePattern to support updateFn-only usage (2ed0218)
- sync deno.json version that was missed in 1.0.0 release (a6c91e4)
- remove 'any' types from RELEASE_NOTES type guard to satisfy linting (a6bc312)
- add type guards for RELEASE_NOTES to resolve CI TypeScript errors (f999da0)

## [1.0.0] - 2025-06-27

### Added

- enhance types.ts with Vento template support and release hooks (ed13b5b)
- ⚠️ BREAKING: integrate Vento template engine for robust template processing (3f8fc72)

### Changed

- deno fmt (3d62b1d)
- deno fmt (e99a886)
- deno fmt (59f28de)

### Fixed

- show actual replacement result in dry-run preview instead of template string (0c8f41b)
- preserve regex flags in previewFileUpdates for accurate pattern matching (a3c575b)
- improve pattern detection in buildSafeReplacement for JSON version fields (83ffe68)
- await template processor calls in release-manager.ts (05761c6)
- correct Vento template engine integration and update to JSR v1.14.0 (ea60ddd)

## [0.8.0] - 2025-06-26

### Added

- add comprehensive file update pattern validation (8106092)

### Changed

- deno fmt (5345675)
- update all examples to use safe file update patterns (addd13f)
- deno fmt (3e08e16)
- deno fmt (39df1ce)
- deno fmt (14e7c4c)

### Fixed

- replace dangerous file update pattern with safe alternative (a2a26a6)
- remove unused import and use const for content variable (72f836c)
- remove invalid getLevel() call from Logger (90b8cc8)
- replace dangerous default file update patterns (4afa222)

## [0.7.0] - 2025-06-26

### Changed

- update to reflect recent fixes (fdc2e8c)

## [0.6.6] - 2025-06-26

### Fixed

- add version.ts to publish.include and export list (f793cbf)

## [0.6.5] - 2025-06-26

### Fixed

- import version from version.ts instead of hardcoded string (54ad071)

## [0.6.4] - 2025-06-26

### Changed

- deno fmt (ede9c01)

### Fixed

- use deno.cwd for resolving relative config paths (236bdfc)

## [0.6.3] - 2025-06-26

### Changed

- deno fmt files (daf0b56)

### Fixed

- export cli.ts as cli.ts (c071991)

## [0.6.2] - 2025-06-26

### Changed

- add statement about node and bun compatibility (71f5ff4)
- add module doc to remaining entry points (e2d85eb)

## [0.6.1] - 2025-06-26

### Fixed

- disable no-inferrable-types rule to resolve JSR conflict (c84758f)

## [0.6.0] - 2025-06-26

### Added

- add comprehensive library integration tests (82b9896)

## [0.5.1] - 2025-06-26

### Fixed

- add explicit type annotations to exported constants (b6a2c0c)

## [0.5.0] - 2025-06-25

### Added

- add post-release formatting automation hook (e077784)

### Fixed

- add type guards for safe object indexing with unknown types (bab3c90)

## [0.4.1] - 2025-06-25

### Fixed

- auto-format generated files instead of failing on format check (62263a4)
- format generated files after v0.3.1 release (d640f23)

## [0.4.0] - 2025-06-25

### Added

- add auto-formatting to generated files (07f418d)

### Fixed

- format generated files (48d0c8a)
- pass correct bumpType (4ec2a7b)
- simplify updateFn to avoid sync/async complexity (a1161c9)

## [0.3.0] - 2025-06-25

### Added

- add GitHub Actions workflow with JSR provenance support (bd4c460)
- add documentation server for Deno Deploy (01dac34)
- enhance deno.json with JSR optimizations (604183d)
- enhance JSR configuration for better scoring (e3a0eb3)
- add runtime compatibility layer for Deno, Node.js, and Bun (4d9fe1f)

### Changed

- add comprehensive FAQ and API reference documentation (b9e30c0)
- enhance mod.ts with comprehensive JSDoc and runtime exports (7b303b2)

### Fixed

- resolve TypeScript strict mode errors (463e11d)

## [0.2.5] - 2025-06-25

### Changed

- fix logic error prerelease version (3468680)

## [0.2.4] - 2025-06-25

### Changed

- fix errors when publishing to jsr (7dd6f04)

## [0.2.3] - 2025-06-25

### Changed

- prepare for publishing to jsr.io (6313fbe)

## [0.2.2] - 2025-06-25

### Fixed

- push tag to github first (7f7d6e4)

## [0.2.1] - 2025-06-25

### Changed

- apply Deno formatting standards (4d7f97c)
- avoid stripping version key (763a2a7)

### Fixed

- improve GitHub release and documentation generation (a21b9e8)

## [0.2.0] - 2025-06-25

### Added

- add initial version file for testing (df51430)
- add command-line interface for release automation (cf6055f)
- add RollbackManager for release rollback operations (061a787)
- configure Nagare release automation (86ab2a2)
- add main library exports and public API (02846ef)
- add rollback functionality for failed releases (aa120d2)
- add core ReleaseManager orchestrator (da57cb6)
- add documentation generation using deno doc (10a0322)
- add GitHub release integration via gh CLI (db9db43)
- add template processing engine for version files (5a0f2b6)
- add CHANGELOG.md generation following Keep a Changelog (3b2d253)
- add semantic versioning utilities (0ce9a42)
- add Git operations abstraction layer (5ef0d07)
- add logging infrastructure with configurable levels (2096db5)
- add configuration schema and built-in templates (04a9837)
- add core TypeScript interfaces and type definitions (dd5e811)

### Changed

- allow docs related folders (6a1595f)
- fix various type errors 2 (b7cd0b1)
- fix various type errors (76923f8)
- add comprehensive testing guide (4608880)
- add cross references (b61ed14)
- add comprehensive testing guide (416e101)
- add link to contributor guidelines (9ed51ac)
- add .gitignore for Deno projects (5b5eef9)
- add contributor guidelines (d94952d)
- add Deno project configuration and task automation (d07701c)
- add technical architecture specification (e391ab7)
- add comprehensive user documentation (52b361f)
- build(deno) create deno.json (c1abe68)
- Initial commit (83406af)

### Fixed

- update deno docs syntax (c1b913d)
- simplify git log format (2680590)
