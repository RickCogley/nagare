# Nagare Internationalization (i18n) Usage

Nagare has i18n support built-in. Currently available:

- English (en) - Default
- Japanese (ja)

**Note**: The i18n system is currently being integrated. Some messages may still show translation keys instead of the
actual translated text. The help text is not yet internationalized.

## Setting the Language

### Method 1: Environment Variable (Recommended for CLI)

```bash
# Set Japanese for current shell session
export NAGARE_LOCALE=ja

# Run Nagare in Japanese
deno task nagare

# Or set it inline for a single command
NAGARE_LOCALE=ja deno task nagare:patch
```

### Method 2: System Locale

Nagare will automatically detect your system locale from `LANG` or `LANGUAGE` environment variables:

```bash
# If your system is set to Japanese
export LANG=ja_JP.UTF-8
deno task nagare

# Or
export LANGUAGE=ja
deno task nagare
```

### Method 3: Programmatic Usage

When using Nagare as a library in your TypeScript/JavaScript code:

```typescript
import { ReleaseManager } from "jsr:@rick/nagare";
import { initI18n, setLocale } from "jsr:@rick/nagare/src/i18n";

// Option A: Initialize with Japanese
await initI18n({ defaultLocale: "ja" });

// Option B: Change locale after initialization
await initI18n(); // Defaults to system locale or English
await setLocale("ja"); // Switch to Japanese

// Use ReleaseManager normally - all messages will be in Japanese
const config = {
  project: {
    name: "My Project",
    repository: "https://github.com/user/repo",
  },
  versionFile: {
    path: "./version.ts",
    template: "typescript",
  },
};

const manager = new ReleaseManager(config);
const result = await manager.release();
```

## Examples

### CLI Usage with Japanese

```bash
# Dry run in Japanese
NAGARE_LOCALE=ja deno task nagare:dry

# Create a patch release with Japanese messages
NAGARE_LOCALE=ja deno task nagare:patch --skip-confirmation

# Show version info in Japanese
NAGARE_LOCALE=ja deno run -A jsr:@rick/nagare/cli --version
```

### Setting Default Language for Project

Add to your shell configuration file (`.bashrc`, `.zshrc`, etc.):

```bash
# Always use Japanese for Nagare
export NAGARE_LOCALE=ja
```

Or create a wrapper script `nagare-ja.sh`:

```bash
#!/bin/bash
NAGARE_LOCALE=ja deno task nagare "$@"
```

## Supported Languages

Currently supported:

- `en` - English (default)
- `ja` - Japanese (日本語)

## Fallback Behavior

If a translation is missing in the selected language, Nagare will:

1. Fall back to English
2. If English translation is also missing, show the translation key

This ensures the tool remains functional even with incomplete translations.
