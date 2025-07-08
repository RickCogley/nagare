# Progress Indicator Design

## Visual Progress System

### 1. Overall Release Progress Bar

```
🚀 Release Progress: [████████░░░░░░░] 53% | JSR Publishing
```

Stages:

1. Pre-release checks (10%)
2. Version updates (20%)
3. Changelog generation (30%)
4. Git operations (40%)
5. GitHub release (50%)
6. CI/CD monitoring (60%)
7. JSR verification (80%)
8. Auto-fix attempts (if needed) (90%)
9. Final verification (100%)

### 2. Workflow Status Indicators

**Waiting/Monitoring:**

```
⣷ Monitoring GitHub Actions workflow...
  └─ Run #1234 | 2m 15s elapsed
```

**Auto-fixing:**

```
🔧 Auto-fixing lint errors (attempt 1/3)
  ├─ ✓ Analyzing 5 ESLint errors
  ├─ ⣾ Applying fixes...
  └─ ○ Committing changes
```

**Multi-task Progress:**

```
📦 Verifying JSR publish
  ├─ ✓ GitHub release created
  ├─ ⣾ Workflow running (job 2/3)
  ├─ ○ JSR processing
  └─ ○ Final verification
```

### 3. Horizontal Flow Indicator (Primary UX)

A clear, GUI-style horizontal flow that shows the entire process with current step highlighted:

**Default style:**

```
┌─────────────────────────── Release Pipeline ───────────────────────────┐
│  Init  │ Checks │ Version │ Changes │  Git  │ GitHub │ ▶ CI/CD ◀ │ JSR │
└─────────────────────────────────────────────────────────────────────────┘
         ✓        ✓         ✓         ✓       ✓        ✓    ⣾ Active
```

**Compact style:**

```
[✓] Init → [✓] Checks → [✓] Version → [✓] Git → [✓] GitHub → [⣾] CI/CD → [ ] JSR → [ ] Done
```

**With substeps expanded:**

```
┌─────────────────────────── Release Pipeline ───────────────────────────┐
│  Init  │ Checks │ Version │ Changes │  Git  │ GitHub │ ▶ CI/CD ◀ │ JSR │
└─────────────────────────────────────────────────────────────────────────┘
                                                           │
                                                    ┌──────┴──────┐
                                                    │ ✓ Triggered │
                                                    │ ⣾ Running   │
                                                    │ ○ Verify     │
                                                    └─────────────┘
```

**Error state with auto-fix:**

```
┌─────────────────────────── Release Pipeline ───────────────────────────┐
│  Init  │ Checks │ Version │ Changes │  Git  │ GitHub │ ▶ CI/CD ◀ │ JSR │
└─────────────────────────────────────────────────────────────────────────┘
         ✓        ✓         ✓         ✓       ✓        ✓    ❌ Failed
                                                              │
                                                       ┌──────┴──────┐
                                                       │ 🔧 Auto-fix │
                                                       │ Attempt 1/3 │
                                                       └─────────────┘
```

### 4. Implementation Approach

**Using Deno-compatible libraries:**

- `cliffy/ansi` - For colors and cursor control
- Custom progress bar implementation
- Spinner patterns: ⣾⣽⣻⢿⡿⣟⣯⣷

**Progress States:**

```typescript
interface ProgressState {
  stage: string;
  percent: number;
  status: "pending" | "active" | "success" | "error" | "fixing";
  message: string;
  elapsed?: number;
  estimated?: number;
}
```

### 5. Error State Indicators

**Failed with details:**

```
❌ GitHub Actions workflow failed
   └─ ESLint found 5 errors in 3 files
   
🔧 Auto-fix enabled. Starting repair process...
```

**Retry countdown:**

```
⏳ JSR not yet available. Retrying in 10s... [██████░░░░]
```

### 6. Configuration

```typescript
{
  release: {
    progress: {
      enabled: true,
      style: "detailed" | "minimal" | "quiet",
      showElapsedTime: true,
      showEstimates: true,
      updateInterval: 100  // ms
    }
  }
}
```

### 7. Examples in Context

**Standard release flow:**

```
$ nagare release

🚀 Starting release v1.2.3

[████░░░░░░░░░░░░] 25% | Updating version files
  └─ ✓ deno.json
  └─ ✓ package.json
  └─ ⣾ README.md

Time elapsed: 0:45 | Estimated remaining: 2:15
```

**With auto-fix:**

```
$ nagare release

🚀 Release v1.2.3 Progress

[████████████░░░░] 75% | CI/CD Pipeline
  └─ ❌ Lint check failed
  
🔧 Auto-fixing detected issues...
  
Lint Fixes [███░░░░░░░] 3/10 files
  ├─ ✓ src/index.ts - Added missing semicolons
  ├─ ✓ src/utils.ts - Fixed import order
  └─ ⣾ src/config.ts - Resolving no-unused-vars...
  
⏱️  2m 30s elapsed | Fix attempt 1 of 3
```

### 8. Accessibility Considerations

- Support `NO_COLOR` environment variable
- Provide text-only mode for CI environments
- Clear status messages even without visual indicators
- Screen reader friendly output in quiet mode
