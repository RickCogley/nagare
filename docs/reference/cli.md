# CLI Commands Reference

## Overview

The Nagare CLI provides commands for release management, version control, and project initialization. All commands
support both interactive and non-interactive modes.

## Synopsis

```bash
nagare [command] [arguments] [options]
nagare release [bumpType] [options]
nagare rollback [version] [options]
nagare retry [version] [options]
nagare init [options]
```

## Description

Nagare's CLI interface manages semantic versioning releases following conventional commits. It handles version bumping,
changelog generation, git tagging, and optional GitHub release creation. The CLI requires Deno runtime due to file
system and process APIs.

## Commands

### `release` {#release}

**Aliases**: Default command when none specified\
**Arguments**: `[bumpType]` - Optional: `major`, `minor`, or `patch`\
**Description**: Create a new release with automatic or manual version bump

Performs a full release cycle including:

- Analyzing commits to determine version bump (if not specified)
- Updating version files and configured files
- Generating changelog entries
- Creating git commit and tag
- Optionally creating GitHub release

**Examples**:

```bash
# Auto-determine version bump from commits
nagare release

# Force specific version bump
nagare release minor

# Preview without making changes
nagare release --dry-run

# Non-interactive mode
nagare release patch --skip-confirmation
```

### `rollback` {#rollback}

**Arguments**: `[version|tag]` - Version number or git tag to rollback\
**Description**: Rollback to a previous release by version or tag

Reverses a release by:

- Restoring previous file states from git history
- Removing git tags (local and remote)
- Optionally deleting GitHub release
- Creating rollback commit

**Examples**:

```bash
# Rollback to specific version
nagare rollback 1.2.0

# Rollback by tag
nagare rollback v1.2.0

# Rollback last release (interactive)
nagare rollback

# Preview rollback changes
nagare rollback 1.2.0 --dry-run
```

### `retry` {#retry}

**Arguments**: `[version]` - Version to retry\
**Description**: Retry a failed release

Retries a release that failed during CI/CD by:

- Cleaning up existing tags (local and remote)
- Pulling latest changes
- Re-running release process for specified version

**Examples**:

```bash
# Retry specific version
nagare retry 1.2.3

# Retry last tagged version
nagare retry

# With custom config
nagare retry 1.2.3 --config ./custom-nagare.config.ts
```

### `init` {#init}

**Arguments**: None **Description**: Initialize Nagare in current directory

Creates initial setup including:

- `nagare-launcher.ts` for local execution.
- `nagare.config.ts` with example configuration.
- Optional AI auto-fix configuration.
- Suggested deno.json task entries.

**Examples**:

```bash
# Initialize project
nagare init

# Initialize with custom language
nagare init --lang ja
```

## Options

### `--help` / `-h` {#help}

Display comprehensive help information including usage examples and configuration guidance.

**Example**:

```bash
nagare --help
```

### `--version` / `-v` {#version}

Display Nagare version number.

**Example**:

```bash
nagare --version
# Output: Nagare v2.9.1
```

### `--version-detailed` {#version-detailed}

Display detailed version information including build info and release notes.

**Example**:

```bash
nagare --version-detailed
```

**Output includes**:

- Application metadata (name, description, repository)
- Build information (date, commit, environment)
- Release notes for current version
- Runtime information (Deno, V8, TypeScript versions)

### `--version-json` {#version-json}

Output version information as structured JSON for programmatic access.

**Example**:

```bash
nagare --version-json | jq .nagare.version
```

### `--config` / `-c` {#config}

**Type**: `string` **Description**: Path to custom configuration file

Override default configuration file location.

**Example**:

```bash
nagare release --config ./custom-nagare.config.ts
```

### `--dry-run` {#dry-run}

**Type**: `boolean` **Description**: Preview changes without applying them

Shows what would be changed without modifying files or creating commits.

**Example**:

```bash
nagare release minor --dry-run
```

### `--skip-confirmation` / `-y` {#skip-confirmation}

**Type**: `boolean` **Description**: Skip confirmation prompts for automation

Essential for CI/CD pipelines and automated workflows.

**Example**:

```bash
# Non-interactive release
nagare release patch --skip-confirmation

# Automated rollback
nagare rollback 1.2.0 -y
```

### `--log-level` {#log-level}

**Type**: `string`\
**Values**: `DEBUG`, `INFO`, `WARN`, `ERROR`\
**Description**: Set logging verbosity

Control the amount of output during operations.

**Example**:

```bash
# Debug mode for troubleshooting
nagare release --log-level DEBUG

# Quiet mode for scripts
nagare release --log-level ERROR
```

### `--lang` {#lang}

**Type**: `string`\
**Values**: `en`, `ja`\
**Description**: Set language for messages

Override language detection for CLI output.

**Example**:

```bash
# Use Japanese messages
nagare release --lang ja

# Force English
nagare init --lang en
```

## Exit Codes

| Code | Description                                 |
| ---- | ------------------------------------------- |
| 0    | Success                                     |
| 1    | General error (validation, git state, etc.) |
| 2    | Configuration error                         |
| 3    | File operation error                        |

## Configuration Files

Nagare looks for configuration in these locations (in order):

1. Path specified with `--config`
2. `./nagare.config.ts`
3. `./nagare.config.js`
4. `./release.config.ts`
5. `./.nagarerc.ts`

## Environment Variables

| Variable        | Description                | Default       |
| --------------- | -------------------------- | ------------- |
| `NAGARE_DEBUG`  | Enable debug output        | `false`       |
| `NAGARE_LANG`   | Default language           | System locale |
| `NAGARE_LOCALE` | Alternative to NAGARE_LANG | System locale |
| `GITHUB_TOKEN`  | GitHub authentication      | None          |
| `CI`            | CI environment flag        | Auto-detected |

## Workflow Examples

### Standard Release Workflow

```bash
# 1. Check current status
git status

# 2. Preview release
nagare release --dry-run

# 3. Perform release
nagare release

# 4. Push changes
git push && git push --tags
```

### CI/CD Automation

```bash
# In GitHub Actions or similar
nagare release --skip-confirmation --log-level INFO
```

### Emergency Rollback

```bash
# 1. Identify problematic version
nagare --version-detailed

# 2. Preview rollback
nagare rollback 2.0.0 --dry-run

# 3. Perform rollback
nagare rollback 2.0.0

# 4. Push rollback
git push
```

### Failed Release Recovery

```bash
# When CI fails after tag creation
# 1. Clean up failed release
nagare retry 1.2.3

# 2. Fix issues
# ... make necessary fixes ...

# 3. Retry with same version
nagare release patch --skip-confirmation
```

## Shebang Execution

The CLI can be executed directly with proper permissions:

```bash
#!/usr/bin/env deno run --allow-read --allow-write --allow-run --allow-net

# Make executable
chmod +x cli.ts

# Run directly
./cli.ts release
```

## Required Permissions

Nagare requires these Deno permissions:

- `--allow-read`: Read configuration and source files
- `--allow-write`: Update version files and create commits
- `--allow-run`: Execute git commands
- `--allow-net`: Create GitHub releases (optional)

For convenience, use `--allow-all` or `-A`:

```bash
deno run -A cli.ts release
```

## Common Issues

### Git State Errors

**Problem**: "Git working directory not clean"\
**Solution**: Commit or stash changes before release

```bash
git add .
git commit -m "chore: prepare for release"
nagare release
```

### Configuration Not Found

**Problem**: "No configuration file found"\
**Solution**: Run init or create config manually

```bash
nagare init
# Edit nagare.config.ts
nagare release
```

### Version Conflict

**Problem**: "Version already exists"\
**Solution**: Use retry command to clean up

```bash
nagare retry 1.2.3
```

## Advanced Usage

### Custom Version File Updates

```bash
# With custom update function in config
nagare release --dry-run  # Preview custom updates
nagare release            # Apply updates
```

### Multi-Language Projects

```bash
# Switch languages per command
nagare release --lang en
nagare rollback --lang ja
```

### Debug Failed Releases

```bash
# Maximum verbosity
nagare release --log-level DEBUG --dry-run > debug.log 2>&1
```

## See also

- [Configuration Reference](./reference-configuration.md) - All configuration options
- [Template Reference](./reference-templates.md) - Template syntax and variables
- [Getting Started Guide](./guide-getting-started.md) - Initial setup
- [Troubleshooting Guide](./guide-troubleshooting.md) - Common problems and solutions
