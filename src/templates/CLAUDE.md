# Templates Module

## Purpose

Content generation using Vento template engine. Handles changelog generation, documentation, and version file creation
with secure template processing.

## Key Components

- **template-processor.ts** - Vento template engine integration with sandboxing
- **changelog-generator.ts** - CHANGELOG.md generation following Keep a Changelog
- **doc-generator.ts** - API documentation generation using deno doc
- **template-security_test.ts** - Template security validation tests

## Template Engine

Uses Vento (not Handlebars/Mustache) for:

- Logic in templates (if/else, loops)
- Custom filters and functions
- Template inheritance
- Auto-escaping for security

## Key Operations

### template-processor.ts

- `processTemplate()` - Render Vento templates with data
- `validateTemplate()` - Security validation before processing
- `setupSecurityContext()` - Sandbox template execution
- Built-in templates for TypeScript, JSON, YAML version files
- Custom template support with security validation

### changelog-generator.ts

- `generateChangelogEntry()` - Create new version entry
- `updateChangelog()` - Insert entry into existing CHANGELOG.md
- Follows Keep a Changelog format
- Groups commits by type (Added, Changed, Fixed, etc.)

### doc-generator.ts

- `generateDocs()` - Run deno doc for API documentation
- Outputs to `docs/api/` directory
- Includes private API if configured
- Generates both HTML and JSON output

## Template Security

**InfoSec Requirements:**

- Templates run in sandboxed environment
- No access to file system or network
- Input data is validated and sanitized
- Template size limits enforced (1MB default)
- Dangerous patterns blocked (eval, Function constructor)

## Template Data Structure

```typescript
interface TemplateData {
  version: string;
  buildDate: string;
  gitCommit: string;
  environment: string;
  releaseNotes: ReleaseNotes;
  metadata: Record<string, unknown>;
  project: ProjectConfig;
  // Computed helpers
  versionComponents: {...};
  currentYear: number;
  shortCommit: string;
}
```

## Built-in Templates

### TypeScript Version File

```typescript
export const VERSION = "{{ version }}";
export const BUILD_DATE = "{{ buildDate }}";
export const GIT_COMMIT = "{{ gitCommit }}";
```

### Custom Templates

Users can provide custom Vento templates:

```vento
{{ set title = "Release " + version }}
# {{ title }}

{{ for change in releaseNotes.added }}
- {{ change }}
{{ /for }}
```

## Usage Pattern

```typescript
import { TemplateProcessor } from "../templates/template-processor.ts";
import { ChangelogGenerator } from "../templates/changelog-generator.ts";

const processor = new TemplateProcessor(config);
const versionFile = await processor.generateVersionFile(data);

const changelog = new ChangelogGenerator(config);
await changelog.updateChangelog(version, commits);
```

## Testing Focus

- Template injection attempts
- Large template DoS prevention
- Sandbox escape attempts
- Output sanitization
- Template syntax errors
