# Execution Plan: PR-Aware Changelog Generation

**Project**: PR-Aware Changelog Enhancement  
**Methodology**: Shape Up  
**Appetite**: 2 weeks  

## Phase 1: PR Detection (Days 1-3)

### 1.1 Git Operations Enhancement

**File**: `/src/git-operations.ts`

**Tasks**:

- Add merge commit detection
- Parse PR numbers from merge messages
- Map commits to their parent PRs

**Implementation**:
```typescript
// New functions to add
export async function getMergeCommits(since: string): Promise<MergeCommit[]> {
  const result = await runGitCommand(
    ["log", "--merges", "--oneline", `${since}..HEAD`]
  );
  return parseMergeCommits(result);
}

export function extractPRNumber(message: string): number | null {
  const patterns = [
    /Merge pull request #(\d+)/,
    /Merge PR #(\d+)/,
    /\(#(\d+)\)/
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return parseInt(match[1]);
  }
  return null;
}

export async function getCommitsInPR(
  prNumber: number, 
  mergeCommit: string
): Promise<Commit[]> {
  // Get commits between merge base and merge commit
  const commits = await runGitCommand([
    "log", 
    "--format=%H %s",
    `${mergeCommit}^1..${mergeCommit}^2`
  ]);
  return parseCommits(commits);
}
```

### 1.2 PR Info Collection

**File**: `/src/changelog/pr-detector.ts` (new)

**Tasks**:

- Create PR detection module
- Build PR-to-commit mapping
- Handle different merge strategies

**Implementation**:
```typescript
export interface PRInfo {
  number: number;
  title: string;
  commits: Commit[];
  types: Set<CommitType>;
}

export class PRDetector {
  async detectPRs(since: string): Promise<Map<number, PRInfo>> {
    const mergeCommits = await getMergeCommits(since);
    const prMap = new Map<number, PRInfo>();
    
    for (const merge of mergeCommits) {
      const prNumber = extractPRNumber(merge.message);
      if (prNumber) {
        const commits = await getCommitsInPR(prNumber, merge.sha);
        prMap.set(prNumber, {
          number: prNumber,
          title: this.extractTitle(merge.message),
          commits,
          types: new Set(commits.map(c => c.type))
        });
      }
    }
    
    return prMap;
  }
  
  private extractTitle(message: string): string {
    // Extract PR title from merge commit message
    const match = message.match(/Merge pull request #\d+ from .+\n\n(.+)/);
    return match ? match[1] : message.split('\n')[0];
  }
}
```

## Phase 2: Changelog Generation Update (Days 4-6)

### 2.1 Data Structure Enhancement

**File**: `/src/changelog/changelog-generator.ts`

**Tasks**:

- Update data structures for PR grouping
- Separate PR commits from direct commits
- Maintain backward compatibility

**Updates**:
```typescript
interface ChangelogSection {
  title: string;
  fromPRs?: PRInfo[];  // New: PR-grouped commits
  direct?: Commit[];   // Direct commits not in PRs
}

export class ChangelogGenerator {
  async generate(config: Config, version: string): Promise<string> {
    const lastTag = await getLastTag();
    const allCommits = await getCommitsSince(lastTag);
    
    // New: Detect PRs
    const prDetector = new PRDetector();
    const prs = await prDetector.detectPRs(lastTag);
    
    // Group commits
    const grouped = this.groupCommits(allCommits, prs);
    
    // Generate changelog with PR awareness
    return this.renderChangelog(version, grouped);
  }
  
  private groupCommits(
    allCommits: Commit[], 
    prs: Map<number, PRInfo>
  ): ChangelogData {
    const prCommitShas = new Set(
      Array.from(prs.values())
        .flatMap(pr => pr.commits.map(c => c.sha))
    );
    
    const directCommits = allCommits.filter(
      c => !prCommitShas.has(c.sha)
    );
    
    // Group by type (feat, fix, etc)
    return this.organizeByType(prs, directCommits);
  }
}
```

### 2.2 Template Updates

**File**: `/templates/changelog.vto`

**Tasks**:

- Implement PR-first layout when PRs detected
- Group commits by type within each PR
- Fall back to traditional layout when no PRs

**Template Changes**:
```vto
## [{{ version }}] - {{ date }}

{{ if pullRequests && pullRequests.length > 0 }}
### Pull Requests
{{ for pr of pullRequests }}
#### {{ pr.title }} (#{{ pr.number }})
{{ if pr.features && pr.features.length > 0 }}
**Added:**
{{ for commit of pr.features }}
- {{ commit.description }} ({{ commit.sha.slice(0, 7) }})
{{ /for }}
{{ /if }}
{{ if pr.fixes && pr.fixes.length > 0 }}
**Fixed:**
{{ for commit of pr.fixes }}
- {{ commit.description }} ({{ commit.sha.slice(0, 7) }})
{{ /for }}
{{ /if }}
{{ if pr.changes && pr.changes.length > 0 }}
**Changed:**
{{ for commit of pr.changes }}
- {{ commit.description }} ({{ commit.sha.slice(0, 7) }})
{{ /for }}
{{ /if }}

{{ /for }}

{{ if directCommits && (directCommits.features || directCommits.fixes) }}
### Direct Commits
{{ if directCommits.features && directCommits.features.length > 0 }}
**Added:**
{{ for commit of directCommits.features }}
- {{ commit.description }} ({{ commit.sha.slice(0, 7) }})
{{ /for }}
{{ /if }}
{{ if directCommits.fixes && directCommits.fixes.length > 0 }}
**Fixed:**
{{ for commit of directCommits.fixes }}
- {{ commit.description }} ({{ commit.sha.slice(0, 7) }})
{{ /for }}
{{ /if }}
{{ /if }}

{{ else }}
{{! Traditional layout when no PRs !}}
{{ if features && features.length > 0 }}
### Added
{{ for commit of features }}
- {{ commit.description }} ({{ commit.sha.slice(0, 7) }})
{{ /for }}
{{ /if }}
{{ if fixes && fixes.length > 0 }}
### Fixed
{{ for commit of fixes }}
- {{ commit.description }} ({{ commit.sha.slice(0, 7) }})
{{ /for }}
{{ /if }}
{{ /if }}
```

## Phase 3: Testing & Edge Cases (Days 7-8)

### 3.1 Test Coverage

**File**: `/tests/changelog-pr.test.ts` (new)

```typescript
describe('PR-Aware Changelog Generation', () => {
  test('detects PRs from merge commits', async () => {
    // Mock git log with merge commits
    const detector = new PRDetector();
    const prs = await detector.detectPRs('v1.0.0');
    expect(prs.size).toBeGreaterThan(0);
  });
  
  test('groups commits correctly by PR', async () => {
    // Test commit grouping logic
  });
  
  test('handles repos without PRs gracefully', async () => {
    // Should generate standard changelog
  });
  
  test('handles squash-merge PRs', async () => {
    // Single commit PRs
  });
  
  test('handles rebase-merge PRs', async () => {
    // Linear history PRs
  });
});
```

### 3.2 Edge Cases

Handle these scenarios:

- Repos that don't use PRs (standard changelog)
- Mixed workflows (some PRs, some direct)
- Squash merges (single commit per PR)
- Rebase merges (linear history)
- Force pushes and amended commits

## Phase 4: Documentation & Examples (Days 9-10)

### 4.1 Documentation

**File**: `/docs/pr-aware-changelogs.md` (new)

- How PR detection works
- Example outputs
- Troubleshooting guide

### 4.2 Migration Guide

**File**: `/docs/migration.md`

```markdown
## PR-Aware Changelogs

Starting with v2.19.0, Nagare automatically detects Pull Requests
and organizes your changelog accordingly. No configuration needed!

### What's Changed
- Commits from PRs are grouped under their PR title
- Direct commits appear in a separate section
- PR numbers are automatically linked

### Example Output
[Show before/after changelog examples]

### Disabling PR Detection
If needed, you can disable PR detection:
```bash
NAGARE_DISABLE_PR_DETECTION=true nagare release
```
```

## Implementation Timeline

| Day | Focus | Deliverable |
|-----|-------|------------|
| 1-2 | Git operations | PR detection working |
| 3 | PR mapping | Commits grouped by PR |
| 4-5 | Changelog generator | Updated data structures |
| 6 | Template updates | New changelog format |
| 7 | Testing | Full test coverage |
| 8 | Edge cases | Handle special scenarios |
| 9 | Documentation | User guides |
| 10 | Examples & polish | Ready to ship |

## Success Metrics

- ✅ PRs automatically detected and grouped
- ✅ Zero configuration required
- ✅ Backward compatible
- ✅ < 100ms performance impact
- ✅ Clean, readable changelogs

## Rollback Plan

If issues arise:
1. Set `NAGARE_DISABLE_PR_DETECTION=true` environment variable
2. Revert template changes if needed
3. Document known issues for next iteration

