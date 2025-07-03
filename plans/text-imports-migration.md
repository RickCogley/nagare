# Text Imports Migration Plan for Templates

## Overview

This document outlines the plan to migrate Nagare's built-in templates from inline string constants
to separate `.vto` files using Deno 2.4's new text import feature.

## Current State

Templates are currently defined as multi-line string constants in `config.ts`:

- `TYPESCRIPT_TEMPLATE` (lines 286-331)
- `JSON_TEMPLATE` (lines 348-371)
- `YAML_TEMPLATE` (lines 387-414)

## Proposed Changes

### 1. Create Template Files

Extract each template into its own file:

```
templates/
├── typescript.vto
├── json.vto
└── yaml.vto
```

### 2. Update config.ts

Replace string constants with text imports:

```typescript
// Add --unstable-raw-imports flag to CLI commands
import typescriptTemplate from "./templates/typescript.vto" with { type: "text" };
import jsonTemplate from "./templates/json.vto" with { type: "text" };
import yamlTemplate from "./templates/yaml.vto" with { type: "text" };

export const BUILT_IN_TEMPLATES: Partial<Record<TemplateFormat, string>> = {
  [TemplateFormat.TYPESCRIPT]: typescriptTemplate,
  [TemplateFormat.JSON]: jsonTemplate,
  [TemplateFormat.YAML]: yamlTemplate,
};
```

### 3. Update Tasks

Add `--unstable-raw-imports` flag to all task commands that use templates:

- All `nagare:*` tasks
- `dev` task
- Test tasks

## Benefits

1. **Better Developer Experience**:
   - Syntax highlighting for `.vto` files in editors
   - No string escaping issues
   - Easier template editing

2. **Cleaner Code Organization**:
   - Separation of concerns
   - Templates in dedicated directory
   - Reduced config.ts file size

3. **Performance**:
   - Templates loaded at compile time (no change from current)
   - No runtime file I/O

## Implementation Steps

1. **Phase 1: Preparation**
   - Create `templates/` directory
   - Extract templates from config.ts to .vto files
   - Test templates work correctly as standalone files

2. **Phase 2: Migration**
   - Update config.ts with text imports
   - Add `--unstable-raw-imports` flag to deno.json tasks
   - Update tests to ensure compatibility

3. **Phase 3: Validation**
   - Run full test suite
   - Test all release scenarios
   - Verify JSR publishing still works

## Risks and Mitigations

1. **Unstable Feature Risk**:
   - Risk: `--unstable-raw-imports` may change
   - Mitigation: Document flag requirement, monitor Deno releases

2. **Build/Publishing Risk**:
   - Risk: JSR publishing may not support text imports
   - Mitigation: Test in dry-run mode first, keep original code as backup

3. **Backwards Compatibility**:
   - Risk: Users on older Deno versions
   - Mitigation: Document minimum Deno version requirement

## Testing Plan

1. Unit tests for template processing
2. Integration tests for full release flow
3. Manual testing of:
   - TypeScript version file updates
   - JSON file updates
   - YAML file updates
   - Custom templates

## Rollback Plan

If issues arise:

1. Revert config.ts to use string constants
2. Remove `--unstable-raw-imports` flags
3. Keep template files for future migration

## Decision

**Recommendation**: Proceed with caution after Deno 2.5 or when text imports become stable.

## Security Considerations

Per OWASP A03 (Injection):

- Templates are loaded at compile time, reducing runtime injection risks
- No user input affects template loading
- Maintains current security posture

InfoSec: No security impact - compile-time template loading maintains current security model
