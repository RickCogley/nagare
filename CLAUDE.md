# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development Tasks
```bash
# Testing
deno task test              # Run all tests
deno task test:watch        # Run tests in watch mode with --watch
deno test path/to/test.ts   # Run a single test file

# Code Quality
deno task lint              # Run linter
deno task fmt               # Format code
deno task check             # Type check all TypeScript files
deno task build             # Full validation (check + test + lint + fmt check)

# Development
deno task dev               # Run with watch mode on examples/test.ts

# Documentation
deno task docs              # Generate HTML documentation
deno task docs:serve        # Serve docs on http://localhost:8080

# Release Management (self-hosting)
deno task nagare            # Run release process
deno task nagare:dry        # Preview release changes
deno task nagare:patch      # Force patch release
deno task nagare:minor      # Force minor release
deno task nagare:major      # Force major release
deno task nagare:rollback   # Rollback a release
```

### Testing Single Files
```bash
deno test --allow-all path/to/file_test.ts
```

## High-Level Architecture

### Core Components and Interactions

1. **Release Flow Architecture**:
   - `cli.ts` → `ReleaseManager` → orchestrates the entire release process
   - `GitOperations` → interfaces with git for commits, tags, and history
   - `VersionUtils` → calculates semantic version bumps from conventional commits
   - `ChangelogGenerator` → creates CHANGELOG.md entries in Keep a Changelog format
   - `FileHandlerManager` → intelligently updates version references in files
   - `TemplateProcessor` → processes Vento templates for custom file formats
   - `GitHubIntegration` → creates GitHub releases via `gh` CLI

2. **Key Design Patterns**:
   - **Manager Pattern**: `-manager` suffix classes orchestrate complex workflows
   - **Operations Pattern**: `-operations` suffix for direct system interfaces
   - **Dependency Injection**: Configuration drives behavior throughout
   - **Fail-Fast Validation**: Early validation with descriptive errors
   - **Type Safety**: Comprehensive TypeScript interfaces in `types.ts`

3. **Configuration System**:
   - `nagare.config.ts` defines project-specific release configuration
   - Built-in file handlers for common patterns (deno.json, package.json, README.md)
   - Custom update functions for complex file modifications
   - Template support via Vento for variable substitution

4. **Conventional Commits Integration**:
   - `feat:` → Minor version bump
   - `fix:` → Patch version bump
   - `BREAKING CHANGE:` or `!` → Major version bump
   - Other types (docs, style, refactor) → Patch version bump

### Important Cross-File Patterns

1. **Version Update Flow**:
   - `ReleaseManager` determines new version
   - `FileHandlerManager` detects file types and applies appropriate handlers
   - Built-in handlers use safe regex patterns with line anchors
   - Custom handlers can be defined in configuration

2. **Template Processing**:
   - `TemplateProcessor` uses Vento engine
   - Templates receive `TemplateData` with version info and metadata
   - Built-in templates: TypeScript, JSON, YAML, Text
   - Custom templates supported via configuration

3. **Rollback Architecture**:
   - `RollbackManager` reverses releases by version or tag
   - Restores previous file states from git history
   - Removes tags and optionally GitHub releases
   - Maintains git history integrity

### Code Style Requirements

- **Formatting**: 2 spaces, double quotes, semicolons required, 100 char line width
- **File Naming**: Kebab-case with descriptive suffixes (e.g., `release-manager.ts`)
- **Class Naming**: PascalCase with semantic suffixes (e.g., `ReleaseManager`)
- **Strict TypeScript**: All strict checks enabled, no implicit any
- **Comments**: Avoid unless necessary for complex logic

### Critical Development Notes

1. **Testing**: Currently minimal test coverage. When adding features, create corresponding tests
2. **File Updates**: Always use line-anchored regex patterns to prevent corruption
3. **Error Handling**: Provide actionable error messages with suggestions
4. **Git State**: Many operations require clean git state - validate early
5. **Self-Hosting**: This project manages its own releases - be careful with version.ts changes