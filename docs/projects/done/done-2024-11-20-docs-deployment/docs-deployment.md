# Documentation Deployment Guide

This guide explains how to deploy Nagare's documentation and handle the URL compatibility issues
with Deno Deploy.

## The Problem

`deno doc` generates documentation with a `~` character in URLs for exported symbols (e.g.,
`/src/file-handlers.ts/~/BUILT_IN_HANDLERS.html`). While these URLs work locally, Deno Deploy may
have issues serving files with `~` in the path.

## Solutions Implemented

### 1. URL Rewriting in docs-server.ts

The documentation server (`docs-server.ts`) now includes URL rewriting logic to handle `~`
characters:

- Decodes URL-encoded tildes (`%7E` → `~`)
- Attempts alternative encodings if the initial request fails
- Supports redirect mappings for migrated URLs

### 2. Post-Processing Script (fix-docs-urls.ts)

A new script that renames `~` directories to `__SYMBOLS__` for better URL compatibility:

```bash
# Run after generating docs
deno task docs:fix-urls
```

This script:

- Renames all `~` directories to `__SYMBOLS__`
- Updates all HTML files to use the new paths
- Creates a `redirects.json` file for backward compatibility

### 3. Enhanced Build Process

The documentation build process now includes URL fixing:

```bash
# Full documentation build with URL fixes
deno task docs:build
```

This runs:

1. `deno doc` - Generate HTML documentation
2. `enhance-docs.ts` - Add custom styling and navigation
3. `fix-docs-urls.ts` - Fix URLs for Deno Deploy compatibility

## Deployment Steps

1. **Generate Documentation**:
   ```bash
   deno task docs:build
   ```

2. **Test Locally**:
   ```bash
   deno task docs:serve
   # Visit http://localhost:8080
   ```

3. **Deploy to Deno Deploy**:
   - Push changes to your repository
   - In Deno Deploy, set the entry point to `docs-server.ts`
   - The server will automatically handle URL rewriting and redirects

## Alternative Approaches

If the URL rewriting doesn't fully resolve the issue, consider:

1. **Custom HTML Generation**: Use `deno doc --json` and generate custom HTML without `~` characters
2. **Static Hosting**: Use a traditional static hosting service that handles special characters
   differently
3. **Path Remapping**: Configure a CDN or proxy to rewrite URLs before they reach Deno Deploy

## Security Considerations

All URL handling includes security measures:

- Path traversal protection in `fix-docs-urls.ts`
- Secure redirect handling in `docs-server.ts`
- Content Security Policy headers for documentation pages

InfoSec: URL rewriting prevents directory traversal attacks by validating all paths remain within
the docs directory.
