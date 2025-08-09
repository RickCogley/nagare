# PR-Aware Changelogs

Starting with Nagare v2.19.0, your changelogs automatically detect and organize changes by Pull Requests.
This feature requires zero configuration and provides a cleaner, more organized view of your release history.

## How It Works

Nagare automatically detects Pull Requests by analyzing git merge commits. When PRs are found, the changelog groups
commits by their associated PR, making it easy to see which changes came from which pull request.

### Automatic Detection

Nagare looks for these PR patterns in your git history:

- Standard GitHub merge: `Merge pull request #123`
- Squash merge: `feat: add feature (#123)`
- Simple merge: `Merge #123: Title`
- GitHub as committer with PR reference

## Changelog Formats

### With Pull Requests (PR-First Layout)

When PRs are detected, your changelog looks like this:

```markdown
## [2.19.0] - 2024-01-15

### 🔀 Pull Requests

#### Add awesome new feature ([#123](../../pull/123))

**✨ Added:**
- New API endpoint for user management (`api`) - [abc1234](../../commit/abc1234)
- Add validation for user input (`validation`) - [def5678](../../commit/def5678)

**🐛 Fixed:**
- Fix memory leak in cache handler (`cache`) - [ghi9012](../../commit/ghi9012)

#### Refactor authentication system ([#124](../../pull/124))

**🔄 Changed:**
- Migrate to JWT tokens (`auth`) - [jkl3456](../../commit/jkl3456)
- Update session handling (`session`) - [mno7890](../../commit/mno7890)

### 📝 Direct Commits

**🐛 Fixed:**
- Quick hotfix for production issue - [pqr1234](../../commit/pqr1234)
```

### Without Pull Requests (Traditional Layout)

In repositories without PRs, or when PR detection is disabled, you get the classic format:

```markdown
## [2.19.0] - 2024-01-15

### Added
- New API endpoint for user management (api) (abc1234)
- Add validation for user input (validation) (def5678)

### Fixed
- Fix memory leak in cache handler (cache) (ghi9012)
- Quick hotfix for production issue (pqr1234)

### Changed
- Migrate to JWT tokens (auth) (jkl3456)
- Update session handling (session) (mno7890)
```

## Configuration

### Zero Configuration Required

PR detection works automatically out of the box. Nagare will:

1. Detect PRs in your git history
2. Group commits by PR
3. Generate an organized changelog
4. Fall back to traditional format when no PRs exist

### Disabling PR Detection

If you prefer the traditional changelog format, you can disable PR detection:

```bash
# Disable for a single release
NAGARE_DISABLE_PR_DETECTION=true nagare release

# Or set it in your environment
export NAGARE_DISABLE_PR_DETECTION=true
```

## Custom Templates

Nagare uses Vento templates for changelog generation. You can customize the PR-aware template by editing `templates/changelog-pr.vto`:

```vto
{{! Custom PR-aware changelog template }}
## [{{ version }}] - {{ metadata.date }}

{{ for pr of metadata.pullRequests }}
### {{ pr.title }} (#{{ pr.number }})
{{! Your custom PR formatting here }}
{{ /for }}
```

## Benefits

### Better Organization

- Changes are grouped by their PR context
- Related commits stay together
- Easy to trace features back to PRs

### Automatic Links

- PR numbers link to GitHub PR pages
- Commit hashes link to commit details
- Better navigation for code review

### Mixed Workflow Support

- Handles both PR and direct commits
- Separate sections for each type
- Clear distinction between workflows

## Edge Cases

### Squash Merges

Squash merges combine all PR commits into one. Nagare detects these by looking for PR references in commit
messages like `(#123)`.

### Rebase Merges

Rebase merges maintain linear history. Nagare detects these through GitHub's merge commit patterns.

### Force Pushes

Force-pushed PRs are handled normally as long as the merge commit contains the PR reference.

## Examples

### Release with Multiple PRs

```bash
$ nagare release minor

🌊 Nagare Release Manager
Version: 2.18.1 → 2.19.0
Date: 2024-01-15

🔀 Pull Requests: 3
  ✨ Features: 5 across PRs
  🐛 Fixes: 3 across PRs
  🔄 Changes: 2 across PRs

📝 Direct Commits: 2

Proceed with release? (y/n)
```

### Generated Changelog Entry

The above release would generate a changelog entry with:

- 3 PR sections with their respective commits
- 1 Direct Commits section with 2 commits
- Automatic linking to GitHub PR and commit pages

## Troubleshooting

### PRs Not Detected

If PRs aren't being detected:

1. Check your merge commit format
2. Ensure you're using standard GitHub merge strategies
3. Verify PRs are merged (not rebased without merge commits)

### Incorrect Grouping

If commits are incorrectly grouped:

1. Check for duplicate commits in history
2. Verify merge commit parent relationships
3. Look for amended or cherry-picked commits

### Performance

PR detection adds minimal overhead:

- Single `git log --merges` command
- In-memory processing
- < 100ms for typical repositories

## Migration

### Upgrading from v2.18.x

No action required! PR detection activates automatically when you upgrade. Your existing changelog remains unchanged,
and new entries will use PR-aware formatting when applicable.

### Rollback

If you need to rollback:

1. Set `NAGARE_DISABLE_PR_DETECTION=true`
2. Continue using Nagare normally
3. Changelogs will use traditional format

## Best Practices

### Commit Messages

- Use conventional commits within PRs
- Keep PR titles descriptive
- Include issue numbers in PR descriptions

### PR Workflow

- Squash small fix PRs
- Keep feature PRs focused
- Use merge commits for visibility

### Release Process

- Review PR groupings before confirming
- Check for orphaned direct commits
- Ensure all PRs are properly merged

## API Reference

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NAGARE_DISABLE_PR_DETECTION` | Disable PR detection | `false` |

### Template Variables

When PRs are detected, these variables are available in templates:

```typescript
interface TemplateMetadata {
  pullRequests: Array<{
    number: number;
    title: string;
    features: ConventionalCommit[];
    fixes: ConventionalCommit[];
    changes: ConventionalCommit[];
    other: ConventionalCommit[];
    sha: string;
  }>;
  directCommits: {
    features: ConventionalCommit[];
    fixes: ConventionalCommit[];
    changes: ConventionalCommit[];
    other: ConventionalCommit[];
  };
  hasPRs: boolean;
  date: string;
}
```

## Feedback

We'd love to hear your experience with PR-aware changelogs!
Please [open an issue](https://github.com/your-repo/nagare/issues) with feedback or suggestions.

