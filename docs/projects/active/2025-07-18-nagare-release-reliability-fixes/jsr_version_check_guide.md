# How to Check Latest Package Versions on JSR.io

This guide shows you how to programmatically verify the latest version of packages hosted on JSR (JavaScript Registry).

## Quick Start

Use the JSR REST API to get the latest version information:

```bash
curl "https://jsr.io/api/scopes/{scope}/packages/{package}"
```

**Example:**
```bash
curl "https://jsr.io/api/scopes/std/packages/path"
```

## Methods

### Method 1: JSR REST API (Recommended)

The JSR API provides direct access to package metadata through HTTP requests.

**Endpoint:** `https://jsr.io/api/scopes/{scope}/packages/{package}`

**JavaScript implementation:**
```javascript
async function getLatestVersion(scope, packageName) {
  const response = await fetch(`https://jsr.io/api/scopes/${scope}/packages/${packageName}`);
  const data = await response.json();
  return data.latest;
}

// Usage
const version = await getLatestVersion('std', 'path');
console.log(version); // Output: "1.0.2"
```

**Python implementation:**
```python
import requests

def get_latest_version(scope, package_name):
    url = f"https://jsr.io/api/scopes/{scope}/packages/{package_name}"
    response = requests.get(url)
    data = response.json()
    return data['latest']

# Usage
version = get_latest_version('std', 'path')
print(version)  # Output: 1.0.2
```

### Method 2: JSR CLI

Install and use the official JSR command-line interface.

**Installation:**
```bash
npm install -g @jsr/cli
```

**Usage:**
```bash
jsr info @std/path
```

### Method 3: Version History Endpoint

For comprehensive version information, including release history:

```bash
curl "https://jsr.io/api/scopes/{scope}/packages/{package}/versions"
```

This endpoint returns an array of all published versions with timestamps and metadata.

## Comparison

| Method | Speed | Dependencies | Output Format | Best For |
|--------|-------|--------------|---------------|----------|
| REST API | Fast | None | JSON | Automated scripts, CI/CD |
| JSR CLI | Moderate | Node.js | Human-readable | Interactive use, debugging |
| Version History | Fast | None | JSON Array | Version analysis, auditing |

## Use Cases

**Automated Dependency Updates:**
```javascript
// Check if local package needs updating
const currentVersion = "1.0.1";
const latestVersion = await getLatestVersion('std', 'path');

if (currentVersion !== latestVersion) {
  console.log(`Update available: ${currentVersion} → ${latestVersion}`);
}
```

**CI/CD Integration:**
```bash
#!/bin/bash
LATEST=$(curl -s "https://jsr.io/api/scopes/std/packages/path" | jq -r '.latest')
echo "Latest version: $LATEST"
```

## Error Handling

Always implement proper error handling for network requests:

```javascript
async function getLatestVersionSafe(scope, packageName) {
  try {
    const response = await fetch(`https://jsr.io/api/scopes/${scope}/packages/${packageName}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.latest;
  } catch (error) {
    console.error('Failed to fetch version:', error);
    return null;
  }
}
```

## Rate Limiting

JSR doesn't publish specific rate limits, but follow these best practices:
- Cache results when possible
- Implement exponential backoff for retries
- Avoid making excessive concurrent requests

## Reference

- [JSR API Documentation](https://jsr.io/docs/api)
- [JSR CLI Repository](https://github.com/jsr-io/jsr-cli)