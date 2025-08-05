# Pitch: Prominent Nagare Branding in Release Flow

## Problem

When running `deno task nagare release`, users see generic release output that doesn't clearly identify
**Nagare** as the release management tool. The current output shows:

```
🌊 Nagare: Automate your release flow with confidence
🌊 Nagare: Starting release current...
[Release progress...]
🎉 🌊 Nagare: Release 0.44.0 flow complete! 🎉
```

While "Nagare" appears in the output, it's easy to miss or confuse with the project being released.
Users need immediate, prominent identification that they're using **Nagare Release Manager** to release their project.

## Appetite

2 weeks - Small batch focused on UI/UX improvements

## Solution

### 1. **Branded Header Block**

Add a distinct visual header when release starts:

```
╭─────────────────────────────────────────────────╮
│ 🌊 NAGARE RELEASE MANAGER v2.15.0              │
│ Releasing: My Awesome Project                    │
│ From: v0.43.2 → v0.44.0                        │
╰─────────────────────────────────────────────────╯
```

### 2. **Configuration Enhancement**

Extend `nagare.config.ts` to support project identification:

```typescript
export const config: NagareConfig = {
  project: {
    name: "My Awesome Project",
    displayName: "My Awesome Project", // New field
    repository: "github.com/user/project"
  },
  // Optionally override Nagare branding
  app: {
    name: "Nagare",
    displayName: "Nagare Release Manager",
    showBranding: true
  }
}
```

### 3. **Progressive Status Updates**

Replace generic progress with branded, informative updates:

```
[Nagare] Analyzing My Awesome Project...
[Nagare] Detected 5 commits since v0.43.2
[Nagare] Suggested version bump: minor (0.44.0)
[Nagare] Updating 4 version files...
[Nagare] Generating changelog...
[Nagare] Creating GitHub release...
```

### 4. **Success Summary**

Enhanced completion message:

```
╭─────────────────────────────────────────────────╮
│ ✅ NAGARE RELEASE COMPLETED                     │
├─────────────────────────────────────────────────┤
│ Project:  My Awesome Project                     │
│ Version:  0.44.0                                │
│ Type:     Minor Release                         │
│ Files:    4 updated                             │
│ Commits:  5 included                            │
│                                                 │
│ 🌊 Released with Nagare v2.15.0                 │
╰─────────────────────────────────────────────────╯
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

