[![JSR](https://jsr.io/badges/@rick/nagare)](https://jsr.io/@rick/nagare)
[![JSR Score](https://jsr.io/badges/@rick/nagare/score)](https://jsr.io/@rick/nagare)

# Nagare (流れ) - Deno Release Management Library

> Nagare means "flow" in Japanese - reflecting the smooth, automated flow from commits to releases.

Nagare is a comprehensive, Deno-native release management library that automates version bumping,
changelog generation, and GitHub releases using conventional commits and semantic versioning.

## ✨ Features

- **🚀 Automated Releases** - Version bumping based on conventional commits
- **📝 Changelog Generation** - Automatic CHANGELOG.md following "Keep a Changelog"
- **🏷️ Git Integration** - Smart tagging and commit management
- **🐙 GitHub Releases** - Automatic GitHub release creation
- **🤖 Intelligent File Handlers** - Automatic version updates for common file types (v1.1.0+)
- **📄 Template System** - Flexible version file templates (TypeScript, JSON, YAML, custom)
- **🔄 Rollback Support** - Safe rollback of failed releases
- **📚 Documentation** - Optional deno doc generation
- **⚙️ Highly Configurable** - Extensive configuration options
- **🛡️ Type-Safe** - Full TypeScript support with comprehensive types
- **🔒 Safe File Updates** - Enhanced pattern validation prevents file corruption

## 🚀 Quick Start

### Installation & Setup

#### Quick Setup (Recommended)

```bash
# Run the init command to set up Nagare in your project
deno run -A jsr:@rick/nagare/cli init
```

This command will:

- Create a `nagare-launcher.ts` file that handles local configuration loading
- Create a minimal `nagare.config.ts` if one doesn't exist
- Show you which tasks to add to your `deno.json`

#### Manual Setup

1. **Create a CLI wrapper file** (`run-nagare.ts`):

```typescript
#!/usr/bin/env deno run -A
import { cli } from "jsr:@rick/nagare/cli";
await cli(Deno.args);
```

2. **Add tasks to your `deno.json`**:

```json
{
  "tasks": {
    "nagare": "deno run -A run-nagare.ts",
    "release": "deno task nagare",
    "release:patch": "deno task nagare patch",
    "release:minor": "deno task nagare minor",
    "release:major": "deno task nagare major",
    "release:dry": "deno task nagare --dry-run"
  }
}
```

3. **Create a configuration file** (`nagare.config.ts`):

```typescript
import type { NagareConfig } from "jsr:@rick/nagare/types";

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

4. **Create your first release**:

```bash
# Dry run to preview changes
deno task nagare --dry-run

# Automatic release based on conventional commits
deno task release

# Or force a specific version bump
deno task nagare minor
```

## 📖 Usage Examples

### CLI Usage

```bash
# Initialize Nagare in a new project
deno run -A jsr:@rick/nagare/cli init

# Automatic version bump based on conventional commits
deno task release

# Force specific version bumps
deno task nagare patch   # 1.0.0 → 1.0.1
deno task nagare minor   # 1.0.0 → 1.1.0  
deno task nagare major   # 1.0.0 → 2.0.0

# Preview changes without making them
deno task nagare --dry-run

# Skip confirmation prompts (for CI)
deno task nagare --skip-confirmation

# Rollback a release
deno task nagare rollback        # Latest release
deno task nagare rollback 1.2.0  # Specific version

# Combine flags
deno task nagare minor --dry-run --skip-confirmation
```

### Alternative CLI Setup

**Direct JSR import (may have interactive prompt issues)**

```json
{
  "tasks": {
    "release": "deno run -A jsr:@rick/nagare/cli",
    "release:patch": "deno run -A jsr:@rick/nagare/cli patch"
  }
}
```

> **⚠️ Note:** The direct JSR import option may not handle interactive prompts correctly. The
> wrapper file approach (recommended setup) or using `nagare init` ensures proper handling of user
> confirmations and error messages.

### Programmatic Usage

```typescript
import { ReleaseManager } from "jsr:@rick/nagare";

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
import type { NagareConfig } from "jsr:@rick/nagare/types";

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
    // ✅ NEW in v1.1.0: Just specify the file - built-in handler does the rest!
    { path: "./deno.json" },
    { path: "./README.md" },
    { path: "./jsr.json" },

    // Or use custom patterns for specific needs
    {
      path: "./custom-config.json",
      patterns: {
        version: /^(\s*)"version":\s*"([^"]+)"/m,
      },
    },
  ],

  docs: {
    enabled: true,
    outputDir: "./documentation",
  },
} as NagareConfig;
```

## 🤖 Intelligent File Handlers (v1.1.0+)

Nagare now includes built-in handlers for common file types, eliminating the need for custom
patterns in most cases:

### Supported File Types

- **JSON Files**: `deno.json`, `package.json`, `jsr.json`
- **TypeScript/JavaScript**: `version.ts`, `constants.ts`, and similar files
- **Markdown**: `README.md` and other `.md` files (updates version badges and references)
- **YAML**: `.yaml` and `.yml` configuration files
- **Language-Specific**: `Cargo.toml` (Rust), `pyproject.toml` (Python)

### Simple Configuration

```typescript
// ✅ NEW: Just specify the file - Nagare handles the rest!
updateFiles: [
  { path: "./deno.json" },
  { path: "./package.json" },
  { path: "./README.md" },
  { path: "./jsr.json" },
];
```

### Custom Patterns (when needed)

For files not covered by built-in handlers or special requirements:

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

**Note:** Built-in handlers use safe, tested patterns that prevent common issues like matching
unintended content in task definitions or comments.

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

**"User cancelled" or Interactive prompts not working**

- Make sure you're using the wrapper file approach (recommended setup)
- Or use `--skip-confirmation` flag for automated workflows
- Avoid echo/pipe patterns that interfere with stdin

**"File update pattern warnings"**

- Nagare detected potentially dangerous regex patterns in your configuration
- Consider using built-in file handlers instead (v1.1.0+): just specify `{ path: "./file.json" }`
- For custom patterns, use line-anchored versions (see Intelligent File Handlers section above)
- The warnings help prevent accidental file corruption

### Getting Help

- 📖 [Full Documentation](https://jsr.io/@rick/nagare)
- 🐛 [Report Issues](https://github.com/RickCogley/nagare/issues)
- 💬 [Discussions](https://github.com/RickCogley/nagare/discussions)

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## ✅ Testing

For comprehensive testing guidelines, see [TESTING.md](TESTING.md).

## 🎯 Runtime Compatibility

### Deno (Primary Runtime)

- ✅ **Full compatibility** - All features supported
- ✅ **CLI tools** - Complete release management
- ✅ **File operations** - Native Deno APIs

### Node.js & Bun (Partial Compatibility)

- ✅ **Types and interfaces** - Full TypeScript support
- ✅ **Configuration objects** - All schemas and defaults
- ✅ **Template processing** - Static template definitions
- ❌ **CLI functionality** - Requires Deno-specific APIs
- ❌ **File operations** - Uses `Deno.Command`, `Deno.readTextFile`

**Use cases for Node.js/Bun:**

- Import types for your own release tools
- Reference configuration schemas
- Use template definitions
- TypeScript IntelliSense and type checking

## 🔒 Security

Nagare follows security best practices and is designed with the OWASP Top 10 guidelines in mind:

### Security Features

- **🛡️ Deno Security Model**: Leverages Deno's permission-based security system
- **📝 Minimal Dependencies**: Only 2 trusted dependencies from JSR registry
- **🔐 Secure Defaults**: Safe configuration defaults to prevent common vulnerabilities
- **✅ Input Validation**: Validates file patterns and configurations
- **🚫 No Secrets Storage**: Delegates authentication to GitHub CLI (`gh`)

### Security Considerations

When using Nagare in production:

1. **Use Minimal Permissions**: Run with only required Deno permissions
   ```bash
   deno run --allow-read --allow-write --allow-run nagare-launcher.ts
   ```

2. **Validate Custom Templates**: Review custom templates before use to prevent template injection

3. **Secure CI/CD**: Use GitHub secrets for tokens, never commit credentials

4. **Configuration Review**: Audit `nagare.config.ts` for security implications

### OWASP Compliance

Nagare addresses the OWASP Top 10 security risks:

| Risk Category             | Status | Implementation                       |
| ------------------------- | ------ | ------------------------------------ |
| Broken Access Control     | ✅     | Deno permission model                |
| Cryptographic Failures    | N/A    | No crypto operations                 |
| Injection                 | ⚠️     | Input validation for file operations |
| Insecure Design           | ✅     | Secure-by-default architecture       |
| Security Misconfiguration | ✅     | Safe defaults, clear documentation   |
| Vulnerable Components     | ✅     | Minimal, vetted dependencies         |
| Authentication            | ✅     | Delegated to GitHub CLI              |
| Data Integrity            | ✅     | Git-based version control            |
| Logging & Monitoring      | ⚠️     | Basic logging included               |
| SSRF                      | N/A    | No direct HTTP requests              |

**Note**: While Nagare implements security best practices, always perform your own security
assessment based on your specific use case and threat model.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

Nagare was extracted and generalized from the [Salty](https://github.com/esolia/salty.esolia.pro)
project's sophisticated release automation system. Special thanks to the Deno team for creating an
excellent TypeScript runtime.

---

**Made with ❤️ by eSolia for the Deno community**
