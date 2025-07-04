[![JSR](https://jsr.io/badges/@rick/nagare)](https://jsr.io/@rick/nagare)
[![JSR Score](https://jsr.io/badges/@rick/nagare/score)](https://jsr.io/@rick/nagare)

# Nagare (流れ) - Deno Release Management Library

> Nagare means "flow" in Japanese - reflecting the smooth, automated flow from commits to releases.

Nagare is a comprehensive, [Deno](https://deno.com/)-native release management library that
automates version bumping, changelog generation, and GitHub releases using
[conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) and
[semantic versioning](https://semver.org/).

## ✨ Features

- **🚀 Automated Releases** - Version bumping based on
  [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/)
- **📝 Changelog Generation** - Automatic CHANGELOG.md following
  [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
- **🏷️ Git Integration** - Smart tagging and commit management
- **🐙 GitHub Releases** - Automatic GitHub release creation
- **🤖 Intelligent File Handlers** - Automatic version updates for common file types (v1.1.0+)
- **📄 Template System** - Flexible version file templates using [Vento](https://vento.js.org/)
  (TypeScript, JSON, YAML, custom)
- **✨ Extensible Version Files** - Add custom exports without full templates (v1.8.0+)
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

### Extending Version Files (NEW in v1.8.0)

Add custom exports to your version file without writing a full template:

```typescript
export default {
  project: {
    name: "My App",
    repository: "https://github.com/user/my-app",
  },

  versionFile: {
    path: "./version.ts",
    template: "typescript",

    // Add custom exports to the generated file
    additionalExports: [
      {
        name: "CONFIG",
        type: "const",
        value: { apiUrl: "https://api.example.com", timeout: 5000 },
        description: "Application configuration",
        asConst: true,
      },
      {
        name: "Utils",
        type: "class",
        content: `
  static getFullVersion(): string {
    return \`v\${VERSION} (\${BUILD_INFO.gitCommit})\`;
  }`,
      },
    ],

    // Or add raw content
    extend: {
      prepend: "// Auto-generated file\n\n",
      append: "\n// End of generated content",
    },
  },
};
```

### Advanced Configuration

```typescript
export default {
  project: {
    name: "Advanced App",
    repository: "https://github.com/user/advanced-app",
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

### ⚠️ Breaking Change Protection

Nagare validates version bumps to ensure semantic versioning compliance:

- **Breaking changes require major bump**: If commits contain `BREAKING CHANGE:` or `!`, only a
  major version bump is allowed
- **Automatic detection**: When no bump type is specified, Nagare automatically selects the
  appropriate version based on commits
- **Error prevention**: Using `nagare:minor` or `nagare:patch` with breaking changes will fail with
  a clear error message

This protection ensures you never accidentally release breaking changes as minor or patch versions.

## 📋 Requirements

- **Deno** 2.4+ (uses text imports feature)
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

## 🔒 Security

Nagare is designed with security as a top priority, following OWASP guidelines and implementing
multiple layers of protection:

### Security Features

#### 1. **Input Validation & Sanitization**

All user inputs are validated and sanitized to prevent injection attacks:

```typescript
// Git references are validated
validateGitRef("v1.2.3; rm -rf /", "tag"); // Throws error

// File paths prevent directory traversal
validateFilePath("../../../etc/passwd", basePath); // Throws error

// CLI arguments are sanitized
validateCliArgs(["--version", "1.2.3 && malicious"]); // Throws error
```

#### 2. **Template Sandboxing**

Vento templates are executed in a restricted environment:

```typescript
// Configure security level in nagare.config.ts
export default {
  security: {
    templateSandbox: "strict", // strict | moderate | disabled
    validateFilePaths: true,
    auditLog: true,
    maxTemplateSize: 1048576, // 1MB limit
  },
} as NagareConfig;
```

In strict mode, templates cannot:

- Access file system (`Deno.readFile`, `import`, `require`)
- Execute commands (`Deno.Command`, `Deno.run`)
- Make network requests (`fetch`, `XMLHttpRequest`)
- Access global objects or use dangerous patterns

#### 3. **Safe File Updates**

Built-in file handlers use secure, line-anchored regex patterns:

```typescript
// ✅ SAFE: Only matches top-level version in JSON
/^(\s*)"version":\s*"([^"]+)"/m

// ❌ DANGEROUS: Could match nested fields
/"version":\s*"([^"]+)"/
```

#### 4. **Command Injection Prevention**

All git operations use Deno's secure Command API with validated inputs:

```typescript
// Commands are constructed safely without shell interpretation
new Deno.Command("git", {
  args: ["tag", validateGitRef(version, "tag")],
});
```

#### 5. **Security Audit Logging**

Security-relevant events are logged for audit trails:

```typescript
// Automatic logging of file updates, template processing, etc.
[SECURITY AUDIT] {"timestamp":"2025-01-01T00:00:00Z","action":"file_updated","details":{...}}
```

### Security Best Practices

1. **Use Minimal Permissions**: Run Nagare with only required Deno permissions:
   ```bash
   deno run --allow-read=. --allow-write=. --allow-run=git,gh nagare-launcher.ts
   ```

2. **Review Custom Templates**: If using custom Vento templates, review them for security:
   ```typescript
   // ✅ SAFE: Simple variable substitution
   export const VERSION = "{{ version }}";

   // ❌ AVOID: JavaScript execution
   export const DATA = {{> someFunction() }};
   ```

3. **Validate Configuration**: Review file update patterns and custom functions:
   ```typescript
   updateFiles: [
     // ✅ Use built-in handlers when possible
     { path: "./deno.json" },

     // ⚠️  Review custom patterns carefully
     {
       path: "./custom.json",
       patterns: { version: /.../ }, // Ensure pattern is safe
     },
   ];
   ```

### Automated Security Testing

Nagare includes comprehensive security tests that run in CI/CD:

- Input validation testing
- Template sandboxing verification
- Command injection prevention tests
- Path traversal prevention tests
- Static analysis for dangerous patterns

See [SECURITY.md](./SECURITY.md) for vulnerability reporting and more details.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🙏 Acknowledgments

Nagare was extracted and generalized from the [Salty](https://github.com/esolia/salty.esolia.pro)
project's sophisticated release automation system. Special thanks to the Deno team for creating an
excellent TypeScript runtime.

---

**Made with ❤️ by eSolia for the Deno community**
