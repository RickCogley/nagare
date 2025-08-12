# Migrating to Nagare's Built-in File Handlers

## Overview

Nagare now includes intelligent file handlers that automatically detect and update common project files without
requiring custom `updateFn` functions or complex regex patterns.

## Before vs After

### Before (Manual Patterns)

```typescript
// nagare.config.ts - The old way
export default {
  project: {
    name: "My App",
    repository: "https://github.com/user/my-app",
  },
  updateFiles: [
    {
      path: "./deno.json",
      // Had to write custom function due to pattern matching issues
      updateFn: (content, data) => {
        return content.replace(
          /^(\s*)"version":\s*"([^"]+)"/m,
          `$1"version": "${data.version}"`,
        );
      },
    },
    {
      path: "./package.json",
      patterns: {
        // Dangerous pattern that could match nested objects
        version: /"version":\s*"([^"]+)"/,
      },
    },
    {
      path: "./README.md",
      patterns: {
        // Complex patterns for badges
        badge: /shields\.io\/badge\/version-([^-]+)-blue/g,
        versionRef: /Version:\s*(\d+\.\d+\.\d+)/,
      },
    },
  ],
};
```

### After (Automatic Handlers)

```typescript
// nagare.config.ts - The new way
export default {
  project: {
    name: "My App",
    repository: "https://github.com/user/my-app",
  },
  updateFiles: [
    { path: "./deno.json" }, // ✅ Automatically handled
    { path: "./package.json" }, // ✅ Automatically handled
    { path: "./README.md" }, // ✅ Automatically handled
  ],
};
```

## How It Works

### 1. File Type Detection

Nagare automatically detects file types based on their names and extensions:

- `deno.json`, `deno.jsonc` → Deno configuration handler
- `package.json` → NPM package handler
- `*.md`, `README.*` → Markdown handler
- `Cargo.toml` → Rust handler
- `pyproject.toml`, `setup.py` → Python handlers
- And more...

### 2. Smart Pattern Matching

Each handler knows the safe patterns for its file type:

```typescript
// Built-in handlers use safe, tested patterns
{
  "deno.json": {
    // ✅ Line-anchored pattern prevents corruption
    version: /^(\s*)"version":\s*"([^"]+)"/m
  },
  
  "README.md": {
    // ✅ Multiple badge formats handled automatically
    shieldsBadge: /shields\.io\/badge\/version-([^-]+)-/g,
    versionHeader: /^#+\s*Version\s+(\d+\.\d+\.\d+)/m
  }
}
```

### 3. Validation

Handlers validate files after updates to prevent corruption:

```typescript
// JSON files are parsed to ensure they remain valid
if (filePath.endsWith(".json")) {
  JSON.parse(updatedContent); // Throws if invalid
}
```

## Migration Steps

### Step 1: Remove Custom Functions

If you have `updateFn` functions that just handle version updates, remove them:

```diff
 {
   path: "./deno.json",
-  updateFn: (content, data) => {
-    return content.replace(
-      /^(\s*)"version":\s*"([^"]+)"/m,
-      `$1"version": "${data.version}"`
-    );
-  }
 }
```

### Step 2: Simplify Pattern Specifications

For files with built-in handlers, you can remove patterns entirely:

```diff
 {
   path: "./package.json",
-  patterns: {
-    version: /"version":\s*"([^"]+)"/
-  }
 }
```

### Step 3: Test with Dry Run

Always test your migration with dry run first:

```bash
deno task nagare --dry-run
```

Check the output to ensure files are being detected and handled correctly:

```
[INFO] Using built-in Deno Configuration handler for ./deno.json
[INFO] Using built-in NPM Package Configuration handler for ./package.json
[INFO] Using built-in Markdown Documentation handler for ./README.md
```

## Custom Patterns Still Supported

For files without built-in handlers or with non-standard formats, you can still use custom patterns:

```typescript
updateFiles: [
  // Use built-in handler
  { path: "./deno.json" },

  // Override with custom pattern
  {
    path: "./custom.json",
    patterns: {
      appVersion: /^(\s*)"appVersion":\s*"([^"]+)"/m,
    },
  },

  // Complex logic still needs updateFn
  {
    path: "./complex-file.xml",
    updateFn: (content, data) => {
      // Custom XML handling
      return updateXmlVersion(content, data.version);
    },
  },
];
```

## Pattern Builder Utilities

For custom patterns, use the PatternBuilder for safety:

```typescript
import { PatternBuilder } from "nagare/file-handlers";

updateFiles: [
  {
    path: "./custom.json",
    patterns: {
      // Safe JSON pattern with line anchoring
      version: PatternBuilder.jsonVersion(true),
    },
  },
  {
    path: "./config.yaml",
    patterns: {
      // YAML pattern handling various quote styles
      version: PatternBuilder.yamlVersion("both"),
    },
  },
];
```

## Debugging File Updates

### Enable Debug Logging

```bash
deno task nagare --log-level DEBUG --dry-run
```

This shows:

- Which handler is being used
- What patterns are being applied
- What changes would be made

### Preview Mode

In dry-run mode, you'll see exactly what will change:

```
📄 File Update Preview:

  File: ./deno.json
    ✅ version: "1.0.0" → "1.1.0"
    
  File: ./README.md
    ✅ shields.io/badge/version-1.0.0-blue → shields.io/badge/version-1.1.0-blue
    ✅ Version: 1.0.0 → Version: 1.1.0
```

## Common Issues

### "No handler found for file type"

**Solution**: Use custom patterns or updateFn:

```typescript
{
  path: "./version.gradle",
  patterns: {
    version: /version\s*=\s*['"]([^'"]+)['"]/
  }
}
```

### "Pattern found multiple matches"

**Solution**: The handler will warn but still update all matches. To be more specific:

```typescript
{
  path: "./README.md",
  patterns: {
    // More specific pattern
    mainVersion: /^#\s+Version:\s*(\d+\.\d+\.\d+)/m
  }
}
```

### "File validation failed after update"

**Solution**: This means the update would corrupt the file. Check:

1. Your pattern is too broad
2. The file has unexpected format
3. Use debug mode to see what's happening

## Benefits of the New System

1. **Less Configuration**: No need to write regex patterns for common files
2. **Safer Updates**: Built-in patterns are tested to avoid corruption
3. **Better Error Messages**: Clear feedback when something goes wrong
4. **Automatic Validation**: Files are checked after updates
5. **Extensible**: Add your own handlers for custom file types

## Creating Custom Handlers

For organization-specific file types, create custom handlers:

```typescript
import { FileHandler, FileHandlerManager } from "nagare/file-handlers";

const myCustomHandler: FileHandler = {
  id: "my-format",
  name: "My Custom Format",
  detector: (path) => path.endsWith(".myformat"),
  patterns: {
    version: /^version:\s*"([^"]+)"/m,
  },
  validate: (content) => {
    // Custom validation logic
    return { valid: true };
  },
};

// Register the handler
const manager = new FileHandlerManager();
manager.registerHandler(myCustomHandler);
```

## Summary

The new file handler system makes Nagare truly "just work" for common cases while maintaining flexibility for complex
scenarios. Most users can now simply list their files without writing any patterns or functions.
