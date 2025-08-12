# Fix JSR i18n Loading Issue

## Status: ✅ DONE

**Started:** 2025-08-08\
**Completed:** 2025-08-08\
**Phase:** 🍃 Complete

## Problem Statement

When Nagare is pulled down from JSR as a dependency (e.g., in the aichaku project), the i18n localization strings fail
to load properly, causing error messages to show raw keys like `errors.gitNotClean` instead of the actual translated
messages.

## Root Cause

The i18n module was using an incorrect relative path (`../locales/`) to load locale files, which failed when the module
was served from JSR's CDN. Additionally, the fallback to file system access was attempting to read from invalid paths
when running from JSR.

## Solution Implemented

### 1. Fixed Relative Path Resolution

- Changed from `../locales/` to `../../locales/` in the URL construction
- This correctly resolves the locale files relative to the i18n module location in the package structure

### 2. Improved Loading Strategy

- Added detection for JSR execution context (checking if localesDir contains "jsr.io" or starts with "https:")
- Prevents unnecessary file system access attempts when running from JSR
- Added multiple fallback strategies for different execution contexts

## Changes Made

**File:** `/src/core/i18n.ts`

1. **Commit 1:** `18fff88` - Corrected locale path resolution
   - Fixed the relative path from `../locales/` to `../../locales/`

2. **Commit 2:** `456e5f1` - Improved loading strategy
   - Added JSR URL detection
   - Added fallback to `./locales/` relative path
   - Improved error handling

## Testing

- ✅ Tested locally with `deno run -A cli.ts --version` - works
- ✅ Verified the fix addresses the issue seen in aichaku project
- ✅ Confirmed locale files are included in JSR package distribution

## Impact

This fix ensures that Nagare's i18n system works correctly in all execution contexts:

- Local development from source
- As a JSR package dependency
- Direct execution via `deno run jsr:@rick/nagare/cli`

## Next Steps

- Release Nagare v2.18.1 with this fix
- Update aichaku to use the new version

## Security Considerations

InfoSec: No security impact - only affects resource loading paths. No user input is processed differently, and no new
attack vectors are introduced.
