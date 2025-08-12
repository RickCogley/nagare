# Understanding Nagare's architecture

## Overview

Nagare's architecture follows a manager-based design pattern where specialized components handle specific aspects of the
release process. This modular approach enables flexibility, testability, and clear separation of concerns. Understanding
this architecture helps you extend Nagare, contribute to the project, or build similar tools.

## Why this architecture?

Software release management involves multiple complex operations:

- Git repository manipulation.
- File system operations.
- Version calculations.
- Template processing.
- External service integration.

Without clear architectural boundaries, these concerns become entangled, making the system difficult to understand,
test, and extend. Nagare's architecture provides structure while maintaining flexibility.

## High-level architecture

```mermaid
graph TB
    subgraph "Entry Points"
        CLI[cli.ts]
        LIB[mod.ts]
    end
    
    subgraph "Core Managers"
        RM[ReleaseManager]
        RBM[RollbackManager]
    end
    
    subgraph "Operations Layer"
        GO[GitOperations]
        GH[GitHubIntegration]
    end
    
    subgraph "Processing Layer"
        FH[FileHandlerManager]
        TP[TemplateProcessor]
        CG[ChangelogGenerator]
        VU[VersionUtils]
    end
    
    subgraph "Configuration"
        CONFIG[NagareConfig]
        TYPES[Type Definitions]
    end
    
    CLI --> RM
    CLI --> RBM
    LIB --> RM
    LIB --> RBM
    
    RM --> GO
    RM --> FH
    RM --> CG
    RM --> VU
    RM --> GH
    
    RBM --> GO
    RBM --> FH
    
    FH --> TP
    
    CONFIG --> RM
    CONFIG --> RBM
    TYPES --> CONFIG
    
    style RM fill:#FFE4B5
    style RBM fill:#FFE4B5
    style CONFIG fill:#E8F5E9
```

## Component deep dive

### Manager components

Managers orchestrate complex workflows by coordinating multiple operations:

```mermaid
classDiagram
    class ReleaseManager {
        -config: NagareConfig
        -gitOps: GitOperations
        -fileHandler: FileHandlerManager
        -changelog: ChangelogGenerator
        -github: GitHubIntegration
        +performRelease()
        +calculateNewVersion()
        +updateFiles()
        +createRelease()
    }
    
    class RollbackManager {
        -config: NagareConfig
        -gitOps: GitOperations
        -fileHandler: FileHandlerManager
        +rollbackToVersion()
        +rollbackToTag()
        -findVersionTag()
        -restoreFiles()
    }
    
    class FileHandlerManager {
        -config: NagareConfig
        -templateProcessor: TemplateProcessor
        +updateFiles()
        -detectFileType()
        -applyHandler()
        -processTemplate()
    }
```

**Design Decision**: The manager pattern provides clear ownership of workflows while keeping individual operations
simple and testable.

### Operations Layer

Operations components handle direct interactions with external systems:

```mermaid
sequenceDiagram
    participant RM as ReleaseManager
    participant GO as GitOperations
    participant GH as GitHubIntegration
    participant Git as Git CLI
    participant Hub as gh CLI
    
    RM->>GO: Check git status
    GO->>Git: git status --porcelain
    Git->>GO: Clean/dirty state
    GO->>RM: Status result
    
    RM->>GO: Create commit
    GO->>Git: git commit -m "..."
    Git->>GO: Commit hash
    GO->>RM: Success
    
    RM->>GH: Create release
    GH->>Hub: gh release create
    Hub->>GH: Release URL
    GH->>RM: Release created
```

**Trade-offs**:

- **Advantages**: Clear abstraction over CLI tools, easy to mock for testing
- **Limitations**: Depends on external tools being installed

### File Handler Architecture

The file handler system provides extensibility through multiple strategies:

```mermaid
graph TD
    subgraph "File Handler Manager"
        FHM[FileHandlerManager]
        FHM --> DET{Detect Type}
        
        DET -->|package.json| BH1[PackageJsonHandler]
        DET -->|deno.json| BH2[DenoJsonHandler]
        DET -->|Cargo.toml| BH3[CargoTomlHandler]
        DET -->|*.md| BH4[MarkdownHandler]
        DET -->|Custom| CH[Custom Handler]
        DET -->|Template| TH[Template Handler]
    end
    
    subgraph "Handler Strategies"
        BH1 --> REG1[Regex Replace]
        BH2 --> REG2[Regex Replace]
        BH3 --> REG3[Regex Replace]
        BH4 --> REG4[Pattern Match]
        CH --> FUNC[User Function]
        TH --> TEMP[Vento Process]
    end
```

### Template Processing Architecture

```mermaid
graph LR
    subgraph "Template System"
        TP[TemplateProcessor]
        TP --> VE[Vento Engine]
        
        subgraph "Template Data"
            TD[TemplateData]
            TD --> V[version]
            TD --> PV[previousVersion]
            TD --> M[metadata]
            TD --> NOW[now]
            TD --> GC[gitCommit]
        end
        
        subgraph "Built-in Templates"
            T1[TypeScript]
            T2[JSON]
            T3[YAML]
            T4[Text]
        end
        
        VE --> TD
        T1 --> VE
        T2 --> VE
        T3 --> VE
        T4 --> VE
    end
```

## Data Flow

### Release Process Data Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant RM as ReleaseManager
    participant VU as VersionUtils
    participant FH as FileHandler
    participant CG as Changelog
    participant GO as GitOps
    participant GH as GitHub
    
    User->>CLI: nagare release
    CLI->>RM: performRelease(config)
    
    RM->>GO: validateGitState()
    GO-->>RM: Clean state
    
    RM->>VU: calculateNewVersion()
    VU->>GO: getCommitsSinceLastTag()
    GO-->>VU: Commit list
    VU-->>RM: New version
    
    RM->>FH: updateFiles(newVersion)
    FH-->>RM: Files updated
    
    RM->>CG: generateChangelog(commits)
    CG-->>RM: Changelog entry
    
    RM->>GO: commitChanges()
    GO-->>RM: Committed
    
    RM->>GO: createTag(version)
    GO-->>RM: Tagged
    
    RM->>GH: createRelease()
    GH-->>RM: Release URL
    
    RM-->>User: Success!
```

## Design Decisions

### Why Manager-Based Architecture?

**Advantages**:

- Clear separation of concerns
- Easy to test individual components
- Workflow logic separated from implementation details
- Natural extension points

**Trade-offs**:

- More files and indirection
- Requires understanding the component hierarchy
- Potential for over-abstraction

### Why Wrap CLI Tools?

Nagare wraps `git` and `gh` CLI tools rather than using libraries:

```mermaid
graph TD
    A[Direct Library Use] --> A1[Pro: No external deps]
    A --> A2[Pro: Full API access]
    A --> A3[Con: Complex implementation]
    A --> A4[Con: Auth handling needed]
    
    B[CLI Wrappers] --> B1[Pro: Simple implementation]
    B --> B2[Pro: Uses existing auth]
    B --> B3[Pro: Familiar to users]
    B --> B4[Con: Requires CLI tools]
    
    C[Decision: CLI Wrappers] --> D[Simpler, leverages existing tools]
    
    style C fill:#90EE90
```

### Configuration-Driven Design

```mermaid
graph TD
    subgraph "Configuration Flow"
        UC[User Config] --> LC[Load Config]
        LC --> VC[Validate Config]
        VC --> MC[Merge Defaults]
        MC --> FC[Final Config]
    end
    
    subgraph "Component Initialization"
        FC --> RM[ReleaseManager]
        FC --> RBM[RollbackManager]
        FC --> FH[FileHandler]
        FC --> TP[TemplateProcessor]
    end
    
    subgraph "Behavior Customization"
        FC --> BH[Built-in Handlers]
        FC --> CH[Custom Handlers]
        FC --> TF[Template Files]
        FC --> RF[Release Format]
    end
```

## Extension Points

### Adding New File Handlers

```mermaid
graph TD
    A[New File Type] --> B{Handler Type?}
    
    B -->|Simple Pattern| C[Add to Built-in]
    C --> C1[Define regex pattern]
    C --> C2[Add to default handlers]
    
    B -->|Complex Logic| D[Custom Handler]
    D --> D1[Write update function]
    D --> D2[Add to config.customFiles]
    
    B -->|Structured Format| E[Template Handler]
    E --> E1[Create Vento template]
    E --> E2[Add to config.templateFiles]
```

### Adding New Commands

```mermaid
graph LR
    A[New Command] --> B[CLI Entry]
    B --> C[Create Manager]
    C --> D[Implement Workflow]
    D --> E[Use Existing Ops]
    
    subgraph "Example: Status Command"
        F[cli.ts] --> G[StatusManager]
        G --> H[GitOperations]
        G --> I[FileHandler]
        G --> J[Display Status]
    end
```

## Error Handling Architecture

```mermaid
graph TD
    subgraph "Error Types"
        E1[NagareError Base]
        E1 --> E2[ValidationError]
        E1 --> E3[GitError]
        E1 --> E4[FileError]
        E1 --> E5[VersionError]
    end
    
    subgraph "Error Flow"
        A[Operation] --> B{Success?}
        B -->|No| C[Throw Specific Error]
        C --> D[Bubble to Manager]
        D --> E[Format User Message]
        E --> F[Exit with Code]
        
        B -->|Yes| G[Continue]
    end
    
    subgraph "Error Information"
        C --> H[Error Type]
        C --> I[User Message]
        C --> J[Technical Details]
        C --> K[Recovery Suggestions]
    end
```

## Security Architecture

### Input Validation Layers

```mermaid
graph TD
    subgraph "Validation Points"
        A[User Input] --> B[CLI Arguments]
        B --> C[Config Validation]
        C --> D[Runtime Validation]
        
        B --> B1[Type checking]
        B --> B2[Format validation]
        
        C --> C1[Schema validation]
        C --> C2[Path verification]
        
        D --> D1[Git state checks]
        D --> D2[File existence]
        D --> D3[Version format]
    end
    
    subgraph "Security Checks"
        E[Path Traversal Prevention]
        F[Command Injection Prevention]
        G[Template Injection Prevention]
        H[Secrets Protection]
    end
    
    D --> E
    D --> F
    D --> G
    D --> H
```

### Secure Operations

```mermaid
sequenceDiagram
    participant User
    participant Nagare
    participant Validation
    participant FileSystem
    
    User->>Nagare: Custom file path
    Nagare->>Validation: Validate path
    
    alt Path contains ../
        Validation-->>Nagare: Reject: Path traversal
        Nagare-->>User: Error
    else Valid path
        Validation-->>Nagare: Approved
        Nagare->>FileSystem: Read/Write file
        FileSystem-->>Nagare: Success
        Nagare-->>User: Complete
    end
```

## Performance Considerations

### Optimization Strategies

```mermaid
graph TD
    A[Performance Optimizations] --> B[Lazy Loading]
    A --> C[Parallel Operations]
    A --> D[Caching]
    
    B --> B1[Load templates on demand]
    B --> B2[Import modules when needed]
    
    C --> C1[Update multiple files concurrently]
    C --> C2[Parallel git operations where safe]
    
    D --> D1[Cache git command results]
    D --> D2[Reuse compiled templates]
```

## Testing Architecture

```mermaid
graph TD
    subgraph "Test Strategy"
        A[Unit Tests] --> A1[Individual components]
        A --> A2[Mock external deps]
        
        B[Integration Tests] --> B1[Full workflows]
        B --> B2[Real git repos]
        
        C[E2E Tests] --> C1[CLI commands]
        C --> C2[Actual releases]
    end
    
    subgraph "Test Utilities"
        D[Test Fixtures]
        E[Mock Factories]
        F[Temp Directories]
        G[Git Helpers]
    end
    
    A --> D
    A --> E
    B --> F
    B --> G
```

## Comparison with Alternative Architectures

| Architecture           | Approach              | Pros                      | Cons                    | Best For          |
| ---------------------- | --------------------- | ------------------------- | ----------------------- | ----------------- |
| Manager-Based (Nagare) | Orchestration classes | Clear workflows, testable | More code structure     | Complex workflows |
| Functional Pipeline    | Pure functions        | Simple, composable        | Harder state management | Simple transforms |
| Plugin Architecture    | Dynamic loading       | Extremely flexible        | Complex, slower         | Large ecosystems  |
| Monolithic Script      | Single file           | Simple to understand      | Hard to test/extend     | Small tools       |

## Future Architecture Considerations

### Potential Enhancements

```mermaid
graph TD
    A[Future Enhancements] --> B[Plugin System]
    A --> C[Async Operations]
    A --> D[Remote Config]
    A --> E[Web UI]
    
    B --> B1[Dynamic handler loading]
    B --> B2[Hook system]
    
    C --> C1[Concurrent file updates]
    C --> C2[Async git operations]
    
    D --> D1[Config from URL]
    D --> D2[Shared team configs]
    
    E --> E1[Release dashboard]
    E --> E2[Visual configuration]
```

### Maintaining Architecture Quality

1. **Component Boundaries**: Keep clear separation between managers, operations, and utilities
2. **Dependency Direction**: Dependencies should flow inward (operations don't know about managers)
3. **Type Safety**: Leverage TypeScript's type system for compile-time guarantees
4. **Error Handling**: Consistent error types and user-friendly messages
5. **Testing**: Each component should be independently testable

## Further Reading

- [Release Workflow Concepts](./release-workflow.md)
- [Version Management Concepts](./version-management.md)
- [API Reference](https://nagare.esolia.deno.net/)
- [Contributing Guide](../CONTRIBUTING.md)
