# GitHub Security Features Setup Guide

This guide explains how to enable and configure GitHub's security features for Nagare.

## Automated Features (Already Configured)

These features are configured via files in the repository:

### 1. CodeQL Analysis
- **Status**: ✅ Configured via `.github/workflows/codeql.yml`
- **What it does**: Semantic code analysis to find security vulnerabilities
- **Cost**: Free for public repos
- Runs automatically on push, PR, and weekly

### 2. Dependabot
- **Status**: ✅ Configured via `.github/dependabot.yml`
- **What it does**: Creates PRs to update vulnerable dependencies
- **Cost**: Free for all repos
- Checks weekly for updates

### 3. Dependency Review
- **Status**: ✅ Configured via `.github/workflows/dependency-review.yml`
- **What it does**: Blocks PRs that introduce vulnerable dependencies
- **Cost**: Free for public repos
- Runs on all pull requests

## Manual Setup Required

### 4. Secret Scanning
- **Status**: 🔄 Requires manual enabling
- **What it does**: Detects accidentally committed secrets (API keys, tokens, etc.)
- **Cost**: Free for public repos

**To enable:**
1. Go to Settings → Code security and analysis
2. Enable "Secret scanning"
3. Optionally enable "Push protection" to block commits with secrets

### 5. Security Advisories
- **Status**: 🔄 Available when needed
- **What it does**: Create and manage security advisories for vulnerabilities
- **Cost**: Free for all repos

**To create an advisory:**
1. Go to Security → Advisories
2. Click "New draft advisory"
3. Fill in vulnerability details
4. Publish when ready

## Viewing Security Results

### Security Tab
All security alerts appear in the Security tab:
- Code scanning alerts (from CodeQL)
- Dependabot alerts
- Secret scanning alerts

### Pull Requests
Security checks appear in PR checks:
- CodeQL analysis
- Dependency review
- Any custom security workflows

## Best Practices

1. **Review alerts promptly** - Don't let security alerts pile up
2. **Configure alert notifications** - Get emailed about new vulnerabilities
3. **Use branch protection** - Require security checks to pass before merging
4. **Keep workflows updated** - Dependabot will propose updates to GitHub Actions

## Notes for Private Repositories

If Nagare becomes private, some features require GitHub Advanced Security:
- CodeQL (requires GitHub Advanced Security)
- Secret scanning (requires GitHub Advanced Security)
- Dependency review (requires GitHub Advanced Security)

Dependabot remains free for private repositories.