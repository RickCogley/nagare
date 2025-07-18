# NagareConfig Reference

## Overview

The NagareConfig interface defines all configuration options for Nagare. Configuration is typically provided via a `nagare.config.ts` file in your project root.

## Synopsis

```typescript
import type { NagareConfig } from '@rick/nagare';

export default {
  project: { /* required */ },
  versionFile: { /* required */ },
  // ... optional configurations
} as NagareConfig;
```

## Description

NagareConfig is the main configuration interface that controls all aspects of Nagare's behavior, from version file generation to release workflows. It requires minimal configuration (project info and version file) but supports extensive customization through optional properties.

## Configuration Properties

### `project` {#project}

**Type**: `object`  
**Required**: Yes  
**Properties**:
- `name` (string, required) - Project name
- `description` (string, optional) - Project description
- `repository` (string, required) - Repository URL
- `homepage` (string, optional) - Project homepage URL
- `license` (string, optional) - Project license (e.g., "MIT")
- `author` (string, optional) - Author information

Project metadata used in version files and release documentation.

**Example**:
```typescript
project: {
  name: 'My App',
  description: 'A fantastic Deno application',
  repository: 'https://github.com/user/my-app',
  homepage: 'https://my-app.deno.dev',
  license: 'MIT',
  author: 'Your Name'
}
```

### `versionFile` {#versionFile}

**Type**: `VersionFile`  
**Required**: Yes  
**Properties**:
- `path` (string, required) - Path to version file relative to project root
- `template` (TemplateFormat, required) - Template format: `"typescript"`, `"json"`, `"yaml"`, or `"custom"`
- `customTemplate` (string, optional) - Custom Vento template (required when template is `"custom"`)
- `additionalExports` (AdditionalExport[], optional) - Additional exports to include
- `extend` (object, optional) - Content to prepend/append to generated file
- `patterns` (object, deprecated) - Legacy regex patterns for version extraction

Configures how version files are generated.

**Example with built-in template**:
```typescript
versionFile: {
  path: './version.ts',
  template: 'typescript'
}
```

**Example with custom template**:
```typescript
versionFile: {
  path: './version.js',
  template: 'custom',
  customTemplate: `
    export const VERSION = "{{ version }}";
    export const BUILD_DATE = "{{ buildDate }}";
  `
}
```

### `releaseNotes` {#releaseNotes}

**Type**: `ReleaseNotesConfig`  
**Required**: No  
**Default**: `{ includeCommitHashes: true, maxDescriptionLength: 100 }`  
**Properties**:
- `template` (string, optional) - Custom Vento template for release notes section
- `metadata` (Record<string, unknown>, optional) - App-specific metadata to include
- `includeCommitHashes` (boolean, optional) - Include git commit hashes (default: true)
- `maxDescriptionLength` (number, optional) - Max commit description length (default: 100)

Controls release notes generation and formatting.

**Example**:
```typescript
releaseNotes: {
  includeCommitHashes: true,
  maxDescriptionLength: 80,
  metadata: {
    features: ['Authentication', 'API'],
    endpoints: ['/api/v1', '/health']
  }
}
```

### `github` {#github}

**Type**: `GitHubConfig`  
**Required**: No  
**Properties**:
- `owner` (string, required) - Repository owner/organization
- `repo` (string, required) - Repository name
- `createRelease` (boolean, optional) - Create GitHub releases (default: true)
- `releaseTemplate` (string, optional) - Custom release template
- `tokenEnvVar` (string, optional) - Environment variable for token (default: "GITHUB_TOKEN")

GitHub integration settings for creating releases.

**Example**:
```typescript
github: {
  owner: 'myorg',
  repo: 'my-app',
  createRelease: true,
  tokenEnvVar: 'GH_TOKEN'
}
```

### `updateFiles` {#updateFiles}

**Type**: `FileUpdatePattern[]`  
**Required**: No  
**Properties per pattern**:
- `path` (string, required) - File path relative to project root
- `patterns` (object, optional) - Key-value regex patterns for find/replace
- `updateFn` (function, optional) - Custom update function

Additional files to update during release (beyond the version file).

**Example with safe patterns**:
```typescript
updateFiles: [
  {
    path: './deno.json',
    patterns: {
      // Line-anchored pattern prevents corruption
      version: /^(\s*)"version":\s*"([^"]+)"/m
    }
  },
  {
    path: './README.md',
    updateFn: (content, data) => {
      return content.replace(
        /Version: \d+\.\d+\.\d+/,
        `Version: ${data.version}`
      );
    }
  }
]
```

### `commitTypes` {#commitTypes}

**Type**: `CommitTypeMapping`  
**Required**: No  
**Default**: Standard conventional commit mappings  
**Properties**: Maps commit types to changelog sections

Custom mappings from conventional commit types to changelog sections.

**Example**:
```typescript
commitTypes: {
  feat: 'added',
  fix: 'fixed',
  perf: 'changed',
  security: 'security',
  breaking: 'removed'
}
```

### `templates` {#templates}

**Type**: `TemplateConfig`  
**Required**: No  
**Properties**:
- `templatesDir` (string, optional) - Directory for external template files
- `dataProviders` (Record<string, () => Promise<unknown>>, optional) - Dynamic data providers

Advanced template configuration.

**Example**:
```typescript
templates: {
  templatesDir: './templates',
  dataProviders: {
    buildMetrics: async () => ({
      size: await getBundleSize(),
      tests: await getTestCount()
    })
  }
}
```

### `docs` {#docs}

**Type**: `DocsConfig`  
**Required**: No  
**Properties**:
- `enabled` (boolean, required) - Enable documentation generation
- `outputDir` (string, optional) - Output directory (default: "./docs")
- `includePrivate` (boolean, optional) - Include private API (default: false)
- `denoDocOptions` (string[], optional) - Additional deno doc options

Documentation generation settings.

**Example**:
```typescript
docs: {
  enabled: true,
  outputDir: './docs/api',
  includePrivate: false,
  denoDocOptions: ['--html']
}
```

### `options` {#options}

**Type**: `ReleaseOptions`  
**Required**: No  
**Properties**:
- `dryRun` (boolean, optional) - Preview changes without applying
- `skipConfirmation` (boolean, optional) - Skip confirmation prompts
- `gitRemote` (string, optional) - Git remote name (default: "origin")
- `tagPrefix` (string, optional) - Git tag prefix (default: "v")
- `logLevel` (LogLevel, optional) - Log verbosity: DEBUG, INFO, WARN, ERROR

General release options.

**Example**:
```typescript
options: {
  tagPrefix: 'release-',
  gitRemote: 'upstream',
  logLevel: 'DEBUG'
}
```

### `security` {#security}

**Type**: `SecurityConfig`  
**Required**: No  
**Since**: 1.6.0  
**Properties**:
- `templateSandbox` ("strict" | "moderate" | "disabled", optional) - Template sandboxing level (default: "strict")
- `validateFilePaths` (boolean, optional) - Enable path validation (default: true)
- `auditLog` (boolean, optional) - Enable security audit logging (default: false)
- `allowedFunctions` (string[], optional) - Functions allowed in moderate mode
- `maxTemplateSize` (number, optional) - Max template size in bytes (default: 1MB)

Security configuration for template processing and file operations.

**Example**:
```typescript
security: {
  templateSandbox: 'strict',
  validateFilePaths: true,
  auditLog: true,
  maxTemplateSize: 524288 // 512KB
}
```

### `release` {#release}

**Type**: `ReleaseConfig`  
**Required**: No  
**Since**: 3.0.0  
**Properties**:
- `verifyJsrPublish` (boolean | JsrVerificationConfig, optional) - JSR publish verification
- `autoFix` (AutoFixConfig, optional) - Automatic error fixing
- `progress` (ProgressConfig, optional) - Progress visualization
- `monitoring` (MonitoringConfig, optional) - GitHub Actions monitoring
- `preflightChecks` (PreflightChecksConfig, optional) - Pre-release validation

Advanced release workflow configuration.

**Example**:
```typescript
release: {
  verifyJsrPublish: {
    enabled: true,
    maxAttempts: 30,
    pollInterval: 10000
  },
  autoFix: {
    basic: true,
    ai: {
      enabled: true,
      provider: 'claude-code',
      thinkingLevel: 'think'
    }
  },
  preflightChecks: {
    runTests: true,
    custom: [{
      name: 'Security Scan',
      command: ['deno', 'task', 'security'],
      fixable: false
    }]
  }
}
```

### `hooks` {#hooks}

**Type**: `object`  
**Required**: No  
**Since**: 1.1.0  
**Properties**:
- `preRelease` (Array<() => Promise<void>>, optional) - Functions to run before release
- `postRelease` (Array<() => Promise<void>>, optional) - Functions to run after release

Lifecycle hooks for custom operations.

**Example**:
```typescript
hooks: {
  preRelease: [
    async () => {
      const result = await runTests();
      if (!result.success) throw new Error("Tests failed");
    }
  ],
  postRelease: [
    async () => {
      await formatGeneratedFiles();
      await notifyTeam();
    }
  ]
}
```

### `locale` {#locale}

**Type**: `string`  
**Required**: No  
**Since**: 2.1.0  
**Default**: Auto-detected from environment  

Language for CLI output and messages (e.g., "en", "ja").

**Example**:
```typescript
locale: 'ja' // Use Japanese translations
```

## Complete Configuration Examples

### Minimal Configuration

```typescript
import type { NagareConfig } from '@rick/nagare';

export default {
  project: {
    name: 'My App',
    repository: 'https://github.com/user/my-app'
  },
  versionFile: {
    path: './version.ts',
    template: 'typescript'
  }
} as NagareConfig;
```

### Advanced Configuration with AI Features

```typescript
import type { NagareConfig } from '@rick/nagare';

export default {
  project: {
    name: 'Enterprise App',
    description: 'Production-grade application',
    repository: 'https://github.com/company/app',
    homepage: 'https://app.company.com',
    license: 'MIT',
    author: 'Company Inc.'
  },
  
  versionFile: {
    path: './src/version.ts',
    template: 'typescript',
    additionalExports: [{
      name: 'API_VERSION',
      type: 'const',
      value: 'v1',
      description: 'API version identifier'
    }]
  },
  
  releaseNotes: {
    includeCommitHashes: true,
    metadata: {
      apiEndpoints: ['/api/v1', '/health'],
      features: ['Auth', 'API', 'Websocket']
    }
  },
  
  github: {
    owner: 'company',
    repo: 'app',
    createRelease: true
  },
  
  updateFiles: [{
    path: './deno.json',
    patterns: {
      version: /^(\s*)"version":\s*"([^"]+)"/m
    }
  }],
  
  release: {
    verifyJsrPublish: true,
    autoFix: {
      basic: true,
      ai: {
        enabled: true,
        provider: 'claude-code',
        thinkingLevel: 'megathink',
        maxAttempts: 3
      }
    },
    preflightChecks: {
      runTests: true
    }
  },
  
  security: {
    templateSandbox: 'strict',
    auditLog: true
  },
  
  hooks: {
    postRelease: [
      async () => {
        console.log('Release completed!');
      }
    ]
  }
} as NagareConfig;
```

## Configuration Validation

Nagare validates configuration at startup. Common validation errors:

1. **Missing required fields**: `project.name` and `project.repository` are required
2. **Invalid template format**: Must be one of: typescript, json, yaml, custom
3. **Missing custom template**: When using `template: 'custom'`, `customTemplate` is required
4. **Invalid regex patterns**: Patterns that could cause file corruption are rejected
5. **Invalid export names**: Additional export names must be valid JavaScript identifiers

## Environment Variables

Some configuration options can be overridden by environment variables:

- `NAGARE_DEBUG`: Enable debug logging
- `NAGARE_LOCALE` or `NAGARE_LANG`: Set language (overridden by CLI `--lang`)
- `GITHUB_TOKEN` (or custom via `tokenEnvVar`): GitHub authentication
- `CI`: Affects test behavior in CI environments

## See also

- [CLI Commands Reference](./reference-cli.md) - Command line usage
- [Template Reference](./reference-templates.md) - Template syntax and variables
- [Configuration Guide](./guide-configuration.md) - How to configure Nagare