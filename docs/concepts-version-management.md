# Understanding Version Management in Nagare

## Overview

Version management is fundamental to software development - it communicates changes, maintains compatibility, and enables dependency management. Nagare combines semantic versioning with conventional commits to create an automated, consistent versioning system that scales from simple scripts to complex multi-package projects.

## Why Semantic Versioning Matters

Semantic versioning (SemVer) provides a universal language for software changes:

- **MAJOR.MINOR.PATCH** format (e.g., 2.4.1)
- Each number conveys specific meaning about compatibility
- Enables automated dependency resolution
- Creates trust between maintainers and users

Without semantic versioning:
- Users don't know if updates will break their code
- Dependency managers can't resolve versions safely
- Change impact is unclear from version numbers alone

## How Nagare Implements Semantic Versioning

### Version Calculation Flow

```mermaid
graph TD
    A[Current Version 1.2.3] --> B[Analyze Commits]
    B --> C{Commit Types Found}
    
    C -->|BREAKING CHANGE| D[Major: 2.0.0]
    C -->|feat:| E[Minor: 1.3.0]
    C -->|fix:| F[Patch: 1.2.4]
    C -->|other:| G[Patch: 1.2.4]
    
    D --> H[New Version]
    E --> H
    F --> H
    G --> H
    
    style A fill:#E8F5E9
    style H fill:#BBDEFB
```

### Conventional Commits Integration

Nagare reads your git history to determine version bumps:

```mermaid
graph LR
    A[Git Commits] --> B[Parser]
    B --> C[Type Extraction]
    C --> D[Breaking Detection]
    D --> E[Version Decision]
    
    subgraph "Commit Types"
        F[feat: New Feature]
        G[fix: Bug Fix]
        H[docs: Documentation]
        I[style: Formatting]
        J[refactor: Code Change]
        K[test: Test Addition]
        L[chore: Maintenance]
    end
    
    F --> M[Minor Bump]
    G --> N[Patch Bump]
    H --> N
    I --> N
    J --> N
    K --> N
    L --> N
```

### Breaking Change Detection

Multiple ways to indicate breaking changes:

```mermaid
graph TD
    A[Breaking Change Indicators] --> B[! in Type]
    A --> C[BREAKING CHANGE in Body]
    A --> D[BREAKING-CHANGE in Body]
    A --> E[BREAKING CHANGE: in Footer]
    
    B --> F[Major Version Bump]
    C --> F
    D --> F
    E --> F
    
    subgraph "Examples"
        G["feat!: Remove deprecated API"]
        H["feat: Add new endpoint<br/>BREAKING CHANGE: Changes response format"]
    end
```

## Design Decisions

### Why Conventional Commits?

We chose conventional commits as the foundation for version management:

**Advantages**:
- Automatic version calculation from commit history
- Self-documenting git log
- Standardized format with tooling ecosystem
- Clear communication of change intent

**Trade-offs**:
- Requires team discipline and training
- Mistakes in commit messages affect versioning
- Retroactive fixes require git history rewriting

### Version Bump Priority System

When multiple commit types exist, Nagare uses the highest priority:

```mermaid
graph TD
    A[Multiple Commits] --> B{Analyze All}
    B --> C[1x Breaking Change]
    B --> D[3x Features]
    B --> E[5x Fixes]
    
    C --> F[Major Wins]
    D --> F
    E --> F
    
    F --> G[Version: Major Bump]
    
    style C fill:#FFB6C1
    style F fill:#FFD700
```

**Design Rationale**: This ensures version numbers always reflect the most significant change, preventing accidental breaking releases with minor version bumps.

### Pre-release Version Handling

Nagare supports pre-release versions for testing:

```mermaid
stateDiagram-v2
    [*] --> Stable: Normal Release
    Stable --> PreRelease: --pre-release alpha
    PreRelease --> PreRelease: Increment
    PreRelease --> Stable: Full Release
    
    state PreRelease {
        alpha --> beta
        beta --> rc
        rc --> [*]
    }
```

Example progression:
- 1.2.3 → 1.3.0-alpha.0
- 1.3.0-alpha.0 → 1.3.0-alpha.1
- 1.3.0-alpha.1 → 1.3.0-beta.0
- 1.3.0-beta.0 → 1.3.0-rc.0
- 1.3.0-rc.0 → 1.3.0

## Version Storage Patterns

### Multi-File Synchronization

Nagare keeps versions synchronized across multiple files:

```mermaid
graph TD
    A[Version Source of Truth] --> B[Git Tags]
    B --> C[Version Calculator]
    
    C --> D[package.json]
    C --> E[deno.json]
    C --> F[Cargo.toml]
    C --> G[version.ts]
    C --> H[README.md]
    C --> I[Custom Files]
    
    subgraph "Update Strategies"
        J[JSON: Direct property update]
        K[TOML: Table value update]
        L[TypeScript: Const replacement]
        M[Markdown: Badge/text replacement]
        N[Custom: User-defined function]
    end
    
    D --> J
    F --> K
    G --> L
    H --> M
    I --> N
```

### Built-in File Handlers

Each file type has specific update patterns:

```mermaid
graph LR
    subgraph "JSON Files"
        A1[package.json] --> A2["{\n  'version': '1.2.3'\n}"]
        B1[deno.json] --> B2["{\n  'version': '1.2.3'\n}"]
    end
    
    subgraph "Code Files"
        C1[version.ts] --> C2["export const VERSION = '1.2.3';"]
        D1[version.py] --> D2["VERSION = '1.2.3'"]
    end
    
    subgraph "Documentation"
        E1[README.md] --> E2["![Version](https://img.shields.io/badge/version-1.2.3-blue)"]
    end
```

## Common Patterns

### Pattern 1: Monorepo Version Management

For monorepos with multiple packages:

```mermaid
graph TD
    A[Root Version] --> B[Package A]
    A --> C[Package B]
    A --> D[Package C]
    
    B --> B1[Independent versioning]
    C --> C1[Synchronized with root]
    D --> D1[Custom logic]
    
    subgraph "Configuration"
        E["fileUpdates: {\n  includeDefaultHandlers: ['./packages/*/package.json']\n}"]
    end
```

### Pattern 2: Version Constants in Code

Embedding version in source code:

```typescript
// Template approach
{
  fileUpdates: {
    templateFiles: [{
      path: "src/version.ts",
      template: `export const VERSION = "&#123;&#123; version &#125;&#125;";
export const BUILD_DATE = "&#123;&#123; now |> date &#125;&#125;";
export const COMMIT = "&#123;&#123; gitCommit &#125;&#125;";`
    }]
  }
}
```

### Pattern 3: Documentation Badge Updates

Keeping README badges current:

```typescript
{
  fileUpdates: {
    customFiles: [{
      path: "README.md",
      update: (content, { newVersion }) => {
        // Update version badge
        content = content.replace(
          /shields\.io\/badge\/version-[\d.]+/g,
          `shields.io/badge/version-${newVersion}`
        );
        // Update installation instructions
        content = content.replace(
          /@[\d.]+/g,
          `@${newVersion}`
        );
        return content;
      }
    }]
  }
}
```

## Version Validation and Safety

### Pre-flight Validation

```mermaid
graph TD
    A[Version Validation] --> B{Valid SemVer?}
    B -->|Yes| C{Higher than Current?}
    B -->|No| X[Error: Invalid Format]
    
    C -->|Yes| D{Tag Exists?}
    C -->|No| Y[Error: Version Regression]
    
    D -->|No| E[Proceed with Release]
    D -->|Yes| Z[Error: Duplicate Version]
    
    style X fill:#FFB6C1
    style Y fill:#FFB6C1
    style Z fill:#FFB6C1
    style E fill:#90EE90
```

### Version Conflict Resolution

When automation meets manual overrides:

```mermaid
sequenceDiagram
    participant User
    participant Nagare
    participant Git
    
    User->>Nagare: nagare --patch
    Nagare->>Git: Analyze commits
    Git->>Nagare: Returns: Minor bump needed
    Nagare->>Nagare: User forced patch
    Nagare->>User: Warning: Overriding minor→patch
    User->>Nagare: Confirm override
    Nagare->>Git: Create patch version
```

## Version History and Rollback

### Rollback Capabilities

```mermaid
graph TD
    A[Current: v2.1.0] --> B[Rollback to v2.0.0]
    
    B --> C[Restore Files]
    C --> C1[Read v2.0.0 file states]
    C --> C2[Update all version files]
    
    B --> D[Update Git]
    D --> D1[Delete v2.1.0 tag]
    D --> D2[Create rollback commit]
    
    B --> E[Update GitHub]
    E --> E1[Delete v2.1.0 release]
    
    C2 --> F[Rolled back to v2.0.0]
    D2 --> F
    E1 --> F
    
    style A fill:#FFB6C1
    style F fill:#90EE90
```

## Comparison with Version Management Approaches

| Approach | Version Source | Pros | Cons | Best For |
|----------|---------------|------|------|----------|
| Nagare (Conventional) | Git commit messages | Automatic, consistent | Requires discipline | Teams following conventions |
| Manual Updates | Developer decision | Full control | Error-prone, inconsistent | Small projects |
| Calendar Versioning | Date-based | Simple, predictable | No compatibility info | Regular releases |
| Git Hash Versioning | Commit SHA | Unique, traceable | Not semantic | Continuous deployment |

## Advanced Version Strategies

### Synchronized Multi-Package Releases

```mermaid
graph TD
    A[Trigger Release] --> B{Release Mode?}
    
    B -->|Independent| C[Each package separately]
    B -->|Synchronized| D[All packages together]
    B -->|Dependent| E[Cascade updates]
    
    C --> F[Package A: 1.2.0→1.2.1]
    C --> G[Package B: 2.0.0→2.0.0]
    
    D --> H[All: 3.0.0→3.1.0]
    
    E --> I[Core: 1.0.0→1.1.0]
    I --> J[Plugin: 1.0.0→1.0.1]
```

### Version Pinning and Constraints

```mermaid
graph LR
    A[Dependency Version Constraints] --> B[Exact: 1.2.3]
    A --> C[Compatible: ^1.2.3]
    A --> D[Minor: ~1.2.3]
    A --> E[Range: >=1.2.3 <2.0.0]
    
    B --> F[Never updates]
    C --> G[Updates to 1.x.x]
    D --> H[Updates to 1.2.x]
    E --> I[Flexible bounds]
```

## Security Considerations

Version management has security implications:

```mermaid
graph TD
    A[Security Concerns] --> B[Version Disclosure]
    B --> B1[Don't expose internal versions]
    B --> B2[Consider security headers]
    
    A --> C[Dependency Confusion]
    C --> C1[Verify package sources]
    C --> C2[Use lock files]
    
    A --> D[Version Injection]
    D --> D1[Sanitize version strings]
    D --> D2[Validate SemVer format]
    
    A --> E[Supply Chain]
    E --> E1[Sign releases]
    E --> E2[Verify checksums]
```

## Best Practices

1. **Commit Message Discipline**: Train your team on conventional commits
2. **Version File Consistency**: Always update all version locations together
3. **Pre-release Testing**: Use pre-release versions for major changes
4. **Changelog Maintenance**: Keep CHANGELOG.md synchronized with versions
5. **Tag Protection**: Protect version tags in your git repository
6. **Automation First**: Let Nagare calculate versions to ensure consistency

## Further Reading

- [Semantic Versioning 2.0.0](https://semver.org/)
- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/)
- [Release Workflow Concepts](./concepts-release-workflow.md)
- [Architecture Overview](./concepts-architecture.md)
- [How to Configure Version Updates](./how-to-configure-version-updates.md)