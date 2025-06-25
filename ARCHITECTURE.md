# Nagare Architecture & Technical Specification

This document provides a technical overview of Nagare's architecture, design decisions, and implementation details for developers who want to understand, contribute to, or extend the library.

## 🏗️ System Architecture

### High-Level Overview

Nagare follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│                CLI Layer                │  ← User Interface
├─────────────────────────────────────────┤
│              Manager Layer              │  ← Orchestration
│  ReleaseManager    │   RollbackManager  │
├─────────────────────────────────────────┤
│            Integration Layer            │  ← External Systems
│ GitOperations │ GitHubIntegration │ ... │
├─────────────────────────────────────────┤
│            Processing Layer             │  ← Data Transformation
│ TemplateProcessor │ ChangelogGen │ ... │
├─────────────────────────────────────────┤
│           Infrastructure Layer          │  ← Foundation
│    Logger    │   Config   │   Types    │
└─────────────────────────────────────────┘
```

### Design Principles

1. **Single Responsibility** - Each class has one clear purpose
2. **Dependency Injection** - Configuration drives behavior
3. **Fail Fast** - Validate early, provide clear error messages
4. **Composability** - Classes can be used independently
5. **Type Safety** - Comprehensive TypeScript interfaces
6. **Extensibility** - Plugin-like architecture for customization

## 📁 File Structure & Naming Conventions

### Directory Structure

```
nagare/
├── mod.ts                    # Public API exports
├── types.ts                  # TypeScript interfaces & types
├── config.ts                 # Configuration schema & defaults
├── cli.ts                    # CLI interface & argument parsing
└── src/                      # Implementation modules
    ├── release-manager.ts    # Core release orchestration
    ├── rollback-manager.ts   # Rollback orchestration  
    ├── git-operations.ts     # Git system interactions
    ├── github-integration.ts # GitHub API integration
    ├── version-utils.ts      # Semantic versioning utilities
    ├── changelog-generator.ts# CHANGELOG.md generation
    ├── template-processor.ts # Template engine
    ├── doc-generator.ts      # Documentation generation
    └── logger.ts             # Logging infrastructure
```

### Naming Convention Semantics

File suffixes indicate **architectural roles**:

| Suffix | Role | Responsibility | Examples |
|--------|------|----------------|----------|
| `-manager` | **Orchestrator** | Coordinates complex workflows | `ReleaseManager`, `RollbackManager` |
| `-operations` | **System Interface** | Direct interaction with external systems | `GitOperations` |
| `-integration` | **Service Wrapper** | Integration with external APIs/services | `GitHubIntegration` |
| `-utils` | **Pure Functions** | Stateless calculations & transformations | `VersionUtils` |
| `-processor` | **Data Transformer** | Process/transform data structures | `TemplateProcessor` |
| `-generator` | **Content Creator** | Generate files, content, or data | `ChangelogGenerator`, `DocGenerator` |
| *No suffix* | **Infrastructure** | Core foundation classes | `Logger`, `Config`, `Types` |

## 🔧 Core Components

### ReleaseManager

**Purpose**: Primary orchestrator for the release process

**Key Responsibilities**:
- Validates environment and prerequisites
- Coordinates all release steps in correct order
- Handles error recovery and rollback scenarios
- Provides unified API for release operations

**Flow**:
```typescript
async release(bumpType?: BumpType): Promise<ReleaseResult> {
  1. validateEnvironment()      // Check git, files, config
  2. getCurrentVersion()        // Read current version
  3. getCommitsSinceLastRelease() // Parse git log
  4. calculateNewVersion()      // Determine next version
  5. generateReleaseNotes()     // Create changelog entries
  6. updateFiles()              // Update version files
  7. commitAndTag()             // Git operations
  8. createGitHubRelease()      // Publish to GitHub
}
```

### GitOperations

**Purpose**: Abstraction layer for all Git interactions

**Key Methods**:
- `getCommitsSinceLastRelease()` - Parses git log with conventional commit format
- `parseConventionalCommit()` - Extracts type, scope, description from commits
- `commitAndTag()` - Creates release commit and tag
- `pushToRemote()` - Pushes changes to remote repository

**Conventional Commit Parsing**:
```typescript
// Regex pattern for conventional commits
/^(feat|fix|docs|style|refactor|perf|test|chore|build|ci|revert|security)(\([^)]+\))?\!?:\s*(.+)$/

// Examples:
"feat(auth): add OAuth login"     → type: "feat", scope: "auth", description: "add OAuth login"
"fix!: breaking API change"      → type: "fix", breakingChange: true
"docs: update README"            → type: "docs", description: "update README"
```

### VersionUtils

**Purpose**: Semantic versioning calculations and operations

**Semantic Version Logic**:
```typescript
calculateNewVersion(currentVersion, commits, bumpType?) {
  if (bumpType) return manualBump(bumpType);
  
  const hasBreaking = commits.some(c => c.breakingChange);
  const hasFeatures = commits.some(c => c.type === 'feat');
  const hasFixes = commits.some(c => c.type === 'fix');
  
  if (hasBreaking) return majorBump();      // 1.0.0 → 2.0.0
  if (hasFeatures) return minorBump();      // 1.0.0 → 1.1.0  
  if (hasFixes) return patchBump();         // 1.0.0 → 1.0.1
  return patchBump();                       // Default fallback
}
```

### TemplateProcessor

**Purpose**: Template engine for version file generation

**Template Syntax**:
```typescript
// Variable substitution
"{{version}}" → "1.2.3"
"{{project.name}}" → "My App"

// Object serialization  
"{{metadata}}" → JSON.stringify(metadata, null, 2)

// Conditional blocks
"{{#if metadata}}...{{/if}}" → Includes content if metadata exists
```

**Built-in Templates**:
- **TypeScript**: Exports with `as const` for type safety
- **JSON**: Standard package.json-style format
- **YAML**: YAML format for configuration files
- **Custom**: User-defined template with full control

### ChangelogGenerator

**Purpose**: Generates CHANGELOG.md following "Keep a Changelog" format

**Section Mapping**:
```typescript
const commitTypeMapping = {
  feat: 'added',        // New features
  fix: 'fixed',         // Bug fixes
  docs: 'changed',      // Documentation
  style: 'changed',     // Code style changes
  refactor: 'changed',  // Code refactoring
  perf: 'changed',      // Performance improvements
  security: 'security', // Security fixes
  // ... etc
};
```

**Output Format**:
```markdown
## [1.2.0] - 2025-01-15

### Added
- feat: add user authentication (abc1234)
- feat: implement dashboard (def5678)

### Fixed  
- fix: resolve login bug (ghi9012)

### Changed
- refactor: improve error handling (jkl3456)
```

## 🔄 Data Flow

### Release Process Flow

```mermaid
graph TD
    A[CLI Input] --> B[ReleaseManager.release()]
    B --> C[Validate Environment]
    C --> D[Get Current Version]
    D --> E[Parse Git Commits]
    E --> F[Calculate New Version]
    F --> G[Generate Release Notes]
    G --> H[Update Files]
    H --> I[Git Commit & Tag]
    I --> J[Create GitHub Release]
    J --> K[Return Result]
```

### Configuration Flow

```mermaid
graph LR
    A[User Config] --> B[Merge with Defaults]
    B --> C[Validate Config]
    C --> D[Inject into Classes]
    D --> E[Runtime Behavior]
```

## 🔧 Configuration System

### Configuration Hierarchy

1. **Built-in defaults** (`DEFAULT_CONFIG`)
2. **User configuration file** (`nagare.config.ts`)
3. **CLI arguments** (override config file)
4. **Environment variables** (override everything)

### Type Safety

```typescript
// All configuration is strictly typed
interface NagareConfig {
  project: ProjectConfig;      // Required
  versionFile: VersionFile;    // Required  
  releaseNotes?: ReleaseNotesConfig; // Optional with defaults
  github?: GitHubConfig;       // Optional
  updateFiles?: FileUpdatePattern[]; // Optional
  // ...
}

// Configuration validation at runtime
const validation = ReleaseManager.validateConfig(config);
if (!validation.valid) {
  console.error('Configuration errors:', validation.errors);
  Deno.exit(1);
}
```

## 🔌 Extension Points

### Custom Templates

Users can provide completely custom templates:

```typescript
versionFile: {
  template: 'custom',
  customTemplate: `
export const VERSION = "{{version}}";
export const CUSTOM_DATA = {{metadata.customData}};
export const FEATURES = {{metadata.features}};
`
}
```

### File Update Patterns

Flexible file update system:

```typescript
updateFiles: [
  {
    path: './package.json',
    patterns: {
      version: /"version":\s*"([^"]+)"/
    }
  },
  {
    path: './README.md',
    updateFn: (content, data) => {
      return content.replace(/Version \d+\.\d+\.\d+/, `Version ${data.version}`);
    }
  }
]
```

### Custom Commit Type Mappings

Override default conventional commit mappings:

```typescript
commitTypes: {
  feat: 'added',
  fix: 'fixed',
  enhancement: 'changed',    // Custom type
  security: 'security',
  breaking: 'changed'        // Custom handling
}
```

## 🧪 Testing Strategy

### Unit Testing

Each class should be unit tested in isolation:

```typescript
// Example test structure
describe('VersionUtils', () => {
  test('calculateNewVersion - feature commits trigger minor bump', () => {
    const commits = [{ type: 'feat', description: 'add feature' }];
    const result = versionUtils.calculateNewVersion('1.0.0', commits);
    assertEquals(result, '1.1.0');
  });
});
```

### Integration Testing

Test complete workflows:

```typescript
describe('ReleaseManager Integration', () => {
  test('full release workflow with mocked git', async () => {
    // Mock git operations
    // Run full release
    // Verify all files updated correctly
  });
});
```

### Test Categories

1. **Unit Tests** - Individual class methods
2. **Integration Tests** - Multi-class workflows  
3. **CLI Tests** - Command-line interface
4. **Template Tests** - Template processing
5. **Git Tests** - Git operation mocking

## 🚀 Performance Considerations

### Git Operations

- **Lazy Loading**: Git operations only executed when needed
- **Caching**: Commit parsing results cached per session
- **Batch Operations**: Multiple git commands combined where possible

### File I/O

- **Streaming**: Large files processed in streams
- **Atomic Writes**: File updates are atomic to prevent corruption
- **Validation**: File existence checked before operations

### Memory Usage

- **Bounded Collections**: Commit history limited to prevent memory issues
- **Clean References**: Objects properly dereferenced after use
- **String Optimization**: Template processing optimized for large templates

## 🔒 Security Considerations

### Input Validation

- **Path Traversal Prevention**: File paths validated against directory traversal
- **Command Injection**: Git commands properly escaped
- **Size Limits**: Input size limits prevent DoS attacks

### Secrets Handling

- **Environment Variables**: Secrets only accessed from environment
- **No Logging**: Sensitive data never logged
- **Memory Cleanup**: Sensitive strings cleared after use

## 🐛 Error Handling

### Error Categories

1. **Configuration Errors** - Invalid config, missing required fields
2. **Environment Errors** - Missing git, file permissions, etc.
3. **Git Errors** - Repository issues, network problems
4. **Template Errors** - Invalid templates, missing placeholders
5. **External Service Errors** - GitHub API failures

### Error Recovery

- **Graceful Degradation**: Optional features fail gracefully
- **Rollback on Failure**: Automatic rollback of partial changes
- **Clear Messages**: User-friendly error messages with suggestions
- **Exit Codes**: Proper exit codes for CI/CD integration

## 📊 Metrics & Observability

### Logging Levels

- **DEBUG**: Detailed internal operations
- **INFO**: General operational messages  
- **WARN**: Recoverable issues
- **ERROR**: Failure conditions

### Performance Metrics

- Release duration tracking
- Git operation timing
- File processing metrics
- Template rendering performance

## 🔮 Future Extensions

### Possible Features

1. **Plugin System** - Custom processors and integrations
2. **Multiple VCS Support** - GitLab, Bitbucket, etc.
3. **Advanced Templates** - Handlebars, Mustache support
4. **Dependency Integration** - Update dependencies on release
5. **Release Scheduling** - Automated release scheduling
6. **Multi-Package Support** - Monorepo release coordination

### Extension Architecture

The current architecture is designed to support these extensions without breaking changes by:

- **Interface-based design** - New implementations can be swapped in
- **Configuration-driven behavior** - New features added via config
- **Modular structure** - New modules can be added independently
- **Backward compatibility** - Existing configurations continue to work

## Development Guidelines
For commit message standards and contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

This architecture provides a solid foundation for reliable, extensible release automation while maintaining simplicity for basic use cases.