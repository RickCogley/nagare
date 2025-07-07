# Definition of Done

## Workflow-Level "Done" Criteria

### 1. Standard Release (No JSR)

**Done when:**

- ✅ All files updated with new version
- ✅ Git tag created and pushed
- ✅ GitHub release created with changelog
- ✅ All commits pushed to remote
- ✅ Release appears on GitHub releases page

### 2. JSR Publishing Release

**Done when:**

- ✅ All standard release criteria met
- ✅ GitHub Actions workflow completes successfully
- ✅ Package version appears on JSR.io
- ✅ Package is installable via `deno add @scope/package`
- ✅ JSR shows correct version metadata

### 3. Auto-Fix Workflow (per fix attempt)

**Done when:**

- ✅ Error correctly identified and parsed
- ✅ Fix applied and committed
- ✅ Workflow retriggered
- ✅ Either: workflow passes OR max attempts reached
- ✅ Status clearly reported to user

### 4. Rollback Workflow

**Done when:**

- ✅ Git tag removed locally and remotely
- ✅ GitHub release deleted (if requested)
- ✅ Files reverted to previous version
- ✅ Changes committed with clear message
- ✅ JSR package deprecated (if applicable)

## Project-Level "Done" Criteria

### Feature Implementation Done

**This feature is complete when:**

1. **Core Verification System**
   - ✅ Detects JSR-enabled projects automatically
   - ✅ Monitors GitHub Actions via `gh` CLI
   - ✅ Polls JSR API for package availability
   - ✅ Reports clear status throughout process
   - ✅ Handles timeouts gracefully

2. **Auto-Fix Capability**
   - ✅ Parses these error types from logs:
     - Lint errors (ESLint, deno lint)
     - Format errors (prettier, deno fmt)
     - Type errors (TypeScript)
     - Security scan failures (DevSkim, CodeQL)
     - Version conflicts on JSR
   - ✅ Spawns Claude Code for each error type
   - ✅ Commits fixes with conventional commits
   - ✅ Retriggers workflows automatically
   - ✅ Respects maxFixAttempts configuration

3. **Configuration System**
   - ✅ New config options documented
   - ✅ Defaults are safe (auto-fix off by default)
   - ✅ Config validation with clear errors
   - ✅ Examples in documentation

4. **Error Handling**
   - ✅ Every failure mode has a specific error message
   - ✅ Suggestions provided for manual fixes
   - ✅ No infinite loops possible
   - ✅ Graceful degradation if GitHub/JSR APIs fail

5. **Testing**
   - ✅ Unit tests for all new components
   - ✅ Integration tests for success paths
   - ✅ Tests for each auto-fixable error type
   - ✅ Tests for timeout and retry logic
   - ✅ Mock tests for API interactions

6. **Progress Indicators**
   - ✅ Horizontal flow indicator showing all stages
   - ✅ Current step clearly highlighted
   - ✅ Progress bars for long operations
   - ✅ Spinners for waiting states
   - ✅ Time elapsed and estimates shown
   - ✅ Substep expansion for active stage
   - ✅ Error states with auto-fix status

7. **Documentation**
   - ✅ README updated with new feature
   - ✅ Config examples added
   - ✅ Troubleshooting guide for common issues
   - ✅ Architecture docs updated
   - ✅ Progress indicator styles documented

## Success Metrics

The feature successfully achieves its goals when:

1. **Reliability**: 95%+ of JSR releases complete without manual intervention
2. **Clarity**: Users always know exactly why a release failed
3. **Automation**: 80%+ of fixable errors are resolved automatically
4. **Speed**: Total release time (including fixes) < 10 minutes
5. **Safety**: Zero cases of corruption or broken releases

## Edge Cases Handled

- ✅ GitHub API rate limits
- ✅ JSR API downtime
- ✅ Concurrent releases
- ✅ Network failures
- ✅ Malformed action logs
- ✅ Claude Code unavailable
- ✅ Git conflicts during fixes
- ✅ Permission errors
