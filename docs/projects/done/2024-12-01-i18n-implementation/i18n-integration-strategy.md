# i18n Integration Strategy for Error System and CLI

## Overview

This document outlines a careful, phased approach to integrating the i18n system into Nagare's error handling and CLI,
ensuring backward compatibility and minimal disruption.

## Principles

1. **Backward Compatibility** - Existing code continues to work
2. **Gradual Migration** - Phase implementation over multiple releases
3. **Opt-in First** - Make i18n optional initially
4. **Type Safety** - Maintain TypeScript benefits
5. **Developer Experience** - Keep APIs simple and intuitive

## Current State Analysis

### Error System

Currently uses hardcoded English messages:

```typescript
throw new NagareError(
  "Not in a git repository",
  ErrorCodes.GIT_NOT_INITIALIZED,
  ["Initialize a git repository: git init", ...]
);
```

### CLI Output

Direct console.log with English strings:

```typescript
console.log("✅ Released version " + version);
```

## Phase 1: Dual API Support (v2.1.0)

### 1.1 Enhanced Error System

Create new error constructors that support both styles:

```typescript
// src/enhanced-error.ts

export class NagareError extends Error {
  // Existing constructor (backward compatible)
  constructor(
    message: string,
    code: string,
    suggestions?: string[],
    context?: Record<string, unknown>,
    docsUrl?: string,
  );

  // New i18n constructor (overload)
  constructor(
    messageKey: TranslationKey,
    code: string,
    options?: {
      suggestions?: TranslationKey[];
      context?: Record<string, unknown>;
      params?: Record<string, unknown>;
      docsUrl?: string;
    },
  );

  constructor(
    messageOrKey: string | TranslationKey,
    public readonly code: string,
    suggestionsOrOptions?: string[] | ErrorOptions,
    context?: Record<string, unknown>,
    docsUrl?: string,
  ) {
    // Detect if using i18n based on whether i18n is initialized
    const isI18n = typeof suggestionsOrOptions === "object" &&
      !Array.isArray(suggestionsOrOptions);

    if (isI18n && hasI18n()) {
      // New i18n path
      const options = suggestionsOrOptions as ErrorOptions;
      const message = t(messageOrKey as TranslationKey, options.params);
      super(message);

      this.suggestions = options.suggestions?.map((key) => t(key));
      this.context = options.context;
      this.docsUrl = options.docsUrl;
    } else {
      // Legacy path
      super(messageOrKey as string);
      this.suggestions = suggestionsOrOptions as string[];
      this.context = context;
      this.docsUrl = docsUrl;
    }

    this.name = "NagareError";
    Object.setPrototypeOf(this, NagareError.prototype);
  }
}

// Helper to check if i18n is available
function hasI18n(): boolean {
  try {
    getI18n();
    return true;
  } catch {
    return false;
  }
}
```

### 1.2 Error Factory Migration

Update error factory with dual support:

```typescript
export class ErrorFactory {
  static gitNotInitialized(): NagareError {
    if (hasI18n()) {
      return new NagareError(
        "errors.gitNotInitialized",
        ErrorCodes.GIT_NOT_INITIALIZED,
        {
          suggestions: [
            "suggestions.runGitInit",
            "suggestions.checkPath"
          ]
        }
      );
    }
    
    // Fallback to hardcoded (backward compatible)
    return new NagareError(
      "Not in a git repository",
      ErrorCodes.GIT_NOT_INITIALIZED,
      ["Initialize a git repository: git init", ...]
    );
  }
  
  static fileNotFound(path: string): NagareError {
    if (hasI18n()) {
      return new NagareError(
        "errors.fileNotFound",
        ErrorCodes.FILE_NOT_FOUND,
        {
          params: { path },
          suggestions: [
            "suggestions.checkPath",
            "suggestions.verifyPermissions"
          ]
        }
      );
    }
    
    // Fallback
    return new NagareError(
      `File not found: ${path}`,
      ErrorCodes.FILE_NOT_FOUND,
      ["Check that the file path is correct", ...]
    );
  }
}
```

### 1.3 Logger Enhancement

Add i18n support to logger:

```typescript
// src/logger.ts

export class Logger {
  // Existing method
  log(level: LogLevel, message: string, ...args: unknown[]): void {
    // ... existing implementation
  }

  // New i18n method
  logI18n(
    level: LogLevel,
    messageKey: TranslationKey,
    params?: Record<string, unknown>,
  ): void {
    const message = hasI18n() ? t(messageKey, params) : messageKey;
    this.log(level, message);
  }

  // Convenience methods
  infoI18n(key: TranslationKey, params?: Record<string, unknown>): void {
    this.logI18n(LogLevel.INFO, key, params);
  }

  errorI18n(key: TranslationKey, params?: Record<string, unknown>): void {
    this.logI18n(LogLevel.ERROR, key, params);
  }
}
```

## Phase 2: CLI Integration (v2.2.0)

### 2.1 CLI Initialization

Initialize i18n early in CLI lifecycle:

```typescript
// cli.ts

export async function cli(args: string[]) {
  try {
    // Load config first
    const config = await loadConfig();

    // Initialize i18n if locale is set
    if (config.locale || Deno.env.get("NAGARE_LOCALE")) {
      await initI18n({
        defaultLocale: config.locale,
        localesDir: new URL("../locales", import.meta.url).pathname,
      });
    }

    // Continue with CLI logic
    const result = await parseAndExecute(args);
  } catch (error) {
    // Error handling works with or without i18n
    handleError(error);
  }
}
```

### 2.2 Output Helpers

Create helpers for CLI output:

```typescript
// src/cli-utils.ts

export function print(key: TranslationKey, params?: Record<string, unknown>): void {
  const message = hasI18n() ? t(key, params) : key;
  console.log(message);
}

export function printSuccess(key: TranslationKey, params?: Record<string, unknown>): void {
  const message = hasI18n() ? t(key, params) : `✅ ${key}`;
  console.log(message);
}

export function printError(key: TranslationKey, params?: Record<string, unknown>): void {
  const message = hasI18n() ? t(key, params) : `❌ ${key}`;
  console.error(message);
}

// Usage in commands
export async function releaseCommand(options: ReleaseOptions) {
  print("cli.release.calculating", { count: commits.length });

  // ... perform release

  printSuccess("cli.release.success", { version: newVersion });
}
```

### 2.3 Progressive Migration

Migrate output gradually:

```typescript
// Before
console.log(`✅ Released version ${version}`);

// Phase 1: Conditional
if (hasI18n()) {
  console.log(t("cli.release.success", { version }));
} else {
  console.log(`✅ Released version ${version}`);
}

// Phase 2: Helper function
printSuccess("cli.release.success", { version });

// Phase 3: Full i18n (v3.0)
console.log(t("cli.release.success", { version }));
```

## Phase 3: Full Integration (v3.0.0)

### 3.1 Remove Dual Support

After deprecation period, remove fallbacks:

```typescript
export class NagareError extends Error {
  constructor(
    messageKey: TranslationKey,
    public readonly code: string,
    public readonly options?: ErrorOptions,
  ) {
    super(t(messageKey, options?.params));
    this.name = "NagareError";

    if (options?.suggestions) {
      this.suggestions = options.suggestions.map((key) => t(key));
    }
  }
}
```

### 3.2 Required i18n Initialization

Make i18n initialization mandatory:

```typescript
export async function cli(args: string[]) {
  // Always initialize i18n
  const config = await loadConfig();
  await initI18n({
    defaultLocale: config.locale || "en",
    localesDir: new URL("../locales", import.meta.url).pathname,
  });

  // Proceed with CLI
}
```

## Migration Guide for Users

### For Library Users

```typescript
// v2.0 (current)
throw new NagareError(
  "File not found: config.ts",
  ErrorCodes.FILE_NOT_FOUND,
);

// v2.1 (optional i18n)
throw new NagareError(
  "errors.fileNotFound",
  ErrorCodes.FILE_NOT_FOUND,
  { params: { path: "config.ts" } },
);

// v3.0 (required i18n)
throw new NagareError(
  "errors.fileNotFound",
  ErrorCodes.FILE_NOT_FOUND,
  { params: { path: "config.ts" } },
);
```

### For CLI Users

```bash
# Enable Japanese locale
export NAGARE_LOCALE=ja
nagare release

# Or in config
# nagare.config.ts
export default {
  locale: "ja",
  // ...
}
```

## Testing Strategy

### 1. Dual Mode Tests

Test both with and without i18n:

```typescript
Deno.test("Error system - dual mode", async (t) => {
  await t.step("works without i18n", () => {
    const error = ErrorFactory.gitNotInitialized();
    assertEquals(error.message, "Not in a git repository");
  });

  await t.step("works with i18n", async () => {
    await initI18n({ defaultLocale: "en" });
    const error = ErrorFactory.gitNotInitialized();
    assertEquals(error.message, "Not in a git repository");
  });

  await t.step("works with Japanese", async () => {
    await initI18n({ defaultLocale: "ja" });
    const error = ErrorFactory.gitNotInitialized();
    assertEquals(error.message, "Gitリポジトリではありません");
  });
});
```

### 2. CLI Output Tests

```typescript
Deno.test("CLI output - i18n", async (t) => {
  await t.step("English output", async () => {
    await initI18n({ defaultLocale: "en" });
    const output = captureOutput(() => {
      printSuccess("cli.release.success", { version: "1.2.3" });
    });
    assertEquals(output, "✅ Released version 1.2.3");
  });

  await t.step("Japanese output", async () => {
    await initI18n({ defaultLocale: "ja" });
    const output = captureOutput(() => {
      printSuccess("cli.release.success", { version: "1.2.3" });
    });
    assertEquals(output, "✅ バージョン 1.2.3 をリリースしました");
  });
});
```

## Performance Considerations

### Lazy Loading

Only load translations when needed:

```typescript
class I18n {
  private loadedLocales = new Set<string>();

  async ensureLoaded(locale: string): Promise<void> {
    if (!this.loadedLocales.has(locale)) {
      await this.loadLocale(locale);
      this.loadedLocales.add(locale);
    }
  }
}
```

### Caching

Cache compiled messages:

```typescript
class I18n {
  private messageCache = new Map<string, string>();

  t(key: string, params?: Record<string, unknown>): string {
    const cacheKey = `${this.currentLocale}:${key}:${JSON.stringify(params)}`;

    if (this.messageCache.has(cacheKey)) {
      return this.messageCache.get(cacheKey)!;
    }

    const message = this.translate(key, params);
    this.messageCache.set(cacheKey, message);
    return message;
  }
}
```

## Deprecation Timeline

### v2.1.0 (Current + 1 month)

- Introduce dual API support
- Add deprecation notices for string-based errors
- Documentation for migration

### v2.2.0 (Current + 3 months)

- Full CLI i18n support
- More deprecation warnings
- Migration tools

### v2.3.0 (Current + 6 months)

- Final deprecation warnings
- Prepare for v3.0

### v3.0.0 (Current + 9 months)

- Remove backward compatibility
- Require i18n initialization
- Clean API surface

## Benefits

1. **Localized Error Messages** - Better developer experience globally
2. **Consistent Messaging** - All messages in one place
3. **Easy Translation** - Community can contribute
4. **Type Safety** - Translation keys are typed
5. **Maintainability** - Easier to update messages

## Risks and Mitigation

### Risk: Breaking Changes

**Mitigation**: Dual API support, long deprecation period

### Risk: Performance Impact

**Mitigation**: Lazy loading, caching, benchmarks

### Risk: Complexity

**Mitigation**: Helper functions, clear documentation

### Risk: Missing Translations

**Mitigation**: Fallback to English, validation scripts

## Success Metrics

1. **Adoption Rate** - % of errors using i18n
2. **Translation Coverage** - Languages supported
3. **Performance Impact** - < 5ms overhead
4. **User Feedback** - Positive reception
5. **Bug Reports** - Minimal i18n-related issues
