# Validation Module

## Purpose

Security-first input validation and permission management. All user inputs and file operations go through this module
for OWASP-compliant validation.

## Key Components

- **validators.ts** - Type guards and validation functions for CLI arguments
- **security-utils.ts** - Path validation, input sanitization, security checks
- **permission-manager.ts** - Deno runtime permission management
- **security-utils_test.ts** - Security validation test suite

## Security Standards

This module implements OWASP Top 10 protections:

- **A03: Injection** - Input sanitization, parameterized commands
- **A01: Access Control** - Path traversal prevention, permission checks
- **A05: Security Misconfiguration** - Secure defaults, validation

## Key Functions

### validators.ts

- `validateReleaseType()` - Validates "major", "minor", "patch"
- `validateVersion()` - Semantic version validation
- `validateFilePath()` - Path traversal prevention
- `validateGitRef()` - Git reference sanitization
- Result<T, E> type for explicit error handling

### security-utils.ts

- `sanitizeErrorMessage()` - Remove sensitive data from errors
- `validateFilePath()` - Prevent directory traversal
- `sanitizeGitRef()` - Prevent command injection in git
- `validateTemplateInput()` - Template injection prevention

### permission-manager.ts

- `checkAllPermissions()` - Verify Deno runtime permissions
- `requestMissingPermissions()` - Interactive permission requests
- Provides helpful error messages for missing permissions

## Usage Pattern

```typescript
import { validateReleaseType, validateVersion } from "../validation/validators.ts";
import { sanitizeErrorMessage, validateFilePath } from "../validation/security-utils.ts";
import { permissionManager } from "../validation/permission-manager.ts";

// Always validate user input
const result = validateReleaseType(userInput);
if (!result.success) {
  throw new Error(sanitizeErrorMessage(result.error));
}
```

## InfoSec Requirements

All validation functions must:

1. **Whitelist, not blacklist** - Only allow known-good patterns
2. **Fail securely** - Default to rejection on validation errors
3. **Log attempts** - Record validation failures for security monitoring
4. **Sanitize errors** - Never expose internal paths or sensitive data

## Testing Focus

- Path traversal attempts (../, ..\, absolute paths)
- Command injection patterns (; | & ` $ etc.)
- Null byte injection (\0)
- Long input DoS attempts
- Unicode normalization attacks
