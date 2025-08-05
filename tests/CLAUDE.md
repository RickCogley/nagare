# /tests Directory - Test Suite

## Purpose

This directory contains comprehensive test coverage for Nagare, following Test-Driven Development (TDD) principles.
Tests ensure reliability, security, and maintainability of the release management system.

## Test Organization

### Unit Tests

Individual component testing with mocked dependencies:

- **release-manager.test.ts** - Core release orchestration logic
  - Release flow validation
  - Dry-run mode verification
  - Error handling scenarios
  - State management tests

- **file-handlers.test.ts** - File update system testing
  - File type detection accuracy
  - Version replacement patterns
  - File integrity preservation
  - Edge case handling

- **git-operations.test.ts** - Git command testing
  - Commit analysis logic
  - Version bump detection
  - Command execution mocking
  - Repository state validation

- **template-processor.test.ts** - Template engine testing
  - Variable interpolation
  - Security sandboxing
  - Template compilation
  - Error handling

- **security-utils.test.ts** - Security testing (OWASP focused)
  - Input sanitization
  - Path traversal prevention
  - Command injection protection
  - Template variable safety

- **version-utils.test.ts** - Version manipulation testing
  - Semver parsing
  - Version incrementing
  - Comparison logic
  - Prerelease handling

### Integration Tests

- **integration/release-flow.test.ts** - End-to-end release testing
  - Complete release cycles
  - Rollback scenarios
  - Multi-file updates
  - GitHub integration

- **integration/cli.test.ts** - CLI interface testing
  - Command parsing
  - Flag combinations
  - Interactive prompts
  - Output formatting

### Security Tests

- **security/owasp-compliance.test.ts** - OWASP Top 10 coverage
  - A01: Access Control
  - A03: Injection attacks
  - A04: Insecure Design
  - A09: Security Logging

## Test Infrastructure

### Mocking Strategy

```typescript
// Mock filesystem operations
const mockFS = {
  readTextFile: spy(),
  writeTextFile: spy(),
  exists: spy(),
};

// Mock git commands
const mockGit = {
  exec: spy().returns({ success: true, stdout: "" }),
};
```

### Test Fixtures

- **fixtures/** - Sample files for testing
  - Various config formats
  - Template examples
  - Commit histories
  - Error scenarios

### Test Utilities

- **utils/test-helpers.ts** - Common test utilities
  - Factory functions
  - Assertion helpers
  - Mock builders
  - Setup/teardown helpers

## Testing Patterns

### AAA Pattern

All tests follow Arrange-Act-Assert:

```typescript
Deno.test("should increment patch version", () => {
  // Arrange
  const version = "1.2.3";

  // Act
  const result = incrementVersion(version, "patch");

  // Assert
  assertEquals(result, "1.2.4");
});
```

### Descriptive Naming

```typescript
Deno.test("should return error when git working directory is not clean", ...);
Deno.test("should successfully rollback to previous version after failed release", ...);
```

### Security Test Focus

```typescript
Deno.test("should prevent path traversal in template names", () => {
  const maliciousPath = "../../../etc/passwd";
  const result = sanitizeTemplatePath(maliciousPath);
  assertEquals(result.isErr(), true);
  assertEquals(result.error.code, "INVALID_PATH");
});
```

## Coverage Requirements

### Target Coverage

- Overall: 80%+ coverage
- Critical paths: 95%+ coverage
- Security functions: 100% coverage

### Coverage Areas

1. **Happy paths** - Normal operation flows
2. **Error paths** - All error conditions
3. **Edge cases** - Boundary conditions
4. **Security cases** - Attack scenarios
5. **Integration points** - External interactions

## Running Tests

### All Tests

```bash
deno test --allow-read --allow-write --allow-run
```

### Specific Categories

```bash
# Unit tests only
deno test tests/unit/

# Security tests
deno test tests/security/

# With coverage
deno test --coverage=coverage
```

### Watch Mode

```bash
deno test --watch
```

## Test Data Management

### Temporary Files

- Created in temp directories
- Cleaned up after each test
- Never modify actual project files

### Git Repository Mocking

- Mock git commands return predefined responses
- Test various repository states
- Simulate error conditions

## Performance Testing

### Benchmarks

- **benchmarks/** - Performance tests
  - File processing speed
  - Template rendering time
  - Large commit history handling
  - Memory usage patterns

### Load Testing

- Multiple file updates
- Large changelog generation
- Concurrent operations

## CI/CD Integration

### Pre-commit

- Run affected tests
- Verify no broken tests
- Check coverage thresholds

### Pull Request

- Full test suite
- Coverage reports
- Performance regression checks

### Release

- Extended test suite
- Cross-platform verification
- Integration with real services

## Common Test Scenarios

### Release Scenarios

1. First release (no previous version)
2. Patch/Minor/Major releases
3. Prerelease versions
4. Rollback after failure
5. Retry failed releases

### Error Scenarios

1. Dirty git working directory
2. Invalid version formats
3. Missing configuration
4. Network failures
5. Permission errors

### Security Scenarios

1. Malicious template paths
2. Command injection attempts
3. XXE in XML parsing
4. Path traversal attempts
5. Resource exhaustion

## Test Maintenance

### Adding New Tests

1. Write failing test first (TDD)
2. Implement minimal code to pass
3. Refactor while keeping tests green
4. Add edge cases
5. Update coverage reports

### Test Review Checklist

- [ ] Tests are independent
- [ ] No hardcoded paths
- [ ] Proper cleanup
- [ ] Clear assertions
- [ ] Security considered

When writing tests:

1. Follow TDD red-green-refactor cycle
2. One assertion per test preferred
3. Mock external dependencies
4. Test behavior, not implementation
5. Consider security implications
