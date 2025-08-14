# Testing Guidelines for Nagare

## Overview

This document outlines the testing strategy and best practices for the Nagare project. Following these guidelines
ensures consistent, maintainable, and effective tests that provide confidence in our codebase.

## Testing Philosophy

### Pragmatic Testing Approach

We follow a pragmatic testing approach focused on:

- **Behavior over implementation** - Test what the code does, not how it does it
- **Critical path coverage** - Prioritize testing of business-critical functionality
- **Meaningful assertions** - Each test should verify actual behavior, not just make coverage numbers look good
- **Maintainability** - Tests should be easy to understand and update

### Coverage Targets

Based on component criticality:

| Component Type                                      | Target Coverage | Rationale                             |
| --------------------------------------------------- | --------------- | ------------------------------------- |
| Core Business Logic (ReleaseManager, GitOperations) | 80-85%          | Critical to application functionality |
| API/Public Interfaces                               | 80-90%          | External contracts must be reliable   |
| Utility Functions                                   | 70-80%          | Important but often straightforward   |
| UI Components                                       | 60-70%          | Visual testing often more valuable    |
| Configuration Files                                 | Minimal         | Low risk, low complexity              |
| Test Helpers/Mocks                                  | Excluded        | Support code, not production code     |

**Overall Target**: 49% minimum (CI requirement), 80% recommended

## Test Structure

### Test File Organization

```
src/
├── component.ts           # Production code
├── component_test.ts      # Unit tests (colocated)
└── component_test_helper.ts # Test utilities (if needed)

tests/
├── integration/          # Integration tests
├── e2e/                  # End-to-end tests
└── fixtures/             # Test data and fixtures
```

### Test Naming Conventions

```typescript
// Test suite names describe the component
Deno.test("ComponentName - method or feature being tested", async () => {
  // Test implementation
});

// Use descriptive sub-tests for multiple scenarios
Deno.test("GitOperations - commit analysis", async (t) => {
  await t.step("parses conventional commits", async () => {
    // Test implementation
  });

  await t.step("handles non-conventional commits", async () => {
    // Test implementation
  });
});
```

## Writing Effective Tests

### 1. Use Proper Mocking

Mock external dependencies to isolate the unit under test:

```typescript
// Mock Deno.Command for git operations
const originalCommand = Deno.Command;
(Deno as any).Command = class MockCommand {
  constructor(public cmd: string, public options?: any) {}
  output() {
    return Promise.resolve({
      success: true,
      stdout: new TextEncoder().encode("mock output"),
      stderr: new TextEncoder().encode(""),
      code: 0,
    });
  }
};

// Don't forget to restore after test
try {
  // Test code
} finally {
  (Deno as any).Command = originalCommand;
}
```

### 2. Test Helpers and Factories

Create reusable test utilities:

```typescript
// Test data factories
export function createTestConfig(overrides?: Partial<NagareConfig>): NagareConfig {
  return {
    ...DEFAULT_CONFIG,
    project: {
      name: "test-project",
      repository: "https://github.com/test/test",
      ...overrides?.project,
    },
    ...overrides,
  };
}

// Mock dependencies factory
export function createMockDeps(config: NagareConfig, state?: TestState) {
  return {
    git: new MockGitOperations(state?.gitState),
    fileHandler: new MockFileHandler(state?.files),
    logger: new MockLogger(),
    // ... other mocks
  };
}
```

### 3. Test All Code Paths

Ensure both success and failure paths are tested:

```typescript
Deno.test("handles success case", async () => {
  const result = await functionUnderTest(validInput);
  assertEquals(result.success, true);
  assertEquals(result.value, expectedValue);
});

Deno.test("handles error case", async () => {
  await assertRejects(
    async () => await functionUnderTest(invalidInput),
    NagareError,
    "Expected error message",
  );
});
```

### 4. Boundary Testing

Test edge cases and boundary conditions:

```typescript
Deno.test("handles version 0.x.x correctly", async () => {
  // In 0.x.x, breaking changes bump minor, not major
  const result = await calculateVersion("0.5.0", BumpType.BREAKING);
  assertEquals(result, "0.6.0");
});

Deno.test("handles empty input", async () => {
  const result = await processCommits([]);
  assertEquals(result.bumpType, BumpType.PATCH); // Default behavior
});
```

## Testing Patterns

### Async Testing

Always properly handle async operations:

```typescript
// ✅ Good - Properly awaited
Deno.test("async operation", async () => {
  const result = await asyncFunction();
  assertEquals(result, expected);
});

// ❌ Bad - Missing await
Deno.test("async operation", () => {
  asyncFunction().then((result) => {
    assertEquals(result, expected);
  });
});
```

### Spies and Stubs

Use Deno's testing utilities for spying and stubbing:

```typescript
import { spy, stub } from "@std/testing/mock";

Deno.test("tracks function calls", () => {
  const mySpy = spy();
  functionThatCallsCallback(mySpy);

  assertEquals(mySpy.calls.length, 1);
  assertEquals(mySpy.calls[0].args[0], expectedArg);
});
```

### Resource Management

Ensure proper cleanup of resources:

```typescript
Deno.test({
  name: "test with resources",
  sanitizeResources: false, // Only if necessary
  sanitizeOps: false, // Only if necessary
  fn: async () => {
    const tempDir = await Deno.makeTempDir();
    try {
      // Test code using tempDir
    } finally {
      await Deno.remove(tempDir, { recursive: true });
    }
  },
});
```

## Running Tests

### Basic Commands

```bash
# Run all tests
deno test

# Run with permissions
deno test --allow-read --allow-write --allow-env --allow-run

# Run specific test file
deno test src/release/release-manager_test.ts

# Run with coverage
deno test --coverage=coverage

# Generate coverage report
deno coverage coverage --html
```

### Deno Tasks

Use the predefined tasks in `deno.json`:

```bash
# Run tests with proper flags
deno task test

# Run tests with coverage
deno task test:coverage

# Generate coverage reports
deno task coverage:generate

# Run tests in watch mode
deno task test:watch
```

## CI/CD Integration

### Quality Gates

The CI pipeline enforces:

- **Minimum coverage**: 49% (will fail build if below)
- **No test failures**: All tests must pass
- **Type checking**: Tests must pass strict type checking

### Test Exclusions in CI

Some integration tests may be skipped in CI:

```typescript
Deno.test({
  ignore: Deno.env.get("CI") === "true",
  name: "integration test requiring real git repo",
  fn: async () => {
    // Test that requires actual git operations
  },
});
```

## Common Pitfalls to Avoid

### 1. Testing Implementation Details

```typescript
// ❌ Bad - Tests internal implementation
test("uses Array.push", () => {
  const spy = spyOn(Array.prototype, "push");
  addItem(list, item);
  expect(spy).toHaveBeenCalled();
});

// ✅ Good - Tests behavior
test("adds item to list", () => {
  const list = ["apple"];
  addItem(list, "banana");
  expect(list).toContain("banana");
});
```

### 2. Overmocking

Don't mock what you're testing:

```typescript
// ❌ Bad - Mocking the system under test
const mockReleaseManager = new MockReleaseManager();
test("release manager", () => {
  mockReleaseManager.release();
  expect(mockReleaseManager.releaseCalled).toBe(true);
});

// ✅ Good - Testing actual behavior with mocked dependencies
test("release manager", () => {
  const mockGit = new MockGitOperations();
  const manager = new ReleaseManager(config, { git: mockGit });
  const result = manager.release();
  expect(result.success).toBe(true);
});
```

### 3. Ignoring Async Errors

Always handle async errors properly:

```typescript
// ✅ Good - Properly catches async errors
await assertRejects(
  async () => await functionThatThrows(),
  Error,
  "Expected error",
);
```

## Debugging Tests

### Verbose Output

```bash
# Run with debug logging
deno test --log-level=DEBUG

# Run specific test with verbose output
deno test --filter "test name" src/file_test.ts
```

### Using Debugger

```typescript
Deno.test("debug this test", async () => {
  debugger; // Breakpoint when running with --inspect
  const result = await complexFunction();
  assertEquals(result, expected);
});
```

Run with debugger:

```bash
deno test --inspect-brk
```

## Best Practices Summary

1. **Test behavior, not implementation**
2. **Mock external dependencies, not the system under test**
3. **Write clear, descriptive test names**
4. **Keep tests focused and isolated**
5. **Clean up resources after tests**
6. **Use test helpers to reduce duplication**
7. **Test both success and failure paths**
8. **Include edge cases and boundary conditions**
9. **Maintain tests alongside code changes**
10. **Run tests locally before pushing**

## Maintaining Test Quality

### Regular Review

- Review test coverage reports monthly
- Refactor tests when they become brittle
- Update tests when requirements change
- Remove obsolete tests

### Documentation

- Document complex test setups
- Explain non-obvious assertions
- Keep this guide updated with new patterns

## Resources

- [Deno Testing Documentation](https://deno.land/manual/testing)
- [Test Coverage Guide](./test-coverage-guide.md)
- [Deno Standard Testing Module](https://deno.land/std/testing)

---

_Last Updated: 2025-08-14_ _Maintained by: Nagare Development Team_
