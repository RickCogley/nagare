# Execution Plan: Display Application Being Released

## Implementation Phases

### Phase 1: Application Name Display (Day 1-2)

**1.1 Use Existing Configuration**

- Application name already available in `config.project.name`
- No schema changes needed!
- Example from Nagare's own config:
  ```typescript
  project: {
    name: "Nagare (流れ)",  // This is what we need to display!
  }
  ```

**1.2 Create Display Utilities**

- New file: `/src/ui/app-context.ts`
- Functions to format application name consistently:
  ```typescript
  export function getAppDisplayName(config: NagareConfig): string {
    return config.project.name || "Unknown Project";
  }
  ```

**1.3 Update I18n Messages**

- File: `/src/i18n.ts`
- Add application-context messages:
  ```typescript
  "release.startingFor": "Starting release current for {appName}...",
  "release.analyzingFor": "Analyzing {appName} commit flow...",
  "release.updatingFor": "Updating {appName} version streams...",
  "release.completedFor": "{appName} v{version} release flow complete!"
  ```

### Phase 2: UI Components (Day 3-5)

**2.1 Create Application Context Header**

- New file: `/src/ui/release-header.ts`
- Display application being released:
  ```typescript
  export function showReleaseHeader(config: NagareConfig, fromVersion: string, toVersion: string) {
    const appName = config.project.name;
    console.log(`🌊 Nagare: Starting release current for ${appName}...`);
    console.log("━".repeat(50));
    console.log(`Project: ${appName}`);
    console.log(`Version: ${fromVersion} → ${toVersion}`);
    console.log("━".repeat(50));
  }
  ```

**2.2 Create Context-Aware Progress Messages**

- Update all progress messages to include app name
- Use consistent format: `🌊 Nagare: [Action] for [AppName]...`
- Examples:
  - In Aichaku: "🌊 Nagare: Analyzing Aichaku commit flow..."
  - In Aichaku: "🌊 Nagare: Updating 4 files in Aichaku current..."
  - In Nagare itself: "🌊 Nagare: Releasing Nagare (流れ) into GitHub current..."

### Phase 3: Integration (Day 6-8)

**3.1 Update Release Manager**

- File: `/src/release-manager.ts`
- Import and use branded output functions
- Replace console.log with branded alternatives
- Add release summary tracking

**3.2 Update CLI Entry Point**

- File: `/cli.ts`
- Show branded header on startup
- Respect `--quiet` or CI environment flags

**3.3 Update Progress Indicators**

- File: `/src/release-manager.ts`
- Replace generic progress with branded messages
- Add context to each step

### Phase 4: Testing & Polish (Day 9-10)

**4.1 Update Tests**

- File: `/tests/release-manager.test.ts`
- Test branded output generation
- Test configuration merging
- Test CI mode (no branding)

**4.2 Add Integration Tests**

- New file: `/tests/branded-output.test.ts`
- Test various terminal widths
- Test with/without configuration

**4.3 Documentation Updates**

- Update README with new configuration options
- Add screenshots of new output
- Document CI/CD considerations

## Technical Decisions

### Box Drawing Approach

```typescript
// Simple, dependency-free box drawing
const TOP_LEFT = "╭";
const TOP_RIGHT = "╮";
const BOTTOM_LEFT = "╰";
const BOTTOM_RIGHT = "╯";
const HORIZONTAL = "─";
const VERTICAL = "│";
```

### CI Detection

```typescript
const isCI = Deno.env.get("CI") === "true" ||
  Deno.env.get("GITHUB_ACTIONS") === "true" ||
  !Deno.isatty(Deno.stdout.rid);
```

### Configuration Loading

```typescript
// Respect user preferences
const showBranding = config.app?.showBranding ?? !isCI;
```

## File Changes Summary

### New Files:

1. `/src/ui/app-context.ts` - Application name utilities
2. `/src/ui/release-header.ts` - Release header display
3. `/tests/app-context.test.ts` - Context display tests

### Modified Files:

1. `/src/release-manager.ts` - Add app context to all output
2. `/src/i18n.ts` - Add app-specific messages
3. `/cli.ts` - Show app being released on startup
4. `/tests/release-manager.test.ts` - Update expectations

## Rollout Strategy

1. **Feature Flag**: Use config option to enable/disable
2. **Backward Compatible**: All changes are additive
3. **CI Friendly**: Auto-disable in CI environments
4. **Gradual Adoption**: Users opt-in via configuration

## Success Metrics

- Application name clearly visible throughout release process
- Users always know which project Nagare is releasing
- Works automatically with existing `config.project.name`
- Essential clarity for multi-project workflows
