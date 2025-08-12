# Pitch: Display Which Application is Being Released

## Problem

When running `deno task nagare release`, the output doesn't clearly identify **which application** is being released.
The current output shows:

```
🌊 Nagare: Automate your release flow with confidence
🌊 Nagare: Starting release current...
[Release progress...]
🎉 🌊 Nagare: Release 0.44.0 flow complete! 🎉
```

While it's clear that Nagare is doing the work, it's not clear **what application** is being released. Users need to see
"Nagare is preparing a release for [Application Name]" to understand the context immediately.

## Appetite

2 weeks - Small batch focused on UI/UX improvements

## Solution

### 1. **Application Context Header**

Add a clear header showing which application is being released:

```
🌊 Nagare: Starting release current for Aichaku...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project: Aichaku Code Reviewer
Version: 0.43.2 → 0.44.0 (minor)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 2. **Configuration Enhancement**

Extend `nagare.config.ts` to support project identification:

```typescript
export const config: NagareConfig = {
  project: {
    name: "My Awesome Project",
    displayName: "My Awesome Project", // New field
    repository: "github.com/user/project",
  },
  // Optionally override Nagare branding
  app: {
    name: "Nagare",
    displayName: "Nagare Release Manager",
    showBranding: true,
  },
};
```

### 3. **Context-Rich Status Updates**

Show the application name throughout the release process:

```
🌊 Nagare: Analyzing Aichaku commit flow...
🌊 Nagare: Found 5 commits in Aichaku current since v0.43.2
🌊 Nagare: Flowing Aichaku version forward: minor (0.44.0)
🌊 Nagare: Updating Aichaku version streams...
🌊 Nagare: Generating Aichaku changelog flow...
🌊 Nagare: Releasing Aichaku into GitHub current...
```

### 4. **Success Summary**

Clear completion message showing what was released:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Aichaku v0.44.0 release flow complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Type:     Minor Release
• Files:    4 updated in the current
• Commits:  5 merged into the flow
• Time:     12.4s
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Rabbit Holes

### Not Doing:

1. **ASCII Art Logos** - Too much visual noise in terminals
2. **Animated Progress Bars** - Focus on clarity over effects
3. **Color Theming** - Stick with existing color scheme
4. **Configuration Migration** - Keep backward compatibility

### Avoiding:

- Over-engineering the UI framework
- Breaking existing CI/CD workflows
- Requiring new dependencies

## No-Gos

1. **Mandatory Branding** - Must be configurable for CI environments
2. **Breaking Changes** - All enhancements must be backward compatible
3. **External Config Files** - Use existing `nagare.config.ts`
4. **Network Calls** - No phoning home or version checks

## Nice-to-Haves

If time permits:

- Marine-themed progress indicators (waves, tides)
- Configurable output verbosity levels
- Export release summary to file
- Integration with terminal notification systems
