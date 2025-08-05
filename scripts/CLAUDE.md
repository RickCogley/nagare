# /scripts Directory - Development and Utility Scripts

## Purpose

This directory contains development scripts, build tools, and utilities that support Nagare development but are not part
of the distributed package. These scripts automate common development tasks and maintain code quality.

## Key Scripts

### Build and Release

- **build.ts** - Build orchestration script
  - Compiles TypeScript files
  - Bundles for distribution
  - Generates type definitions
  - Prepares release artifacts

- **release.ts** - Dogfooding Nagare's own releases
  - Uses Nagare to release Nagare
  - Pre-release validation
  - JSR publishing automation
  - NPM publishing preparation

### Development Tools

- **dev.ts** - Development environment setup
  - Watches file changes
  - Runs tests automatically
  - Starts development server
  - Live reload functionality

- **format.ts** - Code formatting automation
  - Runs deno fmt with project settings
  - Formats TypeScript, JSON, Markdown
  - Pre-commit formatting checks
  - Import sorting

### Quality Assurance

- **lint.ts** - Extended linting beyond deno lint
  - Custom lint rules
  - Security checks
  - Complexity analysis
  - Dead code detection

- **check-types.ts** - Type checking script
  - Runs deno check on all TypeScript
  - Validates type exports
  - Checks for any types
  - Ensures strict mode compliance

- **coverage.ts** - Test coverage reporting
  - Generates coverage reports
  - Checks coverage thresholds
  - Creates HTML reports
  - Identifies untested code

### Maintenance Scripts

- **update-deps.ts** - Dependency management
  - Updates Deno dependencies
  - Checks for security updates
  - Validates compatibility
  - Updates import maps

- **clean.ts** - Cleanup utility
  - Removes build artifacts
  - Cleans test coverage data
  - Resets development state
  - Purges cache files

- **sync-versions.ts** - Version synchronization
  - Ensures version consistency
  - Updates all version references
  - Validates version formats
  - Prepares for release

### Security Scripts

- **security-scan.ts** - Security analysis
  - OWASP compliance checks
  - Dependency vulnerability scanning
  - Code security patterns
  - License compliance

- **audit-permissions.ts** - Deno permission audit
  - Lists required permissions
  - Validates permission usage
  - Suggests permission reductions
  - Documents permission needs

### Documentation Scripts

- **generate-docs.ts** - Documentation generation
  - API documentation from JSDoc
  - README updates
  - Example generation
  - Command reference creation

- **validate-examples.ts** - Example code validation
  - Tests all example code
  - Ensures examples work
  - Updates example outputs
  - Validates against current API

## Script Patterns

### Common Structure

```typescript
// scripts/example.ts
import { parseArgs } from "@std/cli/parse-args";
import { logger } from "../src/logger.ts";

async function main() {
  const args = parseArgs(Deno.args);

  try {
    // Script logic here
    logger.info("Task completed");
  } catch (error) {
    logger.error("Task failed", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
```

### Error Handling

- All scripts use try-catch blocks
- Proper exit codes (0 success, 1 error)
- Meaningful error messages
- Stack traces in debug mode

### Logging

- Uses Nagare's logger for consistency
- Respects --log-level flag
- Structured log output
- Progress indicators for long tasks

## Development Workflows

### Pre-commit Workflow

```bash
deno run -A scripts/format.ts
deno run -A scripts/lint.ts
deno run -A scripts/check-types.ts
deno test
```

### Release Preparation

```bash
deno run -A scripts/sync-versions.ts
deno run -A scripts/security-scan.ts
deno run -A scripts/build.ts
deno run -A scripts/release.ts
```

### Daily Development

```bash
# Start dev mode
deno run -A scripts/dev.ts

# In another terminal, run specific tasks
deno run -A scripts/update-deps.ts
```

## Script Configuration

### Shared Config

Scripts read from common configuration:

- `deno.json` for formatter/linter settings
- `nagare.config.ts` for project settings
- Environment variables for credentials

### Permission Requirements

Most scripts need extensive permissions:

```typescript
// Typical script permissions
--allow - read; // Read project files
--allow - write; // Write generated files
--allow - run; // Execute git, deno commands
--allow - net; // Fetch dependencies
--allow - env; // Read environment variables
```

## CI/CD Integration

### GitHub Actions Usage

```yaml
- name: Run security scan
  run: deno run -A scripts/security-scan.ts

- name: Generate coverage
  run: deno run -A scripts/coverage.ts
```

### Local vs CI Behavior

Scripts detect CI environment:

- Adjust output formatting
- Skip interactive prompts
- Generate machine-readable reports
- Fail fast on errors

## Adding New Scripts

### Script Template

```typescript
#!/usr/bin/env -S deno run -A
/**
 * @fileoverview Brief description
 * @module scripts/new-script
 */

import { parseArgs } from "@std/cli/parse-args";

const args = parseArgs(Deno.args, {
  boolean: ["help", "dry-run"],
  string: ["output"],
  default: {
    output: "./output",
  },
});

if (args.help) {
  console.log(`
Usage: deno run -A scripts/new-script.ts [options]

Options:
  --help        Show this help
  --dry-run     Preview without changes
  --output      Output directory
  `);
  Deno.exit(0);
}

// Script implementation
```

### Best Practices

1. **Single Purpose** - Each script does one thing well
2. **Idempotent** - Running twice produces same result
3. **Documented** - Clear help text and comments
4. **Tested** - Scripts have their own tests
5. **Secure** - Validate all inputs, limit permissions

## Common Issues

### Permission Errors

- Use `-A` flag during development
- Document minimal permissions needed
- Test with restricted permissions

### Path Resolution

- Use import.meta.url for script location
- Resolve paths relative to project root
- Handle both local and CI environments

### Cross-Platform

- Test on macOS, Linux, Windows
- Use Deno's path utilities
- Avoid shell-specific commands

When creating scripts:

1. Start with minimal functionality
2. Add proper error handling
3. Include help documentation
4. Test in CI environment
5. Document permission requirements
