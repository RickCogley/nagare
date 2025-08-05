# /src Directory - Core Nagare Implementation

## Purpose

This directory contains the core implementation of Nagare's release management functionality. Each
module follows SOLID principles and maintains clear separation of concerns.

## Key Components

### Release Orchestration

- **release-manager.ts** - Central orchestrator for the entire release process
  - Coordinates all release steps (validate → version → update → commit → tag → publish)
  - Implements the main release flow with rollback capabilities
  - Manages dry-run mode and confirmation prompts

### File Management

- **file-handlers.ts** - Intelligent file update system
  - Detects file types (JSON, YAML, TOML, TypeScript, etc.)
  - Applies appropriate update patterns for each file type
  - Handles version string replacements with regex patterns
  - Maintains file integrity during updates

### Version Control

- **git-operations.ts** - Git command execution and version analysis
  - Analyzes conventional commits to determine version bumps
  - Executes git commands (add, commit, tag, push)
  - Provides rollback functionality
  - Validates repository state before operations

### GitHub Integration

- **github-integration.ts** - GitHub release creation via gh CLI
  - Creates GitHub releases with generated changelogs
  - Manages draft/prerelease states
  - Handles authentication through gh CLI
  - Supports custom release configurations

### Template Processing

- **template-processor.ts** - Vento template engine integration
  - Processes changelog and version file templates
  - Provides secure template sandboxing
  - Supports custom template variables
  - Handles template caching for performance

### Configuration

- **config.ts** - Configuration management and validation
  - Loads and validates nagare.config.ts files
  - Merges user config with defaults
  - Type-safe configuration schema
  - Environment variable support

### Utilities

- **logger.ts** - Structured logging with levels and colors
  - Supports DEBUG, INFO, WARN, ERROR levels
  - Pretty console output with Unicode symbols
  - JSON output mode for CI environments

- **i18n.ts** - Internationalization support (English/Japanese)
  - Runtime language switching
  - Type-safe translation keys
  - Fallback to English for missing translations

- **security-utils.ts** - OWASP-compliant security utilities
  - Input validation and sanitization
  - Path traversal prevention
  - Command injection protection
  - Secure template variable handling

- **auto-fixer.ts** - AI-powered error resolution
  - Integrates with Claude Code and GitHub Copilot
  - Suggests fixes for common CI/CD errors
  - Optional feature for automated troubleshooting

- **version-utils.ts** - Semantic versioning utilities
  - Parses and validates version strings
  - Increments versions (major, minor, patch)
  - Handles prerelease versions
  - Compares version precedence

## Component Interactions

```
User Input → CLI → Release Manager
                    ↓
              Git Operations ← → File Handlers
                    ↓              ↓
              Template Processor   Config
                    ↓
              GitHub Integration
                    ↓
              Release Complete
```

## Key Patterns

### Error Handling

- All functions use Result<T, E> pattern for error handling
- Errors bubble up with context through the call stack
- User-friendly error messages with suggestions

### Type Safety

- Strict TypeScript with no 'any' types
- Zod schemas for runtime validation
- Type guards for external data

### Security First

- All user inputs sanitized (OWASP A03)
- Template sandboxing prevents code injection
- Path operations validated against traversal
- Sensitive data never logged

### Async Operations

- All I/O operations are async
- Proper error handling for async functions
- Progress indicators for long operations

## Testing Approach

- Unit tests for individual components
- Integration tests for workflows
- Mock git and filesystem operations
- Security-focused test cases

## Marine Theme Integration

The ocean metaphor flows through the codebase:

- Release process described as "waves" 🌊
- Rollback described as "ebbing tide"
- Success messages use marine emojis
- Error recovery uses "calm seas" metaphors

## Dependencies

- Deno standard library for core utilities
- Zod for schema validation
- Vento for template processing
- Chalk for terminal colors (via Deno)

When working in this directory, remember:

1. Maintain SOLID principles
2. Follow OWASP security guidelines
3. Keep functions small and focused
4. Add tests for new functionality
5. Update types when changing interfaces
