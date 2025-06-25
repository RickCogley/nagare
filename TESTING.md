# Testing Nagare

This document provides comprehensive testing guidelines for Nagare development and usage validation.

## 🧪 Testing Overview

Nagare uses a multi-phase testing approach:

1. **Static Analysis** - TypeScript compilation and linting
2. **Unit Tests** - Individual component testing (planned)
3. **Integration Tests** - Full workflow testing
4. **Manual Testing** - CLI and configuration validation
5. **Self-Testing** - Using Nagare to release itself

## 📋 Quick Testing Checklist

```bash
# Basic validation
☐ deno check **/*.ts       # TypeScript compilation
☐ deno lint                # Code quality
☐ deno fmt --check         # Code formatting

# CLI functionality  
☐ deno task release --help # Help display
☐ deno task release:dry    # Dry run test

# Real functionality
☐ deno task release minor  # Actual release
☐ deno task rollback       # Rollback test
```

## 🔧 Environment Setup

### Prerequisites

Ensure you have the required tools installed:

```bash
# Check Deno version (1.40+ required)
deno --version

# Check Git configuration
git config user.name
git config user.email

# Optional: GitHub CLI for releases
gh --version
```

### Project Setup

```bash
# Clone and setup
git clone https://github.com/RickCogley/nagare.git
cd nagare

# Verify basic structure
ls -la src/
cat nagare.config.ts
```

## 🏗️ Phase 1: Static Analysis

Test that the codebase is structurally sound:

### TypeScript Compilation

```bash
# Check all TypeScript files compile
deno check **/*.ts

# Expected: No compilation errors
# If errors occur, fix type issues before proceeding
```

### Code Quality

```bash
# Run linting
deno lint

# Run formatting check
deno fmt --check

# Fix any issues
deno fmt  # Auto-fix formatting
```

### Import Validation

```bash
# Test that main exports work
deno run --allow-read -e "
import { ReleaseManager } from './mod.ts';
console.log('✅ Imports working');
"
```

## 🎛️ Phase 2: CLI Interface Testing

### Help and Version Commands

```bash
# Test help display
deno run --allow-read cli.ts --help
# Expected: Complete help text with examples

# Test version display  
deno run --allow-read cli.ts --version
# Expected: Version number (e.g., "Nagare v1.0.0-dev")
```

### Configuration Loading

```bash
# Test config file loading
deno run --allow-read cli.ts --dry-run release
# Expected: Loads nagare.config.ts without errors

# Test custom config path
deno run --allow-read cli.ts --config ./test-config.ts --dry-run
# Expected: Loads specified config file
```

### Configuration Validation

```bash
# Test with invalid config (for error handling)
echo 'export default { invalid: true };' > invalid-config.ts
deno run --allow-read cli.ts --config ./invalid-config.ts --dry-run
# Expected: Clear validation error messages
rm invalid-config.ts
```

## 🔄 Phase 3: Release Process Testing

### Setup Test Environment

Create a minimal test setup:

```bash
# Ensure you have a version file
cat > version.ts << 'EOF'
export const VERSION = "0.1.0";
export const BUILD_INFO = {
  buildDate: "2025-01-01T00:00:00.000Z",
  gitCommit: "initial",
  buildEnvironment: "development"
} as const;
export const RELEASE_NOTES = {
  version: "0.1.0",
  releaseDate: "2025-01-01", 
  changes: { added: [], improved: [], removed: [], fixed: [], security: [] }
} as const;
EOF

# Commit any pending changes
git add version.ts
git commit -m "test: add initial version file for testing"
```

### Dry Run Testing

```bash
# Test automatic version detection
deno task release:dry
# Expected: Shows calculated version bump based on commits

# Test manual version bumps
deno task release:dry patch  # 0.1.0 → 0.1.1
deno task release:dry minor  # 0.1.0 → 0.2.0  
deno task release:dry major  # 0.1.0 → 1.0.0

# Verify dry run makes no changes
git status
# Expected: No modified files
```

### Release Notes Preview

```bash
# Test release notes generation
deno task release:dry minor
# Expected output should include:
# - Current version detection
# - New version calculation
# - Release notes preview with categorized commits
# - Files that would be updated
```

### Commit History Analysis

```bash
# Check that conventional commits are parsed correctly
git log --oneline -10

# Run dry run and verify commits are categorized properly
deno task release:dry
# Expected: Commits grouped by type (feat→added, fix→fixed, etc.)
```

## 🚀 Phase 4: Actual Release Testing

**⚠️ Warning: This creates real git commits and tags**

### Pre-Release Validation

```bash
# Ensure clean working directory
git status
# Expected: No uncommitted changes

# Verify git user configuration
git config user.name && git config user.email
# Expected: Both should return valid values
```

### First Release

```bash
# Create first real release
deno task release minor

# Expected behavior:
# 1. Analyzes commits since last tag (or all if no tags)
# 2. Calculates new version (e.g., 0.1.0 → 0.2.0)
# 3. Updates version.ts with new version and metadata
# 4. Updates/creates CHANGELOG.md
# 5. Creates git commit with message "chore(release): bump version to X.X.X"
# 6. Creates git tag "vX.X.X"
# 7. Creates GitHub release (if gh CLI configured)
```

### Post-Release Verification

```bash
# Check version file was updated
grep VERSION version.ts
# Expected: New version number

# Check changelog was created/updated
head -20 CHANGELOG.md
# Expected: New entry with current date and changes

# Check git tag was created
git tag -l
# Expected: New tag like "v0.2.0"

# Check latest commit
git log -1 --oneline
# Expected: Commit message like "chore(release): bump version to 0.2.0"
```

## 🔙 Phase 5: Rollback Testing

### Test Rollback Functionality

```bash
# Test rollback of the release we just made
deno task rollback

# Expected behavior:
# 1. Detects last commit was a release
# 2. Prompts for confirmation
# 3. Removes local git tag
# 4. Resets to previous commit (removes release commit)
# 5. Optionally removes remote tag
```

### Verify Rollback

```bash
# Check that tag was removed
git tag -l
# Expected: Release tag should be gone

# Check that release commit was removed
git log -1 --oneline
# Expected: Should be back to pre-release commit

# Check version file is restored
grep VERSION version.ts
# Expected: Back to previous version
```

## 🔍 Phase 6: Error Scenarios

### Test Error Handling

```bash
# Test with uncommitted changes
echo "test" >> test-file.txt
deno task release:dry
# Expected: Error about uncommitted changes
git checkout -- test-file.txt

# Test with invalid version file
mv version.ts version.ts.bak
echo 'invalid content' > version.ts
deno task release:dry
# Expected: Error about version parsing
mv version.ts.bak version.ts

# Test without git repository
cd /tmp && mkdir test-nogit && cd test-nogit
deno run --allow-read --allow-write --allow-run path/to/nagare/cli.ts --dry-run
# Expected: Error about not being in git repository
cd - && rm -rf /tmp/test-nogit
```

## 🧪 Phase 7: Integration Testing

### Test with Different Project Structures

```bash
# Create test project in different directory
mkdir ../test-nagare-integration
cd ../test-nagare-integration
git init

# Create minimal config
cat > nagare.config.ts << 'EOF'
import type { NagareConfig } from '../nagare/types.ts';
export default {
  project: { name: 'Test', repository: 'https://github.com/test/test' },
  versionFile: { path: './version.json', template: 'json' }
} as NagareConfig;
EOF

# Test with JSON version file
echo '{"version":"1.0.0"}' > version.json
git add . && git commit -m "feat: initial test project"

# Test release from external project
deno run --allow-all ../nagare/cli.ts --dry-run
cd ../nagare
```

### Test Configuration Variations

```bash
# Test different template formats
# Test custom templates
# Test file update patterns
# Test documentation generation
```

## 📊 Performance Testing

### Large Repository Testing

```bash
# Test with many commits (if available)
# Measure performance with git log parsing
time deno task release:dry

# Expected: Should complete in reasonable time (< 10 seconds)
```

## 🔧 Troubleshooting Guide

### Common Issues

| Issue | Symptoms | Solution |
|-------|----------|----------|
| **Import errors** | Module not found | Check file paths and imports |
| **Permission denied** | Deno permission error | Add required --allow-* flags |
| **Git not configured** | Git user.name/email missing | Run `git config --global user.*` |
| **Version parsing fails** | Cannot find version | Check version.ts format |
| **GitHub CLI missing** | gh command not found | Install with `brew install gh` |

### Debug Mode

```bash
# Run with debug logging
deno task release --log-level DEBUG --dry-run

# Expected: Detailed operation logs
```

### Manual Verification Steps

```bash
# Check specific components
deno run --allow-read -e "
import { GitOperations } from './src/git-operations.ts';
import { VersionUtils } from './src/version-utils.ts';
console.log('✅ Core classes import successfully');
"
```

## 🚀 Publishing Testing

### JSR Publishing Preparation

```bash
# Test JSR configuration
cat > jsr.json << 'EOF'
{
  "name": "@rick/nagare",
  "version": "1.0.0",
  "exports": {
    ".": "./mod.ts",
    "./cli": "./cli.ts"
  }
}
EOF

# Validate JSR config
deno run --allow-read -e "
const config = JSON.parse(await Deno.readTextFile('./jsr.json'));
console.log('✅ JSR config valid:', config.name);
"
```

## 📋 Testing Completion Checklist

### Before First Release
- [ ] All static analysis passes
- [ ] CLI help and version work
- [ ] Configuration loads correctly
- [ ] Dry run shows expected behavior
- [ ] Error scenarios handled gracefully

### Before Publishing
- [ ] Actual release works end-to-end
- [ ] Rollback functionality works
- [ ] GitHub integration works (if configured)
- [ ] Different configuration options tested
- [ ] Performance is acceptable

### Before Production Use
- [ ] Integration testing with real projects
- [ ] Documentation is complete and accurate
- [ ] All edge cases considered
- [ ] Community feedback incorporated

## 📝 Reporting Issues

If you find issues during testing:

1. **Document the exact steps** to reproduce
2. **Include error messages** and logs
3. **Note your environment** (Deno version, OS, etc.)
4. **Open an issue** on GitHub with details
5. **Include configuration** (redacted if sensitive)

## 🎯 Continuous Testing

### Pre-commit Testing

Add to your workflow:
```bash
#!/bin/bash
# .git/hooks/pre-commit
deno check **/*.ts && deno lint && deno fmt --check
```

### Automated Testing

Future: GitHub Actions for automated testing on PRs and releases.

---

**Happy Testing! 🧪**

Remember: Thorough testing now prevents headaches later. Each phase builds confidence in Nagare's reliability.