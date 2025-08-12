# Template Reference

## Overview

Nagare uses the Vento template engine for generating version files and processing custom templates. Templates have
access to comprehensive data about the release, project, and environment.

## Synopsis

```vento
export const VERSION = "{{ version }}";
export const BUILD_INFO = {
  date: "{{ buildDate }}",
  commit: "{{ gitCommit }}"
};
```

## Description

Templates in Nagare use Vento syntax, which provides a secure and powerful templating system with auto-escaping, custom
filters, and conditional logic. Templates can generate TypeScript, JSON, YAML, or any custom format needed for version
tracking.

## Template Syntax

### Basic Interpolation {#interpolation}

**Syntax**: `{{ variable }}`\
**Description**: Output a variable value with auto-escaping

Variables are automatically escaped for security. In code generation contexts, use the `safe` filter to output raw
values.

**Example**:

```vento
// String values are output as-is
export const VERSION = "{{ version }}";

// Numbers need the safe filter
export const MAJOR = {{ versionComponents.major |> safe }};
```

### Filters {#filters}

**Syntax**: `{{ value |> filterName }}`\
**Description**: Transform values using filters

**IMPORTANT**: Vento uses `|>` (F# pipeline syntax), NOT single pipe `|`.

**Built-in filters**:

- `safe` - Output raw value without escaping
- `escape` - Force HTML escaping (for HTML contexts)
- `jsonStringify` - Convert to JSON with optional indentation
- `formatDate` - Format date to ISO date string
- `shortHash` - Truncate git hash to specified length
- `safeString` - Escape quotes for JSON embedding

**Examples**:

```vento
// JSON stringify an object
export const METADATA = {{ metadata |> jsonStringify |> safe }};

// Format a date
export const RELEASE_DATE = "{{ buildDate |> formatDate }}";

// Short git hash
export const SHORT_COMMIT = "{{ gitCommit |> shortHash(7) }}";

// Chain filters
export const DATA = {{ releaseNotes |> jsonStringify(2) |> safe }};
```

### Conditionals {#conditionals}

**Syntax**: `{{ if condition }} ... {{ /if }}`\
**Description**: Conditional rendering

**Examples**:

```vento
{{- if project.author }}
author: "{{ project.author }}",
{{- /if }}

{{- if metadata }}
export const METADATA = {{ metadata |> jsonStringify |> safe }};
{{- else }}
export const METADATA = {};
{{- /if }}

// Check specific properties
{{- if versionComponents.prerelease }}
export const PRERELEASE = "{{ versionComponents.prerelease }}";
{{- /if }}
```

### Whitespace Control {#whitespace}

**Syntax**: `{{-` and `-}}`\
**Description**: Remove whitespace before/after tags

- `{{-` removes all whitespace before the tag (including newlines)
- `-}}` removes all whitespace after the tag
- Use carefully to avoid unintended formatting issues

**Example**:

```vento
// Without whitespace control
{{ if value }}
  key: "value"
{{ /if }}

// With whitespace control (removes blank lines)
{{- if value }}
  key: "value"
{{- /if }}
```

### Comments {#comments}

**Syntax**: `{{# comment text #}}`\
**Description**: Template comments (not output)

**Example**:

```vento
{{# This comment won't appear in output #}}
export const VERSION = "{{ version }}";
```

## Template Variables

### Core Variables {#core-variables}

| Variable      | Type   | Description          | Example                  |
| ------------- | ------ | -------------------- | ------------------------ |
| `version`     | string | Full version string  | `"1.2.3"`                |
| `buildDate`   | string | ISO timestamp        | `"2024-01-15T10:30:00Z"` |
| `gitCommit`   | string | Full git commit hash | `"abc123def456..."`      |
| `environment` | string | Build environment    | `"production"`           |

### Version Components {#version-components}

**Object**: `versionComponents`\
**Description**: Parsed semantic version parts

| Property     | Type         | Description            | Example    |
| ------------ | ------------ | ---------------------- | ---------- |
| `major`      | number       | Major version          | `1`        |
| `minor`      | number       | Minor version          | `2`        |
| `patch`      | number       | Patch version          | `3`        |
| `prerelease` | string\|null | Pre-release identifier | `"beta.1"` |

**Example usage**:

```vento
export const VERSION_INFO = {
  major: {{ versionComponents.major |> safe }},
  minor: {{ versionComponents.minor |> safe }},
  patch: {{ versionComponents.patch |> safe }},
  prerelease: {{ if versionComponents.prerelease }}{{ versionComponents.prerelease |> jsonStringify |> safe }}{{ else }}null{{ /if }}
} as const;
```

### Project Information {#project-info}

**Object**: `project`\
**Description**: Project metadata from configuration

| Property      | Type              | Description         |
| ------------- | ----------------- | ------------------- |
| `name`        | string            | Project name        |
| `description` | string\|undefined | Project description |
| `repository`  | string            | Repository URL      |
| `homepage`    | string\|undefined | Project homepage    |
| `license`     | string\|undefined | License identifier  |
| `author`      | string\|undefined | Author information  |

**Example usage**:

```vento
export const APP_INFO = {
  name: "{{ project.name }}",
  {{- if project.description }}
  description: "{{ project.description }}",
  {{- /if }}
  repository: "{{ project.repository }}"
} as const;
```

### Release Notes {#release-notes}

**Object**: `releaseNotes`\
**Description**: Changelog entries for current release

| Property     | Type     | Description          |
| ------------ | -------- | -------------------- |
| `version`    | string   | Release version      |
| `date`       | string   | Release date         |
| `added`      | string[] | New features         |
| `changed`    | string[] | Changes/improvements |
| `deprecated` | string[] | Deprecations         |
| `removed`    | string[] | Removed features     |
| `fixed`      | string[] | Bug fixes            |
| `security`   | string[] | Security updates     |

**Example usage**:

```vento
{{- if releaseNotes }}
export const CHANGELOG = {
  version: "{{ releaseNotes.version }}",
  date: "{{ releaseNotes.date }}",
  {{- if releaseNotes.added.length > 0 }}
  added: {{ releaseNotes.added |> jsonStringify |> safe }},
  {{- /if }}
  {{- if releaseNotes.fixed.length > 0 }}
  fixed: {{ releaseNotes.fixed |> jsonStringify |> safe }}
  {{- /if }}
} as const;
{{- /if }}
```

### Metadata {#metadata}

**Object**: `metadata`\
**Description**: Custom metadata from configuration and data providers

Metadata is merged from:

1. `releaseNotes.metadata` in configuration
2. Template data providers
3. Direct metadata properties

**Example configuration**:

```typescript
releaseNotes: {
  metadata: {
    apiEndpoints: ['/api/v1', '/health'],
    features: ['auth', 'websocket']
  }
}
```

**Example usage**:

```vento
{{# Metadata is available as an object #}}
{{- if metadata }}
export const APP_METADATA = {{ metadata |> jsonStringify |> safe }};
{{- /if }}

{{# Individual properties are also at root level #}}
{{- if apiEndpoints }}
export const API_ENDPOINTS = {{ apiEndpoints |> jsonStringify |> safe }};
{{- /if }}
```

### Computed Helpers {#computed-helpers}

| Variable             | Type   | Description    | Example        |
| -------------------- | ------ | -------------- | -------------- |
| `currentYear`        | number | Current year   | `2024`         |
| `buildDateFormatted` | string | Formatted date | `"2024-01-15"` |
| `shortCommit`        | string | Short git hash | `"abc123d"`    |

## Built-in Templates

### TypeScript Template {#TypeScript-template}

**File**: `templates/typescript.vto`\
**Usage**: `template: 'typescript'`

Generates a TypeScript module with const exports:

```typescript
export const VERSION = "1.2.3";
export const BUILD_INFO = {
  buildDate: "2024-01-15T10:30:00Z",
  gitCommit: "abc123def456",
  buildEnvironment: "production",
  versionComponents: {
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: null,
  },
} as const;
// ... additional exports
```

### JSON Template {#json-template}

**File**: `templates/json.vto`\
**Usage**: `template: 'json'`

Generates a JSON file:

```json
{
  "version": "1.2.3",
  "buildDate": "2024-01-15T10:30:00Z",
  "gitCommit": "abc123def456",
  "project": {
    "name": "My App",
    "repository": "https://github.com/user/app"
  }
}
```

### YAML Template {#yaml-template}

**File**: `templates/yaml.vto`\
**Usage**: `template: 'yaml'`

Generates a YAML file:

```yaml
version: 1.2.3
buildDate: 2024-01-15T10:30:00Z
gitCommit: abc123def456
project:
  name: My App
  repository: https://github.com/user/app
```

## Custom Templates

### Basic Custom Template {#custom-basic}

```typescript
versionFile: {
  path: './version.js',
  template: 'custom',
  customTemplate: `
    export const VERSION = "{{ version }}";
    export const BUILD_TIME = {{ Date.now() |> safe }};
  `
}
```

### Advanced Custom Template {#custom-advanced}

```typescript
versionFile: {
  path: './src/build-info.ts',
  template: 'custom',
  customTemplate: `
    /**
     * Build information for {{ project.name }}
     * Generated on {{ buildDate |> formatDate }}
     */
    
    export interface BuildInfo {
      version: string;
      major: number;
      minor: number;
      patch: number;
      commit: string;
      date: string;
      {{- if metadata.features }}
      features: string[];
      {{- /if }}
    }
    
    export const BUILD: BuildInfo = {
      version: "{{ version }}",
      major: {{ versionComponents.major |> safe }},
      minor: {{ versionComponents.minor |> safe }},
      patch: {{ versionComponents.patch |> safe }},
      commit: "{{ gitCommit }}",
      date: "{{ buildDate }}",
      {{- if metadata.features }}
      features: {{ metadata.features |> jsonStringify |> safe }}
      {{- /if }}
    };
    
    {{- if releaseNotes.added.length > 0 }}
    export const NEW_FEATURES = {{ releaseNotes.added |> jsonStringify |> safe }};
    {{- /if }}
  `
}
```

## Security Considerations

### Template Sandboxing {#sandboxing}

Nagare implements template sandboxing with three levels:

1. **strict** (default): Blocks all potentially dangerous operations
2. **moderate**: Allows some safe operations with restrictions
3. **disabled**: No sandboxing (use only with trusted templates)

**Blocked patterns in strict mode**:

- File system access (`Deno.readFile`, `import()`, etc.)
- Network access (`fetch`, `XMLHttpRequest`)
- Process execution (`Deno.Command`, `Deno.run`)
- Global object access (`globalThis`, `window`)
- JavaScript execution (`eval`, `Function`)

### Safe Output Practices {#safe-output}

**For code generation** (TypeScript, JavaScript, JSON):

```vento
// Use |> safe for raw output
export const DATA = {{ data |> jsonStringify |> safe }};
```

**For HTML contexts** (if generating HTML):

```vento
// Always escape for HTML attributes
<div data-version="{{ version |> escape }}">
```

## Template Data Providers

### Configuration {#data-providers}

```typescript
templates: {
  dataProviders: {
    buildMetrics: async () => ({
      bundleSize: await calculateBundleSize(),
      testCount: await getTestCount()
    }),
    gitInfo: async () => ({
      branch: await getCurrentBranch(),
      contributors: await getContributorCount()
    })
  }
}
```

### Usage in Templates {#data-provider-usage}

```vento
{{# Data from providers is merged into template context #}}
{{- if buildMetrics }}
export const BUILD_METRICS = {
  bundleSize: {{ buildMetrics.bundleSize |> safe }},
  testCount: {{ buildMetrics.testCount |> safe }}
};
{{- /if }}

{{# Individual properties available at root #}}
{{- if bundleSize }}
export const BUNDLE_SIZE = {{ bundleSize |> safe }};
{{- /if }}
```

## Common Patterns

### Conditional Exports {#conditional-exports}

```vento
{{# Only export if data exists #}}
{{- if metadata.apiEndpoints }}
export const API_ENDPOINTS = {{ metadata.apiEndpoints |> jsonStringify |> safe }};
{{- /if }}

{{- if project.license }}
export const LICENSE = "{{ project.license }}";
{{- /if }}
```

### Type-Safe TypeScript {#type-safe}

```vento
{{# Generate TypeScript with proper types #}}
export interface VersionInfo {
  version: string;
  components: {
    major: number;
    minor: number;
    patch: number;
    prerelease: string | null;
  };
}

export const VERSION_INFO: VersionInfo = {
  version: "{{ version }}",
  components: {
    major: {{ versionComponents.major |> safe }},
    minor: {{ versionComponents.minor |> safe }},
    patch: {{ versionComponents.patch |> safe }},
    prerelease: {{ versionComponents.prerelease |> jsonStringify |> safe }}
  }
};
```

### Multi-Format Support {#multi-format}

```vento
{{# Adapt output based on file extension #}}
{{- if path.endsWith('.json') }}
{
  "version": "{{ version }}",
  "build": {{ buildInfo |> jsonStringify |> safe }}
}
{{- else if path.endsWith('.yaml') }}
version: {{ version }}
build:
  date: {{ buildDate }}
  commit: {{ gitCommit }}
{{- else }}
export const VERSION = "{{ version }}";
{{- /if }}
```

## Troubleshooting

### Common Errors {#common-errors}

**Error**: "Template processing failed"\
**Cause**: Invalid Vento syntax\
**Solution**: Check for:

- Using `|` instead of `|>` for filters
- Unclosed tags (`{{ if }}` without `{{ /if }}`)
- Undefined variables or properties

**Error**: "Template security violation"\
**Cause**: Template contains blocked patterns\
**Solution**: Remove dangerous operations or set `templateSandbox: 'disabled'` (not recommended)

**Error**: "Cannot read property of undefined"\
**Cause**: Accessing nested property that doesn't exist\
**Solution**: Use conditional checks:

```vento
{{- if metadata && metadata.features }}
  features: {{ metadata.features |> jsonStringify |> safe }}
{{- /if }}
```

## See also

- [Configuration Reference](./reference-configuration.md) - Template configuration options
- [Template Guide](./guide-templates.md) - How to create custom templates
- [Vento Documentation](https://vento.js.org/) - Full Vento syntax reference
