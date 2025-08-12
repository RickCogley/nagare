# Pitch: PR-Aware Changelog Generation

## Problem

**Nagare's changelogs don't currently reflect how modern teams actually often work - through GitHub Pull Requests.**

When teams use PR-based workflows, the generated changelogs miss critical context, using the current Nagare:

### Lost PR Context

- Changelogs show individual commits but not the PRs that grouped them
- A feature PR with 10 commits appears as 10 disconnected items
- No way to see which commits came from reviewed PRs vs direct pushes
- GitHub release notes don't match the actual changelog

### Poor Traceability

- Can't easily trace features back to their PR discussions
- Lost connection between changelog entry and PR review comments
- No indication of what was properly reviewed vs hotfixed

### Manual Cleanup Required

- Teams manually edit changelogs to group related commits
- Have to add PR numbers by hand for traceability
- Time wasted reformatting auto-generated content

## Appetite

**2 weeks** - This is a focused enhancement to existing changelog generation.

The appetite includes:

- Detect and parse PR merge commits (3 days)
- Update changelog template to show PR structure (3 days)
- Test with various git workflows (2 days)
- Documentation and examples (2 days)

## Solution

**Smart PR-aware changelog generation that just works**

### Core Concept

1. **Automatic PR detection** - Find merged PRs since last release
2. **Mixed presentation** - Show PRs when they exist, commits when they don't
3. **Zero configuration** - If you use PRs, they show up automatically

### Changelog Example (PR-first layout)

```markdown
## [2.18.1] - 2025-08-08

### Pull Requests

#### Add dark mode support (#123)

**Added:**

- Create theme context (a3b4c5d)
- Add toggle component (d6e7f8g)
- Add theme switcher to settings (h9i0j1k)

**Fixed:**

- Theme persistence across sessions (l2m3n4o)
- Flash of unstyled content (p5q6r7s)

#### Implement user preferences (#124)

**Added:**

- Settings UI with tabs (t8u9v0w)
- Preference storage system (x1y2z3a)
- Import/export functionality (b4c5d6e)

#### Fix memory leak in cache (#125)

**Fixed:**

- Identify and patch leak source (f7g8h9i)
- Implement proper cleanup on unmount (j0k1l2m)

### Direct Commits

**Added:**

- Add keyboard shortcuts (n3o4p5q)

**Fixed:**

- Resolve type errors (r6s7t8u)
- Update vulnerable dependencies (v9w0x1y)
```

When no PRs exist, it falls back to the traditional format:

```markdown
## [2.18.1] - 2025-08-08

### Added

- Create theme context (a3b4c5d)
- Add toggle component (d6e7f8g)
- Add keyboard shortcuts (n3o4p5q)

### Fixed

- Resolve type errors (r6s7t8u)
- Update vulnerable dependencies (v9w0x1y)
```

## Rabbit Holes

**What we're NOT doing:**

- Not adding configuration options (it just works)
- Not requiring GitHub API tokens (use git data)
- Not changing the release process itself
- Not dealing with squash vs merge strategies

## No-gos

**What would make this fail:**

### Breaking Existing Changelogs

If current changelog format becomes unreadable

**Circuit breaker**: Maintain backward compatibility - enhance, don't replace

### GitHub API Dependency

If we require API tokens and rate limits

**Circuit breaker**: Use git merge commits, not GitHub API

### Over-complicating Templates

If the changelog becomes too nested or complex

**Circuit breaker**: Maximum 2 levels of nesting (type → PR → commits)
