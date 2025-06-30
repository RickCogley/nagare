# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Security & Compliance Standards

### OWASP Top 10 Verification Required

Before suggesting or implementing any code changes, verify against current OWASP Top 10:

#### A01 - Broken Access Control

- Validate all authorization checks in CLI commands and file operations
- Implement principle of least privilege for file system access
- Check for direct object references in configuration handling

#### A02 - Cryptographic Failures

- Use strong, up-to-date encryption algorithms for any sensitive data
- Properly manage secrets and API keys (GitHub tokens, etc.)
- Validate SSL/TLS implementations in GitHub API calls

#### A03 - Injection

- Use parameterized operations for all git commands and file system operations
- Validate and sanitize all user inputs from CLI arguments and config files
- Implement proper output encoding for template processing

#### A04 - Insecure Design

- Review architecture for security flaws in release management workflow
- Implement secure design patterns for file handling and git operations
- Consider threat modeling implications for CI/CD integration

#### A05 - Security Misconfiguration

- Check default configurations in `nagare.config.ts`
- Ensure proper error handling (no sensitive data exposure in logs)
- Validate security headers and settings for documentation server

#### A06 - Vulnerable Components

- Audit all Deno dependencies for known vulnerabilities
- Keep libraries and frameworks updated (especially git and GitHub CLI)
- Document component security status in dependency updates

#### A07 - Authentication Failures

- Implement proper GitHub authentication handling
- Use strong authentication mechanisms for GitHub API
- Protect against unauthorized release operations

#### A08 - Software/Data Integrity Failures

- Validate data integrity in version updates and changelog generation
- Use secure update mechanisms for file modifications
- Implement proper CI/CD security for release pipeline

#### A09 - Logging/Monitoring Failures

- Log security-relevant events in release operations
- Implement proper monitoring for unauthorized changes
- Ensure logs don't contain sensitive data (tokens, credentials)

#### A10 - Server-Side Request Forgery (SSRF)

- Validate all external requests to GitHub API
- Implement proper URL validation for template processing
- Use allowlists for external resources in documentation

### ISO 27001 Compliance Notes

- Document all security decisions in commit messages
- Maintain audit trail for all release operations
- Ensure security reviews for all file handler modifications
- Flag any potential compliance issues immediately

### Security Review Process

When reviewing or suggesting code changes:

1. **Security First**: Always perform OWASP Top 10 assessment before any other suggestions
2. **Flag Issues**: Explicitly call out any potential OWASP violations
3. **Suggest Mitigations**: Provide specific remediation steps for identified risks
4. **Document Decisions**: Include security rationale in comments
5. **Compliance Check**: Note any ISO 27001 implications

### Required Security Checks

For every code change, verify:

- Input validation and sanitization (especially CLI args and config files)
- Authentication and authorization (GitHub API access)
- Secure data handling (version info, changelog data)
- Error handling (no information disclosure in error messages)
- Dependency security status (Deno modules)
- Logging of security events (release operations, file modifications)

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

1. **Security Testing**: When adding features, create corresponding security tests alongside
   functional tests
2. **File Updates**: Always use line-anchored regex patterns to prevent corruption and validate
   inputs
3. **Error Handling**: Provide actionable error messages with suggestions (no sensitive data
   exposure)
4. **Git State**: Many operations require clean git state - validate early and log security events
5. **Self-Hosting**: This project manages its own releases - be careful with version.ts changes
6. **Pre-flight**: Always run `deno fmt`, `deno check **/*.ts`, `deno lint`, `deno test` before
   staging a commit
7. **Attribution**: Don't add "Generated with Claude Code" or "Co-Authored-By: Claude" to commit
   messages or PRs. The fact that CLAUDE.md is present, makes it obvious that Claude is being used
8. **Git Commits**: Use "conventional commits" style to make commit messages, including sufficient
   detail so that a person reading in the future, will be able to understand what the commit was.
   **InfoSec Impact**: Include an InfoSec comment in commit messages when changes have security
   implications. Format: "InfoSec: [brief description of security impact/consideration]"

   Examples:
   - `feat: add input validation to CLI args\n\nInfoSec: Prevents injection attacks through command line parameters`
   - `fix: update GitHub API token handling\n\nInfoSec: Improves credential security and reduces token exposure risk`
   - `refactor: simplify file processing logic\n\nInfoSec: No security impact - code organization only`
   - `docs: update README installation steps` (no InfoSec comment needed)
9. **Documentation Updates**: After functionality is added, update the markdown documentation
   accordingly
10. **Git Merging**: When merging master changes to an active branch, make sure both branches are
    pulled and up to date first
11. **Security Documentation**: Document all security-related decisions and their rationale for ISO
    27001 compliance
