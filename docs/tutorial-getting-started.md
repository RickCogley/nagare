# Getting started with Nagare

In this tutorial, you learn how to use Nagare to automate your first software release. By the end, you have created a tagged release with an auto-generated changelog and updated version files.

## Prerequisites

Before you begin, ensure you have:

- [Deno](https://deno.land/) installed (version 1.37 or higher)
- Git installed and configured
- A GitHub account (for creating GitHub releases)
- GitHub CLI (`gh`) installed and authenticated
- Basic familiarity with the command line

## What you learn

- How to install Nagare
- How to initialize Nagare in your project
- How to make your first automated release
- How to customize version updates
- How to review the generated changelog

## Step 1: install Nagare

First, install Nagare globally using Deno:

```bash
deno install -A -r -f --name nagare jsr:@nagare/nagare/cli
```

Verify the installation:

```bash
nagare --version
```

**Expected output:**

```
nagare 2.9.1
```

## Step 2: create a sample project

For this tutorial, create a simple TypeScript project:

```bash
mkdir my-awesome-app
cd my-awesome-app
git init
```

Create a basic project structure:

```bash
# Create a simple TypeScript module
cat > mod.ts << 'EOF'
export const VERSION = "0.1.0";

export function greet(name: string): string {
  return `Hello, ${name}! Welcome to My Awesome App v${VERSION}`;
}
EOF

# Create a package.json
cat > package.json << 'EOF'
{
  "name": "my-awesome-app",
  "version": "0.1.0",
  "description": "An awesome application"
}
EOF

# Create a README.md
cat > README.md << 'EOF'
# My Awesome App

Version: 0.1.0

A simple demonstration app for Nagare.

## Installation

```bash
npm install my-awesome-app
```
EOF
```

Commit the initial files:

```bash
git add .
git commit -m "feat: initial project setup"
```

## Step 3: initialize Nagare

Run the Nagare initialization command:

```bash
nagare init
```

**Expected output:**

```
🚀 Initializing Nagare configuration...
✅ Created nagare.config.ts
✅ Created CHANGELOG.md
✅ Nagare initialization complete!

Next steps:
1. Review and customize nagare.config.ts
2. Run 'nagare --dry-run' to preview your first release
```

## Step 4: review the configuration

Open the generated `nagare.config.ts` file. You see it has detected your project files:

```typescript
import { defineConfig } from "jsr:@nagare/nagare@^2.9.1";

export default defineConfig({
  repository: {
    provider: "github",
    owner: "your-username",
    name: "my-awesome-app",
  },
  changelog: {
    filename: "CHANGELOG.md",
  },
  files: [
    {
      path: "mod.ts",
      patterns: [
        {
          regex: /export const VERSION = "(.+)";/,
          replacement: 'export const VERSION = "{{version}}";',
        },
      ],
    },
    {
      path: "package.json",
      handler: "json",
      jsonPath: ["version"],
    },
    {
      path: "README.md",
      patterns: [
        {
          regex: /Version: (.+)/,
          replacement: "Version: {{version}}",
        },
      ],
    },
  ],
});
```

## Step 5: make a feature change

Add a new feature to trigger a minor version bump:

```bash
# Add a new function to mod.ts
cat >> mod.ts << 'EOF'

export function farewell(name: string): string {
  return `Goodbye, ${name}! Thanks for using My Awesome App!`;
}
EOF
```

Commit the change using conventional commits:

```bash
git add mod.ts
git commit -m "feat: add farewell function for saying goodbye"
```

## Step 6: preview the release

Before creating an actual release, preview what Nagare does:

```bash
nagare --dry-run
```

**Expected output:**

```
🚀 Nagare Release Manager - Dry Run Mode
📋 Current version: 0.1.0
🔍 Analyzing commits since last release...

📝 Commits since 0.1.0:
  - feat: add farewell function for saying goodbye

📊 Version bump: minor (0.1.0 → 0.2.0)

📄 Files to update:
  ✓ mod.ts
  ✓ package.json
  ✓ README.md
  ✓ CHANGELOG.md

🏷️  Would create tag: v0.2.0
📢 Would create GitHub release: v0.2.0

✅ Dry run complete. No changes were made.
```

## Step 7: create your first release

Now, create the actual release:

```bash
nagare
```

Follow the prompts:

```
🚀 Nagare Release Manager
📋 Current version: 0.1.0
🔍 Analyzing commits...
📊 Recommended version: 0.2.0 (minor bump)

? Proceed with release v0.2.0? (Y/n) Y
```

**Expected output:**

```
✅ Updated mod.ts
✅ Updated package.json
✅ Updated README.md
✅ Updated CHANGELOG.md
✅ Created commit: "chore(release): bump version to 0.2.0"
✅ Created tag: v0.2.0
✅ Pushed changes to origin
✅ Created GitHub release

🎉 Release v0.2.0 completed successfully!
```

## Step 8: review the results

Check what Nagare created:

### View the updated files

```bash
# Check the version in mod.ts
grep VERSION mod.ts
```

**Expected output:**

```
export const VERSION = "0.2.0";
```

### View the changelog

```bash
cat CHANGELOG.md
```

**Expected output:**

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-07-11

### Added

- feat: add farewell function for saying goodbye

## [0.1.0] - 2025-07-11

### Added

- feat: initial project setup

[0.2.0]: https://github.com/your-username/my-awesome-app/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/your-username/my-awesome-app/releases/tag/v0.1.0
```

### Check Git history

```bash
git log --oneline -n 5
```

**Expected output:**

```
abc1234 chore(release): bump version to 0.2.0
def5678 feat: add farewell function for saying goodbye
hij9012 feat: initial project setup
```

## Summary

Congratulations! You've successfully:

- Installed Nagare in your development environment
- Initialized Nagare in a new project
- Configured automatic version updates for multiple files
- Created a release using conventional commits
- Generated a Keep a Changelog format changelog
- Published a GitHub release with release notes

You learned how Nagare:
- Analyzes your commit history to determine version bumps
- Updates version strings across multiple files
- Generates professional changelogs
- Creates Git tags and GitHub releases automatically

## Next steps

- Read [How to customize file updates](how-to-customize-file-updates.md) to handle complex version patterns.
- Explore [How to configure Nagare](how-to-configure-nagare.md) for advanced settings.
- Learn about [Understanding version bumps](explanation-version-bumps.md) to master semantic versioning.
- Try [How to use templates](how-to-use-templates.md) for custom file formats.

## Troubleshooting

**Problem**: "Command not found: nagare"  
**Solution**: Ensure Deno's install location is in your PATH. Add `export PATH="$HOME/.deno/bin:$PATH"` to your shell profile.

**Problem**: "No commits found for version bump"  
**Solution**: Make sure you're using [conventional commits](https://www.conventionalcommits.org/). Commits should start with `feat:`, `fix:`, or include `BREAKING CHANGE:`.

**Problem**: "GitHub release creation failed"  
**Solution**: Ensure the GitHub CLI is authenticated: `gh auth login`