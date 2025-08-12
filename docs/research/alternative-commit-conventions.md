# Alternative Commit Message Conventions Support

## Overview

This document outlines the plan for adding support for alternative commit message conventions beyond Conventional
Commits. This would allow teams using different commit styles to benefit from Nagare's automated release management.

## Goals

1. **Extensible Architecture** - Plugin-based system for commit conventions
2. **Backward Compatible** - Conventional Commits remains the default
3. **Type Safe** - Full TypeScript support for custom conventions
4. **Community Friendly** - Easy to add new conventions
5. **Automatic Detection** - Detect convention from commit history

## Popular Commit Conventions

### 1. **Gitmoji** (🎨 💄 ♻️)

Most popular emoji-based convention with clear semantic meaning.

```
🐛 Fix infinite loop in user authentication
✨ Add dark mode support
🔥 Remove deprecated API endpoints
💥 Change API response format
```

**Version Mapping:**

- 💥 (boom) → Major (breaking change)
- ✨ (sparkles) → Minor (new feature)
- 🐛 (bug) → Patch (bug fix)
- Others → Patch or no bump

### 2. **Angular Commit Guidelines**

Stricter version of Conventional Commits with scope requirements.

```
feat(auth): add OAuth2 support
fix(api): correct rate limiting logic
docs(readme): update installation steps
```

**Differences from Conventional Commits:**

- Scope is mandatory (not optional)
- Stricter format validation
- Footer format requirements

### 3. **Semantic Commit Messages** (Jeremy Mack)

Human-readable format focusing on clarity.

```
Add: user profile page
Change: update button styles to match new design
Fix: resolve memory leak in data processing
Remove: legacy authentication system
```

**Version Mapping:**

- Breaking: → Major
- Add: → Minor
- Fix: → Patch
- Change:, Update: → Patch

### 4. **Chris Beams Style**

Focus on imperative mood and 50-character limit.

```
Add user authentication via OAuth
Fix memory leak in data processor
Refactor database connection pooling
```

**Challenge:** No explicit type indicators, would need keyword detection.

### 5. **Karma Runner Convention**

Similar to Angular but with different type vocabulary.

```
feat: add new test reporter
fix: correct async test handling
docs: update configuration guide
```

## Proposed Architecture

### 1. **Convention Interface**

```typescript
export interface CommitConvention {
  /** Unique identifier for the convention */
  id: string;

  /** Display name */
  name: string;

  /** Description of the convention */
  description: string;

  /** Parse a commit message according to this convention */
  parse(message: string): ParsedCommit | null;

  /** Determine version bump type from parsed commit */
  getBumpType(commit: ParsedCommit): BumpType | null;

  /** Format commit for changelog */
  formatForChangelog(commit: ParsedCommit): ChangelogEntry;

  /** Validate if a message follows this convention */
  validate(message: string): ValidationResult;

  /** Auto-detect if repository uses this convention */
  detect?(commits: string[]): number; // confidence score 0-100
}

export interface ParsedCommit {
  /** Type of change (feat, fix, etc. or emoji) */
  type: string;

  /** Scope of change (optional) */
  scope?: string;

  /** Description of change */
  description: string;

  /** Full commit body (optional) */
  body?: string;

  /** Breaking change indicator */
  breakingChange: boolean;

  /** Original raw message */
  raw: string;

  /** Convention-specific metadata */
  metadata?: Record<string, unknown>;
}
```

### 2. **Built-in Conventions**

```typescript
// src/conventions/conventional-commits.ts
export class ConventionalCommitsConvention implements CommitConvention {
  id = "conventional-commits";
  name = "Conventional Commits";
  description = "https://www.conventionalcommits.org/";

  parse(message: string): ParsedCommit | null {
    // Existing parsing logic
  }

  getBumpType(commit: ParsedCommit): BumpType | null {
    if (commit.breakingChange) return BumpType.MAJOR;
    if (commit.type === "feat") return BumpType.MINOR;
    if (commit.type === "fix") return BumpType.PATCH;
    return null;
  }
}

// src/conventions/gitmoji.ts
export class GitmojiConvention implements CommitConvention {
  id = "gitmoji";
  name = "Gitmoji";
  description = "https://gitmoji.dev/";

  private emojiMap = {
    "💥": { type: "breaking", bump: BumpType.MAJOR },
    "✨": { type: "feat", bump: BumpType.MINOR },
    "🐛": { type: "fix", bump: BumpType.PATCH },
    "📝": { type: "docs", bump: BumpType.PATCH },
    "💄": { type: "style", bump: BumpType.PATCH },
    "♻️": { type: "refactor", bump: BumpType.PATCH },
    "⚡️": { type: "perf", bump: BumpType.PATCH },
    "✅": { type: "test", bump: null },
    // ... more emoji mappings
  };

  parse(message: string): ParsedCommit | null {
    const emojiRegex = /^([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}])/u;
    const match = message.match(emojiRegex);

    if (!match) return null;

    const emoji = match[1];
    const mapping = this.emojiMap[emoji];
    if (!mapping) return null;

    return {
      type: mapping.type,
      description: message.slice(emoji.length).trim(),
      breakingChange: mapping.type === "breaking",
      raw: message,
      metadata: { emoji },
    };
  }
}
```

### 3. **Configuration Integration**

```typescript
export interface NagareConfig {
  // ... existing config

  /**
   * Commit message convention to use
   * @default "conventional-commits"
   */
  commitConvention?: string | CommitConvention;

  /**
   * Additional custom conventions
   */
  customConventions?: CommitConvention[];

  /**
   * Auto-detect convention from commit history
   * @default false
   */
  autoDetectConvention?: boolean;
}
```

### 4. **Usage Examples**

```typescript
// nagare.config.ts with Gitmoji
export default {
  project: {
    name: "My App",
    repository: "https://github.com/user/app",
  },
  commitConvention: "gitmoji",
  versionFile: {
    path: "./version.ts",
    template: "typescript",
  },
} as NagareConfig;

// Custom convention
class TeamConvention implements CommitConvention {
  id = "team-style";
  name = "Our Team Style";

  parse(message: string): ParsedCommit | null {
    // [FEATURE] Add user profile
    // [BUGFIX] Resolve login issue
    // [BREAKING] Remove v1 API

    const match = message.match(/^\[(\w+)\]\s*(.+)/);
    if (!match) return null;

    const [, tag, description] = match;

    return {
      type: tag.toLowerCase(),
      description,
      breakingChange: tag === "BREAKING",
      raw: message,
    };
  }

  getBumpType(commit: ParsedCommit): BumpType | null {
    if (commit.type === "breaking") return BumpType.MAJOR;
    if (commit.type === "feature") return BumpType.MINOR;
    if (commit.type === "bugfix") return BumpType.PATCH;
    return null;
  }
}

export default {
  commitConvention: new TeamConvention(),
  // ... rest of config
} as NagareConfig;
```

## Implementation Plan

### Phase 1: Core Architecture

1. Create `CommitConvention` interface
2. Refactor existing parser to implement interface
3. Add convention registry system
4. Update GitOperations to use conventions

### Phase 2: Built-in Conventions

1. Implement Gitmoji convention
2. Implement Angular convention
3. Implement Semantic Messages convention
4. Add auto-detection logic

### Phase 3: Integration

1. Update configuration to support conventions
2. Add CLI option: `--convention gitmoji`
3. Update changelog generation for different formats
4. Add convention validation command

### Phase 4: Documentation

1. Document each built-in convention
2. Create guide for custom conventions
3. Add examples and migration guides

## Auto-Detection Algorithm

```typescript
async function detectConvention(commits: string[]): Promise<string> {
  const conventions = [
    new ConventionalCommitsConvention(),
    new GitmojiConvention(),
    new AngularConvention(),
    // ... other conventions
  ];

  const scores = new Map<string, number>();

  for (const convention of conventions) {
    let matchCount = 0;

    for (const commit of commits) {
      if (convention.validate(commit).valid) {
        matchCount++;
      }
    }

    const score = (matchCount / commits.length) * 100;
    scores.set(convention.id, score);
  }

  // Return convention with highest score
  const [bestConvention] = [...scores.entries()]
    .sort(([, a], [, b]) => b - a)[0];

  return bestConvention;
}
```

## Changelog Format Customization

Different conventions should produce appropriate changelog formats:

### Conventional Commits

```markdown
### Features

- **auth:** add OAuth2 support
- **api:** implement rate limiting

### Bug Fixes

- **ui:** fix button alignment issue
```

### Gitmoji

```markdown
### ✨ Features

- Add OAuth2 support
- Implement rate limiting

### 🐛 Bug Fixes

- Fix button alignment issue
```

## Migration Support

Provide tools to help teams migrate between conventions:

```bash
# Analyze current convention usage
nagare analyze-commits

# Convert commit messages (dry-run)
nagare convert-commits --from conventional --to gitmoji --dry-run

# Validate commits against convention
nagare validate-commits --convention angular
```

## Testing Strategy

1. **Unit Tests** - Each convention implementation
2. **Integration Tests** - Convention with version calculation
3. **Detection Tests** - Auto-detection accuracy
4. **Migration Tests** - Conversion between formats

## Considerations

### Pros

- Supports diverse team preferences
- Makes Nagare more universally applicable
- Encourages consistent commit messages
- Extensible for future conventions

### Cons

- Increases complexity
- More documentation needed
- Potential confusion with multiple options
- Changelog format variations

## Alternative Approach: Commit Message Transformer

Instead of full convention support, provide a simpler transformer system:

```typescript
export interface CommitTransformer {
  /** Transform any commit message to Conventional Commits format */
  transform(message: string): string;
}

// Usage
export default {
  commitTransformer: {
    transform(message: string): string {
      // Convert "🐛 Fix login" to "fix: Fix login"
      const emojiMap = {
        "🐛": "fix",
        "✨": "feat",
        "💥": "feat!",
      };

      for (const [emoji, type] of Object.entries(emojiMap)) {
        if (message.startsWith(emoji)) {
          return `${type}: ${message.slice(emoji.length).trim()}`;
        }
      }

      return message;
    },
  },
} as NagareConfig;
```

This simpler approach:

- Keeps core logic unchanged
- Transforms messages to Conventional Commits
- Easier to implement and maintain
- Less flexible but covers common use cases

## Recommendation

Start with the **transformer approach** for v2.1:

1. Simpler implementation
2. Covers 80% of use cases
3. Can evolve to full convention support later
4. Maintains backward compatibility

Then consider full convention support for v3.0 based on community feedback.

## Community Input Needed

Before implementation, gather feedback on:

1. Which conventions are most important
2. Transformer vs full convention support
3. Changelog format preferences
4. Migration tool requirements
