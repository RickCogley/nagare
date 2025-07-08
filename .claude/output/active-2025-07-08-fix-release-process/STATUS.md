# Fix Nagare Release Process - Status

## Overview

Fixing the critical issue where every release fails due to formatting/linting issues discovered
AFTER tags are created.

## Current Status: IMPLEMENTATION

Implementing the pre-flight validation and retry mechanism.

## Problem Summary

- Tags created before validation
- Formatting issues discovered in CI after tag exists
- Manual tag deletion/recreation required
- Same files repeatedly fail (deno.json, CHANGELOG.md)

## Solution Approach

1. Pre-flight validation before ANY git operations
2. Auto-format after file updates
3. Only create tags if 100% clean
4. Add release:retry command for recovery

## Progress

- [x] Read and analyze the problem report
- [x] Create Shape Up pitch
- [x] Implement pre-flight validation (performPreflightChecks)
- [x] Add auto-formatting step (formatChangedFiles)
- [x] Modify release flow to validate BEFORE creating tags
- [x] Add retry mechanism (nagare retry command)
- [ ] Add CI environment validation
- [ ] Test the new process

## Completed Features

### Pre-flight Validation

- Added performPreflightChecks() that runs format, lint, type check, and tests
- Shows clear progress indicators and error summaries
- Supports auto-fix for formatting issues
- Configurable test execution

### Auto-formatting

- formatChangedFiles() runs `deno fmt` after file updates
- Ensures consistent formatting before committing
- Non-blocking warnings if formatting fails

### Retry Command

- New `nagare retry [version]` command
- Automatically detects last tag if version not provided
- Deletes local and remote tags
- Pulls latest changes
- Re-runs release process

## Next Steps

1. Add CI environment validation warnings
2. Test the new release process with a real release
3. Update documentation

## Notes

- This is a CRITICAL fix - every release currently fails
- 2-week appetite due to importance
- Must maintain backward compatibility
