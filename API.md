# Nagare API Reference

## Core Classes

### ReleaseManager

The main class for managing releases.

```typescript
import { ReleaseManager } from "jsr:@rick/nagare";
```

#### Constructor

```typescript
new ReleaseManager(config: NagareConfig)
```

**Parameters:**

- `config` - Configuration object implementing the `NagareConfig` interface

**Example:**

```typescript
const releaseManager = new ReleaseManager({
  projectName: "My Project",
  repository: "https://github.com/user/repo",
  versionFile: {
    path: "./version.ts",
    template: "typescript",
  },
});
```

#### Methods

##### `release(bumpType?: BumpType): Promise<ReleaseResult>`

Performs a complete release process.

**Parameters:**

- `bumpType` (optional) - Version bump type: `"major"`, `"minor"`, `"patch"`, or `"prerelease"`

**Returns:** `Promise<ReleaseResult>`

**Example:**

```typescript
// Automatic version bump based on conventional commits
const result = await releaseManager.release();

// Manual version bump
const result = await releaseManager.release("minor");
```

##### `generateDocs(): Promise<void>`

Generates documentation using Deno's built-in documentation generator.

**Example:**

```typescript
await releaseManager.generateDocs();
```

---

### GitOperations

Utility class for Git operations.

```typescript
import { GitOperations } from "jsr:@rick/nagare";
```

#### Static Methods

##### `getCurrentVersion(): Promise<string>`

Gets the current version from git tags.

**Returns:** `Promise<string>` - Current version string

##### `getLastReleaseTag(): Promise<string>`

Gets the last release tag.

**Returns:** `Promise<string>` - Last release tag

##### `getCommitsSince(tag: string): Promise<ConventionalCommit[]>`

Gets commits since a specific tag.

**Parameters:**

- `tag` - Git tag to compare from

**Returns:** `Promise<ConventionalCommit[]>` - Array of parsed commits

##### `createTag(version: string, message?: string): Promise<void>`

Creates a git tag.

**Parameters:**

- `version` - Version string for the tag
- `message` (optional) - Tag message

##### `pushTag(version: string): Promise<void>`

Pushes a tag to remote repository.

**Parameters:**

- `version` - Version string of tag to push

---

### VersionUtils

Semantic versioning utilities.

```typescript
import { VersionUtils } from "jsr:@rick/nagare";
```

#### Static Methods

##### `parseVersion(version: string): SemanticVersion`

Parses a version string into components.

**Parameters:**

- `version` - Version string (e.g., "1.2.3")

**Returns:** `SemanticVersion` object with major, minor, patch properties

**Example:**

```typescript
const parsed = VersionUtils.parseVersion("1.2.3");
// { major: 1, minor: 2, patch: 3 }
```

##### `bumpVersion(currentVersion: string, bumpType: BumpType): string`

Bumps a version according to semantic versioning rules.

**Parameters:**

- `currentVersion` - Current version string
- `bumpType` - Type of bump to perform

**Returns:** `string` - New version string

**Example:**

```typescript
const newVersion = VersionUtils.bumpVersion("1.2.3", "minor");
// "1.3.0"
```

##### `calculateBump(commits: ConventionalCommit[]): BumpType`

Calculates the appropriate version bump based on conventional commits.

**Parameters:**

- `commits` - Array of conventional commits

**Returns:** `BumpType` - Recommended bump type

---

### ChangelogGenerator

Generates changelogs following Keep a Changelog format.

```typescript
import { ChangelogGenerator } from "jsr:@rick/nagare";
```

#### Constructor

```typescript
new ChangelogGenerator(config: NagareConfig)
```

#### Methods

##### `generateReleaseNotes(commits: ConventionalCommit[], version: string): ReleaseNotes`

Generates release notes from conventional commits.

**Parameters:**

- `commits` - Array of conventional commits
- `version` - Version being released

**Returns:** `ReleaseNotes` - Structured release notes

##### `updateChangelog(releaseNotes: ReleaseNotes): Promise<void>`

Updates the CHANGELOG.md file.

**Parameters:**

- `releaseNotes` - Release notes to add

---

### GitHubIntegration

GitHub release management.

```typescript
import { GitHubIntegration } from "jsr:@rick/nagare";
```

#### Constructor

```typescript
new GitHubIntegration(config: GitHubConfig)
```

#### Methods

##### `createRelease(releaseNotes: ReleaseNotes): Promise<void>`

Creates a GitHub release.

**Parameters:**

- `releaseNotes` - Release notes for the GitHub release

##### `isGitHubCliAvailable(): Promise<boolean>`

Checks if GitHub CLI is available.

**Returns:** `Promise<boolean>` - True if GitHub CLI is available

---

### RollbackManager

Handles release rollbacks.

```typescript
import { RollbackManager } from "jsr:@rick/nagare";
```

#### Methods

##### `rollback(version: string, options?: RollbackOptions): Promise<void>`

Rolls back to a previous version.

**Parameters:**

- `version` - Version to rollback to
- `options` (optional) - Rollback options

**Example:**

```typescript
const rollback = new RollbackManager();
await rollback.rollback("1.2.0", {
  removeTags: true,
  resetCommits: true,
  restoreFiles: true,
});
```

---

### TemplateProcessor

Processes templates for version files and release notes.

```typescript
import { TemplateProcessor } from "jsr:@rick/nagare";
```

#### Static Methods

##### `processTemplate(template: string, context: TemplateContext): string`

Processes a template with the given context.

**Parameters:**

- `template` - Template string with placeholders
- `context` - Context object with replacement values

**Returns:** `string` - Processed template

**Example:**

```typescript
const template = "Version: {{version}}, Date: {{buildDate}}";
const context = { version: "1.2.3", buildDate: "2024-01-15" };
const result = TemplateProcessor.processTemplate(template, context);
// "Version: 1.2.3, Date: 2024-01-15"
```

---

### FileHandlerManager (v1.1.0+)

Manages intelligent file handlers for automatic version updates.

```typescript
import { FileHandlerManager } from "jsr:@rick/nagare";
```

#### Constructor

```typescript
new FileHandlerManager();
```

#### Methods

##### `getHandler(filepath: string): FileHandler | undefined`

Finds a handler for the given file path.

**Parameters:**

- `filepath` - Path to the file

**Returns:** `FileHandler | undefined` - Matching handler or undefined

##### `hasHandler(filepath: string): boolean`

Checks if a handler exists for the file.

**Parameters:**

- `filepath` - Path to the file

**Returns:** `boolean` - True if a handler exists

##### `updateFile(filepath: string, data: TemplateData): Promise<UpdateResult>`

Updates a file using its handler.

**Parameters:**

- `filepath` - Path to the file to update
- `data` - Template data containing version and other values

**Returns:** `Promise<UpdateResult>` - Update result with changes

##### `previewChanges(filepath: string, content: string, data: TemplateData): PreviewChange[]`

Preview changes without modifying the file.

**Parameters:**

- `filepath` - Path to the file
- `content` - Current file content
- `data` - Template data

**Returns:** `PreviewChange[]` - Array of preview changes

#### Built-in Handlers

The FileHandlerManager includes handlers for:

- **JSON Files**: `deno.json`, `package.json`, `jsr.json`
- **TypeScript**: `version.ts`, `constants.ts`
- **Markdown**: `README.md` (updates badges and version references)
- **YAML**: `.yaml`, `.yml` files
- **Language-specific**: `Cargo.toml`, `pyproject.toml`

**Example:**

```typescript
const fileHandler = new FileHandlerManager();

// Check if file has a handler
if (fileHandler.hasHandler("./deno.json")) {
  // Update the file
  const result = await fileHandler.updateFile("./deno.json", {
    version: "1.2.3",
    previousVersion: "1.2.2",
    buildDate: new Date().toISOString(),
  });
}

// Preview changes without applying
const preview = fileHandler.previewChanges(
  "./README.md",
  readmeContent,
  { version: "1.2.3" },
);
```

## Type Definitions

### NagareConfig

Main configuration interface.

```typescript
interface NagareConfig {
  projectName: string;
  repository: string;
  versionFile: VersionFileConfig;
  releaseNotes?: ReleaseNotesConfig;
  github?: GitHubConfig;
  updateFiles?: FileUpdatePattern[];
  commitTypes?: CommitTypeMapping;
  metadata?: Record<string, unknown>;
  generateDocs?: boolean;
  docsDir?: string;
}
```

### VersionFileConfig

Configuration for version file handling.

```typescript
interface VersionFileConfig {
  path: string;
  template: VersionFileFormat;
  customTemplate?: string;
  patterns?: {
    version?: RegExp;
    buildDate?: RegExp;
    gitCommit?: RegExp;
    [key: string]: RegExp | undefined;
  };
  encoding?: string;
}
```

### GitHubConfig

GitHub integration configuration.

```typescript
interface GitHubConfig {
  owner: string;
  repo: string;
  releaseTemplate?: string;
  autoRelease?: boolean;
  autoPushTags?: boolean;
}
```

### ConventionalCommit

Parsed conventional commit structure.

```typescript
interface ConventionalCommit {
  type: string;
  scope?: string;
  description: string;
  body?: string;
  breakingChange?: boolean;
  hash: string;
  date: string;
  fullMessage?: string;
}
```

### ReleaseNotes

Release notes structure following Keep a Changelog format.

```typescript
interface ReleaseNotes {
  version: string;
  date: string;
  added: string[];
  changed: string[];
  deprecated: string[];
  removed: string[];
  fixed: string[];
  security: string[];
}
```

### ReleaseResult

Result of a release operation.

```typescript
interface ReleaseResult {
  success: boolean;
  previousVersion: string;
  newVersion: string;
  releaseNotes: ReleaseNotes;
  updatedFiles: string[];
  gitOperations: string[];
  error?: string;
}
```

### FileHandler (v1.1.0+)

Interface for file handlers.

```typescript
interface FileHandler {
  id: string; // Unique identifier
  name: string; // Human-readable name
  detector: (filepath: string) => boolean; // Matches files by path
  patterns: Record<string, RegExp>; // Named regex patterns
  validators?: { // Optional validators
    json?: (obj: any) => void;
    yaml?: (obj: any) => void;
  };
  replacer?: (match: RegExpExecArray, data: TemplateData) => string;
  validate?: (content: string) => void; // Post-update validation
}
```

### FileUpdatePattern

Configuration for file updates.

```typescript
interface FileUpdatePattern {
  path: string; // File path to update
  patterns?: { // Named patterns (optional with v1.1.0+)
    version?: RegExp;
    [key: string]: RegExp | undefined;
  };
  updateFn?: (content: string, data: TemplateData) => string; // Custom update function
}
```

**Note:** As of v1.1.0, if a file has a built-in handler, you can omit both `patterns` and
`updateFn`.

## Constants

### DEFAULT_COMMIT_TYPES

Default mapping of conventional commit types to changelog sections.

```typescript
const DEFAULT_COMMIT_TYPES: CommitTypeMapping = {
  feat: "added",
  fix: "fixed",
  perf: "changed",
  refactor: "changed",
  style: "changed",
  docs: "changed",
  test: "changed",
  build: "changed",
  ci: "changed",
  chore: "changed",
  revert: "changed",
  security: "security",
  breaking: "changed",
};
```

### SUPPORTED_VERSION_FILE_FORMATS

Supported version file formats.

```typescript
const SUPPORTED_VERSION_FILE_FORMATS = [
  "typescript",
  "json",
  "yaml",
  "custom",
] as const;
```

## CLI Usage

### Command Line Interface

```bash
# Basic usage
deno run -A jsr:@rick/nagare/cli [bump-type]

# Examples
deno run -A jsr:@rick/nagare/cli minor
deno run -A jsr:@rick/nagare/cli major
deno run -A jsr:@rick/nagare/cli patch

# With options
deno run -A jsr:@rick/nagare/cli minor --config ./custom-config.ts
deno run -A jsr:@rick/nagare/cli patch --dry-run
deno run -A jsr:@rick/nagare/cli --version 1.2.3
```

### CLI Options

- `--config` - Path to configuration file
- `--dry-run` - Show what would be done without making changes
- `--verbose` - Show detailed output
- `--skip-github` - Skip GitHub release creation
- `--skip-changelog` - Skip changelog update
- `--force` - Force operation even with warnings
- `--version` - Specify exact version (overrides bump type)

## Error Handling

### Common Error Types

#### `NagareError`

Base error class for Nagare-specific errors.

```typescript
class NagareError extends Error {
  code: string;
  details?: Record<string, unknown>;
}
```

#### Error Codes

- `NO_COMMITS` - No commits found since last release
- `INVALID_CONFIG` - Configuration validation failed
- `GIT_ERROR` - Git operation failed
- `GITHUB_ERROR` - GitHub operation failed
- `FILE_ERROR` - File operation failed
- `VERSION_ERROR` - Version parsing/calculation failed

### Error Handling Example

```typescript
try {
  const result = await releaseManager.release("minor");
  console.log(`Released version ${result.newVersion}`);
} catch (error) {
  if (error instanceof NagareError) {
    switch (error.code) {
      case "NO_COMMITS":
        console.log("No new commits to release");
        break;
      case "GITHUB_ERROR":
        console.log("GitHub release failed, but local release succeeded");
        break;
      default:
        console.error("Release failed:", error.message);
    }
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## Runtime Compatibility

### Cross-Runtime APIs

Nagare provides cross-runtime compatibility through internal abstractions:

#### FileSystem

```typescript
// Works on Deno, Node.js, and Bun
await FileSystem.readTextFile("./package.json");
await FileSystem.writeTextFile("./version.ts", content);
await FileSystem.exists("./CHANGELOG.md");
```

#### Process

```typescript
// Execute commands across runtimes
const result = await Process.exec("git", ["status"]);
const envVar = Process.getEnv("NODE_ENV");
```

#### Console

```typescript
// Cross-runtime console utilities
Console.log("Success!", "green");
const input = await Console.prompt("Enter version:");
const confirmed = await Console.confirm("Proceed with release?");
```

### Runtime Detection

```typescript
import { Runtime } from "jsr:@rick/nagare/runtime-compat";

if (Runtime.isDeno) {
  // Deno-specific code
} else if (Runtime.isNode) {
  // Node.js-specific code
} else if (Runtime.isBun) {
  // Bun-specific code
}
```

## Safe File Update Patterns

### Recommended Patterns

For JSON files (deno.json, package.json):

```typescript
updateFiles: [
  {
    path: "./deno.json",
    patterns: {
      // ✅ SAFE: Line-anchored pattern prevents matching task definitions
      version: /^(\s*)"version":\s*"([^"]+)"/m,
    },
  },
  {
    path: "./package.json",
    patterns: {
      // ✅ SAFE: Line-anchored pattern only matches top-level version
      version: /^(\s*)"version":\s*"([^"]+)"/m,
    },
  },
];
```

For other file types:

```typescript
updateFiles: [
  {
    path: "./README.md",
    patterns: {
      // ✅ SAFE: Specific version badge pattern
      version: /(\[Version\s+)(\d+\.\d+\.\d+)(\])/g,
    },
  },
  {
    path: "./src/constants.yaml",
    patterns: {
      // ✅ SAFE: Line-anchored YAML pattern
      version: /^(\s*version:\s*)(['"]?)([^'"\n]+)(['"]?)$/m,
    },
  },
];
```

### Dangerous Patterns to Avoid

```typescript
updateFiles: [
  {
    path: "./deno.json",
    patterns: {
      // ❌ DANGEROUS: Can match ANY "version": in the file
      // This can corrupt task definitions like:
      // "version": "deno run --allow-read version-check.ts"
      version: /"version":\s*"([^"]+)"/,
    },
  },
];
```

### Pattern Validation

Nagare automatically validates your file update patterns and will warn you about potentially
dangerous configurations:

```
⚠️  Dangerous pattern detected in ./deno.json for key "version"
   Pattern: "version":\s*"([^"]+)"
   Issue: This pattern may match unintended content
   Recommended: ^(\s*)"version":\s*"([^"]+)"
```

## Examples

### Complete Configuration Example

```typescript
import type { NagareConfig } from "jsr:@rick/nagare/types";

export const config: NagareConfig = {
  projectName: "Awesome Library",
  repository: "https://github.com/user/awesome-lib",

  versionFile: {
    path: "./src/version.ts",
    template: "custom",
    customTemplate: `
export const VERSION = "{{version}}";
export const BUILD_DATE = "{{buildDate}}";
export const GIT_COMMIT = "{{gitCommit}}";

export const LIBRARY_INFO = {
  name: "{{projectName}}",
  version: VERSION,
  buildDate: BUILD_DATE,
  repository: "{{repository}}"
} as const;
`,
  },

  releaseNotes: {
    includeCommitHashes: true,
    maxItemsPerSection: 15,
    features: ["TypeScript", "Multi-runtime", "CLI"],
    endpoints: ["/api/v1", "/api/v2"],
  },

  github: {
    owner: "user",
    repo: "awesome-lib",
    autoRelease: true,
    autoPushTags: true,
    releaseTemplate: `
## 🚀 Release v{{version}}

{{#if added.length}}
### ✨ New Features
{{#each added}}
- {{this}}
{{/each}}
{{/if}}

{{#if fixed.length}}
### 🐛 Bug Fixes
{{#each fixed}}
- {{this}}
{{/each}}
{{/if}}

**Install:** \`deno add jsr:@user/awesome-lib@{{version}}\`
`,
  },

  updateFiles: [
    {
      path: "./deno.json",
      patterns: {
        // ✅ SAFE: Line-anchored pattern
        version: /^(\s*)"version":\s*"([^"]+)"/m,
      },
    },
    {
      path: "./README.md",
      patterns: {
        version: /@user\/awesome-lib@([^\s\)]+)/g,
        badge: /awesome--lib-([^-]+)-blue/g,
      },
    },
  ],

  commitTypes: {
    feat: "added",
    fix: "fixed",
    perf: "changed",
    enhance: "changed",
    security: "security",
    breaking: "changed",
  },

  generateDocs: true,
  docsDir: "./docs",

  metadata: {
    author: "Your Name",
    license: "MIT",
    keywords: ["release", "versioning", "automation"],
  },
};
```

### Advanced Usage Example

```typescript
import { GitOperations, ReleaseManager, RollbackManager, VersionUtils } from "jsr:@rick/nagare";

// Custom release workflow
async function customRelease() {
  const releaseManager = new ReleaseManager(config);

  try {
    // Check for unreleased commits
    const commits = await GitOperations.getCommitsSince("HEAD");
    if (commits.length === 0) {
      console.log("No commits to release");
      return;
    }

    // Calculate recommended bump
    const recommendedBump = VersionUtils.calculateBump(commits);
    console.log(`Recommended bump: ${recommendedBump}`);

    // Confirm with user
    const proceed = await Console.confirm(`Release ${recommendedBump} version?`);
    if (!proceed) return;

    // Perform release
    const result = await releaseManager.release(recommendedBump);

    console.log(`✅ Released ${result.newVersion}`);
    console.log(`📝 Updated files: ${result.updatedFiles.join(", ")}`);
  } catch (error) {
    console.error("Release failed:", error.message);

    // Offer rollback
    const rollback = await Console.confirm("Rollback changes?");
    if (rollback) {
      const rollbackManager = new RollbackManager();
      await rollbackManager.rollback(previousVersion);
    }
  }
}
```

---

For more examples and guides, see the [FAQ](./FAQ.md) and
[GitHub repository](https://github.com/rick/nagare).
