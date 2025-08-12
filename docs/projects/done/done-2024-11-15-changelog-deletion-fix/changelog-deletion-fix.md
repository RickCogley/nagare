# CHANGELOG.md Deletion Issue - Explanation and Fix

## The Problem

Your `CHANGELOG.md` file was being deleted when running tests. This happened because:

1. The `tests/changelog-generator_test.ts` file was using the **actual project's CHANGELOG.md** for testing
2. The test had a `cleanup()` function that would delete `./CHANGELOG.md` after each test
3. If tests failed or were interrupted (like during your API error), the file would remain deleted

## The Root Cause

```typescript
// OLD CODE - DANGEROUS!
async function cleanup(path = "./CHANGELOG.md"): Promise<void> {
  try {
    await Deno.remove(path); // This deletes the actual project file!
  } catch {
    // Ignore if file doesn't exist
  }
}
```

Tests were calling `cleanup()` which would delete your actual CHANGELOG.md file.

## The Fix

I've rewritten the test file to:

1. **Use temporary directories** for each test
2. **Change to the temp directory** before running tests
3. **Always restore the original directory** after tests
4. **Clean up temp directories** instead of project files

```typescript
// NEW CODE - SAFE!
await t.step("test name", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "nagare-changelog-test-" });
  const originalCwd = Deno.cwd();

  try {
    Deno.chdir(tempDir); // Work in temp directory
    // ... run test ...
  } finally {
    Deno.chdir(originalCwd); // Always restore original directory
    await Deno.remove(tempDir, { recursive: true }); // Clean up temp dir
  }
});
```

## Why This Happened

- Tests should **NEVER** modify actual project files
- Tests should use isolated temporary directories
- The original test was written to operate in the project root directory

## Prevention

1. **Always use temporary directories** for file-based tests
2. **Use try/finally blocks** to ensure cleanup happens even if tests fail
3. **Restore original state** after tests complete
4. **Never hardcode project file paths** in tests

## Immediate Action

Your CHANGELOG.md has been restored from git. The test file has been fixed to prevent this from happening again.

## Testing the Fix

The tests now run successfully without touching your project files. Some tests are failing due to duplicate detection
logic, but that's a separate issue unrelated to the file deletion problem.
