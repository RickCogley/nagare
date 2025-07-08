# Complete Release Flow Automation Pitch

**Problem**: Nagare declares releases complete when it finds the GitHub release, but for
JSR-published projects, the actual success criteria is the package appearing on JSR. When GitHub
Actions fail due to linting, security checks, or publishing errors, Nagare just reports failure
instead of maintaining the "flow" it's named for. This breaks the release flow and requires manual
intervention.

**Appetite**: 6 weeks

**Solution**: Add an intelligent post-release automation system that:

1. Detects if project publishes to JSR (via config or deno.json)
2. After GitHub release creation, monitors for successful JSR publish
3. Watches GitHub Actions workflow status via `gh` CLI
4. When failures occur, parses logs to identify specific issues
5. **NEW**: Automatic problem-solving with two layers:
   - **Basic fixes** (no AI required): Format with --fix, simple version bumps, known suppressions
   - **AI-enhanced fixes** (optional): Complex code analysis and fixes when AI tool available
   - Automatically commits fixes and retriggers workflows
   - Falls back gracefully when AI unavailable
6. **NEW**: Visual progress indicators throughout:
   - Progress bars for multi-step operations
   - Spinners for waiting/monitoring states
   - Clear "You are here" breadcrumbs
   - Status badges and time estimates
7. Provides clear status updates throughout the entire process
8. Only declares success when package is actually live on JSR

Configuration example:

```typescript
{
  release: {
    verifyJsrPublish: true,
    autoFix: {
      basic: true,        // Deterministic fixes (always available)
      ai: {
        enabled: false,   // Opt-in AI features (off by default)
        provider: "claude-code", // or "github-copilot", "custom"
        maxAttempts: 3
      },
      types: [            // Which issues to auto-fix
        "lint",
        "format", 
        "security-scan",
        "type-check",
        "version-conflict"
      ]
    }
  }
}
```

Breadboard sketch:

```
[Release Manager] 
    ↓
[GitHub Release Created] 
    ↓
[Post-Release Automation]
    ├─→ [JSR Check?] → No → ✓ Success
    └─→ [JSR Check?] → Yes 
                        ↓
                    [Monitor GH Actions]
                        ↓
                    [Workflow Status?]
                        ├─→ Success → [Verify on JSR] → ✓
                        └─→ Failed → [Parse Logs]
                                         ↓
                                    [Extract Error Type]
                                         ↓
                                    [AutoFix Enabled?]
                                         ├─→ No → Report error
                                         └─→ Yes → [AI Problem Solver]
                                                        ↓
                                                   [Spawn Fix Tasks]
                                                   ├─→ Fix lint errors
                                                   ├─→ Fix format issues
                                                   ├─→ Fix security scans
                                                   └─→ Fix type errors
                                                        ↓
                                                   [Commit & Push]
                                                        ↓
                                                   [Retrigger Workflow]
                                                        ↓
                                                   [Monitor → Loop]
```

**Rabbit holes**:

- Building complex JSR API client (use simple fetch)
- Creating a general-purpose CI/CD fixer (focus on common Deno/JSR issues)
- Supporting other registries like npm (JSR only for now)
- Parsing every possible GH Actions log format (focus on standard tools)
- Building our own AI model (use Claude Code's existing capabilities)
- Infinite fix loops (implement max attempts and circuit breakers)

**No-gos**:

- We won't fix problems outside the defined autoFixTypes list
- We won't support registries other than JSR initially
- We won't make auto-fixing mandatory (opt-in via config)
- We won't parse logs from unrelated workflow jobs
- We won't attempt fixes that require external service changes (only code fixes)
- We won't continue beyond maxFixAttempts to prevent infinite loops

**Definition of Done**: See [definition-of-done.md](./definition-of-done.md) for detailed completion
criteria at both workflow and project levels.
