# Vento Template Engine Feedback

This document contains feedback based on extensive use of Vento in the Nagare release management
tool, particularly while debugging template processing issues.

## Context

Nagare uses Vento for generating version files in various formats (TypeScript, JSON, YAML). During
the development of releases 1.5.1-1.5.5, we encountered several template-related issues that
provided deep insights into Vento's behavior.

## Positive Aspects 👍

### 1. Clean, Minimal Syntax

The template syntax is elegant and doesn't clutter the content. The use of `{{ }}` for expressions
and `{{- -}}` for whitespace control is intuitive.

### 2. Good Error Messages

When templates fail, the error messages generally point to the right location in the template,
making debugging easier.

### 3. Flexible Filter System

The ability to add custom filters is well-designed and easy to use:

```javascript
vento.filters.jsonStringify = (value, indent = 2) => {
  if (value === null || value === undefined) return "null";
  return JSON.stringify(value, null, indent);
};
```

### 4. Smart Variable Transformation

The automatic transformation of undefined variables to use the data object (e.g., `name` →
`it.name`) is clever and reduces boilerplate.

### 5. Performance

Vento is fast and lightweight, with no noticeable performance impact even when processing multiple
templates.

## Areas for Improvement 🤔

### 1. Filter Syntax Documentation

The `|>` pipe syntax (F# pipeline operator) is not immediately obvious to newcomers. Many template
engines use single `|`, which led to confusion:

**What we tried (incorrect):**

```vento
{{ metadata | jsonStringify }}
```

**What actually works:**

```vento
{{ metadata |> jsonStringify }}
```

This distinction should be more prominently documented, perhaps with a migration guide for users
coming from other template engines.

### 2. Autoescape Interaction with Filters

When `autoescape: true`, the interaction between filters and escaping can be surprising:

```vento
// This produces escaped HTML entities in the output
{{ releaseNotes |> jsonStringify }}

// This is needed to get raw JSON
{{ releaseNotes |> jsonStringify |> safe }}
```

Perhaps JSON output could be automatically considered safe? Or have a `jsonSafe` filter that
combines both operations?

### 3. Whitespace Control Edge Cases

The `{{-` and `-}}` trim markers work well but can sometimes trim too aggressively:

```vento
// This removes the space after the colon
prerelease:{{- if condition }}value{{- /if }}

// Results in: "prerelease:value" instead of "prerelease: value"
```

### 4. Better TypeScript Types

The TypeScript type definitions could be more specific:

```typescript
// Current
filters: Record<string, Function>;

// Could be
filters: Record<string, (value: unknown, ...args: unknown[]) => unknown>;
```

### 5. Debugging Tools

It would be helpful to have a way to see the generated JavaScript code more easily for debugging
template issues. Currently, we had to write custom test scripts to inspect the compiled output.

## Feature Suggestions 💡

### 1. Built-in Common Filters

Consider adding more built-in filters:

- `json` - Alias for `jsonStringify |> safe`
- `default` - Provide default values for null/undefined
- `trim` - Trim whitespace
- `escape` / `unescape` - HTML entity handling
- `date` - Common date formatting

### 2. Template Validation Mode

A way to validate template syntax without executing it would be helpful for CI/CD pipelines:

```javascript
const result = vento.validate(templateString);
if (!result.valid) {
  console.error(result.errors);
}
```

### 3. Source Maps

For complex templates, source maps connecting the generated JavaScript back to the template source
would aid debugging.

### 4. Better Conditional Property Access

A safe way to access nested properties without errors:

```vento
{{- if metadata?.dependencies?.length > 0 }}
  Has dependencies
{{- /if }}
```

### 5. Template Composition Helpers

More advanced template composition features:

- Named blocks that can be overridden
- Template inheritance with multiple levels
- Macros or reusable template functions

## Real-World Example Issues We Encountered

### Issue 1: Filter Syntax Confusion

We spent considerable time debugging why filters weren't working, only to discover we were using `|`
instead of `|>`.

### Issue 2: Escaped JSON Output

Our generated TypeScript files had `&quot;` instead of `"` because we didn't know about the `safe`
filter requirement when using `autoescape: true`.

### Issue 3: Conditional Complexity

Complex conditionals for handling null values required verbose syntax:

```vento
{{- if versionComponents.prerelease }}{{ versionComponents.prerelease |> jsonStringify |> safe }}{{- else }}null{{- /if }}
```

## Conclusion

Vento is a solid template engine that fits well with Deno's philosophy of simplicity and standards.
The issues we encountered were more about documentation and expected behaviors than fundamental
flaws. With some documentation improvements and minor feature additions, Vento could be even more
developer-friendly.

The engine's performance, clean syntax, and flexibility make it a good choice for Deno projects. We
appreciate the work that has gone into making it standards-compliant and lightweight.

## Recommendations for Nagare Users

1. Always use `|>` for filters, not `|`
2. When outputting JSON, always add `|> safe` after `|> jsonStringify`
3. Be careful with whitespace trim markers (`{{-` and `-}}`)
4. Test templates with undefined/null values to ensure proper handling
5. Use the built-in `safe` filter to prevent HTML escaping when needed
