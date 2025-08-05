# Change Summary: Display Application Being Released

## Overview

Enhance Nagare's release flow to prominently display **which application is being released**, making it clear
that "Nagare is preparing a release for [Application Name]".

## Key Changes

### 1. Visual Identity

**Before:**
```
🌊 Nagare: Starting release current...
[INFO] log.release.starting
✅ Release 0.44.0 flow complete!
```

**After:**
```
🌊 Nagare: Starting release current for Aichaku...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project: Aichaku Code Reviewer
Version: 0.43.2 → 0.44.0 (minor)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌊 Nagare: Analyzing Aichaku commit flow...
🌊 Nagare: Found 5 commits in Aichaku current since v0.43.2
🌊 Nagare: Flowing Aichaku version forward: minor (0.44.0)
```

### 2. Configuration Enhancement

New optional configuration in `nagare.config.ts`:
```typescript
app: {
  displayName: "Nagare Release Manager",
  showBranding: true  // Auto-false in CI
}
```

### 3. User Benefits

- **Clear Application Context**: Always know which application Nagare is releasing
- **Consistent Messaging**: Application name appears throughout the release flow
- **Improved Clarity**: "Nagare is releasing X" vs generic "Starting release"
- **Multi-Project Friendly**: Essential when managing multiple applications

## Implementation Strategy

- **No Breaking Changes**: All enhancements are additive
- **Configurable**: Users can customize or disable branding
- **Progressive**: Gracefully degrades in limited terminals
- **Tested**: Comprehensive test coverage for all scenarios

## Timeline

- **Duration**: 2 weeks (1 cycle)
- **Phases**: Configuration → UI → Integration → Testing
- **Risk**: Low - UI-only changes with fallbacks

## Success Criteria

✅ Users immediately see which application is being released  
✅ Application name appears consistently throughout the flow  
✅ Clear "Nagare is releasing [App]" messaging  
✅ Works automatically by detecting project name from config/package

