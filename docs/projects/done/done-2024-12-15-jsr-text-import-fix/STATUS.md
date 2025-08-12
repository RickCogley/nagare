# Project Status: JSR Text Import Fix

**Status**: ✅ COMPLETE\
**Completed**: 2024-12-15\
**Type**: Infrastructure Update

## Summary

Implemented a workaround for JSR's lack of support for text imports, enabling nagare to continue using embedded
templates while remaining compatible with JSR publishing.

## Problem Solved

- JSR doesn't support importing text files (e.g., `import template from "./template.vento" with { type: "text" }`)
- This prevented nagare from being published to JSR
- Embedded Vento templates were essential for the template processor functionality

## Solution Implemented

- Created `inline-templates.ts` build script to inline text imports at build time
- Script reads template files and generates TypeScript modules with the content as string literals
- Integrated into the release workflow before JSR publishing
- Maintained development experience with actual text imports locally

## Technical Details

- Build script processes all `.vento` template files
- Generates corresponding `.ts` files with exported string constants
- Updates imports automatically during build process
- Preserves template syntax highlighting in development

## Files Created/Modified

- `scripts/inline-templates.ts` - Build script for inlining templates
- `src/template-processor.ts` - Updated to use generated imports
- `.github/workflows/publish-to-jsr.yml` - Added build step
- Template files converted during build process

## Impact

- Nagare can now be published to JSR successfully
- Development workflow remains unchanged
- Template files stay as `.vento` for proper syntax highlighting
- Build process handles the conversion automatically
- No runtime performance impact
