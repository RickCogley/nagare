# Proposal: Enhanced Lifecycle Hooks for Nagare

## Overview

This proposal outlines additional lifecycle hooks that could be added to Nagare to provide more granular control over
the release process. These hooks would enable users to integrate custom logic at specific points in the release
workflow.

## Current State

Nagare currently supports two hooks:

- `preRelease`: Runs before the release process begins
- `postRelease`: Runs after the release is complete

## Proposed Additional Hooks

### 1. Version Calculation Hooks

#### `preVersionCalculation`

- **When**: Before conventional commits are analyzed
- **Use cases**:
  - Custom commit filtering
  - Inject additional commits for consideration
  - Log version calculation metrics
- **Context**: Current version, commit range

#### `postVersionCalculation`

- **When**: After new version is determined but before any files are updated
- **Use cases**:
  - Validate version number against custom rules
  - Check version conflicts with other systems
  - Send early notifications about upcoming version
- **Context**: Old version, new version, bump type, commits analyzed

### 2. File Update Hooks

#### `preFileUpdate`

- **When**: Before each file is updated with new version
- **Use cases**:
  - Create backups of files
  - Validate file accessibility
  - Custom file locking mechanisms
- **Context**: File path, current content, planned new content

#### `postFileUpdate`

- **When**: After each file is updated
- **Use cases**:
  - Run file-specific validation
  - Update dependent files
  - Trigger hot-reload in development
- **Context**: File path, old content, new content

### 3. Changelog Hooks

#### `preChangelogGeneration`

- **When**: Before changelog is generated
- **Use cases**:
  - Add custom sections to changelog
  - Filter sensitive information from commits
  - Fetch additional context (PR descriptions, issue links)
- **Context**: Commits to be included, version info

#### `postChangelogGeneration`

- **When**: After changelog is generated but before it's written
- **Use cases**:
  - Format changelog for different platforms
  - Translate changelog content
  - Add custom metadata or sections
- **Context**: Generated changelog content, version info

### 4. Git Operation Hooks

#### `preGitCommit`

- **When**: Before the release commit is created
- **Use cases**:
  - Add additional files to the commit
  - Run final validation checks
  - Update git hooks temporarily
- **Context**: Files to be committed, commit message

#### `postGitCommit`

- **When**: After release commit but before tag
- **Use cases**:
  - Sign commits with GPG
  - Update branch protection rules
  - Trigger CI/CD workflows
- **Context**: Commit hash, commit message

#### `preGitTag`

- **When**: Before git tag is created
- **Use cases**:
  - Validate tag naming conventions
  - Check for tag conflicts
  - Prepare tag annotations
- **Context**: Tag name, version

#### `postGitTag`

- **When**: After git tag is created
- **Use cases**:
  - Sign tags with GPG
  - Push to multiple remotes
  - Update tag-based deployments
- **Context**: Tag name, tag hash

### 5. GitHub Release Hooks

#### `preGitHubRelease`

- **When**: Before GitHub release is created
- **Use cases**:
  - Prepare release assets
  - Generate release notes for different audiences
  - Check GitHub API quotas
- **Context**: Release data, changelog content

#### `postGitHubRelease`

- **When**: After GitHub release is created
- **Use cases**:
  - Upload additional assets
  - Update project website
  - Notify external services
- **Context**: Release URL, release ID, asset URLs

### 6. Error Recovery Hooks

#### `onReleaseError`

- **When**: When any error occurs during release
- **Use cases**:
  - Custom error reporting
  - Attempt recovery strategies
  - Clean up temporary resources
- **Context**: Error details, stage where error occurred, partial release state

#### `preRollback`

- **When**: Before rollback operations begin
- **Use cases**:
  - Confirm rollback decision
  - Backup current state
  - Notify team about rollback
- **Context**: Version to rollback to, current version

#### `postRollback`

- **When**: After rollback is complete
- **Use cases**:
  - Verify system state
  - Update monitoring dashboards
  - Create incident reports
- **Context**: Rolled back version, affected files

## Hook Context Data Structure

Each hook would receive a context object with relevant data:

```typescript
interface HookContext {
  // Common to all hooks
  timestamp: Date;
  nagareVersion: string;
  config: NagareConfig;

  // Hook-specific data
  data: {
    // Varies by hook type
    [key: string]: unknown;
  };

  // Utilities
  utils: {
    log: (message: string) => void;
    exec: (command: string) => Promise<CommandResult>;
    readFile: (path: string) => Promise<string>;
    writeFile: (path: string, content: string) => Promise<void>;
  };
}
```

## Example Implementations

### Security Scanning Hook

```typescript
hooks: {
  postVersionCalculation: [
    async (context) => {
      const { newVersion } = context.data;

      // Run security audit
      const auditResult = await context.utils.exec("npm audit --json");
      const issues = JSON.parse(auditResult.stdout);

      if (issues.vulnerabilities.high > 0 || issues.vulnerabilities.critical > 0) {
        throw new Error(`Security vulnerabilities detected. Cannot release ${newVersion}`);
      }
    },
  ];
}
```

### Multi-Registry Publishing Hook

```typescript
hooks: {
  postGitHubRelease: [
    async (context) => {
      const { version } = context.data;

      // Publish to npm
      await context.utils.exec(`npm publish`);
      context.utils.log(`✅ Published to npm`);

      // Publish to JSR
      await context.utils.exec(`deno publish`);
      context.utils.log(`✅ Published to JSR`);

      // Publish to internal registry
      await context.utils.exec(`npm publish --registry=https://internal.company.com`);
      context.utils.log(`✅ Published to internal registry`);
    },
  ];
}
```

### Deployment Hook

```typescript
hooks: {
  postGitHubRelease: [
    async (context) => {
      const { version, releaseUrl } = context.data;

      // Deploy to staging
      await context.utils.exec(`kubectl set image deployment/app app=myapp:${version} -n staging`);

      // Run smoke tests
      const tests = await context.utils.exec(`npm run test:staging`);
      if (!tests.success) {
        // Rollback staging
        await context.utils.exec(`kubectl rollout undo deployment/app -n staging`);
        throw new Error("Staging deployment failed smoke tests");
      }

      // Notify Slack
      await fetch(process.env.SLACK_WEBHOOK, {
        method: "POST",
        body: JSON.stringify({
          text: `Version ${version} deployed to staging. Release: ${releaseUrl}`,
        }),
      });
    },
  ];
}
```

## Implementation Considerations

### 1. Hook Execution Order

- Hooks of the same type should execute in the order they're defined
- Consider adding priority/weight system for complex scenarios
- Option to run hooks in parallel vs sequential

### 2. Error Handling

- Pre-hooks that throw should halt the process
- Post-hooks might have different error strategies (warn vs fail)
- Recovery hooks need special error handling

### 3. Performance

- Hooks shouldn't significantly slow down releases
- Consider timeout mechanisms
- Option to skip hooks with `--no-hooks` flag

### 4. Debugging

- Verbose logging mode for hook execution
- Dry-run mode that shows what hooks would run
- Hook execution timing metrics

### 5. Backwards Compatibility

- New hooks should be optional
- Existing `preRelease` and `postRelease` continue to work
- Migration path for users wanting more granular control

## Benefits

1. **Flexibility**: Users can customize every aspect of the release process
2. **Integration**: Easy integration with existing tools and workflows
3. **Safety**: More checkpoints to catch issues before they propagate
4. **Automation**: Reduce manual steps in complex release processes
5. **Observability**: Better insight into what happens during releases

## Potential Challenges

1. **Complexity**: Too many hooks might make configuration overwhelming
2. **Debugging**: More hooks means more potential failure points
3. **Performance**: Each hook adds overhead to the release process
4. **Documentation**: Need comprehensive docs for each hook's behavior
5. **Testing**: Users need ways to test their hooks safely

## Migration Strategy

1. **Phase 1**: Implement hook infrastructure enhancements
   - Context objects
   - Better error handling
   - Execution utilities

2. **Phase 2**: Add most requested hooks
   - `postVersionCalculation`
   - `postGitHubRelease`
   - `onReleaseError`

3. **Phase 3**: Complete hook set based on user feedback
   - File update hooks
   - Git operation hooks
   - Changelog hooks

## Alternatives Considered

1. **Plugin System**: Instead of hooks, have full plugins
   - Pros: More powerful, can add commands
   - Cons: More complex, harder to maintain

2. **Event Emitter**: Node.js style event system
   - Pros: Familiar pattern, very flexible
   - Cons: Less structured, harder to type

3. **Middleware**: Express-style middleware chain
   - Pros: Composable, familiar pattern
   - Cons: Less clear execution order

## Conclusion

This enhanced hooks system would make Nagare significantly more powerful while maintaining its simplicity for basic use
cases. The phased approach allows us to gather feedback and refine the implementation based on real-world usage.

The key is to provide enough hooks to cover common use cases without overwhelming users or making the system too
complex. Each hook should have a clear purpose and well-defined behavior.

## Next Steps

1. Gather feedback on which hooks would be most valuable
2. Prototype the hook context system
3. Implement 2-3 high-value hooks as a proof of concept
4. Document patterns and best practices
5. Iterate based on user feedback
