# JSR.io REST API Authentication Guide

This guide explains when authentication is required for JSR.io REST API operations and how to implement it correctly.

## Quick Reference

| Operation               | Authentication Required | API Type       |
| ----------------------- | ----------------------- | -------------- |
| Check package versions  | ❌ No                   | Registry API   |
| Get package metadata    | ❌ No                   | Registry API   |
| Download packages       | ❌ No                   | Registry API   |
| Publish packages        | ✅ Yes                  | Management API |
| User account operations | ✅ Yes                  | Management API |

## No Authentication Required

### Registry API Operations

Most common operations, including version checking, require **no authentication**:

```bash
# Get package information - no auth needed
curl "https://jsr.io/api/scopes/std/packages/path"

# Get version history - no auth needed  
curl "https://jsr.io/api/scopes/std/packages/path/versions"

# Get specific version metadata - no auth needed
curl "https://jsr.io/api/scopes/std/packages/path/1.0.2"
```

**JavaScript example:**

```javascript
// No authentication required for reading package data
async function getPackageInfo(scope, packageName) {
  const response = await fetch(`https://jsr.io/api/scopes/${scope}/packages/${packageName}`);
  return await response.json();
}

const packageInfo = await getPackageInfo("std", "path");
console.log(`Latest version: ${packageInfo.latest}`);
```

### When No Auth is Sufficient

Use the unauthenticated Registry API for:

- Version checking and monitoring
- Package discovery and browsing
- Downloading packages for consumption
- CI/CD dependency resolution
- Public package analysis tools

## Authentication Required

### Management API Operations

Publishing and user management operations require authentication:

```bash
# Publishing requires authentication
curl -X POST "https://api.jsr.io/packages" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"scope": "myorg", "package": "mypackage"}'
```

### Authentication Methods

JSR supports three token types:

1. **Short-lived device access tokens** - For user authentication
2. **Bearer tokens** - Standard API tokens
3. **GitHub OIDC tokens** - For CI/CD integration

**Example with Bearer token:**

```javascript
async function publishPackage(token, packageData) {
  const response = await fetch("https://api.jsr.io/packages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "MyTool/1.0.0",
    },
    body: JSON.stringify(packageData),
  });

  return await response.json();
}
```

### When Authentication is Required

Use the authenticated Management API for:

- Publishing new packages
- Managing package permissions
- User account operations
- Administrative functions
- Tools that act on behalf of users

## Best Practices

### API Selection

**Registry API (No Auth):**

- Use for all read-only operations
- Faster and simpler implementation
- No rate limiting concerns
- Preferred for public tools

**Management API (Auth Required):**

- Only for write operations and user management
- Requires proper token management
- Should include User-Agent header
- Monitor for rate limiting

### Security Considerations

**Token Storage:**

```javascript
// Good: Environment variables
const token = process.env.JSR_TOKEN;

// Bad: Hardcoded tokens
const token = "jsr_abc123..."; // Never do this
```

**Error Handling:**

```javascript
async function authenticatedRequest(endpoint, token) {
  try {
    const response = await fetch(endpoint, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (response.status === 401) {
      throw new Error("Invalid or expired token");
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Authentication failed:", error.message);
    throw error;
  }
}
```

### User-Agent Requirements

Management API requests should identify the calling tool:

```javascript
const headers = {
  "User-Agent": "MyTool/1.2.0 (https://example.com/contact)",
  "Authorization": `Bearer ${token}`,
};
```

## Migration Notes

If you're currently using authenticated requests for read operations:

**Before (unnecessary auth):**

```javascript
// Wasteful - auth not needed for reading
const response = await fetch("https://api.jsr.io/scopes/std/packages/path", {
  headers: { "Authorization": `Bearer ${token}` },
});
```

**After (optimized):**

```javascript
// Better - no auth needed for Registry API
const response = await fetch("https://jsr.io/api/scopes/std/packages/path");
```

## Reference

- [JSR API Documentation](https://jsr.io/docs/api)
- [OpenAPI Specification](https://api.jsr.io/.well-known/openapi)
- [API Reference](https://jsr.io/docs/api-reference)

For questions about API usage, contact: help@jsr.io
