# Utils Module

## Purpose

General-purpose utilities and CLI helpers with minimal dependencies. These functions support various operations
throughout Nagare.

## Key Components

- **utils.ts** - Shell command execution, file operations, general helpers
- **cli-utils.ts** - CLI output formatting, prompts, user interaction
- **std-progress-indicator.ts** - Terminal progress bars and spinners

## Dependencies

Can import from:

- `core/` - For logging, errors, i18n

Cannot import from:

- Other module folders (to avoid circular dependencies)

## Key Functions

### utils.ts

- `runCommand()` - Safe shell command execution with timeout
- `sanitizeForShell()` - Prevent shell injection attacks
- `ensureDir()` - Safe directory creation
- `readJsonFile()` - Type-safe JSON reading

### cli-utils.ts

- `print()` - Internationalized console output
- `printSuccess()`, `printError()`, `printWarning()` - Styled messages
- `confirmI18n()` - Internationalized confirmation prompts

### std-progress-indicator.ts

- Progress bars for long operations
- Spinners for indeterminate operations
- Marine-themed animations (waves 🌊)

## Security Considerations

- All shell commands are sanitized to prevent injection
- File paths are validated before operations
- User input is validated and sanitized

## Usage Pattern

```typescript
import { runCommand, sanitizeForShell } from "../utils/utils.ts";
import { confirmI18n, printSuccess } from "../utils/cli-utils.ts";
```

## Testing

Focus on:

- Shell command sanitization
- Error handling for failed commands
- Progress indicator visual output
- CLI prompt handling
