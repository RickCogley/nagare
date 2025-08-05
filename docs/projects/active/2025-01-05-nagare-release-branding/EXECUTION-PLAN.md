# Execution Plan: Nagare Release Branding

## Implementation Phases

### Phase 1: Configuration Schema (Day 1-2)

**1.1 Extend Type Definitions**

- File: `/src/types.ts`
- Add `AppConfig` interface:
  ```typescript
  export interface AppConfig {
    name?: string;
    displayName?: string;
    version?: string;
    showBranding?: boolean;
  }
  ```
- Update `NagareConfig` to include `app?: AppConfig`

**1.2 Update Configuration Handler**

- File: `/src/config.ts`
- Add default app configuration
- Merge user overrides appropriately

**1.3 Update Example Config**

- File: `/nagare-example.config.ts`
- Document new `app` configuration options

### Phase 2: UI Components (Day 3-5)

**2.1 Create Branded Output Module**

- New file: `/src/ui/branded-output.ts`
- Functions:
  - `showHeader(config: NagareConfig, fromVersion: string, toVersion: string)`
  - `showProgress(message: string, tool: string = "Nagare")`
  - `showSuccess(summary: ReleaseSummary)`

**2.2 Create Box Drawing Utilities**

- New file: `/src/ui/box-drawing.ts`
- Simple box drawing without external dependencies
- Support for headers, content, and footers

**2.3 Update I18n Messages**

- File: `/src/i18n.ts`
- Add branding-related messages:
  ```typescript
  "app.name": "Nagare Release Manager",
  "release.header": "NAGARE RELEASE MANAGER v{version}",
  "release.releasing": "Releasing: {project}",
  "release.fromTo": "From: {from} → {to}"
  ```

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

1. `/src/ui/branded-output.ts` - Main branding functions
2. `/src/ui/box-drawing.ts` - Terminal box utilities
3. `/tests/branded-output.test.ts` - UI tests

### Modified Files:

1. `/src/types.ts` - Add AppConfig interface
2. `/src/config.ts` - Handle app configuration
3. `/src/release-manager.ts` - Use branded output
4. `/src/i18n.ts` - Add branding messages
5. `/cli.ts` - Show header on startup
6. `/nagare-example.config.ts` - Document new options
7. `/tests/release-manager.test.ts` - Update expectations

## Rollout Strategy

1. **Feature Flag**: Use config option to enable/disable
2. **Backward Compatible**: All changes are additive
3. **CI Friendly**: Auto-disable in CI environments
4. **Gradual Adoption**: Users opt-in via configuration

## Success Metrics

- Clear identification of Nagare as the release tool
- Improved user understanding of what's being released
- No disruption to existing workflows
- Positive user feedback on clarity

