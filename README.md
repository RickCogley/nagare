# Nagare (流れ) - Deno Release Management Library

> Nagare means "flow" in Japanese - reflecting the smooth, automated flow from commits to releases.

Nagare is a comprehensive, Deno-native release management library that automates version bumping,
changelog generation, and GitHub releases using conventional commits and semantic versioning.

## ✨ Features

- **🚀 Automated Releases** - Version bumping based on conventional commits
- **📝 Changelog Generation** - Automatic CHANGELOG.md following "Keep a Changelog"
- **🏷️ Git Integration** - Smart tagging and commit management
- **🐙 GitHub Releases** - Automatic GitHub release creation
- **📄 Template System** - Flexible version file templates (TypeScript, JSON, YAML, custom)
- **🔄 Rollback Support** - Safe rollback of failed releases
- **📚 Documentation** - Optional deno doc generation
- **⚙️ Highly Configurable** - Extensive configuration options
- **🛡️ Type-Safe** - Full TypeScript support with comprehensive types

## 🚀 Quick Start

### Installation

```bash
# Add to your Deno project
deno add @rick/nagare

# Or use directly via URL
import { ReleaseManager } from "https://deno.land/x/nagare/mod.ts";
```

### Basic Setup

1. **Create a configuration file** (`nagare.config.ts`):

```typescript
import type { NagareConfig } from "@rick/nagare";

export default {
  project: {
    name: "My App",
    repository: "https://github.com/user/my-app",
  },
  versionFile: {
    path: "./version.ts",
    template: "typescript",
  },
} as NagareConfig;
```

2. **Add tasks to your `deno.json`**:

```json
{
  "tasks": {
    "release": "deno run --allow-all jsr:@rick/nagare/cli",
    "release:patch": "deno run --allow-all jsr:@rick/nagare/cli patch",
    "release:minor": "deno run --allow-all jsr:@rick/nagare/cli minor",
    "release:major": "deno run --allow-all jsr:@rick/nagare/cli major",
    "rollback": "deno run --allow-all jsr:@rick/nagare/cli rollback"
  }
}
```

3. **Create your first release**:

```bash
# Dry run to preview changes
deno task release --dry-run

# Automatic release based on conventional commits
deno task release

# Or force a specific version bump
deno task release minor
```

## 📖 Usage Examples

### CLI Usage

```bash
# Automatic version bump based on conventional commits
deno task release

# Force specific version bumps
deno task release patch   # 1.0.0 → 1.0.1
deno task release minor   # 1.0.0 → 1.1.0  
deno task release major   # 1.0.0 → 2.0.0

# Preview changes without making them
deno task release --dry-run

# Skip confirmation prompts (for CI)
deno task release --skip-confirmation

# Rollback a release
deno task rollback        # Latest release
deno task rollback 1.2.0  # Specific version
```

### Programmatic Usage

```typescript
import { ReleaseManager } from "@rick/nagare";

const config = {
  project: {
    name: "My App",
    repository: "https://github.com/user/my-app",
  },
  versionFile: {
    path: "./version.ts",
    template: "typescript",
  },
};

const releaseManager = new ReleaseManager(config);

// Automatic release
const result = await releaseManager.release();

if (result.success) {
  console.log(`🎉 Released version ${result.version}!`);
  console.log(`📦 ${result.commitCount} commits included`);
  console.log(`🔗 ${result.githubReleaseUrl}`);
} else {
  console.error(`❌ Release failed: ${result.error}`);
}
```

## ⚙️ Configuration

### Basic Configuration

```typescript
import type { NagareConfig } from "@rick/nagare";

export default {
  project: {
    name: "My App",
    description: "A fantastic Deno application",
    repository: "https://github.com/user/my-app",
    license: "MIT",
  },

  versionFile: {
    path: "./version.ts",
    template: "typescript",
  },

  github: {
    owner: "user",
    repo: "my-app",
    createRelease: true,
  },
} as NagareConfig;
```

### Advanced Configuration

```typescript
export default {
  project: {
    name: "Advanced App",
    repository: "https://github.com/user/advanced-app",
  },

  versionFile: {
    path: "./src/version.ts",
    template: "custom",
    customTemplate: `
export const VERSION = "{{version}}";
export const BUILD_INFO = {
  buildDate: "{{buildDate}}",
  gitCommit: "{{gitCommit}}"
};
export const FEATURES = {{metadata.features}};
`,
  },

  releaseNotes: {
    metadata: {
      features: ["API", "Database", "Auth"],
    },
  },

  updateFiles: [
    {
      path: "./deno.json",
      patterns: {
        version: /"version":\s*"([^"]+)"/,
      },
    },
  ],

  docs: {
    enabled: true,
    outputDir: "./documentation",
  },
} as NagareConfig;
```

## 🔧 Version File Templates

### TypeScript Template (default)

```typescript
export const VERSION = "1.2.3";
export const BUILD_INFO = {
  buildDate: "2025-01-01T12:00:00.000Z",
  gitCommit: "abc1234",
};
```

### JSON Template

```json
{
  "version": "1.2.3",
  "buildInfo": {
    "buildDate": "2025-01-01T12:00:00.000Z",
    "gitCommit": "abc1234"
  }
}
```

### Custom Template

Create your own template with any structure using `{{placeholders}}`:

```typescript
template: 'custom',
customTemplate: `
export const APP_VERSION = "{{version}}";
export const RELEASE_DATE = "{{buildDate}}";
export const COMMIT_HASH = "{{gitCommit}}";
export const FEATURES = {{metadata.features}};
export const CHANGELOG = {{releaseNotes}};
`
```

## 🤖 Conventional Commits

Nagare automatically determines version bumps based on conventional commit messages:

- **`feat:`** → Minor version bump (1.0.0 → 1.1.0)
- **`fix:`** → Patch version bump (1.0.0 → 1.0.1)
- **`BREAKING CHANGE:`** → Major version bump (1.0.0 → 2.0.0)
- **`docs:`, `style:`, `refactor:`** → Patch version bump

Example commits:

```bash
git commit -m "feat: add user authentication"     # 1.0.0 → 1.1.0
git commit -m "fix: resolve login bug"            # 1.0.0 → 1.0.1
git commit -m "feat!: redesign API"               # 1.0.0 → 2.0.0
```

## 📋 Requirements

- **Deno** 1.40+
- **Git** repository with conventional commits
- **GitHub CLI** (`gh`) for GitHub releases (optional)
- **Node.js** environment variables if specified

## 🔒 Environment Variables

```bash
# Optional: GitHub Personal Access Token for releases
export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"

# Optional: Custom build environment
export NODE_ENV="production"
```

## 🆘 Troubleshooting

### Common Issues

**"Could not find version in version.ts"**

- Ensure your version file has `export const VERSION = "x.x.x"`
- Or configure custom patterns in `versionFile.patterns`

**"Not in a git repository"**

- Initialize git: `git init`
- Make sure you're in the project root

**"GitHub CLI not found"**

- Install: `brew install gh` (macOS) or `scoop install gh` (Windows)
- Or set `github.createRelease: false` in config

**"Uncommitted changes detected"**

- Commit your changes: `git add . && git commit -m "your message"`
- Or stash them: `git stash`

### Getting Help

- 📖 [Full Documentation](https://jsr.io/@rick/nagare)
- 🐛 [Report Issues](https://github.com/RickCogley/nagare/issues)
- 💬 [Discussions](https://github.com/RickCogley/nagare/discussions)

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## ✅ Testing

For comprehensive testing guidelines, see [TESTING.md](TESTING.md).

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

Nagare was extracted and generalized from the [Salty](https://github.com/esolia/salty.esolia.pro)
project's sophisticated release automation system. Special thanks to the Deno team for creating an
excellent TypeScript runtime.

---

**Made with ❤️ by eSolia for the Deno community**
