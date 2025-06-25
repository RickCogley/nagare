# Contributing to Nagare

Thank you for your interest in contributing to Nagare! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/nagare.git
   cd nagare
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feat/your-feature-name
   ```
4. **Make your changes** following our guidelines below
5. **Test your changes** thoroughly
6. **Submit a pull request**

## 📝 Commit Message Guidelines

Nagare follows [Conventional Commits](https://www.conventionalcommits.org/) specification. This helps with automated changelog generation and semantic versioning.

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | Purpose | Example |
|------|---------|---------|
| `feat` | New features | `feat: add rollback functionality` |
| `fix` | Bug fixes | `fix: resolve version parsing error` |
| `docs` | Documentation changes | `docs: update API reference` |
| `style` | Code style changes | `style: fix linting issues` |
| `refactor` | Code refactoring | `refactor: simplify template processing` |
| `perf` | Performance improvements | `perf: optimize git log parsing` |
| `test` | Adding/updating tests | `test: add version utils test suite` |
| `build` | Build system/tooling | `build: add Deno project configuration` |
| `ci` | CI/CD changes | `ci: add GitHub Actions workflow` |
| `chore` | Maintenance tasks | `chore: update dependencies` |
| `revert` | Reverting changes | `revert: undo breaking API change` |
| `security` | Security fixes | `security: validate file paths` |

### Configuration Files

Configuration files require special attention to commit types:

#### Build System Configuration
```bash
# deno.json, package.json, tsconfig.json
git commit -m "build: add Deno project configuration and task automation

- Configure TypeScript compiler options and linting rules
- Add development, testing, and formatting tasks
- Define release automation tasks using Nagare CLI
- Set up documentation generation and code checking"
```

#### Feature Configuration
```bash
# nagare.config.ts, .nagarerc, etc.
git commit -m "feat: configure Nagare release automation

- Set up project metadata and GitHub integration
- Configure TypeScript version file template
- Define release notes metadata and custom fields
- Enable automatic changelog generation"
```

#### CI/CD Configuration
```bash
# .github/workflows/, .gitlab-ci.yml, etc.
git commit -m "ci: add automated testing and release pipeline

- Configure GitHub Actions for PR testing
- Add automated release on main branch merge
- Set up security scanning and dependency checks"
```

### Scopes (Optional)

Use scopes to indicate which part of the codebase is affected:

```bash
feat(cli): add --dry-run flag for preview mode
fix(git): handle empty commit messages gracefully
docs(api): update ReleaseManager interface documentation
test(template): add custom template processing tests
```

### Breaking Changes

For breaking changes, add `!` after the type or add `BREAKING CHANGE:` in the footer:

```bash
feat!: redesign configuration schema

BREAKING CHANGE: The versionFile.patterns property is now required
```

### Examples of Good Commits

```bash
# Feature addition
feat: add GitHub release integration via gh CLI

- Implement GitHubIntegration class for automated releases
- Add release body formatting with emoji sections
- Include gh CLI availability detection and error handling
- Support optional GitHub integration when CLI unavailable

# Bug fix
fix: resolve version parsing regex for pre-release versions

- Update regex pattern to handle alpha/beta/rc versions
- Add test cases for pre-release version formats
- Ensure backward compatibility with existing versions

# Documentation
docs: add troubleshooting section to README

- Add common error scenarios and solutions
- Include environment setup requirements
- Provide debugging tips for git configuration issues

# Configuration
build: enable strict TypeScript compilation

- Add strict mode and noImplicitAny to tsconfig.json
- Enable exactOptionalPropertyTypes for better type safety
- Configure module resolution for Deno compatibility
```

### Examples of Poor Commits

```bash
# Too vague
fix: bug fix

# Missing context
feat: add feature

# Wrong type
chore: add new API endpoint  # Should be feat:

# Missing description
build: deno.json  # Should describe what the config enables
```

## 🧪 Testing Guidelines

### Running Tests

```bash
# Run all tests
deno task test

# Run tests in watch mode
deno task test:watch

# Run specific test file
deno test src/version-utils_test.ts
```

### Writing Tests

- **Unit tests** for individual class methods
- **Integration tests** for multi-class workflows
- **Mock external dependencies** (git, GitHub API, file system)
- **Test both success and failure scenarios**
- **Use descriptive test names**

Example test structure:
```typescript
import { assertEquals, assertThrows } from "@std/testing/asserts";
import { VersionUtils } from "../src/version-utils.ts";

Deno.test("VersionUtils.calculateNewVersion - feature commits trigger minor bump", () => {
  const versionUtils = new VersionUtils(mockConfig);
  const commits = [{ type: 'feat', description: 'add new feature', breakingChange: false }];
  
  const result = versionUtils.calculateNewVersion('1.0.0', commits);
  
  assertEquals(result, '1.1.0');
});
```

## 🏗️ Code Style Guidelines

### TypeScript Style

- **Use TypeScript strict mode** - Enable all strict type checking
- **Prefer interfaces over types** for object shapes
- **Use const assertions** for immutable data: `as const`
- **Avoid `any`** - Use proper types or `unknown`
- **Export interfaces** from `types.ts` for reusability

### File Organization

- **One class per file** following naming conventions
- **Group related utilities** in the same file
- **Use barrel exports** in `mod.ts` for clean public API
- **Keep files focused** on single responsibility

### Naming Conventions

#### File Names
```bash
# Use kebab-case with meaningful suffixes
release-manager.ts     # Orchestrator classes
git-operations.ts      # System interface classes  
version-utils.ts       # Utility classes
github-integration.ts  # External service integrations
template-processor.ts  # Data transformation classes
changelog-generator.ts # Content generation classes
logger.ts             # Infrastructure (no suffix)
```

#### Class Names
```typescript
// Use PascalCase with descriptive suffixes
class ReleaseManager     // Orchestrates complex workflows
class GitOperations      // Interfaces with external systems
class VersionUtils       // Pure functions and calculations
class GitHubIntegration  // Wraps external APIs
class TemplateProcessor  // Transforms data
class ChangelogGenerator // Creates content
```

#### Method Names
```typescript
// Use camelCase with verb-noun patterns
async getCurrentVersion()
async calculateNewVersion()
async generateReleaseNotes()
async createGitHubRelease()
```

### Error Handling

- **Use descriptive error messages** with context
- **Provide actionable suggestions** when possible
- **Fail fast with validation** - Check preconditions early
- **Use proper error types** - Extend Error for custom errors

```typescript
// Good error handling
if (!await this.git.isGitRepository()) {
  throw new Error(
    'Not in a git repository. Run "git init" to initialize a repository.'
  );
}

// Custom error types
class ConfigurationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
```

## 📋 Pull Request Guidelines

### Before Submitting

- ✅ **Run all tests** and ensure they pass
- ✅ **Run linting** with `deno task lint`
- ✅ **Format code** with `deno task fmt`
- ✅ **Update documentation** if needed
- ✅ **Add tests** for new functionality
- ✅ **Follow commit message guidelines**

### Pull Request Template

Use this template for your PR description:

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] New tests added for new functionality
- [ ] All existing tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated if needed
- [ ] No new warnings introduced
```

## 🐛 Reporting Issues

### Bug Reports

Include the following information:

- **Nagare version** you're using
- **Deno version** (`deno --version`)
- **Operating system** and version
- **Steps to reproduce** the issue
- **Expected behavior** vs actual behavior
- **Error messages** or logs (if any)
- **Configuration file** (redacted if sensitive)

### Feature Requests

- **Clear description** of the feature
- **Use case** - why is this needed?
- **Proposed solution** if you have ideas
- **Alternatives considered**
- **Impact** on existing functionality

## 🔒 Security

If you discover a security vulnerability, please **do not** open a public issue. Instead:

1. **Email the maintainer** directly
2. **Provide detailed information** about the vulnerability
3. **Allow time for a fix** before public disclosure
4. **Coordinate disclosure** timing with maintainers

## 📄 License

By contributing to Nagare, you agree that your contributions will be licensed under the [MIT License](LICENSE).

## ❓ Questions

- **GitHub Discussions** - For general questions and ideas
- **GitHub Issues** - For bug reports and feature requests
- **Documentation** - Check README.md and ARCHITECTURE.md first

Thank you for contributing to Nagare! 🚀