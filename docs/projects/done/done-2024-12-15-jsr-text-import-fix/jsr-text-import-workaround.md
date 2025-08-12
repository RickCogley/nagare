# JSR Text Import Workaround Strategy

## Problem

JSR doesn't support the new text import syntax (`with { type: "text" }`), but we want to use it for better developer
experience and type safety.

## Solution: Build-Time Template Inlining

Transform the source code before publishing to JSR by converting text imports into string constants.

### How It Works

1. **Development** (current state):
   ```typescript
   // src/template-processor.ts
   import typescriptTemplate from "../templates/typescript.vto" with { type: "text" };
   ```

2. **Build Process** (automatic transformation):
   ```typescript
   // build/src/template-processor.ts
   // Inlined from ../templates/typescript.vto
   const typescriptTemplate = `{{ metadata |> jsonStringify |> safe }}
   export const VERSION = "{{ version }}";
   // ... rest of template content
   `;
   ```

3. **JSR Publishing**: The transformed code has no text imports, so JSR accepts it.

## Benefits

- ✅ **Keep using text imports** in development
- ✅ **Type safety** maintained (TypeScript knows it's a string)
- ✅ **JSR compatible** without waiting for spec approval
- ✅ **No runtime overhead** - templates are already inlined
- ✅ **Smaller package size** - no need to include .vto files
- ✅ **No breaking changes** for users

## Implementation

### Scripts Created

1. **`scripts/inline-templates.ts`**
   - Finds all files with text imports
   - Reads the imported template files
   - Replaces imports with inline constants
   - Outputs to `./build/` directory

2. **`scripts/publish-to-jsr.ts`**
   - Orchestrates the entire publish process
   - Runs template inlining
   - Validates the build
   - Publishes to JSR

### Workflow

```bash
# For development (unchanged)
deno task dev

# For JSR publishing
deno task publish:jsr

# For testing the build
deno task publish:jsr:dry
```

### Add to deno.json

```json
{
  "tasks": {
    // ... existing tasks ...
    "build:jsr": "deno run --allow-all scripts/inline-templates.ts",
    "publish:jsr": "deno run --allow-all scripts/publish-to-jsr.ts",
    "publish:jsr:dry": "deno run --allow-all scripts/publish-to-jsr.ts --dry-run"
  }
}
```

## Considerations

### Pros

- Immediate solution (don't need to wait for JSR)
- Better performance (templates pre-compiled)
- Cleaner published package
- Maintains all benefits of text imports during development

### Cons

- Additional build step
- Source code in JSR differs from repository
- Need to maintain build scripts

### Edge Cases Handled

1. **Escaped characters**: Templates with backticks, backslashes, and `${` are properly escaped
2. **Relative imports**: Both relative (`./template.vto`) and absolute paths work
3. **Multiple imports**: Files with multiple text imports are handled correctly
4. **Non-text files**: Other files are copied as-is

## Migration Path

1. **Now**: Use this workaround for JSR publishing
2. **Future**: When JSR supports text imports:
   - Simply publish directly without the build step
   - Remove the inline scripts
   - No changes needed to source code

## Example Usage

```bash
# Regular development (with text imports)
deno task dev

# Test that templates inline correctly
deno task build:jsr
ls -la ./build/

# Dry run to see what would be published
deno task publish:jsr:dry

# Actually publish to JSR
deno task publish:jsr
```

## Alternative Approaches Considered

1. **Preprocessor comments**: Use special comments that get replaced
   - ❌ More complex, harder to maintain

2. **Dynamic imports**: Load templates at runtime
   - ❌ Loses type safety, requires async

3. **Revert to old approach**: Go back to string concatenation
   - ❌ Loses all benefits of text imports

4. **Wait for JSR support**: Don't publish until supported
   - ❌ Blocks releases indefinitely

## Conclusion

This workaround provides the best of both worlds: modern text imports during development and JSR compatibility for
publishing. It's a temporary solution that can be easily removed once JSR adds support.
