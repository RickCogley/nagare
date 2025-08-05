# Pitch: Nagare Release Reliability Fixes

## Problem

Nagare's release process has three critical reliability issues that are causing friction and failed releases:

### 1. **Rollback Problem** (High Impact)

When releases fail after file modifications but before successful commit, the working directory is left in an inconsistent state. Files like version numbers, CHANGELOG.md, and configured update files are modified, but there's no automatic cleanup mechanism.

**Real-world impact**:

- Failed releases require manual git reset/checkout
- Risk of incomplete rollbacks leaving stale modifications
- Developer time lost on manual cleanup

### 2. **JSR Verification False Failures** (High Impact)

Successful JSR publishes are marked as failed due to race conditions between GitHub Actions completion and JSR package availability. This leads to timeouts and false error messages like "Workflow succeeded but package not found on JSR."

**Real-world impact**:

- Developers force-quit with Ctrl-C after 1-2 minutes
- Successful releases marked as failed
- Loss of confidence in the release process

### 3. **Visual Timeline Broken** (Medium Impact)

The progress indicator displays incorrectly, showing malformed output instead of the intended visual timeline during releases.

**Real-world impact**:

- Poor user experience during releases
- Difficult to track release progress
- Unprofessional appearance

## Appetite

**6 weeks** - This is a full cycle worth of reliability improvements that will significantly improve the release experience.

### Why 6 weeks?

- **Three distinct problems** each requiring careful analysis and testing
- **Critical path dependencies** - rollback mechanism affects how we handle the other failures
- **Cross-platform compatibility** - Visual timeline needs to work across different terminals
- **Comprehensive testing** - Release tooling must be bulletproof

### Raw Ideas vs. Shaped Solution

This is a **shaped solution** - we have clear problem statements, known root causes, and identified solution approaches from our codebase analysis.

## Solution

### Core Approach: Defensive Release Pipeline

Transform nagare's release process from "fail-fast" to "fail-safe" with proper cleanup and verification.

### 1. **Pre-Commit Rollback System**

- **File state backup**: Capture file states before any modifications
- **Failure point detection**: Track which stage of release failed
- **Automatic restoration**: Restore files based on failure point
- **Integration with existing RollbackManager**: Extend current post-commit rollback

**Key elements**:

- Backup mechanism before file modifications (line 579 in release-manager.ts)
- Failure detection at each stage
- Automatic cleanup on pre-commit failures
- User confirmation for restoration

### 2. **Robust JSR Verification**

- **Grace period**: 60-second mandatory delay after workflow success
- **Better verification method**: Use JSR API endpoints instead of web page URLs
- **Progressive backoff**: Reduce API pressure with increasing delays
- **Dual verification**: API + web page fallback strategy

**Key elements**:

- Replace `checkJsrPackage()` method with JSR REST API (`https://jsr.io/api/scopes/{scope}/packages/{package}`)
- Add configuration for grace periods and backoff
- Use `data.latest` field for definitive version confirmation
- Enhanced logging for verification process

### 3. **Robust Visual Timeline**

- **Terminal capability detection**: Check terminal support before rendering
- **Fallback rendering modes**: Simple text mode for unsupported terminals
- **Better error handling**: Graceful degradation when ANSI fails
- **Consistent display**: Fix concurrent rendering issues

**Key elements**:

- Terminal compatibility layer
- Multiple rendering modes (detailed, simple, minimal)
- Error recovery for display issues
- Platform-specific optimizations

## Rabbit Holes

### Things to avoid that could blow up the timeline:

1. **Over-engineering the backup system** - Don't create a full version control system, just track the files we modify
2. **JSR API deep dive** - Don't reverse-engineer JSR's internal API, use documented endpoints and CLI tools
3. **Terminal emulator compatibility matrix** - Don't try to support every terminal, focus on common ones
4. **Configuration complexity** - Don't add too many knobs, keep sensible defaults
5. **Rewriting the entire progress system** - Fix the existing one, don't start from scratch

## No-Goes

### What we won't do in this cycle:

1. **Rewrite the release manager** - We're fixing specific issues, not rebuilding
2. **Add new release strategies** - Focus on reliability, not new features
3. **Comprehensive configuration overhaul** - Minimal config changes only
4. **Performance optimization** - Reliability first, speed second
5. **New testing frameworks** - Use existing test infrastructure

## Technical Approach

### Phase 1: Rollback Infrastructure (2 weeks)

- Implement file state backup system
- Add failure point detection
- Create automatic restoration logic
- Test with various failure scenarios

### Phase 2: JSR Verification (2 weeks)

- Implement grace period after workflow success
- Switch to JSR API endpoints
- Add progressive backoff and dual verification
- Integrate jsr CLI tool findings

### Phase 3: Visual Timeline (1 week)

- Add terminal capability detection
- Implement fallback rendering modes
- Fix concurrent rendering issues
- Test across different terminal types

### Phase 4: Integration & Polish (1 week)

- End-to-end testing of all fixes
- Documentation updates
- Configuration refinement
- Final edge case handling

## Success Metrics

### How we'll know this worked:

1. **Rollback success**: Failed releases leave clean working directories
2. **JSR verification reliability**: No false failures for successful publishes
3. **Timeline display**: Consistent, readable progress indicators
4. **Overall reliability**: Release process succeeds on first attempt with proper error handling

## Risk Assessment

**Low risk** - We have clear problem statements, identified root causes, and existing infrastructure to build on. The main risk is scope creep, which we'll manage with the defined no-goes.

---

**Shaped by**: Rick & Claude  
**Date**: 2025-07-18  
**Ready for betting**: ✅ **YES** - JSR API findings incorporated
