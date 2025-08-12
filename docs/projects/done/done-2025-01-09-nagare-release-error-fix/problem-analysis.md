# Problem Analysis: Nagare Release Errors

## Error Breakdown

### Primary Error: i18n Initialization Failure

```
❌ Failed to initialize i18n: Failed to load fallback locale en: NotFound: No such file or directory (os error 2): readfile './locales/en.yaml'
```

**Impact**: Complete failure to start release process **Location**: i18n system initialization **Root Cause**: Missing
locale files

### Secondary Error: CLI Argument Parsing

```
Task nagare deno run -A nagare-launcher.ts "minor" "--" "--skip-confirmation"
```

**Impact**: `--skip-confirmation` not being recognized **Location**: CLI argument processing **Root Cause**: `--`
separator causing confusion in argument parsing

## Investigation Points

### 1. Locale Files Missing

- Check if `locales/` directory exists in published JSR package
- Verify if locale files are properly included in publish configuration
- Check if path resolution is correct for JSR imports

### 2. CLI Argument Flow

```
deno task release:minor -- --skip-confirmation
↓
deno task nagare minor "--" "--skip-confirmation"
↓ 
deno run -A nagare-launcher.ts "minor" "--" "--skip-confirmation"
```

The `--` separator is being treated as a literal argument instead of an argument separator.

## Potential Solutions

### For i18n Issue:

1. **Add locale files to JSR publish** - Ensure `locales/` directory is included
2. **Fix path resolution** - Make locale loading work with JSR imports
3. **Graceful fallback** - Allow operation without locale files

### For CLI Issue:

1. **Fix argument parsing** - Handle `--` separator correctly
2. **Improve task definitions** - Better argument passing in deno tasks
3. **Enhanced error messages** - Better feedback when arguments malformed

## Files to Investigate

- `/src/i18n.ts` - i18n initialization
- `/cli.ts` - CLI argument parsing
- `/deno.json` - Task definitions
- `/jsr.json` - Publish configuration
- `/locales/` directory - Locale files
