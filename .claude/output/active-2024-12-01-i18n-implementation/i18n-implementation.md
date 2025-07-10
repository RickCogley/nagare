# Internationalization (i18n) Implementation Plan for Nagare

## Overview

This document outlines the plan for implementing internationalization support in Nagare, starting
with Japanese translations and designed to be extensible for community contributions.

## Goals

1. **Minimal Dependencies** - No new external dependencies beyond what's in Deno std
2. **Type Safety** - Full TypeScript support with generated types from translation files
3. **Lightweight** - Target ~200 lines of implementation code
4. **Community Friendly** - Easy to contribute translations via YAML/JSON files
5. **CLI Focused** - Optimized for command-line output and error messages

## Architecture

### File Structure

```
nagare/
├── locales/
│   ├── en.yaml           # Default English translations
│   ├── ja.yaml           # Japanese translations
│   ├── es.yaml           # Spanish (future)
│   ├── schema.ts         # Generated TypeScript types
│   └── README.md         # Translation guide for contributors
├── src/
│   ├── i18n.ts           # Core i18n implementation
│   └── i18n-types.ts     # Types and interfaces
├── scripts/
│   └── generate-i18n-types.ts  # Type generation script
```

### Translation File Format

#### English (en.yaml)

```yaml
# Error messages
errors:
  fileNotFound: "File not found: {path}"
  versionExists: "Version {version} already exists"
  gitNotClean: "Working directory has uncommitted changes"
  gitNotRepo: "Not in a git repository"
  invalidBumpType: "Invalid bump type: {type}"
  breakingRequiresMajor: "Cannot use {requested} bump: commits require at least {minimum}"
  commandFailed: "Command failed: {command}"
  configNotFound: "Configuration file not found: {path}"

# CLI messages
cli:
  release:
    description: "Create a new release"
    calculating: "Calculating version bump from {count} commits..."
    updating: "Updating {count} files..."
    success: "✅ Released version {version}"
    dryRun: "🔍 DRY RUN: Would release version {version}"

  rollback:
    description: "Rollback a release"
    confirm: "Are you sure you want to rollback to {version}?"
    success: "✅ Rolled back to version {version}"

  commands:
    patch: "Bump patch version (1.0.0 → 1.0.1)"
    minor: "Bump minor version (1.0.0 → 1.1.0)"
    major: "Bump major version (1.0.0 → 2.0.0)"

# Suggestions for error recovery
suggestions:
  checkPath: "Check that the file path is correct"
  verifyPermissions: "Verify you have read permissions"
  runGitInit: "Run 'git init' to initialize a repository"
  commitChanges: "Commit or stash your changes"
  useValidType: "Use one of: major, minor, patch"

# Changelog sections
changelog:
  added: "Added"
  changed: "Changed"
  deprecated: "Deprecated"
  removed: "Removed"
  fixed: "Fixed"
  security: "Security"

# Git commit types
commitTypes:
  feat: "Features"
  fix: "Bug Fixes"
  docs: "Documentation"
  style: "Styles"
  refactor: "Code Refactoring"
  test: "Tests"
  chore: "Chores"
  perf: "Performance Improvements"
  ci: "Continuous Integration"
  build: "Build System"
  revert: "Reverts"
```

#### Japanese (ja.yaml)

```yaml
# エラーメッセージ
errors:
  fileNotFound: "ファイルが見つかりません: {path}"
  versionExists: "バージョン {version} は既に存在します"
  gitNotClean: "作業ディレクトリにコミットされていない変更があります"
  gitNotRepo: "Gitリポジトリではありません"
  invalidBumpType: "無効なバンプタイプ: {type}"
  breakingRequiresMajor: "{requested}バンプは使用できません: コミットには最低でも{minimum}が必要です"
  commandFailed: "コマンドが失敗しました: {command}"
  configNotFound: "設定ファイルが見つかりません: {path}"

# CLIメッセージ
cli:
  release:
    description: "新しいリリースを作成"
    calculating: "{count}個のコミットからバージョンバンプを計算中..."
    updating: "{count}個のファイルを更新中..."
    success: "✅ バージョン {version} をリリースしました"
    dryRun: "🔍 ドライラン: バージョン {version} をリリースする予定"

  rollback:
    description: "リリースをロールバック"
    confirm: "本当にバージョン {version} にロールバックしますか？"
    success: "✅ バージョン {version} にロールバックしました"

  commands:
    patch: "パッチバージョンをバンプ (1.0.0 → 1.0.1)"
    minor: "マイナーバージョンをバンプ (1.0.0 → 1.1.0)"
    major: "メジャーバージョンをバンプ (1.0.0 → 2.0.0)"

# エラー回復の提案
suggestions:
  checkPath: "ファイルパスが正しいか確認してください"
  verifyPermissions: "読み取り権限があることを確認してください"
  runGitInit: "'git init' を実行してリポジトリを初期化してください"
  commitChanges: "変更をコミットまたはスタッシュしてください"
  useValidType: "次のいずれかを使用してください: major, minor, patch"

# 変更履歴セクション
changelog:
  added: "追加"
  changed: "変更"
  deprecated: "非推奨"
  removed: "削除"
  fixed: "修正"
  security: "セキュリティ"

# Gitコミットタイプ
commitTypes:
  feat: "機能"
  fix: "バグ修正"
  docs: "ドキュメント"
  style: "スタイル"
  refactor: "リファクタリング"
  test: "テスト"
  chore: "雑務"
  perf: "パフォーマンス改善"
  ci: "継続的インテグレーション"
  build: "ビルドシステム"
  revert: "取り消し"
```

### Core Implementation

#### i18n.ts

```typescript
import { parse as parseYAML } from "@std/yaml";

export interface I18nConfig {
  defaultLocale?: string;
  fallbackLocale?: string;
  localesDir?: string;
}

export class I18n {
  private translations: Map<string, Map<string, string>> = new Map();
  private currentLocale: string;
  private fallbackLocale: string;
  private localesDir: string;

  constructor(config: I18nConfig = {}) {
    this.currentLocale = config.defaultLocale || this.detectLocale();
    this.fallbackLocale = config.fallbackLocale || "en";
    this.localesDir = config.localesDir || "./locales";
  }

  /**
   * Detect locale from environment
   */
  private detectLocale(): string {
    const envLocale = Deno.env.get("LANG") || Deno.env.get("LANGUAGE") || "";
    const locale = envLocale.split(".")[0].split("_")[0];
    return locale || "en";
  }

  /**
   * Load translations from YAML file
   */
  async loadLocale(locale: string): Promise<void> {
    try {
      const path = `${this.localesDir}/${locale}.yaml`;
      const content = await Deno.readTextFile(path);
      const data = parseYAML(content) as Record<string, any>;

      const flatMap = new Map<string, string>();
      this.flattenObject(data, "", flatMap);
      this.translations.set(locale, flatMap);
    } catch (error) {
      if (locale !== this.fallbackLocale) {
        console.warn(`Failed to load locale ${locale}, falling back to ${this.fallbackLocale}`);
        await this.loadLocale(this.fallbackLocale);
      } else {
        throw new Error(`Failed to load fallback locale ${this.fallbackLocale}: ${error}`);
      }
    }
  }

  /**
   * Flatten nested object into dot-notation keys
   */
  private flattenObject(
    obj: Record<string, any>,
    prefix: string,
    result: Map<string, string>,
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "string") {
        result.set(fullKey, value);
      } else if (typeof value === "object" && value !== null) {
        this.flattenObject(value, fullKey, result);
      }
    }
  }

  /**
   * Initialize i18n by loading current and fallback locales
   */
  async init(): Promise<void> {
    await this.loadLocale(this.currentLocale);
    if (this.currentLocale !== this.fallbackLocale) {
      await this.loadLocale(this.fallbackLocale);
    }
  }

  /**
   * Set current locale
   */
  async setLocale(locale: string): Promise<void> {
    if (!this.translations.has(locale)) {
      await this.loadLocale(locale);
    }
    this.currentLocale = locale;
  }

  /**
   * Get current locale
   */
  getLocale(): string {
    return this.currentLocale;
  }

  /**
   * Translate a key with optional parameters
   */
  t(key: string, params?: Record<string, any>): string {
    // Try current locale first
    let translation = this.translations.get(this.currentLocale)?.get(key);

    // Fall back to fallback locale
    if (!translation && this.currentLocale !== this.fallbackLocale) {
      translation = this.translations.get(this.fallbackLocale)?.get(key);
    }

    // If still not found, return the key
    if (!translation) {
      console.warn(`Translation not found: ${key}`);
      return key;
    }

    // Replace parameters
    if (params) {
      return translation.replace(/{(\w+)}/g, (match, paramKey) => {
        const value = params[paramKey];
        return value !== undefined ? String(value) : match;
      });
    }

    return translation;
  }

  /**
   * Check if a translation exists
   */
  has(key: string): boolean {
    return !!(
      this.translations.get(this.currentLocale)?.has(key) ||
      this.translations.get(this.fallbackLocale)?.has(key)
    );
  }

  /**
   * Get all available locales
   */
  getAvailableLocales(): string[] {
    return Array.from(this.translations.keys());
  }
}

// Global instance
let globalI18n: I18n | null = null;

/**
 * Initialize global i18n instance
 */
export async function initI18n(config?: I18nConfig): Promise<I18n> {
  globalI18n = new I18n(config);
  await globalI18n.init();
  return globalI18n;
}

/**
 * Get global i18n instance
 */
export function getI18n(): I18n {
  if (!globalI18n) {
    throw new Error("i18n not initialized. Call initI18n() first.");
  }
  return globalI18n;
}

/**
 * Shorthand translate function
 */
export function t(key: string, params?: Record<string, any>): string {
  return getI18n().t(key, params);
}
```

### Type Generation

#### generate-i18n-types.ts

```typescript
import { parse as parseYAML } from "@std/yaml";

interface TranslationStructure {
  [key: string]: string | TranslationStructure;
}

function generateTypeDefinition(obj: TranslationStructure, indent = 0): string {
  const spaces = "  ".repeat(indent);
  let result = "{\n";

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result += `${spaces}  ${key}: string;\n`;
    } else {
      result += `${spaces}  ${key}: ${generateTypeDefinition(value, indent + 1)}`;
    }
  }

  result += `${spaces}}`;
  return indent === 0 ? result : result + ";\n";
}

async function generateTypes() {
  const enContent = await Deno.readTextFile("./locales/en.yaml");
  const translations = parseYAML(enContent) as TranslationStructure;

  const typeDefinition = `// Auto-generated from locales/en.yaml
// DO NOT EDIT MANUALLY

export interface TranslationKeys ${generateTypeDefinition(translations)}

export type TranslationKey = ${generateAllKeys(translations).map((k) => `"${k}"`).join(" | ")};
`;

  await Deno.writeTextFile("./locales/schema.ts", typeDefinition);
  console.log("✅ Generated translation types");
}

function generateAllKeys(obj: TranslationStructure, prefix = ""): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      keys.push(fullKey);
    } else {
      keys.push(...generateAllKeys(value, fullKey));
    }
  }

  return keys;
}

if (import.meta.main) {
  await generateTypes();
}
```

### Integration Points

#### 1. Enhanced Error System

```typescript
// enhanced-error.ts
import { t } from "./i18n.ts";

export class NagareError extends Error {
  constructor(
    messageKey: string,
    public code: ErrorCodes,
    public suggestions: string[] = [],
    public context?: Record<string, any>,
  ) {
    super(t(messageKey, context));
    this.name = "NagareError";
  }
}

// Usage
throw new NagareError(
  "errors.fileNotFound",
  ErrorCodes.FILE_NOT_FOUND,
  [t("suggestions.checkPath"), t("suggestions.verifyPermissions")],
  { path: filePath },
);
```

#### 2. CLI Integration

```typescript
// cli.ts
import { initI18n, t } from "./src/i18n.ts";

export async function cli(args: string[]) {
  // Initialize i18n with config locale or auto-detect
  const config = await loadConfig();
  await initI18n({
    defaultLocale: config.locale,
    localesDir: new URL("../locales", import.meta.url).pathname,
  });

  // Use translations
  console.log(t("cli.release.description"));
}
```

#### 3. Configuration

```typescript
// types.ts
export interface NagareConfig {
  // ... existing config

  /**
   * Locale for messages (e.g., "en", "ja")
   * @default Auto-detected from environment
   */
  locale?: string;
}
```

### Testing Strategy

1. **Unit Tests** - Test i18n class functionality
2. **Integration Tests** - Test with actual translation files
3. **Missing Translation Tests** - Ensure fallback works
4. **Parameter Interpolation Tests** - Test {param} replacement
5. **Type Safety Tests** - Ensure generated types match translations

### Migration Plan

1. **Phase 1**: Implement core i18n system
2. **Phase 2**: Add English translations for all messages
3. **Phase 3**: Update all error messages and CLI output to use i18n
4. **Phase 4**: Add Japanese translations
5. **Phase 5**: Generate TypeScript types
6. **Phase 6**: Documentation and contributor guide

### Performance Considerations

1. **Lazy Loading** - Only load requested locales
2. **Caching** - Cache parsed translations in memory
3. **Compile-Time Safety** - Generate types at build time
4. **Bundle Size** - No impact on bundle size (file-based)

### Security Considerations

1. **Path Validation** - Validate locale names to prevent path traversal
2. **YAML Parsing** - Use Deno std YAML parser (safe)
3. **Parameter Sanitization** - Escape user input in parameters

### Future Enhancements

1. **Pluralization** - Use Intl.PluralRules for proper plural forms
2. **Number/Date Formatting** - Use Intl formatters
3. **Locale Detection** - Better browser/system locale detection
4. **Hot Reload** - Reload translations without restart in dev mode
5. **Translation Validation** - Check all locales have same keys

### Community Contribution Guide

Create `locales/README.md`:

```markdown
# Contributing Translations

1. Copy `en.yaml` to `[locale].yaml` (e.g., `es.yaml` for Spanish)
2. Translate all values, keeping keys unchanged
3. Ensure all placeholders like `{version}` remain
4. Test with `deno task test:i18n`
5. Submit PR with your translation

## Guidelines

- Keep translations concise for CLI output
- Maintain consistent terminology
- Preserve formatting placeholders
- Include locale in PR title: "Add Spanish (es) translation"
```

## Timeline

1. **Week 1**: Core implementation and English translations
2. **Week 2**: Integration with existing codebase
3. **Week 3**: Japanese translations and testing
4. **Week 4**: Documentation and release

## Success Criteria

1. All user-facing messages are translatable
2. Zero performance impact on English users
3. Type-safe translation keys
4. Easy community contribution process
5. Maintains Nagare's minimal dependency philosophy
