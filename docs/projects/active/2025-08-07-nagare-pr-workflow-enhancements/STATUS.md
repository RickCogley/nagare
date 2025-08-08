# Status: Nagare PR Workflow Enhancements

## Overview

Enable Nagare to seamlessly support pull request-based development workflows, handling the complexity of versioning,
changelog generation, and releases in a multi-branch environment.

## Current Status

📋 **PLANNING** - Comprehensive plan ready for review

## Executive Summary

The core challenge: **How do we handle versioning and releases when multiple developers work on multiple PRs
simultaneously?**

Our solution: **Defer versioning until after merge to main**, then release with the correct version based on all
accumulated changes. This avoids version conflicts while providing safety gates against accidental releases.

## Problem Statement

Currently, Nagare assumes a linear workflow where releases happen directly from the main branch. In reality, most teams
use pull requests with these challenges:

1. **Version Conflicts** - Multiple open PRs may conflict on version bumps
2. **Changelog Fragmentation** - Commits spread across multiple PRs
3. **Release Timing** - When should version bumps actually happen?
4. **Tag Management** - Tags should only exist on main, not feature branches
5. **CI/CD Integration** - Releases need to work with GitHub Actions and PR checks

## Core Design Principles

1. **PR-First Development** - Assume all changes go through PRs
2. **Flexible Release Strategies** - Support different team workflows
3. **Conflict Avoidance** - Prevent version conflicts between PRs
4. **Automation-Friendly** - Work seamlessly with CI/CD

## Supported Release Strategies

### Strategy 1: "Release After Merge" (Recommended)

**How it works:**

1. Developers create feature branches and PRs with conventional commits
2. PRs are reviewed and merged to main (usually squashed)
3. After merge, Nagare can either:
   - **Option A**: Create a draft GitHub release for review (safer)
   - **Option B**: Auto-release if commit contains `[release]` tag
   - **Option C**: Wait for manual trigger or scheduled release

**Benefits:**

- No version conflicts between PRs
- Clean linear history on main
- Safety gates prevent accidental releases
- Flexible release timing

**Configuration Options:**

#### Option A: Draft Release for Review (Safest)

```yaml
# .github/workflows/prepare-release.yml
on:
  push:
    branches: [main]
jobs:
  prepare-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v1
      - name: Prepare Draft Release
        run: |
          # Create draft release without publishing
          deno task nagare release --draft --skip-confirmation
      - name: Comment on PR
        run: |
          echo "Draft release created. Review at GitHub Releases page."
```

#### Option B: Conditional Auto-Release

```yaml
# .github/workflows/release.yml
on:
  push:
    branches: [main]
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v1
      - name: Check for Release Intent
        id: check
        run: |
          # Only auto-release if commit message contains [release]
          if git log -1 --pretty=%B | grep -q "\[release\]"; then
            echo "should_release=true" >> $GITHUB_OUTPUT
          fi
      - name: Release
        if: steps.check.outputs.should_release == 'true'
        run: deno task nagare release --skip-confirmation
```

#### Option C: Manual Trigger

```yaml
# .github/workflows/release.yml
on:
  workflow_dispatch:  # Manual trigger from GitHub UI
  schedule:
    - cron: '0 10 * * 1'  # Or weekly on Mondays
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v1
      - run: deno task nagare release --skip-confirmation
```

### Strategy 2: "Release PR"

**How it works:**

1. Feature PRs don't include version bumps
2. When ready to release, run `nagare pr release`
3. Nagare creates a PR with version bump and changelog
4. Review and merge the release PR
5. Tag and publish triggered on merge

**Benefits:**

- Explicit release approval process
- Changelog review before release
- Works with protected branches

**Commands:**
```bash
# Create a release PR
nagare pr release --target main

# Create release PR for specific version
nagare pr release minor --target main
```

### Strategy 3: "Continuous Deployment"

**How it works:**

1. Every PR includes its own version bump
2. Nagare detects PR context and adjusts version
3. On merge, tag is created and package published
4. Changelog accumulates across releases

**Benefits:**

- Every PR is a release
- Fast deployment cycle
- Good for libraries

### Strategy 4: "Scheduled Releases"

**How it works:**

1. PRs accumulate on main without releases
2. Scheduled workflow (e.g., weekly) creates release
3. Version bump based on all changes since last release
4. Automatic or manual approval

**Benefits:**

- Predictable release schedule
- Batched changes
- Time for integration testing

## Key Features for PR Support

### 1. Branch & PR Context Awareness

- [ ] Detect current branch and PR status
- [ ] Know if running in CI/CD environment
- [ ] Understand PR merge target
- [ ] Handle fork PRs differently

### 2. Smart Version Management

- [ ] **Deferred Versioning** - Don't bump version in feature branches
- [ ] **Version Reservation** - Reserve next version to avoid conflicts
- [ ] **Conflict Resolution** - Handle version conflicts on merge
- [ ] **PR-based Versioning** - Use PR number in prerelease versions

### 3. Changelog Strategies

- [ ] **Accumulative** - Gather commits from multiple PRs
- [ ] **PR-grouped** - Group changes by PR in changelog
- [ ] **Squash-aware** - Use PR title when commits are squashed
- [ ] **Unreleased Section** - Maintain unreleased changes section

### 4. CI/CD Integration

- [ ] **GitHub Actions Templates** - Provide workflow templates
- [ ] **PR Comments** - Post release preview as PR comment
- [ ] **Status Checks** - Create GitHub status checks
- [ ] **Auto-merge Support** - Enable auto-merge when checks pass

## Safety Considerations

### Preventing Accidental Releases

1. **Draft Releases First**
   - Create draft GitHub releases that require manual publishing
   - Allows review of version bump and changelog
   - Can be converted to full release after verification

2. **Release Gates**
   - Require explicit `[release]` tag in merge commit
   - Use branch protection rules
   - Require specific GitHub team approval
   - Check for passing tests and security scans

3. **Rollback Safety**
   - Keep previous version in a git stash before release
   - Tag with `-pre-release` suffix for easy identification
   - Maintain release state file for recovery

4. **Monitoring & Alerts**
   - Post to Slack/Discord when release is prepared
   - Create GitHub issue for release approval
   - Email notifications for release events

### Recommended Safe Workflow

```mermaid
graph TD
    A[PR Merged to Main] --> B{Check Conditions}
    B -->|Has [no-release] tag| C[Skip Release]
    B -->|Normal merge| D[Prepare Release]
    D --> E[Create Draft Release]
    E --> F[Run Validation Checks]
    F -->|Tests Pass| G[Notify Team]
    F -->|Tests Fail| H[Create Issue]
    G --> I{Human Review}
    I -->|Approved| J[Publish Release]
    I -->|Rejected| K[Delete Draft]
```

## Implementation Plan

### Phase 1: Branch & Environment Detection

**Goal:** Make Nagare aware of its execution context

```typescript
interface ExecutionContext {
  branch: string;
  isCI: boolean;
  isPR: boolean;
  prNumber?: number;
  prBase?: string;
  prTitle?: string;
  isFork: boolean;
}

// Detect from environment variables and git
function detectContext(): ExecutionContext {
  // Check CI environment variables (GITHUB_ACTIONS, CI, etc.)
  // Check git branch and remote
  // Check for PR metadata
}
```

**Implementation:**

- [ ] Create `src/core/context-detector.ts`
- [ ] Support GitHub Actions, GitLab CI, CircleCI
- [ ] Detect PR context from environment
- [ ] Add `--pr` flag to override detection

### Phase 2: Release Strategy Configuration

**Goal:** Let teams choose their workflow

```typescript
interface ReleaseStrategy {
  mode: "on-merge" | "release-pr" | "continuous" | "scheduled";
  
  // For on-merge strategy
  onMerge?: {
    branches: string[];         // Branches that trigger releases
    autoRelease: boolean;       // Auto-release or require confirmation
  };
  
  // For release-pr strategy
  releasePR?: {
    branch: string;             // Branch to create release PR from
    title: string;              // PR title template
    labels: string[];           // Labels to add
    autoMerge: boolean;         // Enable auto-merge
  };
  
  // For continuous strategy
  continuous?: {
    prereleaseTemplate: string; // e.g., "{version}-pr.{prNumber}"
    tagPrereleases: boolean;    // Create tags for prereleases
  };
  
  // Version conflict resolution
  versionStrategy: "defer" | "reserve" | "independent";
}
```

**Implementation:**

- [ ] Add to `NagareConfig` type
- [ ] Create strategy pattern for each mode
- [ ] Add validation for strategy configuration

### Phase 3: PR-Aware Commands

**Goal:** New commands for PR workflows with safety features

```bash
# Create a draft release (safe default)
nagare release --draft

# Preview what would be released without creating anything
nagare release --preview

# Create a release PR for review
nagare pr release [version]

# Release only if conditions are met
nagare release --if-changed --if-tests-pass

# Create PR for current branch
nagare pr create --title "feat: add new feature"

# Check if a release is needed
nagare release check
```

**Implementation:**

- [ ] Add `pr` subcommand to CLI
- [ ] Create `src/pr/pr-manager.ts`
- [ ] Add `--draft` flag for safe releases
- [ ] Add conditional release flags
- [ ] Integrate with GitHub CLI
- [ ] Add preview/dry-run support

### Phase 4: Changelog Management

**Goal:** Handle changelog across PRs

```typescript
interface ChangelogStrategy {
  // How to handle unreleased changes
  unreleased: {
    enabled: boolean;           // Maintain UNRELEASED section
    file: string;               // Separate file for unreleased
    includePRLinks: boolean;    // Add PR links to entries
  };
  
  // How to group changes
  grouping: "pr" | "type" | "scope";
  
  // PR-specific formatting
  prFormat: {
    includeNumber: boolean;     // Include PR number
    includeAuthor: boolean;     // Include PR author
    usePRTitle: boolean;        // Use PR title for squashed commits
  };
}
```

**Implementation:**

- [ ] Enhance changelog generator
- [ ] Support UNRELEASED section
- [ ] Add PR metadata to entries
- [ ] Handle squashed commits properly

## Real-World Scenarios

### Scenario 1: Multiple Developers, Multiple PRs

**Situation:**

- 3 developers working on features simultaneously
- All PRs target main branch
- Version is currently 1.2.0

**Without PR Support (Problem):**

- PR #1 bumps to 1.2.1
- PR #2 also bumps to 1.2.1 (conflict!)
- PR #3 also bumps to 1.2.1 (more conflicts!)

**With PR Support (Solution):**
```bash
# Each developer just commits normally
git commit -m "feat: add user settings"

# Create PR without version bump
nagare pr create

# After all PRs merge, release from main
nagare release  # Correctly bumps to 1.3.0 (minor due to features)
```

### Scenario 2: Release Review Process

**Situation:**

- Team wants to review releases before publishing
- Multiple features ready for release
- Need changelog preview

**Solution:**
```bash
# Create a release PR with preview
nagare pr release --preview

# This creates a PR with:
# - Version bump (1.2.0 → 1.3.0)
# - Updated CHANGELOG.md
# - Updated version files

# Team reviews PR, approves, merges
# GitHub Action publishes on merge
```

### Scenario 3: Hotfix During Feature Development

**Situation:**

- Feature branch in progress
- Critical bug found in production
- Need immediate fix

**Solution:**
```bash
# Create hotfix from main
git checkout main
git checkout -b hotfix/security-issue

# Make fix
git commit -m "fix: patch security vulnerability"

# Create and merge hotfix PR
nagare pr create --priority high --auto-merge

# Nagare creates 1.2.1 release
# Feature branches rebase and continue
```

## Configuration Examples

### Example 1: Auto-Release on Merge

```typescript
// nagare.config.ts
export default {
  release: {
    strategy: {
      mode: "on-merge",
      onMerge: {
        branches: ["main", "master"],
        autoRelease: true
      },
      versionStrategy: "defer"  // Don't version in PRs
    }
  },
  changelog: {
    unreleased: {
      enabled: true,
      includePRLinks: true
    },
    prFormat: {
      includeNumber: true,
      usePRTitle: true  // For squashed commits
    }
  }
}
```

### Example 2: Release PR Workflow

```typescript
// nagare.config.ts
export default {
  release: {
    strategy: {
      mode: "release-pr",
      releasePR: {
        branch: "release/next",
        title: "chore: release v{version}",
        labels: ["release", "automated"],
        autoMerge: true
      }
    }
  }
}
```

### Example 3: Continuous Deployment

```typescript
// nagare.config.ts
export default {
  release: {
    strategy: {
      mode: "continuous",
      continuous: {
        prereleaseTemplate: "{version}-pr.{prNumber}",
        tagPrereleases: false
      },
      versionStrategy: "independent"  // Each PR versions independently
    }
  }
}
```

## GitHub Actions Integration

### Workflow: Auto-Release on Merge

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      packages: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Need full history for changelog
      
      - uses: denoland/setup-deno@v1
      
      - name: Release
        run: |
          deno task nagare release --skip-confirmation
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Workflow: Release PR

```yaml
# .github/workflows/release-pr.yml
name: Create Release PR
on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version bump type'
        required: true
        type: choice
        options:
          - patch
          - minor
          - major

jobs:
  release-pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: denoland/setup-deno@v1
      
      - name: Create Release PR
        run: |
          deno task nagare pr release ${{ inputs.version }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Success Criteria

1. **Developer Experience**
   - Zero version conflicts between PRs
   - Clear understanding of what will be released
   - Works with existing git workflows

2. **Flexibility**
   - Supports multiple release strategies
   - Configurable for team preferences
   - Works with protected branches

3. **Automation**
   - Fully automated releases possible
   - Manual approval when needed
   - Integration with CI/CD

4. **Safety**
   - No accidental version bumps
   - Preview before release
   - Rollback capabilities maintained

## Implementation Priority

1. **Phase 1** - Context Detection (Week 1)
   - Critical for all other features
   - Enables PR-aware behavior

2. **Phase 2** - Defer Strategy (Week 2)
   - Solves version conflict problem
   - Most requested feature

3. **Phase 3** - Release PR Command (Week 3)
   - Enables review workflow
   - Works with protected branches

4. **Phase 4** - GitHub Actions Templates (Week 4)
   - Complete automation
   - Documentation and examples

## Testing Plan

- Unit tests for context detection
- Integration tests with git operations
- Mock PR environments
- Test with real GitHub repos
- Test all release strategies
- Test conflict scenarios

## Documentation Updates

- New "PR Workflows" guide
- Update README with PR examples
- Add troubleshooting section
- Create video tutorials
- Migration guide from direct releases
