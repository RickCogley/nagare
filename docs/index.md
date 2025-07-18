# Nagare Documentation

Welcome to the comprehensive documentation for Nagare, a Deno-native release management library that automates version bumping, changelog generation, and GitHub releases.

## Documentation Structure

This documentation follows the [Diátaxis framework](https://diataxis.fr/) combined with Google Developer Documentation Style guidelines to provide clear, user-focused content organized by your specific needs.

### 🎓 Tutorials (Learning-oriented)

Start here if you're new to Nagare or want to learn step-by-step.

- **[Getting Started](./tutorials/getting-started.md)** - Your first automated release with Nagare

### 🔧 How-to Guides (Task-oriented)

Practical guides for solving specific problems.

- **[Configure File Updates](./how-to/configure-file-updates.md)** - Set up automatic version updates across multiple files
- **[Use Custom Templates](./how-to/use-custom-templates.md)** - Create custom version file templates
- **[Set Up CI/CD Integration](./how-to/setup-ci-cd.md)** - Integrate Nagare with GitHub Actions, GitLab CI, and more
- **[Use Hooks](./how-to/use-hooks.md)** - Customize release workflows with lifecycle hooks
- **[Rollback Releases](./how-to/rollback-releases.md)** - Safely rollback failed or incorrect releases

### 📖 Reference (Information-oriented)

Complete technical documentation for all features.

- **[CLI Reference](./reference/cli.md)** - Command-line interface documentation
- **[Configuration Reference](./reference/configuration.md)** - Complete configuration options
- **[Template Reference](./reference/templates.md)** - Template system and built-in templates
- **[Environment Variables](./reference/environment-variables.md)** - All environment variables and their effects
- **[API Documentation](https://nagare.esolia.deno.net/)** - Complete TypeScript API reference

### 💡 Explanation (Understanding-oriented)

Deep dives into concepts and design decisions.

- **[Architecture Overview](./explanation/architecture.md)** - System architecture and design
- **[Design Principles](./explanation/design-principles.md)** - Core design philosophy and decisions
- **[Security Model](./explanation/security-model.md)** - Comprehensive security architecture
- **[Branding System](./explanation/branding-system.md)** - Consistent CLI messaging and brand identity
- **[File Update System](./explanation/file-update-system.md)** - How intelligent file handlers work
- **[Release Workflow](./explanation/release-workflow.md)** - How releases work internally
- **[Version Management](./explanation/version-management.md)** - Semantic versioning implementation

## Quick Start

New to Nagare? Start with our **[Getting Started Tutorial](./tutorials/getting-started.md)** for a hands-on introduction.

```bash
# Initialize Nagare in your project
deno run -A jsr:@rick/nagare/cli init

# Create your first release
deno task nagare
```

## Common Tasks

### First Time Setup
1. **[Getting Started](./tutorials/getting-started.md)** - Complete walkthrough
2. **[Configure File Updates](./how-to/configure-file-updates.md)** - Set up version synchronization
3. **[Set Up CI/CD](./how-to/setup-ci-cd.md)** - Automate releases

### Daily Usage
- **[CLI Reference](./reference/cli.md)** - Command reference
- **[Configuration Reference](./reference/configuration.md)** - Config options
- **[Rollback Releases](./how-to/rollback-releases.md)** - Fix mistakes

### Advanced Configuration
- **[Use Custom Templates](./how-to/use-custom-templates.md)** - Custom version files
- **[Use Hooks](./how-to/use-hooks.md)** - Extend release workflow
- **[Security Model](./explanation/security-model.md)** - Security best practices

## Key Features

### 🚀 Automated Releases
- **Semantic Versioning**: Automatic version bumping based on conventional commits
- **Changelog Generation**: Professional changelogs following Keep a Changelog format
- **GitHub Integration**: Automatic GitHub release creation with release notes

### 🔧 Intelligent File Updates
- **Built-in Handlers**: Automatic detection and updating of common file types
- **Custom Patterns**: Flexible regex-based file updating for special cases
- **Template System**: Powerful Vento templates for complex version files

### 🛡️ Security & Reliability
- **Deno Security**: Leverages Deno's permission-based security model
- **Atomic Operations**: Backup and rollback system prevents inconsistent states
- **Comprehensive Validation**: Input validation and security checks at every layer

### ⚙️ Highly Configurable
- **Convention over Configuration**: Sensible defaults with customization options
- **Extensible Architecture**: Hooks and plugins for custom workflows
- **TypeScript Support**: Full type safety and excellent developer experience

## Example Configuration

```typescript
import type { NagareConfig } from "jsr:@rick/nagare/types";

export default {
  project: {
    name: "My Awesome App",
    repository: "https://github.com/user/my-awesome-app",
    description: "A fantastic Deno application",
  },

  versionFile: {
    path: "./version.ts",
    template: "typescript",
  },

  github: {
    owner: "user",
    repo: "my-awesome-app",
    createRelease: true,
  },

  // Automatic file updates
  updateFiles: [
    { path: "./deno.json" },
    { path: "./package.json" },
    { path: "./README.md" },
    { path: "./jsr.json" },
  ],

  // Custom hooks
  hooks: {
    preRelease: [
      async () => {
        console.log("Running tests...");
        const result = await new Deno.Command("deno", {
          args: ["test"],
        }).output();
        if (!result.success) throw new Error("Tests failed");
      },
    ],
  },
} as NagareConfig;
```

## Community & Support

### Getting Help
- **[GitHub Issues](https://github.com/RickCogley/nagare/issues)** - Bug reports and feature requests
- **[GitHub Discussions](https://github.com/RickCogley/nagare/discussions)** - Questions and community support
- **[JSR Package](https://jsr.io/@rick/nagare)** - Package documentation
- **[API Documentation](https://nagare.esolia.deno.net/)** - Complete TypeScript API reference

### Contributing
- **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute to Nagare
- **[Code of Conduct](../CODE_OF_CONDUCT.md)** - Community guidelines
- **[Security Policy](../SECURITY.md)** - Responsible disclosure process

## Additional Resources

### Project Documentation
- **[API Documentation](./api/)** - Auto-generated API reference
- **[Project Management](./projects/)** - Shape Up methodology documentation
- **[Session Checkpoints](./checkpoints/)** - Development session notes

### External Resources
- **[Conventional Commits](https://www.conventionalcommits.org/)** - Commit message format
- **[Keep a Changelog](https://keepachangelog.com/)** - Changelog format
- **[Semantic Versioning](https://semver.org/)** - Version numbering specification
- **[Deno Documentation](https://docs.deno.com/)** - Deno runtime documentation

## License

Nagare is released under the [MIT License](../LICENSE).

---

**Made with ❤️ by eSolia for the Deno community**