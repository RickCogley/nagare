# Understanding Nagare's Design Principles

## Overview

Nagare is built on a foundation of carefully considered design principles that prioritize security, reliability, and developer experience. Understanding these principles helps you make better decisions when configuring and using Nagare in your projects.

## Core Design Principles

### 1. Security by Default

**Principle**: Every feature is designed with security as the primary concern, not an afterthought.

**Implementation**:

- **Input validation**: All user inputs are validated and sanitized using OWASP guidelines
- **Template sandboxing**: Vento templates execute in restricted environments
- **File path validation**: Prevents directory traversal and path injection attacks
- **Command injection prevention**: Uses Deno's secure Command API with validated inputs

**Example**:
```typescript
// ✅ SECURE: Validated inputs
const gitRef = validateGitRef(version, "tag");
new Deno.Command("git", { args: ["tag", gitRef] });

// ❌ INSECURE: Direct string interpolation
new Deno.Command("git", { args: [`tag ${version}`] });
```

**Why this matters**: Release tools handle sensitive operations like git commits, GitHub API calls, and file modifications. A security vulnerability could compromise entire repositories or CI/CD pipelines.

### 2. Fail-Fast with Clear Error Messages

**Principle**: Detect problems early and provide actionable error messages that help developers fix issues quickly.

**Implementation**:

- **Comprehensive validation**: Configuration, file patterns, and environment are validated before any operations
- **Enhanced error types**: Rich error objects with context, suggestions, and documentation links
- **Early detection**: Problems are caught during dry-run mode or pre-flight checks

**Example**:
```typescript
// Enhanced error with context and suggestions
throw new NagareError(
  "File update pattern validation failed",
  ErrorCodes.FILE_PATTERN_VALIDATION_FAILED,
  {
    file: "./package.json",
    pattern: "version.*[0-9]",
    suggestions: [
      "Use line-anchored patterns: /^\"version\":\\s*\"([^\"]+)\"/m",
      "Consider using built-in handlers for common file types",
    ],
    docsUrl: "https://docs.nagare.dev/patterns",
  }
);
```

**Why this matters**: Developers should spend time building features, not debugging cryptic error messages. Clear errors reduce support burden and improve adoption.

### 3. Atomic Operations with Rollback

**Principle**: Release operations should be atomic - either completely succeed or completely fail, with no partial state.

**Implementation**:

- **Pre-commit backup system**: Files are backed up before modification
- **Automatic rollback**: Failed operations restore original state
- **UUID-based tracking**: Prevents backup collisions in concurrent environments

**Example**:
```typescript
// Atomic operation with automatic rollback
const backupManager = new BackupManager();
try {
  const backupId = await backupManager.createBackup(filesToModify);
  await updateVersionFiles(newVersion);
  await createGitTag(newVersion);
  await backupManager.cleanupBackup(backupId);
} catch (error) {
  await backupManager.restoreBackup(backupId);
  throw error;
}
```

**Why this matters**: Partial failures leave repositories in inconsistent states, requiring manual cleanup and potentially causing confusion for team members.

### 4. Convention over Configuration

**Principle**: Provide sensible defaults that work for most projects, while allowing customization when needed.

**Implementation**:

- **Built-in file handlers**: Automatically detect and handle common file types
- **Intelligent defaults**: Reasonable configuration values for most use cases
- **Progressive enhancement**: Start simple, add complexity only when needed

**Example**:
```typescript
// ✅ SIMPLE: Uses intelligent defaults
export default {
  updateFiles: [
    { path: "./deno.json" },      // Built-in handler
    { path: "./package.json" },   // Built-in handler
    { path: "./README.md" },      // Built-in handler
  ],
} as NagareConfig;

// ⚠️ COMPLEX: Only when needed
export default {
  updateFiles: [
    {
      path: "./custom-config.yaml",
      patterns: { version: /^version:\s*"([^"]+)"/m },
    },
  ],
} as NagareConfig;
```

**Why this matters**: Most projects follow similar patterns. Requiring extensive configuration for common use cases creates friction and reduces adoption.

### 5. Deno-First Architecture

**Principle**: Leverage Deno's security model, modern JavaScript features, and excellent TypeScript support.

**Implementation**:

- **Permission-based security**: Uses Deno's permission system for fine-grained access control
- **TypeScript by default**: Full type safety without configuration
- **Modern JavaScript**: Uses latest ECMAScript features and Web APIs
- **Minimal dependencies**: Reduces attack surface and improves reliability

**Example**:
```bash
# Fine-grained permissions
deno run --allow-read=. --allow-write=. --allow-run=git,gh nagare-launcher.ts
```

**Why this matters**: Deno's security model and TypeScript support provide better developer experience and security guarantees compared to Node.js-based tools.

## Design Decisions

### Why Template-Based Version Files?

**Decision**: Use Vento templates instead of simple string replacement for version files.

**Reasoning**:

- **Flexibility**: Templates can generate complex version files with metadata
- **Maintainability**: Template logic is separate from application code
- **Security**: Sandboxed execution prevents template injection attacks

**Trade-offs**:

- **Complexity**: More complex than simple string replacement
- **Performance**: Slight overhead from template processing
- **Learning curve**: Developers need to understand Vento syntax

**Alternative considered**: Simple string replacement with placeholders like `{{VERSION}}`.

### Why JSR REST API over HEAD Requests?

**Decision**: Use JSR's official REST API endpoints for package verification.

**Reasoning**:

- **Reliability**: Official API provides consistent results
- **Rich data**: API returns detailed package information
- **Future-proofing**: API evolution is more predictable than scraping

**Trade-offs**:

- **Dependency**: Relies on JSR API availability
- **Complexity**: More complex than simple HEAD requests
- **Rate limiting**: Subject to API rate limits

**Alternative considered**: HTTP HEAD requests to check package availability.

### Why Git-Based Version Detection?

**Decision**: Use git commit analysis for version bump detection instead of manual version specification.

**Reasoning**:

- **Consistency**: Semantic versioning based on conventional commits
- **Automation**: No manual version decision making required
- **Traceability**: Version bumps are tied to specific commits

**Trade-offs**:

- **Commit discipline**: Requires consistent conventional commit usage
- **Complexity**: More complex than manual version specification
- **Git dependency**: Requires git repository with commit history

**Alternative considered**: Manual version specification or semantic analysis of code changes.

## Architectural Patterns

### Error Handling Strategy

**Pattern**: Comprehensive error handling with rich context and recovery suggestions.

```typescript
// Centralized error factory
export class ErrorFactory {
  static fileNotFound(path: string): NagareError {
    return new NagareError(
      `File not found: ${path}`,
      ErrorCodes.FILE_NOT_FOUND,
      {
        path,
        suggestions: [
          "Check that the file path is correct",
          "Ensure the file exists in the repository",
          "Use relative paths from the project root",
        ],
        context: { operation: "file-read", timestamp: Date.now() },
      }
    );
  }
}
```

**Benefits**:

- **Consistency**: All errors follow the same pattern
- **Rich context**: Errors include actionable information
- **Maintainability**: Centralized error creation and formatting

### Dependency Injection Pattern

**Pattern**: Constructor injection for better testability and flexibility.

```typescript
export class ReleaseManager {
  constructor(
    private config: NagareConfig,
    private git: GitOperations,
    private github: GitHubIntegration,
    private logger: Logger
  ) {}
}
```

**Benefits**:

- **Testability**: Easy to mock dependencies in tests
- **Flexibility**: Can swap implementations without changing core logic
- **Separation of concerns**: Each dependency has a single responsibility

### Command Pattern for Operations

**Pattern**: Encapsulate operations as commands with validation and rollback.

```typescript
export abstract class Command {
  abstract execute(): Promise<void>;
  abstract rollback(): Promise<void>;
  abstract validate(): Promise<void>;
}

export class UpdateVersionFileCommand extends Command {
  async execute(): Promise<void> {
    await this.backup();
    await this.updateFile();
  }
  
  async rollback(): Promise<void> {
    await this.restore();
  }
}
```

**Benefits**:

- **Atomicity**: Operations can be rolled back on failure
- **Composability**: Commands can be combined and orchestrated
- **Testability**: Each command can be tested independently

## Performance Considerations

### Why Concurrent Operations?

**Decision**: Use Promise.all() for independent operations like file updates.

**Reasoning**:

- **Speed**: Parallel execution reduces total operation time
- **Efficiency**: Better resource utilization
- **User experience**: Faster releases improve developer productivity

**Implementation**:
```typescript
// Concurrent file updates
await Promise.all([
  updateFile("./version.ts", newVersion),
  updateFile("./package.json", newVersion),
  updateFile("./README.md", newVersion),
]);
```

### Why Lazy Loading?

**Decision**: Load expensive resources only when needed.

**Reasoning**:

- **Startup time**: Faster CLI startup for simple operations
- **Memory usage**: Reduced memory footprint for unused features
- **Modularity**: Clear separation between optional and core features

**Implementation**:
```typescript
// Lazy loading of AI auto-fix
get autoFixer(): AutoFixer {
  if (!this._autoFixer) {
    this._autoFixer = new AutoFixer(this.config.aiAutoFix);
  }
  return this._autoFixer;
}
```

## Security Architecture

### Defense in Depth

**Strategy**: Multiple security layers to prevent and detect attacks.

**Layers**:

1. **Input validation**: Sanitize all user inputs
2. **Template sandboxing**: Restrict template execution environment
3. **File path validation**: Prevent directory traversal
4. **Command injection prevention**: Use parameterized commands
5. **Audit logging**: Track security-relevant events

### Principle of Least Privilege

**Strategy**: Request minimal permissions and validate all operations.

**Implementation**:

- **Deno permissions**: Request only required permissions
- **File access**: Validate all file operations
- **Network access**: Limit to necessary endpoints

## Future Considerations

### Extensibility

**Design**: Plugin architecture for future extensibility.

**Approach**:

- **Well-defined interfaces**: Clear contracts for extensions
- **Dependency injection**: Easy to add new implementations
- **Configuration-driven**: Extensions configured rather than coded

### Backward Compatibility

**Design**: Evolve APIs without breaking existing configurations.

**Approach**:

- **Versioned configuration**: Support multiple config versions
- **Deprecation warnings**: Gradual migration path
- **Semantic versioning**: Clear API stability guarantees

## Learning from Production

### Reliability Improvements

The recent reliability fixes demonstrate these principles in action:

1. **Atomic operations**: BackupManager ensures consistent state
2. **API-first approach**: JSR REST API provides reliable verification
3. **Graceful degradation**: Terminal compatibility with fallbacks
4. **Comprehensive testing**: Preflight checks prevent failures

### User Feedback Integration

**Pattern**: Continuous improvement based on real-world usage.

**Implementation**:

- **Error telemetry**: Anonymous error reporting for improvement
- **Usage analytics**: Understanding common patterns and pain points
- **Community feedback**: GitHub issues and discussions

## Conclusion

Nagare's design principles create a foundation for secure, reliable, and maintainable release automation. By understanding these principles, you can better configure Nagare for your specific needs and contribute to its continued evolution.

The emphasis on security, reliability, and developer experience ensures that Nagare remains a trusted tool for critical release operations while being approachable for developers of all experience levels.

## Further Reading

- [Architecture Overview](./architecture.md) - Technical architecture details
- [Release Workflow](./release-workflow.md) - How releases work internally
- [Version Management](./version-management.md) - Semantic versioning implementation
