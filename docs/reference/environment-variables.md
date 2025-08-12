# Environment Variables Reference

This document describes all environment variables that Nagare recognizes and their effects on behavior.

## Overview

Nagare uses environment variables for configuration that should not be committed to version control, such as API tokens,
or for runtime behavior modification.

## Authentication Variables

### `GITHUB_TOKEN` {#GitHub-token}

**Type**: `string`\
**Default**: None\
**Required**: Yes (for GitHub releases)

GitHub Personal Access Token or GitHub Actions token for API access.

**Permissions required**:

- `contents: write` (for creating releases)
- `metadata: read` (for repository access)

**Example**:

```bash
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**GitHub Actions**:

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Behavior Control Variables

### `NAGARE_SKIP_CONFIRMATION` {#nagare-skip-confirmation}

**Type**: `boolean`\
**Default**: `false`\
**Environment variable**: `NAGARE_SKIP_CONFIRMATION`

Skip interactive confirmation prompts. Useful for CI/CD environments.

**Example**:

```bash
export NAGARE_SKIP_CONFIRMATION=true
deno task nagare  # No confirmation prompts
```

**Valid values**: `true`, `false`, `1`, `0`

### `NAGARE_LANG` {#nagare-lang}

**Type**: `string`\
**Default**: `en`\
**Environment variable**: `NAGARE_LANG`

Set the display language for Nagare messages and output.

**Example**:

```bash
export NAGARE_LANG=ja
deno task nagare --help  # Shows help in Japanese
```

**Valid values**: `en`, `ja`

### `NAGARE_DEBUG` {#nagare-debug}

**Type**: `boolean`\
**Default**: `false`\
**Environment variable**: `NAGARE_DEBUG`

Enable debug mode for detailed logging and troubleshooting.

**Example**:

```bash
export NAGARE_DEBUG=true
deno task nagare  # Shows detailed debug information
```

**Valid values**: `true`, `false`, `1`, `0`

## Terminal and Display Variables

### `NO_COLOR` {#no-color}

**Type**: `boolean`\
**Default**: `false`\
**Environment variable**: `NO_COLOR`

Disable colored output. Follows the [NO_COLOR](https://no-color.org/) standard.

**Example**:

```bash
export NO_COLOR=1
deno task nagare  # No colored output
```

**Valid values**: Any non-empty value disables colors

### `TERM` {#term}

**Type**: `string`\
**Default**: System default\
**Environment variable**: `TERM`

Terminal type identifier. Affects ANSI escape sequence support detection.

**Example**:

```bash
export TERM=xterm-256color
```

**Common values**: `xterm`, `xterm-256color`, `screen`, `dumb`

### `CI` {#ci}

**Type**: `boolean`\
**Default**: `false`\
**Environment variable**: `CI`

Indicates running in a CI environment. Affects progress indicator display.

**Example**:

```bash
export CI=true
deno task nagare  # Uses CI-friendly output
```

**Valid values**: `true`, `false`, `1`, `0`

## Git Configuration Variables

### `GIT_AUTHOR_NAME` {#git-author-name}

**Type**: `string`\
**Default**: Git global config\
**Environment variable**: `GIT_AUTHOR_NAME`

Override git author name for release commits.

**Example**:

```bash
export GIT_AUTHOR_NAME="Release Bot"
```

### `GIT_AUTHOR_EMAIL` {#git-author-email}

**Type**: `string`\
**Default**: Git global config\
**Environment variable**: `GIT_AUTHOR_EMAIL`

Override git author email for release commits.

**Example**:

```bash
export GIT_AUTHOR_EMAIL="releases@example.com"
```

### `GIT_COMMITTER_NAME` {#git-committer-name}

**Type**: `string`\
**Default**: Git global config\
**Environment variable**: `GIT_COMMITTER_NAME`

Override git committer name for release commits.

**Example**:

```bash
export GIT_COMMITTER_NAME="CI System"
```

### `GIT_COMMITTER_EMAIL` {#git-committer-email}

**Type**: `string`\
**Default**: Git global config\
**Environment variable**: `GIT_COMMITTER_EMAIL`

Override git committer email for release commits.

**Example**:

```bash
export GIT_COMMITTER_EMAIL="ci@example.com"
```

## Security Variables

### `NAGARE_TEMPLATE_SANDBOX` {#nagare-template-sandbox}

**Type**: `string`\
**Default**: `strict`\
**Environment variable**: `NAGARE_TEMPLATE_SANDBOX`

Set template processing security level.

**Example**:

```bash
export NAGARE_TEMPLATE_SANDBOX=moderate
```

**Valid values**: `strict`, `moderate`, `disabled`

### `NAGARE_AUDIT_LOG` {#nagare-audit-log}

**Type**: `boolean`\
**Default**: `false`\
**Environment variable**: `NAGARE_AUDIT_LOG`

Enable security audit logging for file operations.

**Example**:

```bash
export NAGARE_AUDIT_LOG=true
```

**Valid values**: `true`, `false`, `1`, `0`

## Development Variables

### `NAGARE_CONFIG_PATH` {#nagare-config-path}

**Type**: `string`\
**Default**: `./nagare.config.ts`\
**Environment variable**: `NAGARE_CONFIG_PATH`

Override default configuration file path.

**Example**:

```bash
export NAGARE_CONFIG_PATH="./configs/release.config.ts"
```

### `NAGARE_CACHE_DIR` {#nagare-cache-dir}

**Type**: `string`\
**Default**: OS-specific cache directory\
**Environment variable**: `NAGARE_CACHE_DIR`

Override cache directory for temporary files.

**Example**:

```bash
export NAGARE_CACHE_DIR="/tmp/nagare-cache"
```

## AI Auto-fix Variables

### `NAGARE_AI_PROVIDER` {#nagare-ai-provider}

**Type**: `string`\
**Default**: None\
**Environment variable**: `NAGARE_AI_PROVIDER`

Override AI provider for auto-fix functionality.

**Example**:

```bash
export NAGARE_AI_PROVIDER="claude-code"
```

**Valid values**: `claude-code`, `github-copilot`, `custom`

### `NAGARE_AI_THINKING_LEVEL` {#nagare-ai-thinking-level}

**Type**: `string`\
**Default**: `think`\
**Environment variable**: `NAGARE_AI_THINKING_LEVEL`

Set AI thinking level for auto-fix analysis.

**Example**:

```bash
export NAGARE_AI_THINKING_LEVEL="megathink"
```

**Valid values**: `think`, `megathink`, `ultrathink`

## CI/CD Specific Variables

### `GITHUB_ACTIONS` {#GitHub-actions}

**Type**: `boolean`\
**Default**: `false`\
**Environment variable**: `GITHUB_ACTIONS`

Automatically set by GitHub Actions. Affects output formatting.

**Example**:

```bash
# Automatically set in GitHub Actions
echo "GITHUB_ACTIONS=true"
```

### `GITLAB_CI` {#GitLab-ci}

**Type**: `boolean`\
**Default**: `false`\
**Environment variable**: `GITLAB_CI`

Automatically set by GitLab CI. Affects output formatting.

**Example**:

```bash
# Automatically set in GitLab CI
echo "GITLAB_CI=true"
```

### `JENKINS_URL` {#jenkins-url}

**Type**: `string`\
**Default**: None\
**Environment variable**: `JENKINS_URL`

Automatically set by Jenkins. Affects CI detection.

**Example**:

```bash
# Automatically set in Jenkins
echo "JENKINS_URL=http://jenkins.example.com"
```

## Example Configurations

### Local Development

```bash
# .env file for local development
export GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export NAGARE_LANG="en"
export NAGARE_DEBUG="false"
```

### CI/CD Environment

```bash
# CI environment variables
export GITHUB_TOKEN="$GITHUB_TOKEN_SECRET"
export NAGARE_SKIP_CONFIRMATION="true"
export CI="true"
export NO_COLOR="1"
export GIT_AUTHOR_NAME="CI Bot"
export GIT_AUTHOR_EMAIL="ci@example.com"
```

### Docker Container

```bash
# Dockerfile ENV directives
ENV NAGARE_SKIP_CONFIRMATION=true
ENV NO_COLOR=1
ENV NAGARE_TEMPLATE_SANDBOX=strict
```

## Priority Order

When the same configuration is available through multiple sources, Nagare uses this priority order:

1. **Command-line flags** (highest priority)
2. **Environment variables**
3. **Configuration file** (`nagare.config.ts`)
4. **Default values** (lowest priority)

**Example**:

```bash
# Config file: lang: "ja"
# Environment: NAGARE_LANG="en"
# Command line: --lang=es
# Result: Spanish (es) - command line wins
```

## Validation

All environment variables are validated on startup:

- **Boolean values**: `true`, `false`, `1`, `0`
- **String values**: Must be non-empty when required
- **Enum values**: Must match allowed values exactly
- **Path values**: Must be valid file system paths

Invalid values result in clear error messages with suggestions.

## Security Considerations

- **Never commit tokens** to version control
- **Use CI secrets** for sensitive environment variables
- **Validate inputs** - Nagare validates all environment variables
- **Audit logging** - Enable `NAGARE_AUDIT_LOG` for security compliance

## See also

- [Configuration Reference](./configuration.md) - Configuration file options
- [CLI Reference](./cli.md) - Command-line interface
- [How to Set Up CI/CD](../how-to/setup-ci-cd.md) - CI/CD integration guide
