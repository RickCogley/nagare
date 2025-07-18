# Branding System

## Overview

Nagare uses a centralized branding system to ensure consistent messaging across all CLI interactions. The system emphasizes the "flow" concept with water/river metaphors, reflecting the Japanese meaning of "Nagare" (流れ) - flow.

## Brand Identity

### Core Elements

- **Primary Emoji**: 🌊 (represents flow/river)
- **Brand Name**: Nagare
- **Japanese Meaning**: 流れ (flow)
- **Brand Prefix**: `🌊 Nagare:`

### Brand Philosophy

The branding follows these principles:

1. **Flow-Focused**: Emphasizes smooth, automated progression from commits to releases
2. **Water Metaphors**: Uses river/flow imagery to represent the release process
3. **User-Centric**: Messages are written from the user's perspective
4. **Action-Oriented**: Clear, actionable language with specific next steps
5. **Consistent**: All messaging follows the same tone and format

## Implementation

### Branded Messages Module

The `src/branded-messages.ts` module provides the centralized branding system:

```typescript
import { NagareBrand as Brand } from "./branded-messages.ts";

// Standard branded message
Brand.log("Setting up automated release flow...");

// Success confirmation
Brand.success("Release v1.2.0 complete!");

// Error with actionable guidance
Brand.error("Can't find version file. Did you run 'init' first?");

// Progress with phase indicators
Brand.progress("Analyzing commits...", "analyzing");
```

### Message Types

#### Standard Messages

- **`Brand.log(message)`** - Major operations with full branding prefix
- **`Brand.info(message)`** - Neutral information without branding
- **`Brand.debug(message)`** - Technical details (verbose mode only)

#### Status Messages

- **`Brand.success(message)`** - Positive confirmations (✅ prefix)
- **`Brand.error(message)`** - Errors with branding prefix
- **`Brand.warning(message)`** - Cautionary messages (⚠️ prefix)
- **`Brand.celebrate(message)`** - Major achievements (🎉 prefix)

#### Progress Messages

- **`Brand.progress(message, phase?)`** - Ongoing operations with optional phase emoji
- **Flow phases**: `analyzing` 🔍, `building` 🔧, `publishing` 📤, `complete` ✨

#### Specialized Messages

- **File operations**: `Brand.fileOperation("updated", "package.json")`
- **Network operations**: `Brand.networkOperation("uploading", "JSR registry")`
- **Git operations**: `Brand.gitOperation("tagging", "v1.2.0")`

### Pre-built Templates

The system includes pre-built message templates for common scenarios:

```typescript
// Initialization
Brand.welcome("1.0.0");              // "🌊 Nagare: Setting up automated release flow (v1.0.0)..."

// Version operations
Brand.analyzingCommits();            // "🌊 Nagare: Analyzing your commits since last release..."
Brand.versionBump("1.0.0", "1.1.0", "minor");  // "🌊 Nagare: Flowing from v1.0.0 to v1.1.0 (minor)..."

// Release operations
Brand.creatingRelease("1.1.0");     // "🌊 Nagare: Creating release v1.1.0..."
Brand.publishingToGitHub("1.1.0");  // "🌊 Nagare: Publishing v1.1.0 to GitHub..."
Brand.publishingToJSR("1.1.0");     // "🌊 Nagare: Publishing v1.1.0 to JSR..."

// Completion
Brand.releaseComplete("1.1.0", 5);  // "🎉 Release v1.1.0 complete! (5 commits included)"
```

## Usage Guidelines

### When to Use Branded Messages

✅ **Use Brand.* methods for:**
- Major operations and status updates
- User-facing confirmations and errors
- Progress indicators during long operations
- Success/failure messages
- Warnings and advisory messages

❌ **Don't use Brand.* methods for:**
- Debug logging (use `Brand.debug()` instead)
- Internal technical logs (use `logger` instead)
- Simple informational displays without context
- Error messages that will be caught and reformatted

### Message Writing Guidelines

#### Tone and Voice

- **Present tense** for ongoing actions: "Analyzing commits..."
- **Past tense** for completed actions: "Created release v1.2.0"
- **Active voice**: "Nagare creates..." not "Release created by..."
- **User-focused**: "Your release is ready" not "Release process complete"

#### Content Standards

- **Specific**: "Updated package.json" not "Updated files"
- **Actionable**: Include next steps for errors
- **Positive**: "Setting up flow" not "Initializing system"
- **Concise**: One line when possible, max two lines

#### Examples

```typescript
// Good
Brand.log("Analyzing your commits since last release...");
Brand.error("Can't find version file. Run 'nagare init' first.");
Brand.success("Release v1.2.0 published to GitHub!");

// Avoid
Brand.log("Performing commit analysis operation...");
Brand.error("Error: version file not found");
Brand.success("Success: GitHub release creation completed");
```

## Integration with Existing Systems

### CLI Utils Integration

The branded messages work alongside the existing `cli-utils.ts` i18n system:

```typescript
// For standard messaging
Brand.log("Setting up release flow...");

// For i18n-supported messages
printSuccess("release.complete", { version: "1.2.0" });
```

### Logger Integration

Branded messages complement the structured logger:

```typescript
// User-facing branded message
Brand.progress("Publishing to JSR...", "publishing");

// Internal technical logging
logger.info("JSR API response", { status: 200, version: "1.2.0" });
```

## Testing and Validation

### Message Consistency

Run this command to verify all branded messages are being used consistently:

```bash
# Check for direct console.log usage (should be minimal)
grep -r "console\.log" src/ --exclude-dir=node_modules

# Verify Brand imports are present
grep -r "Brand\." src/ --exclude-dir=node_modules
```

### Brand Guidelines Compliance

1. **Prefix consistency**: All major operations use `🌊 Nagare:` prefix
2. **Emoji usage**: Appropriate emojis for different message types
3. **Tone consistency**: Flow-focused, user-centric language
4. **Action clarity**: Clear next steps for errors and warnings

## Future Enhancements

### Planned Features

1. **Color support** - Terminal color coding for different message types
2. **Localization** - Multi-language support for branded messages
3. **Configuration** - User-customizable emoji and prefix preferences
4. **Analytics** - Message effectiveness tracking and optimization

### Extension Points

The branding system is designed for easy extension:

```typescript
// Adding new message types
static milestone(message: string): void {
  console.log(`🎯 ${message}`);
}

// Adding new templates
static deploymentComplete(environment: string): string {
  return `${NagareBrand.PREFIX} Deployed to ${environment} successfully!`;
}
```

## See Also

- [CLI Guidelines](../reference/cli-guidelines.md) - Overall CLI design principles
- [Error Handling](../explanation/error-handling.md) - Error message standards
- [Internationalization](../how-to/setup-i18n.md) - Multi-language support