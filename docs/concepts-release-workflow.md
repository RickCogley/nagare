# Understanding Nagare's Release Workflow

## Overview

The release workflow is the heart of Nagare - it orchestrates the entire process of creating a new version of your software. Understanding this workflow helps you customize Nagare for your specific needs, troubleshoot issues, and contribute to the project effectively.

## Why Release Automation Matters

Manual releases are error-prone and time-consuming. Common issues include:
- Forgetting to update version numbers in multiple files
- Inconsistent changelog entries
- Missing git tags or GitHub releases
- Human errors in repetitive tasks

Nagare automates these steps while maintaining flexibility for project-specific needs.

## How the Release Workflow Works

The release process follows a carefully orchestrated sequence:

```mermaid
graph TD
    A[Start Release] --> B{Check Git State}
    B -->|Clean| C[Analyze Commits]
    B -->|Dirty| Z[Error: Uncommitted Changes]
    
    C --> D[Calculate Version Bump]
    D --> E[Update Version Files]
    E --> F[Generate Changelog]
    F --> G[Create Git Commit]
    G --> H[Create Git Tag]
    H --> I{GitHub Integration?}
    I -->|Yes| J[Create GitHub Release]
    I -->|No| K[Complete]
    J --> K[Complete]
    
    style A fill:#90EE90
    style K fill:#87CEEB
    style Z fill:#FFB6C1
```

### Detailed Phase Breakdown

#### 1. Pre-flight Checks

Before any modifications, Nagare validates the environment:

```mermaid
graph LR
    A[Git State Check] --> B{Working Directory Clean?}
    B -->|Yes| C[Proceed]
    B -->|No| D[Abort with Error]
    
    C --> E{On Valid Branch?}
    E -->|Yes| F[Check Remote]
    E -->|No| G[Abort with Error]
    
    F --> H{Up to Date?}
    H -->|Yes| I[Ready]
    H -->|No| J[Warning]
```

**Design Decision**: We require a clean git state to ensure releases are reproducible and don't accidentally include unintended changes.

#### 2. Version Calculation

Nagare analyzes commit messages since the last release:

```mermaid
graph TD
    A[Get Commits Since Last Tag] --> B[Parse Each Commit]
    B --> C{Commit Type?}
    
    C -->|feat:| D[Minor Bump]
    C -->|fix:| E[Patch Bump]
    C -->|BREAKING CHANGE| F[Major Bump]
    C -->|other| G[Patch Bump]
    
    D --> H[Aggregate Highest Bump]
    E --> H
    F --> H
    G --> H
    
    H --> I[Apply to Current Version]
```

**Trade-offs**:
- **Advantages**: Automatic versioning based on commit history, follows semantic versioning
- **Limitations**: Requires disciplined commit messages, can't override version calculation without force flags

#### 3. File Update Process

The FileHandlerManager orchestrates updates across multiple file types:

```mermaid
sequenceDiagram
    participant RM as ReleaseManager
    participant FH as FileHandlerManager
    participant H as Handler
    participant TP as TemplateProcessor
    
    RM->>FH: Update files with new version
    FH->>FH: Detect file types
    
    loop For each file
        FH->>H: Apply handler
        alt Built-in Handler
            H->>H: Apply regex pattern
        else Custom Handler
            H->>H: Execute custom function
        else Template Handler
            H->>TP: Process template
            TP->>H: Return processed content
        end
        H->>FH: Return updated content
    end
    
    FH->>RM: All files updated
```

#### 4. Changelog Generation

The changelog follows the Keep a Changelog format:

```mermaid
graph TD
    A[Group Commits by Type] --> B[Format Each Section]
    B --> C[Added: New Features]
    B --> D[Fixed: Bug Fixes]
    B --> E[Changed: Modifications]
    B --> F[Security: Security Updates]
    
    C --> G[Generate Entry]
    D --> G
    E --> G
    F --> G
    
    G --> H[Prepend to CHANGELOG.md]
    H --> I[Maintain Previous Entries]
```

## Design Decisions

### Why Conventional Commits?

We chose conventional commits as the foundation because:

**Advantages**:
- Machine-readable format enables automation
- Industry standard with wide tooling support
- Clear intent in commit history
- Enables automatic version calculation

**Trade-offs**:
- Requires team discipline
- Learning curve for new contributors
- Less flexible than manual versioning

### Why Multiple File Handlers?

Different projects use different file formats for version management:

```mermaid
graph TD
    A[File Type Detection] --> B{What Type?}
    B -->|package.json| C[JSON Handler]
    B -->|deno.json| D[Deno Handler]
    B -->|Cargo.toml| E[TOML Handler]
    B -->|version.txt| F[Text Handler]
    B -->|Custom| G[User Function]
    
    C --> H[Targeted Updates]
    D --> H
    E --> H
    F --> H
    G --> H
```

**Design Rationale**: 
- Built-in handlers cover 80% of use cases
- Custom handlers provide escape hatch for complex scenarios
- Template support enables any file format

### Git Integration Architecture

```mermaid
graph LR
    A[GitOperations] --> B[Local Git Commands]
    A --> C[Commit & Tag Creation]
    
    D[GitHubIntegration] --> E[gh CLI Wrapper]
    D --> F[Release Creation]
    
    G[ReleaseManager] --> A
    G --> D
    
    style G fill:#FFE4B5
```

**Why gh CLI?**: 
- Avoids API token management complexity
- Leverages existing GitHub authentication
- Simpler than direct API integration

## Common Patterns

### Pattern 1: Multi-File Version Updates

Many projects need version updates in multiple locations:

```mermaid
graph TD
    A[New Version 2.0.0] --> B[package.json]
    A --> C[README.md badges]
    A --> D[version.ts constant]
    A --> E[API documentation]
    
    B --> F[npm publish]
    C --> G[User visibility]
    D --> H[Runtime access]
    E --> I[API reference]
```

### Pattern 2: Custom Version Locations

For non-standard files, use custom handlers:

```typescript
{
  fileUpdates: {
    customFiles: [{
      path: "src/constants.py",
      update: (content, { newVersion }) => {
        return content.replace(
          /VERSION = ["'][\d.]+["']/,
          `VERSION = "${newVersion}"`
        );
      }
    }]
  }
}
```

### Pattern 3: Template-Based Updates

For complex files, use Vento templates:

```typescript
{
  fileUpdates: {
    templateFiles: [{
      path: "src/build-info.ts",
      templatePath: "./templates/build-info.vento"
    }]
  }
}
```

## Workflow Customization Points

```mermaid
graph TD
    A[Release Workflow] --> B{Customization Points}
    
    B --> C[Version Calculation]
    C --> C1[Force specific bump type]
    C --> C2[Custom version format]
    
    B --> D[File Updates]
    D --> D1[Add custom handlers]
    D --> D2[Skip built-in handlers]
    D --> D3[Template processing]
    
    B --> E[Changelog]
    E --> E1[Custom sections]
    E --> E2[Format overrides]
    
    B --> F[Git Operations]
    F --> F1[Commit message format]
    F --> F2[Tag format]
    
    B --> G[Post-Release]
    G --> G1[GitHub release]
    G --> G2[Custom hooks]
```

## Error Handling Philosophy

Nagare follows a fail-fast approach with helpful error messages:

```mermaid
stateDiagram-v2
    [*] --> Validating
    Validating --> Processing: All checks pass
    Validating --> Error: Validation fails
    
    Processing --> Updating: Version calculated
    Processing --> Error: Parse failure
    
    Updating --> Committing: Files updated
    Updating --> Error: Update failure
    
    Committing --> Tagging: Commit created
    Committing --> Error: Git failure
    
    Tagging --> Publishing: Tag created
    Tagging --> Error: Tag exists
    
    Publishing --> [*]: Success
    Publishing --> Error: Publish failure
    
    Error --> [*]: Show helpful message
```

## Comparison with Alternatives

| Tool | Approach | Pros | Cons | Best For |
|------|----------|------|------|----------|
| Nagare | Conventional commits + config | Flexible, type-safe, multi-format | Requires commit discipline | Projects needing customization |
| semantic-release | Fully automated | Zero config, plugin ecosystem | Less flexible, Node.js only | Standard Node.js projects |
| release-it | Interactive/automated | Good defaults, extensible | Requires Node.js | JavaScript ecosystem |
| goreleaser | Config-driven | Go-specific features | Go only | Go projects |

## Security Considerations

The release workflow has several security touchpoints:

```mermaid
graph TD
    A[Security Checks] --> B[Input Validation]
    B --> B1[Sanitize version strings]
    B --> B2[Validate file paths]
    
    A --> C[Authentication]
    C --> C1[GitHub token handling]
    C --> C2[No hardcoded secrets]
    
    A --> D[File Operations]
    D --> D1[Path traversal prevention]
    D --> D2[Safe file updates]
    
    A --> E[Git Operations]
    E --> E1[Command injection prevention]
    E --> E2[Safe tag names]
```

## Further Reading

- [Semantic Versioning Specification](https://semver.org/)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Architecture Overview](./concepts-architecture.md)
- [Version Management Concepts](./concepts-version-management.md)