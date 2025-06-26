#!/usr/bin/env deno run --allow-read --allow-write --allow-run --allow-net

/**
 * @module CLI
 * @fileoverview CLI interface for Nagare release management
 * @description Provides command-line access to release and rollback functionality.
 * Note: CLI functionality requires Deno runtime due to file system and process APIs.
 */

import { ReleaseManager } from "./src/release-manager.ts";
import { RollbackManager } from "./src/rollback-manager.ts";
import type { BumpType, NagareConfig } from "./types.ts";
import { LogLevel } from "./config.ts";
import { APP_INFO, BUILD_INFO, RELEASE_NOTES, VERSION } from "./version.ts";

/**
 * CLI configuration options
 */
interface CLIOptions {
  config?: string;
  dryRun?: boolean;
  skipConfirmation?: boolean;
  logLevel?: LogLevel;
  help?: boolean;
  version?: boolean;
  versionDetailed?: boolean;
  versionJson?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): {
  command?: string;
  bumpType?: string;
  options: CLIOptions;
} {
  const options: CLIOptions = {};
  let command: string | undefined;
  let bumpType: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue; // Skip undefined args

    switch (arg) {
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--version":
      case "-v":
        options.version = true;
        break;
      case "--version-detailed":
      case "--version-full":
        options.versionDetailed = true;
        break;
      case "--version-json":
        options.versionJson = true;
        break;
      case "--config":
      case "-c":
        i++;
        if (args[i]) {
          options.config = args[i];
        }
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--skip-confirmation":
      case "-y":
        options.skipConfirmation = true;
        break;
      case "--log-level": {
        i++;
        const level = args[i];
        if (level && level in LogLevel) {
          options.logLevel = LogLevel[level as keyof typeof LogLevel];
        }
        break;
      }
      default:
        if (!arg.startsWith("-")) {
          // Check if this is a bump type first
          if (["major", "minor", "patch"].includes(arg)) {
            bumpType = arg;
          } else if (!command) {
            // If it's not a bump type and we don't have a command yet, it's the command
            command = arg;
          }
        }
        break;
    }
  }

  // If no explicit command was provided, default to "release"
  if (!command && bumpType) {
    command = "release";
  }

  return { command, bumpType, options };
}

/**
 * Load configuration from file
 */
async function loadConfig(configPath?: string): Promise<NagareConfig> {
  const defaultPaths = [
    "./nagare.config.ts",
    "./nagare.config.js",
    "./release.config.ts",
    "./.nagarerc.ts",
  ];

  const pathsToTry = configPath ? [configPath] : defaultPaths;

  for (const path of pathsToTry) {
    try {
      // FIX: Use Deno.cwd() for relative paths instead of import.meta.url
      // This ensures relative paths work when Nagare is imported from JSR
      const resolvedPath = path.startsWith(".") || !path.includes("://")
        ? new URL(path, `file://${Deno.cwd()}/`).href
        : path;

      const module = await import(resolvedPath);
      return module.default || module.config;
    } catch {
      // Continue to next path
    }
  }

  if (configPath) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  throw new Error(`No configuration file found. Tried: ${defaultPaths.join(", ")}`);
}

/**
 * Display help information
 */
function showHelp(): void {
  console.log(`
${APP_INFO.name} v${VERSION} - ${APP_INFO.description}

USAGE:
  nagare <command> [options]
  nagare release [major|minor|patch] [options]
  nagare rollback [version] [options]

COMMANDS:
  release    Create a new release (default)
  rollback   Rollback a release

BUMP TYPES:
  major      Increment major version (1.0.0 -> 2.0.0)
  minor      Increment minor version (1.0.0 -> 1.1.0)  
  patch      Increment patch version (1.0.0 -> 1.0.1)

OPTIONS:
  --config, -c <path>         Path to configuration file
  --dry-run                   Preview changes without making them
  --skip-confirmation, -y     Skip confirmation prompts
  --log-level <level>         Set log level (DEBUG, INFO, WARN, ERROR)
  --help, -h                  Show this help message
  --version, -v               Show version information
  --version-detailed          Show detailed version information
  --version-json              Show version information in JSON format

EXAMPLES:
  nagare release                       # Auto-determine version bump from commits
  nagare release minor                # Force minor version bump
  nagare release --dry-run            # Preview release without making changes
  nagare rollback                     # Rollback latest release
  nagare rollback 1.2.0               # Rollback specific version
  nagare --config ./my-config.ts      # Use custom config file
  nagare --version-detailed           # Show build info and release notes
  nagare --version-json               # Output version info as JSON

CONFIGURATION:
  Create a nagare.config.ts file in your project root:

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

For more information, visit: ${APP_INFO.repository}
`);
}

/**
 * Show basic version information
 */
function showVersion(): void {
  console.log(`Nagare v${VERSION}`);
}

/**
 * Show detailed version information
 */
function showDetailedVersion(): void {
  console.log(`🌊 ${APP_INFO.name} v${VERSION}`);
  console.log(`📝 ${APP_INFO.description}`);
  console.log(`📦 Repository: ${APP_INFO.repository}`);
  console.log(`📄 License: ${APP_INFO.license}`);
  console.log();
  console.log("📋 Build Information:");
  console.log(`   📅 Build Date: ${BUILD_INFO.buildDate}`);
  console.log(`   🔗 Git Commit: ${BUILD_INFO.gitCommit}`);
  console.log(`   🏗️  Environment: ${BUILD_INFO.buildEnvironment}`);

  if (RELEASE_NOTES && RELEASE_NOTES.version === VERSION) {
    console.log();
    console.log(`📰 Release Notes (v${RELEASE_NOTES.version} - ${RELEASE_NOTES.date}):`);

    if (RELEASE_NOTES.added && RELEASE_NOTES.added.length > 0) {
      console.log("   ✨ Added:");
      RELEASE_NOTES.added.forEach((item) => console.log(`      • ${item}`));
    }

    if (RELEASE_NOTES.changed && RELEASE_NOTES.changed.length > 0) {
      console.log("   🔄 Changed:");
      RELEASE_NOTES.changed.forEach((item) => console.log(`      • ${item}`));
    }

    if (RELEASE_NOTES.fixed && RELEASE_NOTES.fixed.length > 0) {
      console.log("   🐛 Fixed:");
      RELEASE_NOTES.fixed.forEach((item) => console.log(`      • ${item}`));
    }

    if (RELEASE_NOTES.deprecated && RELEASE_NOTES.deprecated.length > 0) {
      console.log("   ⚠️  Deprecated:");
      RELEASE_NOTES.deprecated.forEach((item) => console.log(`      • ${item}`));
    }

    if (RELEASE_NOTES.removed && RELEASE_NOTES.removed.length > 0) {
      console.log("   🗑️  Removed:");
      RELEASE_NOTES.removed.forEach((item) => console.log(`      • ${item}`));
    }

    if (RELEASE_NOTES.security && RELEASE_NOTES.security.length > 0) {
      console.log("   🔒 Security:");
      RELEASE_NOTES.security.forEach((item) => console.log(`      • ${item}`));
    }
  }

  console.log();
  console.log("🚀 Runtime Information:");
  console.log(`   🦕 Deno: ${Deno.version.deno}`);
  console.log(`   🔧 V8: ${Deno.version.v8}`);
  console.log(`   📘 TypeScript: ${Deno.version.typescript}`);
}

/**
 * Show version information in JSON format
 */
function showVersionJson(): void {
  const versionInfo = {
    nagare: {
      version: VERSION,
      name: APP_INFO.name,
      description: APP_INFO.description,
      repository: APP_INFO.repository,
      license: APP_INFO.license,
    },
    build: {
      buildDate: BUILD_INFO.buildDate,
      gitCommit: BUILD_INFO.gitCommit,
      buildEnvironment: BUILD_INFO.buildEnvironment,
    },
    runtime: {
      deno: Deno.version.deno,
      v8: Deno.version.v8,
      typescript: Deno.version.typescript,
    },
    releaseNotes: RELEASE_NOTES.version === VERSION ? RELEASE_NOTES : null,
  };

  console.log(JSON.stringify(versionInfo, null, 2));
}

/**
 * Format success message with emoji
 */
function formatSuccess(message: string): string {
  return `✅ ${message}`;
}

/**
 * Format error message with emoji
 */
function formatError(message: string): string {
  return `❌ ${message}`;
}

/**
 * Format info message with emoji
 */
function formatInfo(message: string): string {
  return `ℹ️  ${message}`;
}

/**
 * Main CLI entry point
 */
export async function cli(args: string[]): Promise<void> {
  const { command, bumpType, options } = parseArgs(args);

  // Handle version options first
  if (options.version) {
    showVersion();
    return;
  }

  if (options.versionDetailed) {
    showDetailedVersion();
    return;
  }

  if (options.versionJson) {
    showVersionJson();
    return;
  }

  if (options.help) {
    showHelp();
    return;
  }

  try {
    // Load configuration
    console.log(formatInfo("Loading configuration..."));
    const config = await loadConfig(options.config);

    // Apply CLI options to config
    if (options.dryRun !== undefined) {
      config.options = { ...config.options, dryRun: options.dryRun };
    }
    if (options.skipConfirmation !== undefined) {
      config.options = { ...config.options, skipConfirmation: options.skipConfirmation };
    }
    if (options.logLevel !== undefined) {
      config.options = { ...config.options, logLevel: options.logLevel };
    }

    // Validate configuration
    console.log(formatInfo("Validating configuration..."));
    const validation = ReleaseManager.validateConfig(config);
    if (!validation.valid) {
      console.error(formatError("Configuration validation failed:"));
      validation.errors.forEach((error) => console.error(`   • ${error}`));
      Deno.exit(1);
    }

    console.log(formatSuccess("Configuration validated successfully"));

    // Execute command
    switch (command) {
      case "rollback": {
        console.log(formatInfo(`Starting rollback process...`));
        const rollbackManager = new RollbackManager(config);
        const result = await rollbackManager.rollback(bumpType); // bumpType is version in this case
        if (!result.success) {
          console.error(formatError(`Rollback failed: ${result.error}`));
          Deno.exit(1);
        }
        console.log(formatSuccess("Rollback completed successfully"));
        break;
      }

      case "release":
      default: {
        console.log(
          formatInfo(`Starting release process${bumpType ? ` with ${bumpType} bump` : ""}...`),
        );
        const releaseManager = new ReleaseManager(config);
        const result = await releaseManager.release(bumpType as BumpType);
        if (!result.success) {
          console.error(formatError(`Release failed: ${result.error}`));
          Deno.exit(1);
        }
        console.log(formatSuccess("Release completed successfully"));
        break;
      }
    }
  } catch (error) {
    console.error(formatError(`${error instanceof Error ? error.message : String(error)}`));
    if (options.logLevel === LogLevel.DEBUG) {
      console.error("\nDebug information:");
      console.error(error);
    }
    Deno.exit(1);
  }
}

/**
 * Example configurations for documentation
 */
export const EXAMPLE_TS_CONFIG: string = `import type { NagareConfig } from '@rick/nagare';

export default {
  project: {
    name: 'My Awesome App',
    description: 'A fantastic Deno application',
    repository: 'https://github.com/user/my-app',
    homepage: 'https://my-app.deno.dev',
    license: 'MIT',
    author: 'Your Name'
  },

  versionFile: {
    path: './version.ts',
    template: 'typescript'
  },

  releaseNotes: {
    includeCommitHashes: true,
    maxDescriptionLength: 100,
    metadata: {
      features: ['Feature 1', 'Feature 2'],
      apiEndpoints: ['/api/v1', '/health']
    }
  },

  github: {
    owner: 'user',
    repo: 'my-app',
    createRelease: true
  },

  updateFiles: [
    {
      path: './deno.json',
      patterns: {
        version: /"version":\\s*"([^"]+)"/
      }
    },
    {
      path: './README.md',
      patterns: {
        version: /Version:\\s*([\\d\\.]+)/
      }
    }
  ],

  docs: {
    enabled: true,
    outputDir: './docs',
    includePrivate: false
  },

  options: {
    tagPrefix: 'v',
    gitRemote: 'origin',
    logLevel: 'INFO'
  }
} as NagareConfig;`;

export const EXAMPLE_MINIMAL_CONFIG: string = `import type { NagareConfig } from '@rick/nagare';

export default {
  project: {
    name: 'My App',
    repository: 'https://github.com/user/my-app'
  },
  
  versionFile: {
    path: './version.ts',
    template: 'typescript'
  }
} as NagareConfig;`;

export const EXAMPLE_CUSTOM_TEMPLATE: string = `import type { NagareConfig } from '@rick/nagare';

export default {
  project: {
    name: 'Salty',
    repository: 'https://github.com/esolia/salty.esolia.pro'
  },
  
  versionFile: {
    path: './version.ts',
    template: 'custom',
    customTemplate: \`
export const VERSION = "{{version}}";

export const BUILD_INFO = {
  buildDate: "{{buildDate}}",
  gitCommit: "{{gitCommit}}",
  buildEnvironment: "{{environment}}"
} as const;

export const APP_INFO = {
  name: "{{project.name}}",
  description: "{{project.description}}",
  author: "{{project.author}}"
} as const;

{{#if metadata.cryptoFeatures}}
export const CRYPTO_FEATURES = {{metadata.cryptoFeatures}} as const;
{{/if}}

{{#if metadata.securityFeatures}}
export const SECURITY_FEATURES = {{metadata.securityFeatures}} as const;
{{/if}}

export const RELEASE_NOTES = {{releaseNotes}} as const;
\`
  },

  releaseNotes: {
    metadata: {
      cryptoFeatures: ['AES-GCM-256', 'PBKDF2-SHA512', 'basE91'],
      securityFeatures: ['Rate limiting', 'API authentication']
    }
  }
} as NagareConfig;`;

/**
 * Run CLI if this file is executed directly
 */
if (import.meta.main) {
  await cli(Deno.args);
}
