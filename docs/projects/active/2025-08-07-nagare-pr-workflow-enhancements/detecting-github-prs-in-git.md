# Detecting Pull Requests in Git History

Pull requests are a GitHub platform feature, not part of Git itself, but they often leave **distinctive fingerprints**
in the git history. Think of it like archaeologists identifying ancient trade routes - you can't see the merchants,
but you can spot their characteristic pottery shards.

## What You CAN Detect

### 1. Merge Commit Patterns

GitHub creates merge commits with specific message formats:

```bash
# GitHub's PR merge commit pattern
Merge pull request #123 from username/branch-name

Title of the pull request

# Or for squash merges
Feature: Add new capability (#123)

# You can search for these patterns
git log --grep="Merge pull request #" --oneline
git log --grep="(#[0-9]+)" --oneline
```

### 2. Branch Patterns in Merge Commits

```bash
# Find merges that look like PR merges
git log --merges --pretty=format:"%h %s" | grep -E "(#[0-9]+|pull/[0-9]+)"

# See the branch structure that indicates PR workflow
git log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset'
```

### 3. Committer vs Author Differences

When GitHub merges a PR, the committer is often `GitHub <noreply@github.com>`:

```bash
# Find commits where GitHub was the committer
git log --pretty=format:"%h %cn: %s" | grep "GitHub:"
```

## What You CAN'T Reliably Detect

```typescript
// Things invisible in git history alone:
{
  prReviews: "❌ Who reviewed and approved",
  prComments: "❌ Discussion threads",  
  prStatus: "❌ CI/CD check results",
  prLabels: "❌ Labels and metadata",
  rejectedPRs: "❌ PRs that were closed without merging",
  prTimeline: "❌ When PR was opened vs merged"
}
```

## For Nagare: Detecting PR-based Releases

Here's how you could enhance Nagare to detect and handle PR-based workflows:

```typescript
// In your release.ts or git-operations.ts
class GitAnalyzer {
  /**
   * Detect if commits came from PRs
   * Like a detective looking for GitHub's calling cards
   */
  async detectPullRequestCommits(): Promise<Map<string, number>> {
    const prCommits = new Map<string, number>();
    
    // Pattern 1: Explicit PR merge commits
    const mergePattern = /Merge pull request #(\d+)/;
    
    // Pattern 2: Squash merge with PR reference
    const squashPattern = /\(#(\d+)\)$/;
    
    // Pattern 3: Branch names that suggest PRs
    const branchPattern = /Merge branch '[\w-]+\/(feature|fix|chore)\/[\w-]+'/;
    
    const log = await this.runCommand([
      'git', 'log', 
      '--pretty=format:%H|%s|%b|%cn',
      '--since=last.release'
    ]);
    
    for (const line of log.split('\n')) {
      const [hash, subject, body, committer] = line.split('|');
      
      // Check for PR markers
      let prNumber: number | null = null;
      
      if (mergePattern.test(subject)) {
        prNumber = parseInt(subject.match(mergePattern)![1]);
      } else if (squashPattern.test(subject)) {
        prNumber = parseInt(subject.match(squashPattern)![1]);
      } else if (committer === 'GitHub') {
        // GitHub web UI merge
        const match = subject.match(/#(\d+)/);
        if (match) prNumber = parseInt(match[1]);
      }
      
      if (prNumber) {
        prCommits.set(hash.substring(0, 7), prNumber);
      }
    }
    
    return prCommits;
  }

  /**
   * Enrich changelog with PR links
   * Like adding hyperlinks to a treasure map
   */
  enrichChangelogWithPRs(
    commits: ConventionalCommit[],
    prMap: Map<string, number>
  ): ConventionalCommit[] {
    return commits.map(commit => {
      const prNumber = prMap.get(commit.hash);
      if (prNumber) {
        return {
          ...commit,
          pr: prNumber,
          // Enhance description with PR link
          description: `${commit.description} ([#${prNumber}](../../pull/${prNumber}))`
        };
      }
      return commit;
    });
  }
}
```

## Practical Detection Script

Here's a standalone script to analyze your git history for PR patterns:

```bash
#!/bin/bash
# detect-prs.sh - Find evidence of PRs in git history

echo "🔍 Analyzing git history for Pull Request patterns..."
echo ""

echo "📊 Merge commits that look like PRs:"
git log --merges --pretty=format:"%h %s" | grep -E "#[0-9]+" | head -10

echo ""
echo "📈 Statistics:"
total_merges=$(git log --merges --oneline | wc -l)
pr_merges=$(git log --merges --oneline | grep -E "#[0-9]+" | wc -l)
echo "Total merge commits: $total_merges"
echo "Likely PR merges: $pr_merges"

echo ""
echo "🏷️ PR references by number:"
git log --oneline | grep -oE "#[0-9]+" | sort -u | head -20
```

## The Honest Trade-offs

### Pros of git-only detection:

- ✅ Works offline
- ✅ No API rate limits
- ✅ Fast and lightweight
- ✅ Works across platforms (GitLab, Bitbucket patterns differ but similar concept)

### Cons:

- ❌ Can't get PR metadata (reviewers, labels, checks)
- ❌ Might miss PRs merged via rebase
- ❌ Can't detect rejected/closed PRs
- ❌ Pattern matching can have false positives

## For Nagare Integration

Consider this configuration approach:

```typescript
// nagare.config.ts
export default {
  git: {
    // Detect and enrich with PR information
    detectPullRequests: true,
    
    // Custom patterns for your workflow
    prPatterns: {
      merge: /Merge pull request #(\d+)/,
      squash: /\(#(\d+)\)$/,
      custom: /PR-(\d+)/  // Your team's convention
    },
    
    // How to format PR links in changelog
    prLinkTemplate: "[#{{number}}]({{repository}}/pull/{{number}})"
  }
}
```

## Summary

While you can't get the **full PR story** from git alone, you can detect enough breadcrumbs to know PRs were used
and even link back to them. It's like reading sheet music versus hearing the full orchestra - you get the structure
but miss some of the richness.

### Quick Reference Commands

```bash
# Find all PR references
git log --oneline | grep -E "#[0-9]+"

# Count PR merges
git log --merges --grep="pull request" --oneline | wc -l

# Show recent PR merges with dates
git log --merges --grep="#[0-9]" --pretty=format:"%h %ad %s" --date=short

# Find squash-merged PRs
git log --grep="(#[0-9][0-9]*)" --pretty=format:"%h %s"
```
