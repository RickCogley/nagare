# Simple Test Coverage Improvement Plan

## Current Situation

- Coverage: ~36%
- Many tests fail due to mocking issues
- Subprocess tests don't track coverage properly
- Complex tests timeout and provide no value

## New Approach: Simple, Direct Testing

### Core Principle

**Test functions directly, not through subprocesses**

### Step 1: Identify Testable Pure Functions

Focus on functions that:

- Take inputs and return outputs
- Don't require filesystem/git operations
- Can be tested without mocks

Priority targets:

1. `src/utils/utils.ts` - String manipulation, path utilities
2. `src/release/version-utils.ts` - Version parsing and incrementing
3. `src/core/enhanced-error.ts` - Error creation and formatting
4. `src/validation/security-utils.ts` - Input validation functions
5. `src/templates/template-processor.ts` - Template variable replacement

### Step 2: Write Simple Unit Tests

#### Test Template

```typescript
import { assertEquals, assertThrows } from "@std/assert";
import { functionToTest } from "../src/module.ts";

Deno.test("functionToTest - handles normal input", () => {
  const result = functionToTest("input");
  assertEquals(result, "expected");
});

Deno.test("functionToTest - handles edge case", () => {
  const result = functionToTest("");
  assertEquals(result, "");
});
```

### Step 3: Refactor for Testability

For functions that currently require complex setup:

1. Extract pure logic into separate functions
2. Pass dependencies as parameters
3. Return results instead of side effects

Example refactor:

```typescript
// BEFORE - Hard to test
async function updateFile() {
  const content = await Deno.readTextFile("file.txt");
  const updated = content.replace(/old/, "new");
  await Deno.writeTextFile("file.txt", updated);
}

// AFTER - Easy to test
function updateContent(content: string): string {
  return content.replace(/old/, "new");
}

async function updateFile() {
  const content = await Deno.readTextFile("file.txt");
  const updated = updateContent(content); // Test this function
  await Deno.writeTextFile("file.txt", updated);
}
```

### Step 4: Implementation Order

#### Phase 1: Pure Functions (No I/O)

1. **version-utils.ts**
   - `incrementVersion(version, type)`
   - `parseVersion(versionString)`
   - `compareVersions(v1, v2)`

2. **security-utils.ts**
   - `sanitizePath(path)`
   - `validateInput(input, rules)`
   - `escapeHtml(text)`

3. **utils.ts**
   - `formatBytes(bytes)`
   - `truncateString(str, length)`
   - `parseFlags(args)`

#### Phase 2: Functions with Simple Dependencies

1. **enhanced-error.ts**
   - `createError(code, message)`
   - `formatError(error)`

2. **template-processor.ts**
   - `replaceVariables(template, vars)`
   - `parseTemplate(template)`

#### Phase 3: Integration Tests (Keep Simple)

1. **Config loading** - Test with temp files
2. **Git operations** - Mock command output only
3. **File handlers** - Test detection logic, not actual file ops

### Success Criteria

- Each test file runs in < 5 seconds
- No test requires actual git operations
- No test modifies real files
- All tests pass consistently
- Coverage increases incrementally

### What NOT to Do

❌ Don't create complex test orchestrators ❌ Don't test CLI through subprocess execution ❌ Don't create comprehensive
test files with 50+ tests ❌ Don't mock entire modules ❌ Don't test implementation details

### Measuring Progress

Run after each test file:

```bash
deno test --coverage=coverage
deno coverage coverage --exclude="test" --exclude=".*test.*"
```

Target: Add 5-10% coverage per phase

### Next Immediate Action

1. Create `tests/version-utils_simple_test.ts`
2. Test 3-5 pure functions
3. Verify tests pass
4. Check coverage improvement
5. Repeat for next module
