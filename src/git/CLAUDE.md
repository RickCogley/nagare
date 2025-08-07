# Git Module

## Purpose

Version control operations and GitHub integration. Handles all git commands, conventional commit parsing, and GitHub
release creation.

## Key Components

- **git-operations.ts** - Git command execution, version analysis, tagging
- **GitHub-integration.ts** - GitHub release creation via gh CLI
- **GitHub-actions-monitor.ts** - CI/CD workflow monitoring

## Dependencies

Can import from:

- `core/` - Logging, errors
- `utils/` - Command execution
- `validation/` - Input sanitization

## Key Operations

### git-operations.ts

- `getCurrentCommitHash()` - Get current HEAD commit
- `getCommitsSinceLastRelease()` - Analyze commits for version bump
- `parseConventionalCommit()` - Parse commit messages
- `commitAndTag()` - Create release commit and tag
- `pushToRemote()` - Push changes to remote
- `hasUncommittedChanges()` - Check working directory status
- `rollback()` - Revert to previous version

### GitHub-integration.ts

- `createRelease()` - Create GitHub release with notes
- `uploadAssets()` - Attach files to releases
- Uses `gh` CLI tool for authentication

### GitHub-actions-monitor.ts

- `monitorWorkflow()` - Watch CI/CD pipeline status
- `extractLogs()` - Get failure logs for debugging
- Integrates with auto-fixer for CI/CD issues

## Conventional Commits

Supports standard commit types:

- `feat:` - New features (minor version bump)
- `fix:` - Bug fixes (patch version bump)
- `BREAKING CHANGE:` - Breaking changes (major version bump)
- `docs:`, `style:`, `refactor:`, `test:`, `chore:` - No version bump

## Security Considerations

- All git refs are sanitized before use
- Command injection prevention in git operations
- GitHub tokens never logged or exposed
- Uses gh CLI for secure authentication

## Error Handling

Common errors and handling:

- Uncommitted changes - Prompt to commit or stash
- No git repository - Clear error with init instructions
- Network failures - Retry with exponential backoff
- Authentication failures - Guide to gh CLI setup

## Usage Pattern

```typescript
import { GitOperations } from "../git/git-operations.ts";
import { GitHubIntegration } from "../git/github-integration.ts";

const git = new GitOperations(config);
const commits = await git.getCommitsSinceLastRelease();
const version = calculateVersionBump(commits);
await git.commitAndTag(version, "Release v" + version);
```

## Testing

- Mock git commands for unit tests
- Test conventional commit parsing
- Verify command sanitization
- Test error recovery scenarios
