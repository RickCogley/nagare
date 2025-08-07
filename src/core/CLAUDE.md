# Core Module

## Purpose

Foundation utilities with zero external dependencies. These modules form the base layer of Nagare and are imported by
all other modules.

## Key Components

- **i18n.ts** - Internationalization system supporting English/Japanese
- **enhanced-error.ts** - Type-safe error handling with error codes and context
- **logger.ts** - Structured logging with levels (DEBUG, INFO, WARN, ERROR)
- **branded-messages.ts** - Marine-themed UI messages and branding
- **runtime-compat.ts** - Cross-runtime compatibility layer

## Design Principles

1. **Zero Dependencies** - Core modules cannot import from other folders
2. **Type Safety** - All exports are fully typed with no 'any'
3. **Security First** - Error messages are sanitized, no sensitive data logged
4. **Performance** - Lightweight, no heavy operations

## Usage Pattern

```typescript
import { Logger } from "../core/logger.ts";
import { ErrorCodes, NagareError } from "../core/enhanced-error.ts";
import { t } from "../core/i18n.ts";
```

## Security Considerations

- Error messages are sanitized to prevent information disclosure
- Logging never includes sensitive data like tokens or passwords
- All user-facing messages go through i18n for consistency

## Testing

Core modules have comprehensive unit tests focusing on:

- Error handling edge cases
- Internationalization fallbacks
- Logger output formatting
- Runtime compatibility

When adding new core utilities, ensure they:

1. Have no external dependencies
2. Are fully typed
3. Include JSDoc documentation
4. Have corresponding tests
