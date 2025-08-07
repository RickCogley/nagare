# Release Module

## Purpose

Core release orchestration and file management. This is the main module that coordinates all aspects of the release
process.

## Key Components

- **release-manager.ts** - Main orchestrator that coordinates the entire release flow
- **version-utils.ts** - Semantic version calculations and parsing
- **file-handlers.ts** - Intelligent file type detection and updates
- **rollback-manager.ts** - Safe rollback to previous versions
- **backup-manager.ts** - Backup creation before modifications
- **release-state-tracker.ts** - Track release progress for recovery

## Release Flow

1. **Validation** - Check git state, permissions, configuration
2. **Backup** - Create backups of files to be modified
3. **Version Calculation** - Analyze commits to determine bump
4. **File Updates** - Update version in all configured files
5. **Changelog** - Generate and update CHANGELOG.md
6. **Git Operations** - Commit, tag, push
7. **GitHub Release** - Create release with notes
8. **Verification** - Verify JSR publication if configured

## Key Classes

### ReleaseManager

The main orchestrator (2354 lines) that:

- Validates environment and configuration
- Coordinates all release steps
- Handles dry-run mode
- Manages rollback on failure
- Provides progress updates

### VersionUtils

- `calculateNewVersion()` - Determine version bump from commits
- `parseVersion()` - Parse semantic version strings
- `getCurrentVersion()` - Read version from files

### FileHandlerManager

Intelligent file updates with handlers for:

- JSON (package.json, deno.json)
- YAML (*.yml, *.yaml)
- TOML (Cargo.toml)
- TypeScript/JavaScript (version.ts, version.js)
- Markdown (README.md badges)
- Plain text files

Each handler:

- Detects file type
- Validates content
- Updates version preserving formatting
- Handles multiple version locations

### RollbackManager

- Restores previous version
- Reverts git commits
- Removes tags (local and remote)
- Restores file backups

### BackupManager

- Creates timestamped backups
- Validates backup integrity
- Provides restore capability
- Cleans up old backups

### ReleaseStateTracker

- Tracks release progress
- Enables recovery from failures
- Records completed steps
- Provides rollback points

## Configuration

```typescript
interface NagareConfig {
  project: ProjectInfo;
  versionFile: VersionFileConfig;
  updateFiles?: FileUpdatePattern[];
  github?: GitHubConfig;
  release?: ReleaseConfig;
  hooks?: ReleaseHooks;
}
```

## Error Handling

Uses enhanced errors with:

- Error codes for each failure type
- Contextual information
- Suggested fixes
- Recovery instructions

## Security

- All file paths validated
- Template sandboxing
- Input sanitization
- No sensitive data in logs

## Usage Pattern

```typescript
import { ReleaseManager } from "../release/release-manager.ts";

const manager = new ReleaseManager(config);
const result = await manager.release({
  versionBump: "minor",
  dryRun: false,
  skipConfirmation: false,
});

if (!result.success) {
  // Automatic rollback already performed
  console.error(result.error);
}
```

## Testing

- Mock file system operations
- Mock git commands
- Test rollback scenarios
- Verify state tracking
- Test handler detection
