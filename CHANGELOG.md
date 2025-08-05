# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.17.0] - 2025-08-05

### Added

- show application name in CLI startup message (15c71da)
- integrate app context display in release manager (10d02d2)

### Changed

- add comprehensive tests for app context display features (bd846f4)
- maintain 'release current' linguistic style in Shape Up project (399aebf)
- remove test file to verify hook handles deleted files (515f7f5)
- add test file for hook verification (5117a30)
- correct Shape Up project to focus on displaying app being released (97ef636)
- create Shape Up project for Nagare release flow branding (dab7384)

### Fixed

- resolve linting issues for app context display features (556c57c)
- resolve i18n initialization issue for JSR packages (a301000)
- exclude deleted files from format-code git hook (8489f07)

## [2.16.0] - 2025-08-05

### Added

- update security check hook (350aefb)

### Changed

- re-enable pre-commit hooks (ce30752)

## [2.15.0] - 2025-08-05

### Added

- enhance deno.json with aichaku-inspired configuration (e57cf0e)
- add CLAUDE.md documentation to all critical subfolders (ac5aec3)
- add git pre-commit hooks for code quality (2f503a9)

### Changed

- disable git hooks (aefffce)
- disable tests githook (13c923e)
- enable test and security pre-commit hooks (3390979)

### Fixed

- resolve all git-related test failures (4f770a6)
- resolve markdown linting issue in CLAUDE.md (186feec)

## [2.14.0] - 2025-08-04

### Added

- add aichaku app-description.yaml with auto-update support (2de066b)

### Changed

- add session checkpoint for spinner improvements and message enhancements (791a0d9)
- bump aichaku version (2ae3d06)

## [2.13.2] - 2025-07-20

### Fixed

- prevent duplicate flow messages in celebration (769c0c0)
- improve final release messages with version numbers and cleaner flow (ee988e7)

## [2.13.1] - 2025-07-19

### Changed

- add visual progress indicators to key features (12f0aa5)
- rename KiaProgressIndicator to StdProgressIndicator for accuracy (5738b72)

## [2.13.0] - 2025-07-19

### Added

- replace custom progress indicator with Kia library for reliable spinner animation (fec845a)

### Fixed

- pin @std/cli to exact version 1.0.20 for JSR compatibility (610ca89)
- use JSR-compatible @std/cli/unstable-spinner for reliable animation (a812348)
- replace Kia with JSR-compatible Deno std Spinner (e30c9e8)
- improve JSR verification error handling and restore Kia spinner (d970ca9)
- add missing substep methods to KiaProgressIndicator for TypeScript compatibility (e88a08b)
- remove unnecessary async keywords from KiaProgressIndicator methods (ab43d0b)

## [2.12.7] - 2025-07-19

### Fixed

- improve progress indicator visual states and spinner animation (1e5b3ff)

## [2.12.6] - 2025-07-19

### Fixed

- prevent spinner characters from persisting after stage completion (c83b6f5)

## [2.12.5] - 2025-07-19

### Fixed

- add pause/resume calls around heavy logging operations (ed2ccd9)

## [2.12.4] - 2025-07-19

### Fixed

- improve spinner to checkmark transition timing (d463ff5)

## [2.12.3] - 2025-07-19

### Changed

- temp: disable progress indicator to resolve log interference (44fa015)

### Fixed

- re-enable progress indicator after fixing animation issues (6e1578c)
- resolve spinner animation stuck static issue (5227472)

## [2.12.2] - 2025-07-19

### Changed

- gitignore: exclude nagare backup files (2d209be)
- clean: remove backup files that were accidentally committed (987e5c7)

### Fixed

- restore progress indicator with simple line-by-line updates (041fe22)

## [2.12.1] - 2025-07-19

### Fixed

- simplify progress indicator to avoid log interference (be75034)

## [2.12.0] - 2025-07-19

### Added

- implement bottom-anchored progress indicator (a0838e4)

## [2.11.8] - 2025-07-19

### Fixed

- add small delay after render to prevent concurrent output interference (54112b4)

## [2.11.7] - 2025-07-19

### Changed

- clean: remove debug logging - progress indicator working perfectly (95c78d8)

## [2.11.6] - 2025-07-19

### Changed

- debug: add stage status logging to diagnose spinner issue (3a36b9e)

## [2.11.5] - 2025-07-19

### Changed

- clean: remove debug logging from progress indicator (2c1f61b)
- debug: add logging to understand spinner status issue (33e4254)

## [2.11.4] - 2025-07-19

### Fixed

- ensure completed stages show checkmarks instead of frozen spinners (eeadcae)

## [2.11.3] - 2025-07-19

### Fixed

- complete progress indicator improvements (abc4748)

## [2.11.2] - 2025-07-19

### Fixed

- remove unused newLines variable in progress indicator (b9fc0fd)
- simplify progress indicator to single-line updates (987db1b)
- improve ANSI terminal detection for modern terminals (3d1b0c5)

## [2.11.1] - 2025-07-19

### Fixed

- prevent duplicate progress headers by disabling ANSI clearing (20b25d0)
- correct spinner animation frame sequence (91a558f)
- disable progress indicator during dry runs and improve animation (d85cefe)
- improve progress indicator functionality (9bbe2eb)

## [2.11.0] - 2025-07-19

### Added

- comprehensive marine-themed branding with wave animation (c92ace6)

### Changed

- update project status to reflect completed implementation (91c30e3)
- complete nagare branding flow experience project (adbb288)
- update project status with progress indicator fix (2d4ae47)

### Fixed

- improve wave animation visibility and marine color accuracy (d185ea0)
- progress indicator scope to complete on final stage (a5968b9)

## [2.10.0] - 2025-07-19

### Added

- implement comprehensive branding system for consistent CLI messaging (3501e0f)
- implement three critical reliability fixes for nagare release process (3c9d64d)

### Changed

- revert release (6f5c276)
- bump version to 2.10.0 (008be55)
- pre-release checkpoint (42878ac)
- reorganize and clean up documentation structure (c10e16a)
- optimize GitHub Pages compatibility (c4824fe)
- add checkpoint documentation for reliability fixes (3b9fa17)
- add comprehensive explanation documentation with Mermaid diagrams (c2b4a89)
- add comprehensive reference documentation (54adf55)
- add comprehensive how-to guides for common tasks (9bb7229)
- add comprehensive tutorial documentation with visual guides (0bccc8c)
- create comprehensive documentation hub with Diátaxis framework (70aad33)
- tidy up CLAUDE.md (78f6806)
- cleanup with new aichaku (61c0070)
- upgrade aichaku to v0.28.0 and migrate to new structure (2f9f27f)
- add comprehensive project documentation (762896b)
- add comprehensive standards including documentation (3e481fd)

### Fixed

- resolve JSR import constraint errors for publishing (6b47e2b)
- implement dynamic branch detection for rollback system (09492dc)
- resolve critical rollback system issues (7866fc9)
- enhance rollback system for comprehensive tag reversion (04d0465)
- remove unused Brand import from release-manager (6211980)
- disable docs generation to avoid backup directory issue (f8edf85)
- escape Liquid template syntax in version-management.md for Jekyll compatibility (f984868)
- escape Liquid template syntax in documentation for Jekyll compatibility (96dd03e)
- simplify because checks covered elsewhere (7858ad0)

## [2.9.1] - 2025-07-11

### Fixed

- resolve i18n initialization and CLI argument parsing issues (2dd18a5)

## [2.9.0] - 2025-07-11

### Added

- add workflow_dispatch to all GitHub workflows (9c04658)

### Changed

- update CLAUDE.md to reflect new /docs structure (53d67c2)
- migrate documentation structure to /docs with API docs in /docs/api (1781458)
- reorganize documentation structure with Aichaku methodology (93520ed)
- add comprehensive lifecycle hooks documentation to API.md (6339390)
- upgrade to latest and clean up (ef91074)
- add session checkpoint 2025-07-09-193706 (b77cf20)
- add session checkpoint 2025-07-09-113741 (7e53d07)
- add session checkpoint 2025-07-09 (b713b98)
- add session checkpoint for 2025-07-09 (cf94e6e)

## [2.8.1] - 2025-07-08

### Changed

- close out completed Claude projects (2fda967)
- remove v5.2.0 version anomaly warnings (6af5463)
- add version notice about v5.2.0 anomaly (7f946ed)

## [2.8.0] - 2025-07-08

This version includes critical fixes for the release process, including pre-flight validation and proper version
detection.

### Added

- add pre-flight validation system to prevent release failures (1177e80)

### Changed

- disable tests in pre-flight checks for demo (0cc0bd6)
- increase AI fix maxAttempts from 3 to 5 (5f92058)

### Fixed

- **CRITICAL**: read current version from git tags instead of version file (3c34320) - prevents version jumps when
  releases fail
- resolve linting error in test mock (e184855)
- add unstable-raw-imports flag to pre-flight test command (e9117e6)
- add unstable-raw-imports flag to type check (1280491)
- resolve linting errors in release manager (2011bfd)
- prevent release failures with pre-flight validation (0a245c3)

## [2.7.0] - 2025-07-08

### Added

- add configurable thinking levels for AI auto-fix (5837aaa)

## [2.6.0] - 2025-07-08

### Added

- add AI documentation and enhance init command (ea46cba)

## [2.5.0] - 2025-07-08

### Added

- complete Japanese translations for nagare (7d65d53)

### Changed

- add language setting documentation (e6aff0a)

### Fixed

- ensure GitHub releases are never created as drafts (f158757)

## [2.4.0] - 2025-07-08

### Added

- add configurable language settings (8444cb5)

### Changed

- use nagare-launcher.ts for nagare itself (9f2d0c7)
- update README to reflect current setup approaches (2926f3e)

## [2.3.0] - 2025-07-07

### Added

- add JSR verification and auto-fix system for release workflow (5aabed1)
- integrate aichaku adaptive methodology system (8915200)

### Changed

- upgrade aichaku integration and project configuration (cc8ed9b)
- organize Claude Code session summaries (29c64d3)

## [2.2.1] - 2025-07-04

### Changed

- add security scanning configuration section to CLAUDE.md (1aa61e8)

### Fixed

- correct placement of DevSkim inline suppression comments (c158af5)
- configure DevSkim to ignore docs and fix CodeQL suppression syntax (7957726)
- add both DevSkim and CodeQL suppression comments for all security alerts (794c794)
- properly place inline DevSkim comments to resolve all code scanning alerts (a73059c)
- add inline DevSkim comments to resolve code scanning alerts (6ec032b)
- resolve code scanning security alerts (1918d0c)
- resolve static analysis warnings for type comparison and regex anchors (1c83bcd)
- add --unstable-raw-imports flag to security tests (633af26)
- remove unused import and fix undefined variable in rollback-manager (0d85f56)

## [2.2.0] - 2025-07-04

### Added

- complete i18n implementation for CLI output (df29e8c)
- add internationalized help text (bd21415)

### Changed

- add i18n usage examples and fix locale path resolution (23a585c)

## [2.1.0] - 2025-07-03

### Added

- implement internationalization (i18n) system with backward compatibility (ccb0b01)
- implement internationalization (i18n) system (4f584f9)
- implement breaking change validation for version bumps (8bf245c)

## [2.0.0] - 2025-07-03

### Added

- migrate to Deno 2.4 text imports for templates (39c313d)

### Fixed

- include templates directory in JSR publish configuration (7db1682)
- add --unstable-raw-imports flag to deno publish command (7553e19)
- update GitHub Actions workflow for Deno 2.4 compatibility (0e0a0f9)

## [1.10.0] - 2025-07-02

### Added

- add git pre-commit hook for automatic formatting (f28d7c5)

### Changed

- clarify Vento JSON escaping security requirements (5037e97)
- update CLAUDE.md with critical learnings from recent development (4ff5638)
- format generated files after release (1bd7f7c)

## [1.9.4] - 2025-07-02

### Changed

- format generated files after release (4031312)

### Fixed

- suppress false positive security alerts with DevSkim comments (08246d2)

## [1.9.3] - 2025-07-02

### Changed

- format generated files after release (28f114f)

### Fixed

- skip git-operations tests in CI environment (40c4d05)

## [1.9.2] - 2025-07-02

### Changed

- format generated files after release (3da077c)

### Fixed

- remove 'any' types from test files to pass lint checks (01586a5)

## [1.9.1] - 2025-07-02

### Changed

- add comprehensive tests for logger (e4d1045)
- add comprehensive tests for changelog-generator (d2f130a)
- add comprehensive tests for version-utils (075b45c)
- add initial git-operations tests (WIP) (48081f3)
- format generated files after release (e6019b5)

## [1.9.0] - 2025-07-01

### Added

- implement enhanced error system with actionable suggestions (729f087)
- add enhanced error system for better developer experience (bff19f7)

### Changed

- regenerate documentation with enhanced error reference (c8b629b)
- add helpful links to README and create scheduled actions feature request (a4d3dc5)
- remove redundant badge section from README (87bf00e)
- add comprehensive documentation for additionalExports feature (581fae7)
- format generated files after release (1f7b891)

## [1.8.0] - 2025-07-01

### Added

- add additionalExports and extend options for version files (8911d5b)

### Changed

- fix formatting and lint issues (00ded67)
- format generated files after release (0fce404)

### Fixed

- improve template validation to avoid false positives (ca77022)

## [1.7.3] - 2025-07-01

### Changed

- format generated files after release (770d5e9)

### Fixed

- resolve linting errors preventing JSR publish (7c095b0)

## [1.7.2] - 2025-07-01

### Changed

- add missing DevSkim suppression for test SHA (8af84ba)
- add DevSkim suppressions for false positives (75f6d26)
- exclude generated docs from CodeQL scanning (3d9fc92)
- format generated files after release (d0fc09e)

### Fixed

- correct DevSkim suppression comment placement (8ed81ff)
- address high-severity CodeQL security alerts (2fad58b)

## [1.7.1] - 2025-07-01

### Fixed

- use safe filter for numeric version components in templates (30ee84c)
- correct syntax error in version.ts after v1.7.0 release (92389a4)

## [1.7.0] - 2025-07-01

### Added

- add Microsoft DevSkim security linter workflow (ed7b90e)

### Fixed

- add backtick to forbidden characters in git ref validation (9137670)
- exclude test files and docs from secret scanning (e5348e4)
- correct shell quoting in security workflow grep command (6e92231)
- resolve linting errors in security code (19bc7b8)
- correct syntax error in version.ts patch value (b762e82)

## [1.6.0] - 2025-07-01

### Added

- add comprehensive GitHub security integrations (1bdce57)
- implement comprehensive security enhancements (e105e6b)

### Changed

- move GitHub security guide to plans and expand security feature docs (71a5d81)
- clarify security roadmap and SAST/DAST status (c703327)
- update code of conduct (62c81ff)
- rename programming paradigm file (d94b38b)
- claude settings (b0643c1)
- add CODE_OF_CONDUCT.md and update SECURITY.md (a115d1b)
- format generated files after release (e8299e7)

## [1.5.6] - 2025-07-01

### Changed

- add comprehensive Vento template engine documentation (966cc95)

## [1.5.5] - 2025-07-01

### Changed

- format generated files after release (0e29070)

### Fixed

- correct Vento filter pipe syntax in templates (281616d)
- replace any type with TemplateData in updateFn (44880d6)

## [1.5.4] - 2025-06-30

### Changed

- format generated files after release (1360095)

### Fixed

- handle null prerelease in TypeScript template (ea39e22)
- correct updateFn signature and template issues (24953d0)

## [1.5.3] - 2025-06-30

### Changed

- format CHANGELOG.md after release (8b4c94e)

### Fixed

- add missing commas to TypeScript template and document updateFn pattern (9443b16)
- correct mod.ts pattern replacement and version.ts template issues (78bd005)

## [1.5.2] - 2025-06-30

### Changed

- format CHANGELOG.md after release (826c256)

### Fixed

- correct mod.ts version pattern in nagare.config.ts (047df1e)
- correct version.ts template output and update mod.ts version (0deff1d)

## [1.5.1] - 2025-06-30

### Changed

- format CHANGELOG.md and version.ts (2704e26)
- add programming paradigm documentation and guidance (40e94a2)

## [1.5.0] - 2025-06-30

### Added

- add JSR badges to README (fe8aa28)

### Changed

- clean up post-release changes (0cf5ae1)
- restore public API documentation (27 symbols) (122564a)
- use full project name in documentation title (7bcdd5f)
- regenerate documentation for v1.4.1 (e9967e5)

## [1.4.1] - 2025-06-30

### Fixed

- use proper Vento JavaScript expression syntax (915191d)
- use proper Vento syntax in TypeScript template (33f9d4b)
- repair version.ts syntax errors and improve template robustness (a0c1fd3)

## [1.4.0] - 2025-06-30

### Added

- integrate documentation enhancement into release process (b62eb55)

### Fixed

- fix documentation styling and table rendering (e879566)
- handle undefined values in TypeScript template (ca7d2c1)

## [1.3.0] - 2025-06-30

### Added

- implement comprehensive OWASP security improvements (90d984f)

### Changed

- add comprehensive security documentation (aca639d)
- add OWASP directives (e26e6a2)
- format generated files after release (5dbcd79)

### Fixed

- relax template validation for built-in templates (816c614)
- add --allow-env flag to nagare tasks for NODE_ENV access (d912a70)
- add CSS support for all_symbols.html (705b602)
- complete documentation styling fixes (f9be516)
- comprehensive documentation improvements (5ce3885)
- additional documentation rendering fixes (dce7d0e)
- remove unsupported caption tags from JSDoc examples (7caab51)

## [1.2.2] - 2025-06-30

### Changed

- enhance documentation with scenarios and custom styling (29a4c1c)
- enhance mod.ts with comprehensive JSDoc documentation (9c732bf)
- format generated files after release (fbe0ca9)

## [1.2.1] - 2025-06-30

### Changed

- remove non-functional echo pattern from CLI setup options (29274c5)
- format generated files after release (a2415fb)

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
