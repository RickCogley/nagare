# Feature Summary: Complete Release Flow Automation

## All Aspects We're Shaping

### 1. **Core Problem**

- Nagare declares success prematurely when GitHub release is created
- For JSR projects, true success = package live on JSR
- CI/CD failures break the "flow" and require manual intervention

### 2. **Verification System**

- Detect JSR-enabled projects automatically
- Monitor GitHub Actions workflows via `gh` CLI
- Poll JSR API to verify package publication
- Clear definition of "done" for each workflow type

### 3. **AI-Powered Auto-Fix**

- Parse GitHub Actions logs for specific errors
- Spawn Claude Code with extended thinking for analysis
- Automatically fix common issues:
  - Lint errors (ESLint, deno lint)
  - Format issues (prettier, deno fmt)
  - Type errors (TypeScript)
  - Security scan failures (DevSkim, CodeQL)
  - Version conflicts on JSR
- Commit fixes and retrigger workflows
- Configurable retry limits and fix types

### 4. **Progress Visualization**

- Horizontal flow indicator (GUI-style pipeline view)
- Clear "you are here" highlighting
- Progress bars for multi-step operations
- Spinners for waiting states
- Time elapsed and estimates
- Substep expansion for active stages
- Error states with auto-fix progress

### 5. **Configuration**

```typescript
{
  release: {
    verifyJsrPublish: true,
    enableAutoFix: true,
    maxFixAttempts: 3,
    autoFixTypes: ["lint", "format", "security-scan", "type-check", "version-conflict"],
    progress: {
      enabled: true,
      style: "detailed" | "minimal" | "quiet"
    }
  }
}
```

### 6. **Safety & Boundaries**

- Opt-in auto-fixing (off by default)
- Maximum retry attempts to prevent loops
- Only fix code issues (not external service problems)
- Clear error messages when manual intervention needed
- Rollback capability if fixes make things worse

### 7. **Success Criteria**

- 95%+ of JSR releases complete without manual intervention
- <10 minute total release time (including auto-fixes)
- Users always know exactly where they are in the process
- Clear diagnostics for any failures

## The Complete Vision

Nagare becomes a true "flow" tool that doesn't just start releases but ensures they complete
successfully all the way to JSR. When obstacles appear (lint errors, security issues), it
automatically clears them while keeping the user informed with beautiful progress indicators. The
release process becomes a smooth, automated flow from code to published package.

## Appetite: 6 weeks

This expanded scope justifies the 6-week appetite as we're building:

- Workflow monitoring infrastructure
- Log parsing and error detection
- AI integration for problem-solving
- Progress visualization system
- Comprehensive configuration
- Safety mechanisms and testing
