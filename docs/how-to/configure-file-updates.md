# How to Configure File Updates

This guide shows you how to configure Nagare to update version strings in multiple files during releases. Use this approach when you need to keep version information synchronized across different file types.

## Before you begin

Ensure you have:

- Nagare initialized in your project (`deno task nagare init`)
- A `nagare.config.ts` file in your project root
- Basic understanding of regular expressions (for custom patterns)

## Built-in file handlers

Nagare includes intelligent file handlers that automatically detect and update common file types without custom configuration.

### Supported file types

- **JSON Files**: `deno.json`, `package.json`, `jsr.json`
- **TypeScript/JavaScript**: `version.ts`, `constants.ts`, and similar files
- **Markdown**: `README.md` and other `.md` files (updates version badges and references)
- **YAML**: `.yaml` and `.yml` configuration files
- **Language-specific**: `Cargo.toml` (Rust), `pyproject.toml` (Python)

### Simple configuration

```typescript
// ✅ Recommended: Use built-in handlers
export default {
  updateFiles: [
    { path: "./deno.json" },
    { path: "./package.json" },
    { path: "./README.md" },
    { path: "./jsr.json" },
    { path: "./Cargo.toml" },
  ],
} as NagareConfig;
```

## Custom file patterns

For files not covered by built-in handlers, you can define custom patterns.

### Basic custom pattern

```typescript
export default {
  updateFiles: [
    {
      path: "./config/app.yaml",
      patterns: {
        // ✅ SAFE: Line-anchored pattern
        version: /^version:\s*"([^"]+)"/m,
      },
    },
  ],
} as NagareConfig;
```

### Multiple patterns in one file

```typescript
export default {
  updateFiles: [
    {
      path: "./src/constants.ts",
      patterns: {
        version: /^export const VERSION = "([^"]+)"/m,
        buildNumber: /^export const BUILD_NUMBER = (\d+)/m,
      },
    },
  ],
} as NagareConfig;
```

### Custom update function

For complex update logic, use a custom function:

```typescript
export default {
  updateFiles: [
    {
      path: "./src/metadata.ts",
      updateFn: (content, data) => {
        // Update version
        content = content.replace(
          /VERSION:\s*"[^"]+"/,
          `VERSION: "${data.version}"`
        );
        
        // Update build date
        content = content.replace(
          /BUILD_DATE:\s*"[^"]+"/,
          `BUILD_DATE: "${data.buildDate}"`
        );
        
        return content;
      },
    },
  ],
} as NagareConfig;
```

## Advanced patterns

### JSON path updates

For nested JSON properties:

```typescript
export default {
  updateFiles: [
    {
      path: "./package.json",
      patterns: {
        // Update nested property
        version: /^(\s*"version":\s*)"[^"]+"/m,
        // Update in dependencies
        dependency: /^(\s*"@myorg\/mypackage":\s*)"[^"]+"/m,
      },
    },
  ],
} as NagareConfig;
```

### YAML configurations

```typescript
export default {
  updateFiles: [
    {
      path: "./docker-compose.yml",
      patterns: {
        // Update image tag
        imageTag: /^(\s*image:\s*myapp:)[\w.-]+$/m,
      },
    },
  ],
} as NagareConfig;
```

### Multi-line patterns

For patterns spanning multiple lines:

```typescript
export default {
  updateFiles: [
    {
      path: "./Dockerfile",
      patterns: {
        // Update LABEL version
        version: /^(LABEL version=)"[^"]+"/m,
      },
    },
  ],
} as NagareConfig;
```

## Pattern validation

Nagare validates file update patterns to prevent common issues:

### Safe patterns (recommended)

```typescript
// ✅ SAFE: Line-anchored with specific context
/^(\s*"version":\s*)"[^"]+"/m

// ✅ SAFE: Matches only at line start
/^version:\s*"([^"]+)"/m

// ✅ SAFE: Specific field name
/^export const VERSION = "([^"]+)"/m
```

### Patterns to avoid

```typescript
// ❌ DANGEROUS: Could match nested fields
/"version":\s*"[^"]+"/

// ❌ DANGEROUS: Too broad, could match comments
/version.*"[^"]+"/

// ❌ DANGEROUS: No anchoring
/VERSION = "[^"]+"/
```

## Testing your configuration

### Preview changes

Test your file update patterns without making changes:

```bash
# Preview all file updates
deno task nagare:dry

# Check specific files
deno task nagare --dry-run --verbose
```

### Validate patterns

```bash
# Test pattern matching
deno run -A scripts/check-patterns.ts
```

## Troubleshooting

### Pattern not matching

**Problem**: "No matches found for pattern"

**Solution**:

1. Check that the pattern uses line anchors (`^` and `$`)
2. Verify the file contains the expected content
3. Test the regex with a tool like regex101.com

### Multiple matches

**Problem**: "Pattern matches multiple locations"

**Solution**:

1. Make the pattern more specific
2. Use line anchors to match only intended lines
3. Consider using `updateFn` for complex logic

### File corruption

**Problem**: "File content corrupted after update"

**Solution**:

1. Use built-in handlers when possible
2. Test patterns with `--dry-run` first
3. Ensure patterns have proper capture groups

## Best practices

1. **Use built-in handlers** when possible for reliability
2. **Test patterns thoroughly** with `--dry-run` before releases
3. **Be specific** - narrow patterns prevent unintended matches
4. **Use line anchors** (`^` and `$`) for safety
5. **Document custom patterns** for team understanding

## Related tasks

- [How to use custom templates](./use-custom-templates.md)
- [How to configure Nagare](./configure-nagare.md)
- [How to rollback releases](./rollback-releases.md)
