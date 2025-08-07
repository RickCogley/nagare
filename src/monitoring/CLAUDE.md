# Monitoring Module

## Purpose

Error analysis, monitoring, and automated recovery. Provides intelligent error parsing, auto-fixing capabilities, and
publication verification.

## Key Components

- **log-parser.ts** - Parse and categorize CI/CD error logs
- **auto-fixer.ts** - AI-powered and deterministic error fixes
- **jsr-verifier.ts** - Verify JSR package publication
- **error-reference.ts** - Comprehensive error code documentation

## Key Features

### Log Parser

- Parses CI/CD logs to identify error types
- Categorizes errors (lint, format, test, security, etc.)
- Extracts actionable information
- Supports GitHub Actions, GitLab CI, etc.

Error types detected:

- Linting errors (ESLint, deno lint)
- Formatting issues (Prettier, deno fmt)
- Type checking failures
- Test failures
- Security scan results
- Version conflicts

### Auto-Fixer

Provides two levels of fixes:

**Basic Fixes** (Deterministic):

- Run formatters with --fix flag
- Update version numbers for conflicts
- Retry transient network failures
- Fix common configuration issues

**AI-Powered Fixes** (Optional):

- Integrates with Claude Code or GitHub Copilot
- Analyzes complex error patterns
- Suggests code changes
- Can auto-apply fixes with approval

Configuration:

```typescript
autoFix: {
  basic: true,
  ai: {
    enabled: true,
    provider: "claude-code",
    thinkingLevel: "megathink"
  }
}
```

### JSR Verifier

- Polls JSR API to verify publication
- Handles rate limiting gracefully
- Configurable timeout and retry
- Direct API calls (no web scraping)

Verification flow:

1. Wait for grace period (CDN propagation)
2. Poll JSR API for package
3. Verify version matches
4. Confirm package is downloadable

### Error Reference

Comprehensive error documentation:

- Error codes with descriptions
- Common causes
- Suggested fixes
- Prevention strategies

Error code format:

- `GIT_*` - Git-related errors
- `FILE_*` - File operation errors
- `GITHUB_*` - GitHub integration errors
- `SECURITY_*` - Security validation errors
- `CONFIG_*` - Configuration errors

## Integration

### With Release Manager

- Auto-fix runs on preflight check failures
- Monitors GitHub Actions during release
- Verifies JSR publication after push

### With CI/CD

- Parses workflow logs
- Identifies failure points
- Suggests or applies fixes
- Can retry failed steps

## Security Considerations

- AI fixes are sandboxed
- No automatic execution without approval
- Sensitive data scrubbed from logs
- Rate limiting respected

## Usage Pattern

```typescript
import { AutoFixer } from "../monitoring/auto-fixer.ts";
import { LogParser } from "../monitoring/log-parser.ts";
import { JsrVerifier } from "../monitoring/jsr-verifier.ts";

// Parse errors from CI logs
const parser = new LogParser();
const errors = await parser.parseGitHubActions(logContent);

// Attempt fixes
const fixer = new AutoFixer(config);
const fixResult = await fixer.fix(errors);

// Verify publication
const verifier = new JsrVerifier(config);
const published = await verifier.waitForPublication(version);
```

## Testing

- Mock API responses
- Test error parsing patterns
- Verify fix safety
- Test retry logic
- Validate timeout handling
