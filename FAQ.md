# Frequently Asked Questions (FAQ)

## General Questions

### What is Nagare?

Nagare (流れ - "flow" in Japanese) is a comprehensive release management library for JavaScript/TypeScript projects. It
automates versioning, changelog generation, and GitHub releases using conventional commits and semantic versioning
principles.

### Why choose Nagare over other release tools?

- **Multi-runtime support**: Works seamlessly with Deno, Node.js, and Bun
- **Type-safe**: Full TypeScript support with comprehensive type definitions
- **Flexible**: Template-based configuration system adapts to any project structure
- **Modern**: Built for JSR, supports latest JavaScript runtime features
- **Self-managing**: Can manage its own releases (dogfooding approach)
- **Safe file updates**: Enhanced pattern validation prevents file corruption

### Which runtimes does Nagare support?

- **Deno** 1.40+ (primary runtime)
- **Node.js** 18.0+ (via JSR)
- **Bun** 1.0+ (via JSR)

## Installation & Setup

### How do I install Nagare?

**For Deno:**

```typescript
import { ReleaseManager } from "jsr:@rick/nagare";
```

**For Node.js:**

```bash
npx jsr add @rick/nagare
```

**For Bun:**

```bash
bunx jsr add @rick/nagare
```

### Do I need a configuration file?

While not required, a configuration file is highly recommended for consistent releases. You can:

1. **Create `nagare.config.ts`** (recommended)
2. **Pass config directly** to ReleaseManager constructor
3. **Use CLI flags** for simple use cases

### What's the minimal configuration needed?

```typescript
const config = {
  projectName: "My Project",
  repository: "https://github.com/user/my-project",
  versionFile: {
    path: "./version.ts",
    template: "typescript",
  },
};
```

## Version Management

### What version file formats are supported?

- **TypeScript** (`.ts`) - Recommended for Deno projects
- **JSON** (`.json`) - Universal format
- **YAML** (`.yaml/.yml`) - Human-readable
- **Custom** - Define your own template

### How does automatic version bumping work?

Nagare analyzes conventional commits since the last release:

- **`feat:`** → Minor version bump (1.0.0 → 1.1.0)
- **`fix:`** → Patch version bump (1.0.0 → 1.0.1)
- **`feat!:` or `BREAKING CHANGE:`** → Major version bump (1.0.0 → 2.0.0)
- **Other types** → Patch version bump

### Can I manually specify version bumps?

Yes! You can override automatic detection:

```bash
# CLI
deno run -A jsr:@rick/nagare/cli major

# Programmatically
await releaseManager.release("minor");
```

### How do I handle pre-release versions?

```typescript
// Create pre-release
await releaseManager.release("prerelease"); // 1.0.0 → 1.0.1-0

// Manual pre-release versioning
await releaseManager.release("1.2.0-beta.1");
```

## Conventional Commits

### What conventional commit types are supported?

Default mappings:

- **`feat:`** → Added section
- **`fix:`** → Fixed section
- **`perf:`**, **`refactor:`**, **`style:`** → Changed section
- **`security:`** → Security section
- **`docs:`**, **`test:`**, **`chore:`** → Changed section

### Can I customize commit type mappings?

Yes! Override in your configuration:

```typescript
commitTypes: {
  feat: "added",
  fix: "fixed",
  enhance: "changed",     // Custom type
  breaking: "changed",    // Custom type
  security: "security"
}
```

### What if my commits don't follow conventional format?

Non-conventional commits are included in the "Changed" section. However, for best results, we recommend adopting
conventional commits:

```bash
# Good
git commit -m "feat: add user authentication"
git commit -m "fix(api): handle null responses"

# Works but less informative
git commit -m "add authentication and fix api bug"
```

## GitHub Integration

### How do I set up GitHub releases?

1. **Install GitHub CLI**: `gh auth login`
2. **Configure in Nagare**:

```typescript
github: {
  owner: "your-username",
  repo: "your-repo",
  autoRelease: true
}
```

### Can I customize GitHub release notes?

Yes! Use a custom template:

```typescript
github: {
  releaseTemplate: `
## 🚀 What's New in v{{version}}

{{#if added}}
### ✨ New Features
{{#each added}}
- {{this}}
{{/each}}
{{/if}}

Download: https://github.com/{{owner}}/{{repo}}/archive/v{{version}}.zip
`;
}
```

### What if GitHub CLI isn't available?

Nagare will:

1. Create local git tag
2. Show manual release instructions
3. Continue with other operations
4. Log helpful next-step commands

## File Updates

### How do I update multiple files during release?

**New in v1.1.0: Intelligent File Handlers**

Nagare now automatically detects and updates common file types:

```typescript
// Simple configuration - no patterns needed!
updateFiles: [
  { path: "./deno.json" }, // Automatically handled
  { path: "./package.json" }, // Automatically handled
  { path: "./README.md" }, // Updates badges and version references
  { path: "./jsr.json" }, // Automatically handled
];
```

**For custom files or specific patterns:**

```typescript
updateFiles: [
  {
    path: "./custom-config.json",
    patterns: {
      // ✅ SAFE: Line-anchored pattern only matches top-level version
      version: /^(\s*)"version":\s*"([^"]+)"/m,
    },
  },
  {
    path: "./special.txt",
    updateFn: (content, data) => {
      return content.replace(/VERSION=(\S+)/, `VERSION=${data.version}`);
    },
  },
];
```

### What are safe file update patterns?

**As of v1.1.0, Nagare includes built-in handlers with safe patterns!**

For common files, you don't need to worry about patterns anymore:

```typescript
// Just specify the file - Nagare uses safe patterns automatically
updateFiles: [
  { path: "./deno.json" },
  { path: "./package.json" },
];
```

**When using custom patterns, follow these guidelines:**

**✅ Safe Patterns:**

```typescript
updateFiles: [
  {
    path: "./custom.json",
    patterns: {
      // ✅ SAFE: Line-anchored pattern prevents matching unintended content
      version: /^(\s*)"version":\s*"([^"]+)"/m,
    },
  },
];
```

**❌ Dangerous Patterns:**

```typescript
updateFiles: [
  {
    path: "./custom.json",
    patterns: {
      // ❌ DANGEROUS: Can match ANY "version:" in the file
      version: /"version":\s*"([^"]+)"/,
    },
  },
];
```

**Why it matters:**

- Dangerous patterns can match unintended content (e.g., task definitions)
- This can corrupt files like `deno.json` or `package.json`
- Line-anchored patterns (^) ensure only the intended lines are matched
- Built-in handlers (v1.1.0+) use pre-tested safe patterns

### What if a file update pattern fails?

Nagare will:

1. Log a warning about the failed pattern
2. Continue with other file updates
3. Still complete the release process
4. Show summary of what succeeded/failed

### How do I know if my patterns are safe?

**For v1.1.0+ users:** If you're using built-in handlers (just specifying the file path), your patterns are
automatically safe!

**For custom patterns:** Nagare validates them automatically:

```
⚠️  Dangerous pattern detected in ./custom.json for key "version"
   Pattern: "version":\s*"([^"]+)"
   Issue: This pattern may match unintended content
   Recommended: ^(\s*)"version":\s*"([^"]+)"
```

Always use the `--dry-run` flag to preview changes before applying them.

### Which files have built-in handlers? (v1.1.0+)

Nagare automatically handles these file types:

- **JSON**: `deno.json`, `deno.jsonc`, `package.json`, `jsr.json`
- **TypeScript**: `version.ts`, `constants.ts`, and similar version files
- **Markdown**: `README.md` and other `.md` files (updates badges and version references)
- **YAML**: `.yaml` and `.yml` configuration files
- **Language-specific**: `Cargo.toml` (Rust), `pyproject.toml` (Python)

For these files, just specify the path - no patterns needed!

## Troubleshooting

### "No commits found since last release"

This happens when:

- All commits since last tag are already released
- No git tags exist (first release)

**Solutions:**

- Force a release: `await releaseManager.release("patch")`
- Check git log: `git log --oneline`
- Verify last tag: `git describe --tags --abbrev=0`

### "GitHub CLI not found"

**Install GitHub CLI:**

```bash
# macOS
brew install gh

# Windows
winget install GitHub.cli

# Linux
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
```

Then authenticate: `gh auth login`

### "Permission denied" errors

**For Deno:**

```bash
deno run --allow-read --allow-write --allow-run --allow-env your-script.ts
```

**Or use the `--allow-all` flag:**

```bash
deno run -A your-script.ts
```

### Version file not updating

1. **Check file path** in configuration
2. **Verify regex patterns** match your file format
3. **Ensure file permissions** allow writing
4. **Test patterns** with regex tools like regex101.com

### Changelog not generating

1. **Verify conventional commit format**
2. **Check commit history**: `git log --oneline`
3. **Ensure CHANGELOG.md is writable**
4. **Review commit type mappings**

### "File update pattern warnings"

These warnings help prevent file corruption:

```
⚠️  Dangerous pattern detected in ./deno.json for key "version"
   Pattern: "version":\s*"([^"]+)"
   Issue: This pattern may match unintended content
   Recommended: ^(\s*)"version":\s*"([^"]+)"
```

**Solution:** Update your patterns to use the recommended safer versions.

## Best Practices

### How should I structure my project for Nagare?

**Recommended structure:**

```
my-project/
├── version.ts           # Version file
├── CHANGELOG.md         # Generated changelog
├── nagare.config.ts     # Nagare configuration
├── deno.json           # Deno configuration
├── src/                # Source code
└── README.md           # Documentation
```

### What's the recommended release workflow?

1. **Develop features** using conventional commits
2. **Test thoroughly** before release
3. **Run Nagare release**: `deno task release`
4. **Verify release** on GitHub/JSR
5. **Deploy** to production

### How do I handle hotfixes?

```bash
# Create hotfix branch
git checkout -b hotfix/critical-bug

# Make fix with conventional commit
git commit -m "fix: resolve critical security vulnerability"

# Release patch version
deno task release patch

# Merge back to main
git checkout main
git merge hotfix/critical-bug
```

### Should I commit the generated CHANGELOG.md?

**Yes!** Nagare automatically commits the updated changelog as part of the release process. This ensures:

- Version history is preserved in git
- Users can see changes without running Nagare
- GitHub releases have consistent formatting

### How do I prevent file corruption?

1. **Use line-anchored patterns** for JSON files:
   ```typescript
   // ✅ SAFE: Only matches top-level version
   version: /^(\s*)"version":\s*"([^"]+)"/m;

   // ❌ DANGEROUS: Can match any "version": in the file
   version: /"version":\s*"([^"]+)"/;
   ```

2. **Always run dry-run first**: `deno task nagare --dry-run`

3. **Pay attention to warnings**: Nagare will warn about dangerous patterns

4. **Test patterns carefully**: Use regex tools to verify what your patterns match

## Advanced Usage

### Can I run Nagare in CI/CD?

Yes! Example GitHub Actions:

```yaml
- name: Release
  run: |
    git config --global user.name "Release Bot"
    git config --global user.email "bot@example.com"
    deno run -A jsr:@rick/nagare/cli minor
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### How do I integrate with monorepos?

Configure separate Nagare instances for each package:

```typescript
// packages/package-a/nagare.config.ts
export const config = {
  projectName: "Package A",
  versionFile: { path: "./version.ts", template: "typescript" },
  updateFiles: [
    {
      path: "./deno.json",
      patterns: {
        // ✅ SAFE: Line-anchored pattern
        version: /^(\s*)"version":\s*"([^"]+)"/m,
      },
    },
  ],
  // ... other config
};
```

### Can I customize the changelog format?

The changelog follows [Keep a Changelog](https://keepachangelog.com/) format, but you can customize:

1. **Commit type mappings** (which section commits go to)
2. **GitHub release templates** (how GitHub releases look)
3. **Version file templates** (how version info is stored)

### How do I rollback a failed release?

```typescript
import { RollbackManager } from "jsr:@rick/nagare";

const rollback = new RollbackManager();

// Rollback to specific version
await rollback.rollback("1.2.0", {
  removeTags: true,
  resetCommits: true,
  restoreFiles: true,
});
```

## Security & Safety

### How does Nagare prevent file corruption?

1. **Pattern validation**: Automatically detects dangerous regex patterns
2. **Dry-run mode**: Preview all changes before applying them
3. **JSON validation**: Ensures JSON files remain valid after updates
4. **Multiple match detection**: Warns when patterns match more than intended
5. **Safe defaults**: No dangerous default patterns included

### What should I do if I see pattern warnings?

```
⚠️  Dangerous pattern detected in ./deno.json for key "version"
   Pattern: "version":\s*"([^"]+)"
   Issue: This pattern may match unintended content
   Recommended: ^(\s*)"version":\s*"([^"]+)"
```

**Action steps:**

1. **Update your pattern** to the recommended version
2. **Test with dry-run** to verify it works correctly
3. **Commit the safer pattern** to prevent future issues

### Can I disable pattern validation?

While not recommended, pattern validation cannot be disabled as it's a safety feature. Instead:

1. **Fix the patterns** to be more specific
2. **Use custom update functions** if regex patterns aren't suitable
3. **Report issues** if you believe the validation is incorrect

## Recent Updates & Known Issues

### What's new in v1.1.0?

**Intelligent File Handlers**: Nagare now automatically detects and updates common file types without requiring custom
patterns:

- Just specify `{ path: "./deno.json" }` - no patterns needed!
- Built-in support for JSON, TypeScript, Markdown, YAML, and more
- Safer defaults with pre-tested patterns
- Backward compatible with existing configurations

### What was fixed in v1.1.1?

Fixed a critical issue where the config file couldn't be resolved when Nagare was imported from JSR. This affected users
who installed Nagare via JSR and tried to use a `nagare.config.ts` file.

### Are there any known limitations?

1. **Runtime compatibility**: Full CLI functionality requires Deno
2. **GitHub releases**: Requires GitHub CLI (`gh`) to be installed
3. **Pre-release versions**: Limited support for complex pre-release workflows
4. **Monorepo support**: Each package needs its own configuration

## Getting Help

### Where can I find more examples?

- **GitHub Repository**: https://github.com/RickCogley/nagare
- **JSR Package**: https://jsr.io/@rick/nagare
- **API Documentation**: [API.md](./API.md)

### How do I report bugs or request features?

1. **Check existing issues**: https://github.com/RickCogley/nagare/issues
2. **Create new issue** with:
   - Nagare version
   - Runtime (Deno/Node.js/Bun) and version
   - Minimal reproduction case
   - Expected vs actual behavior

### How can I contribute?

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Use conventional commits**: `git commit -m "feat: add amazing feature"`
4. **Add tests** for new functionality
5. **Submit pull request**

---

**Still have questions?** Open an issue on [GitHub](https://github.com/RickCogley/nagare/issues) or check the
[API documentation](./API.md).
