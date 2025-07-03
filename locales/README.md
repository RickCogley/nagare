# Contributing Translations to Nagare

Thank you for helping make Nagare accessible to more developers around the world! 🌍

## How to Add a New Language

1. **Copy the English template**
   ```bash
   cp en.yaml [locale].yaml
   ```
   Replace `[locale]` with your language code (e.g., `es` for Spanish, `fr` for French)

2. **Translate all values**
   - Keep all keys exactly as they are (don't translate keys)
   - Translate only the string values
   - Preserve all placeholders like `{version}`, `{path}`, etc.

3. **Test your translation**
   ```bash
   # Set your locale and run Nagare
   export NAGARE_LOCALE=es
   deno task nagare --help
   ```

4. **Validate completeness**
   ```bash
   deno task i18n:types
   ```
   This will check if your translation has all required keys

5. **Submit a Pull Request**
   - Title: "Add [Language] translation"
   - Include your locale code in the PR description

## Translation Guidelines

### General Rules

- **Be concise** - CLI messages should be short and clear
- **Be consistent** - Use the same terms throughout
- **Keep placeholders** - Never remove `{variable}` placeholders
- **Maintain tone** - Match the professional but friendly tone

### Specific Terminology

| English  | Japanese     | Spanish      | Notes                           |
| -------- | ------------ | ------------ | ------------------------------- |
| release  | リリース     | lanzamiento  | The act of publishing a version |
| version  | バージョン   | versión      |                                 |
| bump     | バンプ       | incrementar  | Increasing version number       |
| rollback | ロールバック | revertir     |                                 |
| dry run  | ドライラン   | simulación   |                                 |
| commit   | コミット     | confirmación | Git commit                      |
| tag      | タグ         | etiqueta     | Git tag                         |

### Placeholders

Placeholders are variables that get replaced with actual values:

- `{version}` - Version number (e.g., "1.2.3")
- `{path}` - File path
- `{count}` - Numeric count
- `{error}` - Error message
- `{from}`, `{to}` - Version transitions

**Never translate or remove these!**

### Examples

Good translation:

```yaml
# English
errors:
  fileNotFound: "File not found: {path}"

# Japanese
errors:
  fileNotFound: "ファイルが見つかりません: {path}" # ✅ Placeholder preserved
```

Bad translation:

```yaml
# Japanese
errors:
  fileNotFound: "ファイルが見つかりません: パス" # ❌ Placeholder removed
  fileNotFound: "ファイルが見つかりません: {パス}" # ❌ Placeholder translated
```

## Testing Your Translation

1. **Unit test** - Check specific messages:
   ```typescript
   import { initI18n, t } from "../src/i18n.ts";

   await initI18n({ defaultLocale: "es" });
   console.log(t("cli.release.success", { version: "1.2.3" }));
   ```

2. **Integration test** - Run actual commands:
   ```bash
   export NAGARE_LOCALE=es
   deno task nagare --dry-run
   ```

3. **Visual review** - Check formatting and line lengths

## Locale Codes

Use standard ISO 639-1 codes:

- `en` - English
- `ja` - Japanese
- `es` - Spanish
- `fr` - French
- `de` - German
- `zh` - Chinese
- `ko` - Korean
- `pt` - Portuguese
- `ru` - Russian
- `it` - Italian

For regional variants, use full codes like `pt-BR` (Brazilian Portuguese).

## Questions?

If you're unsure about a translation:

1. Check how similar tools translate it
2. Ask in the PR discussion
3. When in doubt, keep it literal but natural

Thank you for contributing! 🙏
