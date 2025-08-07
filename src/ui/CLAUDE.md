# UI Module

## Purpose

Terminal user interface components for enhanced user experience. Provides marine-themed visual elements and interactive
prompts.

## Key Components

- **app-context.ts** - Application context and display names
- **release-header.ts** - Release progress headers and summaries

## Visual Design

### Marine Theme 🌊

The UI follows an ocean/maritime theme:

- Wave animations for progress
- Ship emoji for releases 🚢
- Ocean colors (blue, cyan, aqua)
- Nautical terminology

### Progress Indicators

- Wave animation: `🌊 ~~~~ 🌊`
- Ship sailing: `⛵ --> --> --> 🏁`
- Spinner with marine elements
- Progress bars with water effects

## Key Functions

### app-context.ts

- `getAppDisplayName()` - Format app name for display
- `getAppContext()` - Build context for UI elements
- `formatVersion()` - Version display formatting

### release-header.ts

- `showReleaseHeader()` - Display release start banner
- `showReleaseSummary()` - Show what will be released
- `showAppProgress()` - Animated progress during release
- `showAppCompletion()` - Success celebration display

## Display Examples

### Release Header

```
🌊 =======================================
     Nagare Release Manager v2.17.0
     Sailing to version 2.18.0...
=======================================🌊
```

### Progress Display

```
🚢 Creating release...
   ▶ Validating environment... ✓
   ▶ Calculating version... ✓
   ▶ Updating files... [████████--] 80%
```

### Completion

```
🎉 Release Complete!
   Version 2.18.0 has set sail!
   
   View at: https://github.com/user/repo/releases/tag/v2.18.0
   
🌊 Smooth sailing ahead! 🌊
```

## Internationalization

All UI text supports i18n:

- English (en) - Default
- Japanese (ja) - Full translation
- Falls back gracefully

## Accessibility

- Clear visual hierarchy
- High contrast colors
- Alternative text for emojis
- Progress percentages for screen readers

## Usage Pattern

```typescript
import { showAppProgress, showReleaseHeader } from "../ui/release-header.ts";
import { getAppDisplayName } from "../ui/app-context.ts";

// Start of release
showReleaseHeader(config, version);

// During operations
showAppProgress("Updating files", 50, 100);

// Completion
showAppCompletion(version, releaseUrl);
```

## Design Guidelines

When adding UI elements:

1. Follow marine theme
2. Use consistent emoji
3. Provide i18n keys
4. Consider terminal width
5. Test on different terminals
6. Ensure readability

## Testing

- Visual regression tests
- Terminal width handling
- Color output testing
- i18n fallbacks
- Progress animation
