# How to Set Up CI/CD Integration

This guide shows you how to integrate Nagare with continuous integration and deployment pipelines. Use this approach when you want to automate releases from your CI/CD system.

## Before you begin

Ensure you have:

- Nagare configured in your project
- GitHub Actions, GitLab CI, or another CI/CD system
- GitHub CLI (`gh`) authenticated in your CI environment
- Understanding of your CI/CD platform's secrets management

## GitHub Actions integration

### Basic workflow

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0
      
      - uses: denoland/setup-deno@v1
        with:
          deno-version: v2.4.x
      
      - name: Run tests
        run: deno test
      
      - name: Check for release needed
        id: check
        run: |
          if deno task nagare --dry-run --skip-confirmation | grep -q "No version bump needed"; then
            echo "release_needed=false" >> $GITHUB_OUTPUT
          else
            echo "release_needed=true" >> $GITHUB_OUTPUT
          fi
      
      - name: Create release
        if: steps.check.outputs.release_needed == 'true'
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          deno task nagare --skip-confirmation
```

### Advanced workflow with matrix builds

```yaml
name: Release

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        deno-version: [v2.4.x, v2.5.x]
    
    steps:
      - uses: actions/checkout@v4
      - uses: denoland/setup-deno@v1
        with:
          deno-version: ${{ matrix.deno-version }}
      
      - name: Run tests
        run: deno test
      
      - name: Check formatting
        run: deno fmt --check
      
      - name: Run linter
        run: deno lint

  release:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
    
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0
      
      - uses: denoland/setup-deno@v1
        with:
          deno-version: v2.4.x
      
      - name: Create release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # Check if release is needed
          if deno task nagare --dry-run --skip-confirmation | grep -q "No version bump needed"; then
            echo "No release needed"
            exit 0
          fi
          
          # Create the release
          deno task nagare --skip-confirmation
```

## GitLab CI integration

Create `.gitlab-ci.yml`:

```yaml
stages:
  - test
  - release

variables:
  DENO_VERSION: "2.4.0"

test:
  stage: test
  image: denoland/deno:${DENO_VERSION}
  script:
    - deno fmt --check
    - deno lint
    - deno test
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

release:
  stage: release
  image: denoland/deno:${DENO_VERSION}
  before_script:
    - apt-get update && apt-get install -y git curl
    - curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    - echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    - apt-get update && apt-get install -y gh
    - git config --global user.email "ci@example.com"
    - git config --global user.name "CI Bot"
  script:
    - |
      if deno task nagare --dry-run --skip-confirmation | grep -q "No version bump needed"; then
        echo "No release needed"
        exit 0
      fi
    - deno task nagare --skip-confirmation
  rules:
    - if: $CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH
  environment:
    name: production
```

## Azure DevOps integration

Create `azure-pipelines.yml`:

```yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

stages:
- stage: Test
  jobs:
  - job: TestJob
    steps:
    - task: UseDeno@0
      inputs:
        version: '2.4.x'
    
    - script: |
        deno fmt --check
        deno lint
        deno test
      displayName: 'Run tests'

- stage: Release
  dependsOn: Test
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
  jobs:
  - job: ReleaseJob
    steps:
    - task: UseDeno@0
      inputs:
        version: '2.4.x'
    
    - script: |
        # Install GitHub CLI
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sudo apt update && sudo apt install gh
      displayName: 'Install GitHub CLI'
    
    - script: |
        git config --global user.email "azure-pipelines@example.com"
        git config --global user.name "Azure Pipelines"
      displayName: 'Configure Git'
    
    - script: |
        if deno task nagare --dry-run --skip-confirmation | grep -q "No version bump needed"; then
          echo "No release needed"
          exit 0
        fi
        deno task nagare --skip-confirmation
      displayName: 'Create release'
      env:
        GITHUB_TOKEN: $(GITHUB_TOKEN)
```

## Docker-based CI

For containerized CI environments:

```dockerfile
FROM denoland/deno:2.4.0

# Install GitHub CLI
RUN apt-get update && apt-get install -y curl git
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null
RUN apt-get update && apt-get install -y gh

WORKDIR /app
COPY . .

# Install dependencies
RUN deno cache --unstable-raw-imports mod.ts

# Run tests
RUN deno test

# Create release script
RUN echo '#!/bin/bash\n\
if deno task nagare --dry-run --skip-confirmation | grep -q "No version bump needed"; then\n\
  echo "No release needed"\n\
  exit 0\n\
fi\n\
deno task nagare --skip-confirmation' > release.sh && chmod +x release.sh

CMD ["./release.sh"]
```

## Environment configuration

### Required environment variables

```bash
# GitHub token for API access
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Custom git configuration
GIT_AUTHOR_NAME="CI Bot"
GIT_AUTHOR_EMAIL="ci@example.com"
GIT_COMMITTER_NAME="CI Bot"
GIT_COMMITTER_EMAIL="ci@example.com"

# Optional: Disable interactive prompts
NAGARE_SKIP_CONFIRMATION=true
```

### Secrets management

**GitHub Actions:**
```yaml
- name: Create release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: deno task nagare --skip-confirmation
```

**GitLab CI:**
```yaml
release:
  script:
    - export GITHUB_TOKEN="$GITHUB_TOKEN_SECRET"
    - deno task nagare --skip-confirmation
```

## Conditional releases

### Release only on specific patterns

```yaml
- name: Check for release commits
  id: check
  run: |
    if git log --oneline -n 1 | grep -E "(feat|fix|BREAKING CHANGE)"; then
      echo "should_release=true" >> $GITHUB_OUTPUT
    else
      echo "should_release=false" >> $GITHUB_OUTPUT
    fi

- name: Create release
  if: steps.check.outputs.should_release == 'true'
  run: deno task nagare --skip-confirmation
```

### Skip CI releases

```yaml
- name: Check commit message
  id: check
  run: |
    if git log --oneline -n 1 | grep -q "\[skip ci\]"; then
      echo "skip_release=true" >> $GITHUB_OUTPUT
    else
      echo "skip_release=false" >> $GITHUB_OUTPUT
    fi

- name: Create release
  if: steps.check.outputs.skip_release == 'false'
  run: deno task nagare --skip-confirmation
```

## Advanced configuration

### Custom release messages

```typescript
// nagare.config.ts
export default {
  github: {
    releaseTemplate: `
## What's Changed

{{#each commits}}
- {{this.description}} ({{this.hash}})
{{/each}}

**Full Changelog**: {{compareUrl}}

---
*This release was created automatically by CI/CD*
    `,
  },
} as NagareConfig;
```

### Notifications

```yaml
- name: Notify on release
  if: success()
  run: |
    curl -X POST "$SLACK_WEBHOOK_URL" \
      -H "Content-type: application/json" \
      --data "{\"text\":\"🎉 New release: ${{ github.repository }}@${{ env.RELEASE_VERSION }}\"}"
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## Troubleshooting

**Problem**: "Permission denied" when creating releases  
**Solution**: Ensure your CI token has `contents: write` permissions

**Problem**: "GitHub CLI not authenticated"  
**Solution**: Set `GITHUB_TOKEN` environment variable in your CI

**Problem**: "Git user not configured"  
**Solution**: Set git user name and email in your CI script

**Problem**: "No commits found for version bump"  
**Solution**: Ensure you're using conventional commits and fetching full git history

## Best practices

1. **Run tests first** - Always validate code before releasing
2. **Use semantic versioning** - Follow conventional commits strictly
3. **Check for changes** - Skip CI runs when no release is needed
4. **Secure tokens** - Use your CI platform's secret management
5. **Monitor releases** - Set up notifications for release failures

## Related tasks

- [How to use hooks](./use-hooks.md)
- [How to configure file updates](./configure-file-updates.md)
- [How to rollback releases](./rollback-releases.md)
