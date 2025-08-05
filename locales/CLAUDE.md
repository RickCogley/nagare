# /locales Directory - Internationalization Files

## Purpose

This directory contains translation files for Nagare's multi-language support. Currently supports English and Japanese,
with a structure that allows easy addition of new languages.

## Language Files

### English (Default)

- **en.json** - English translations
  - Primary language for all features
  - Complete set of all translatable strings
  - Serves as reference for other languages
  - American English conventions

### Japanese

- **ja.json** - Japanese translations (日本語)
  - Full feature parity with English
  - Professional technical Japanese
  - Appropriate keigo (politeness) levels
  - Considers Japanese developer workflows

## Translation Structure

### Key Organization

```json
{
  "commands": {
    "release": "Create a new release",
    "rollback": "Rollback to previous version",
    "retry": "Retry failed release"
  },
  "prompts": {
    "confirmRelease": "Proceed with release?",
    "selectVersion": "Select version type"
  },
  "messages": {
    "success": "Release completed successfully",
    "error": "An error occurred"
  },
  "errors": {
    "gitNotClean": "Working directory has uncommitted changes",
    "invalidVersion": "Invalid version format"
  }
}
```

### Key Naming Conventions

- **Dot notation**: `section.subsection.key`
- **Camel case**: `confirmRelease` not `confirm_release`
- **Descriptive**: `errors.gitNotClean` not `errors.e001`
- **Grouped**: Related messages under common parents

## Marine Theme Integration 🌊

Both languages incorporate ocean metaphors:

- English: "Riding the release wave 🌊"
- Japanese: "リリースの波に乗って 🌊"

Consistent emoji usage across languages:

- Success: 🎉
- Progress: 🌊
- Warning: ⚠️
- Error: ❌

## Translation Guidelines

### Adding New Keys

1. Add to en.json first (source of truth)
2. Add Japanese translation to ja.json
3. Use consistent terminology
4. Test in both languages
5. Consider string length for UI

### Quality Standards

- **Accuracy**: Technical correctness over literal translation
- **Clarity**: Clear to target audience
- **Consistency**: Same terms throughout
- **Context**: Consider where text appears
- **Culture**: Respect linguistic norms

### Japanese Specific Considerations

- Use カタカナ for technical terms: コミット (commit)
- Appropriate politeness: です/ます form
- Avoid overly casual expressions
- Consider character width in terminals

## Usage in Code

### Loading Translations

```typescript
import { I18n } from "../src/i18n.ts";

const i18n = new I18n("ja"); // or 'en'
const message = i18n.t("commands.release");
```

### Dynamic Interpolation

```typescript
// Template: "Version {{version}} released"
i18n.t("messages.released", { version: "2.14.0" });
```

### Pluralization

```typescript
// "1 file updated" vs "3 files updated"
i18n.t("files.updated", { count: fileCount });
```

## Testing Translations

### Completeness Check

- All keys in en.json must exist in ja.json
- No orphaned keys in translation files
- Automated tests verify parity

### Context Testing

- Run Nagare in different languages
- Verify messages make sense in context
- Check for text overflow in UI

### Cultural Review

- Have native speakers review translations
- Consider regional variations
- Validate technical terminology

## Adding New Languages

To add a new language:

1. Copy en.json to `[lang].json`
2. Translate all strings
3. Add language to i18n.ts supported list
4. Update CLI help for language codes
5. Test thoroughly

Example for Spanish:

```bash
cp locales/en.json locales/es.json
# Translate all strings in es.json
# Update src/i18n.ts to include 'es'
```

## Maintenance

### Regular Updates

- Keep translations synchronized
- Review for outdated terminology
- Update for new features
- Maintain consistency

### Translation Memory

Consider maintaining a glossary:

- Common technical terms
- Nagare-specific concepts
- Preferred translations
- Terms to avoid

## Integration with CI/CD

### Validation Steps

1. JSON syntax validation
2. Key completeness check
3. Interpolation variable matching
4. Character encoding verification

### Automated Checks

- Pre-commit hooks validate JSON
- CI ensures translation parity
- Tests run in all languages

## Common Issues

### Missing Translations

- Fallback to English automatically
- Log warnings in debug mode
- Never show raw keys to users

### Encoding Problems

- Always use UTF-8
- Test with various terminals
- Consider emoji support

### Length Constraints

- Terminal width considerations
- Keep messages concise
- Test wrap behavior

When working with translations:

1. Always update all language files
2. Test in target language
3. Consider cultural context
4. Maintain the marine theme 🌊
5. Verify in different terminal environments
