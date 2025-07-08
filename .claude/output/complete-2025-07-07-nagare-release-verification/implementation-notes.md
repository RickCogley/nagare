# Implementation Notes: AI-Assisted Problem Solving

## Key Technical Considerations

### 1. Claude Code Integration

- Use subprocess to spawn `claude code` with specific prompts
- Pass `--extended-thinking` flag for complex problem analysis
- Structure prompts to focus on specific error types

### 2. Parallel Task Execution

- Create separate fix branches for different issue types
- Run fixes concurrently where possible
- Merge successful fixes back to release branch

### 3. Error Pattern Recognition

Common patterns to detect and fix:

- **Lint errors**: Extract file:line from ESLint/deno lint output
- **Format issues**: Run formatter with --fix flag
- **Security scans**: Parse DevSkim/CodeQL output, add suppressions or fix
- **Type errors**: Extract from TypeScript compiler output
- **Version conflicts**: Detect "version already exists" and bump

### 4. Safety Mechanisms

- Configurable maxFixAttempts (default: 3)
- Circuit breaker if same error repeats
- Rollback capability if fixes make things worse
- Dry-run mode for testing

### 5. Example Auto-Fix Flow

```typescript
// When lint error detected:
const lintErrors = parseLintErrors(actionLog);
if (config.enableAutoFix && config.autoFixTypes.includes("lint")) {
  await spawnClaudeCode({
    prompt: `Fix these lint errors:\n${lintErrors}`,
    flags: ["--extended-thinking"],
    timeout: 300000, // 5 minutes
  });

  // Commit, push, and retrigger
  await git.commit("fix: resolve lint errors for release");
  await git.push();
  await gh.workflow.run("publish.yml");
}
```

### 6. Configuration Schema

```typescript
interface ReleaseConfig {
  verifyJsrPublish?: boolean;
  enableAutoFix?: boolean;
  maxFixAttempts?: number;
  autoFixTimeout?: number;
  autoFixTypes?: Array<
    | "lint"
    | "format"
    | "security-scan"
    | "type-check"
    | "version-conflict"
    | "test-failure"
  >;
  claudeCodeFlags?: string[]; // Additional flags for AI
}
```
