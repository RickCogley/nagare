# /templates Directory - Vento Template Files

## Purpose

This directory contains Vento template files used by Nagare to generate dynamic content such as
changelogs, version files, and release notes. Templates provide flexible, customizable output while
maintaining security through sandboxing.

## Key Templates

### Core Templates

- **changelog.vento** - Default changelog template
  - Generates CHANGELOG.md with conventional commit grouping
  - Supports multiple version entries
  - Includes breaking changes section
  - Customizable commit type headings

- **version.json.vento** - JSON version file template
  - Updates version in package.json style files
  - Preserves existing JSON structure
  - Handles nested version fields

- **version.ts.vento** - TypeScript version constant template
  - Generates version.ts files with export const
  - Type-safe version exports
  - Supports additional metadata

- **version.yaml.vento** - YAML version file template
  - Updates version in YAML configuration files
  - Maintains YAML formatting
  - Supports complex YAML structures

### Custom Templates

Users can add their own templates here for project-specific needs:

- Release notes templates
- Documentation version updates
- Custom file format support

## Vento Template Syntax

### Variables Available

```vento
{{ version }}        - New version string (e.g., "2.14.0")
{{ previousVersion }} - Previous version string
{{ date }}           - Release date (ISO format)
{{ commits }}        - Array of parsed commits
{{ breaking }}       - Array of breaking changes
{{ features }}       - Array of new features
{{ fixes }}          - Array of bug fixes
{{ projectName }}    - From nagare.config.ts
{{ projectUrl }}     - Repository URL
```

### Common Patterns

```vento
{{ if breaking.length > 0 }}
## ⚠ BREAKING CHANGES
{{ for change of breaking }}
- {{ change.description }}
{{ /for }}
{{ /if }}

{{ set versionDate = date.toLocaleDateString('en-US') }}
## [{{ version }}] - {{ versionDate }}
```

## Security Considerations

### Template Sandboxing

- Templates run in isolated context
- No access to filesystem or network
- Limited to provided variables only
- HTML escaping enabled by default

### Input Validation

- All template variables sanitized
- Path traversal attempts blocked
- Code injection prevented
- Template syntax validated before execution

## Template Development

### Best Practices

1. **Keep Templates Simple** - Logic belongs in code, not templates
2. **Use Comments** - Document complex sections
3. **Test with Edge Cases** - Empty arrays, missing data
4. **Validate Output** - Ensure generated files are valid
5. **Version Control** - Track template changes

### Testing Templates

```typescript
// Use the template processor directly
const result = await processTemplate('changelog.vento', {
  version: '1.0.0',
  commits: [...],
  date: new Date()
});
```

## Customization Guide

### Adding New Templates

1. Create .vento file in this directory
2. Define variables needed in template
3. Update nagare.config.ts to reference template
4. Test with dry-run mode first

### Template Naming Convention

- Use descriptive names: `changelog-detailed.vento`
- Include file type: `version.toml.vento`
- Avoid special characters
- Use lowercase with hyphens

## Integration with Nagare

Templates are processed by `src/template-processor.ts`:

1. Template loaded from disk
2. Variables prepared and sanitized
3. Vento engine compiles template
4. Output generated with provided data
5. Result validated before writing

## Internationalization

Templates can support multiple languages:

```vento
{{ set lang = options.lang || 'en' }}
{{ if lang === 'ja' }}
  ## 新機能
{{ else }}
  ## Features
{{ /if }}
```

## Performance Notes

- Templates are cached after first use
- Compilation happens once per session
- Large commit lists processed efficiently
- Async rendering for better performance

## Common Issues

### Template Not Found

- Ensure file exists in /templates
- Check file extension is .vento
- Verify path in config is correct

### Invalid Output

- Validate template syntax
- Check variable names match
- Test with minimal data first

### Security Warnings

- Review any dynamic content
- Avoid user input in templates
- Use Nagare's sanitization utilities

When creating or modifying templates:

1. Follow Vento syntax guidelines
2. Keep security in mind
3. Test thoroughly with edge cases
4. Document custom variables
5. Consider internationalization needs
