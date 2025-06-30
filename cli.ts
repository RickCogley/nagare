#!/usr/bin/env deno run --allow-read --allow-write --allow-run --allow-net

/**
 * @module CLI
 * @fileoverview CLI interface for Nagare release management
 * @description Provides command-line access to release and rollback functionality.
 * Note: CLI functionality requires Deno runtime due to file system and process APIs.
 *
 * @example Basic usage:
 * ```bash
 * # Initialize Nagare in current directory
 * deno run --allow-all cli.ts init
 *
 * # Auto-determine version bump from commits
 * deno run --allow-all cli.ts release
 *
 * # Force specific version bump
 * deno run --allow-all cli.ts release minor
 *
 * # Preview changes without making them
 * deno run --allow-all cli.ts --dry-run
 *
 * # Rollback a release
 * deno run --allow-all cli.ts rollback 1.2.0
 * ```
 *
 * @since 0.1.0
 * @author Rick Cogley
 */

import { ReleaseManager } from "./src/release-manager.ts";
import { RollbackManager } from "./src/rollback-manager.ts";
import type { BumpType, NagareConfig, ReleaseNotes } from "./types.ts";
import { LogLevel } from "./config.ts";
import { APP_INFO, BUILD_INFO, RELEASE_NOTES, VERSION } from "./version.ts";
import { sanitizeErrorMessage, validateCliArgs, validateFilePath } from "./src/security-utils.ts";

/**
 * CLI configuration options interface
 *
 * @description Configuration options that can be passed via command line arguments
 * to override default behavior and configuration file settings.
 *
 * @interface CLIOptions
 */
interface CLIOptions {
  /** Path to custom configuration file */
  config?: string;
  /** Enable dry run mode (preview changes without making them) */
  dryRun?: boolean;
  /** Skip confirmation prompts */
  skipConfirmation?: boolean;
  /** Override log level */
  logLevel?: LogLevel;
  /** Show help information */
  help?: boolean;
  /** Show basic version information */
  version?: boolean;
  /** Show detailed version information with build info and release notes */
  versionDetailed?: boolean;
  /** Show version information in JSON format */
  versionJson?: boolean;
}

/**
 * Type guard for RELEASE_NOTES to ensure safe property access
 *
 * @description Validates that RELEASE_NOTES has the expected structure
 * with version information and changelog sections.
 *
 * @param releaseNotes - The release notes object to validate
 * @returns Type predicate indicating if object is valid ReleaseNotes
 *
 * @example
 * ```typescript
 * if (isValidReleaseNotes(RELEASE_NOTES)) {
 *   console.log(RELEASE_NOTES.version); // Safe to access
 * }
 * ```
 */
function isValidReleaseNotes(releaseNotes: unknown): releaseNotes is ReleaseNotes {
  if (releaseNotes === null || typeof releaseNotes !== "object") {
    return false;
  }

  const obj = releaseNotes as Record<string, unknown>;

  return (
    "version" in obj &&
    "date" in obj &&
    typeof obj.version === "string" &&
    typeof obj.date === "string"
  );
}

/**
 * Parse command line arguments into structured options
 *
 * @description Parses Deno.args into command, bump type, and options.
 * Handles both short and long form flags, and validates argument combinations.
 * Includes security validation to prevent injection attacks.
 *
 * @param args - Command line arguments array (typically Deno.args)
 * @returns Parsed command structure with command, bump type, and options
 * @throws Error if arguments contain dangerous characters
 *
 * @example
 * ```typescript
 * const { command, bumpType, options } = parseArgs(['release', 'minor', '--dry-run']);
 * // Returns: { command: 'release', bumpType: 'minor', options: { dryRun: true } }
 * ```
 */
function parseArgs(args: string[]): {
  command?: string;
  bumpType?: string;
  options: CLIOptions;
} {
  // Validate all arguments first for security
  const validatedArgs = validateCliArgs(args);
  const options: CLIOptions = {};
  let command: string | undefined;
  let bumpType: string | undefined;

  for (let i = 0; i < validatedArgs.length; i++) {
    const arg = validatedArgs[i];
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
        if (validatedArgs[i]) {
          // Validate config path to prevent directory traversal
          try {
            options.config = validateFilePath(validatedArgs[i], Deno.cwd());
          } catch (error) {
            throw new Error(`Invalid config path: ${sanitizeErrorMessage(error, false)}`);
          }
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
        const level = validatedArgs[i];
        if (level && level in LogLevel) {
          options.logLevel = LogLevel[level as keyof typeof LogLevel];
        }
        break;
      }
      default:
        if (!arg.startsWith("-")) {
          // Check if this is a valid command
          if (["release", "rollback", "init"].includes(arg)) {
            command = arg;
          } else if (["major", "minor", "patch"].includes(arg)) {
            bumpType = arg;
          } else if (!command) {
            // If it's not a recognized command or bump type, assume it's a command
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
 * Load configuration from file with fallback paths
 *
 * @description Attempts to load Nagare configuration from various standard locations.
 * Supports both TypeScript and JavaScript configuration files with ES modules.
 *
 * @param configPath - Optional explicit path to configuration file
 * @returns Promise resolving to loaded configuration object
 * @throws Error if no configuration file found or configuration is invalid
 *
 * @example
 * ```typescript
 * // Load from default locations
 * const config = await loadConfig();
 *
 * // Load from specific path
 * const config = await loadConfig('./custom-config.ts');
 * ```
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
      let resolvedPath: string;

      // Handle different path formats
      if (path.startsWith("file://") || path.startsWith("http://") || path.startsWith("https://")) {
        // Already a URL, use as-is
        resolvedPath = path;
      } else if (path.startsWith("/")) {
        // Absolute path - convert to file:// URL
        resolvedPath = `file://${path}`;
      } else {
        // Relative path - resolve from current working directory
        const absolutePath = path.startsWith("./")
          ? `${Deno.cwd()}/${path.slice(2)}`
          : `${Deno.cwd()}/${path}`;
        resolvedPath = `file://${absolutePath}`;
      }

      // Try to import the module
      const module = await import(resolvedPath);

      // Check if the module has a default export or a config export
      const config = module.default || module.config;

      if (!config) {
        throw new Error(`No default export or config export found in ${path}`);
      }

      return config;
    } catch (error) {
      // Log error in debug mode
      if (Deno.env.get("NAGARE_DEBUG") === "true") {
        console.error(`Failed to load ${path}:`, error);
      }
      // Continue to next path
    }
  }

  if (configPath) {
    throw new Error(`Configuration file not found: ${configPath}`);
  }

  throw new Error(`No configuration file found. Tried: ${defaultPaths.join(", ")}`);
}

/**
 * Display comprehensive help information
 *
 * @description Shows detailed usage instructions, command examples,
 * configuration guidance, and safety information about file update patterns.
 *
 * @example
 * ```typescript
 * showHelp();
 * // Outputs comprehensive help text to console
 * ```
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
  init       Initialize Nagare in current directory

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
  nagare init                         # Initialize Nagare in current directory
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
    },
    updateFiles: [
      {
        path: './deno.json',
        patterns: {
          // ✅ SAFE: Line-anchored pattern prevents matching task definitions
          version: /^(\\s*)"version":\\s*"([^"]+)"/m
        }
      }
    ]
  } as NagareConfig;

SAFE FILE UPDATE PATTERNS:
  Always use line-anchored patterns for JSON files to prevent corruption:
  
  ✅ SAFE:   /^(\\s*)"version":\\s*"([^"]+)"/m
  ❌ UNSAFE: /"version":\\s*"([^"]+)"/
  
  The unsafe pattern can match task definitions and corrupt your files.
  Nagare will warn you if dangerous patterns are detected.

For more information, visit: ${APP_INFO.repository}
`);
}

/**
 * Show basic version information
 *
 * @description Displays the current Nagare version in a simple format.
 * Useful for quick version checks and scripting.
 *
 * @example
 * ```typescript
 * showVersion();
 * // Output: Nagare v1.0.0
 * ```
 */
function showVersion(): void {
  console.log(`Nagare v${VERSION}`);
}

/**
 * Show detailed version information with build details and release notes
 *
 * @description Displays comprehensive version information including:
 * - Application metadata (name, description, repository)
 * - Build information (date, commit, environment)
 * - Release notes for current version (if available)
 * - Runtime information (Deno, V8, TypeScript versions)
 *
 * @example
 * ```typescript
 * showDetailedVersion();
 * // Outputs detailed version info with release notes
 * ```
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

  // Type guard to ensure RELEASE_NOTES has the expected structure
  if (isValidReleaseNotes(RELEASE_NOTES) && RELEASE_NOTES.version === VERSION) {
    console.log();
    console.log(`📰 Release Notes (v${RELEASE_NOTES.version} - ${RELEASE_NOTES.date}):`);

    if (RELEASE_NOTES.added && RELEASE_NOTES.added.length > 0) {
      console.log("   ✨ Added:");
      RELEASE_NOTES.added.forEach((item: string) => console.log(`      • ${item}`));
    }

    if (RELEASE_NOTES.changed && RELEASE_NOTES.changed.length > 0) {
      console.log("   🔄 Changed:");
      RELEASE_NOTES.changed.forEach((item: string) => console.log(`      • ${item}`));
    }

    if (RELEASE_NOTES.fixed && RELEASE_NOTES.fixed.length > 0) {
      console.log("   🐛 Fixed:");
      RELEASE_NOTES.fixed.forEach((item: string) => console.log(`      • ${item}`));
    }

    if (RELEASE_NOTES.deprecated && RELEASE_NOTES.deprecated.length > 0) {
      console.log("   ⚠️  Deprecated:");
      RELEASE_NOTES.deprecated.forEach((item: string) => console.log(`      • ${item}`));
    }

    if (RELEASE_NOTES.removed && RELEASE_NOTES.removed.length > 0) {
      console.log("   🗑️  Removed:");
      RELEASE_NOTES.removed.forEach((item: string) => console.log(`      • ${item}`));
    }

    if (RELEASE_NOTES.security && RELEASE_NOTES.security.length > 0) {
      console.log("   🔒 Security:");
      RELEASE_NOTES.security.forEach((item: string) => console.log(`      • ${item}`));
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
 *
 * @description Outputs comprehensive version information as structured JSON.
 * Useful for programmatic access and integration with other tools.
 *
 * @example
 * ```typescript
 * showVersionJson();
 * // Outputs structured JSON with version, build, and runtime info
 * ```
 */
function showVersionJson(): void {
  // Type guard for RELEASE_NOTES to ensure safe access
  const releaseNotes = isValidReleaseNotes(RELEASE_NOTES) && RELEASE_NOTES.version === VERSION
    ? RELEASE_NOTES
    : null;

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
    releaseNotes,
  };

  console.log(JSON.stringify(versionInfo, null, 2));
}

/**
 * Format success message with emoji
 *
 * @param message - Message to format
 * @returns Formatted success message with checkmark emoji
 */
function formatSuccess(message: string): string {
  return `✅ ${message}`;
}

/**
 * Format error message with emoji
 *
 * @param message - Message to format
 * @returns Formatted error message with X emoji
 */
function formatError(message: string): string {
  return `❌ ${message}`;
}

/**
 * Format info message with emoji
 *
 * @param message - Message to format
 * @returns Formatted info message with info emoji
 */
function formatInfo(message: string): string {
  return `ℹ️  ${message}`;
}

/**
 * Main CLI entry point
 *
 * @description Coordinates the entire CLI workflow including:
 * - Argument parsing and validation
 * - Configuration loading and merging
 * - Command execution (release/rollback)
 * - Error handling and user feedback
 *
 * @param args - Command line arguments array
 * @throws Process exit with error code on failure
 *
 * @example
 * ```typescript
 * // Called automatically when run as script
 * await cli(Deno.args);
 *
 * // Or call programmatically
 * await cli(['release', 'minor', '--dry-run']);
 * ```
 */
export async function cli(args: string[]): Promise<void> {
  let command: string | undefined;
  let bumpType: string | undefined;
  let options: CLIOptions;

  try {
    const parsed = parseArgs(args);
    command = parsed.command;
    bumpType = parsed.bumpType;
    options = parsed.options;
  } catch (error) {
    console.error(formatError(`Invalid arguments: ${sanitizeErrorMessage(error, false)}`));
    Deno.exit(1);
  }

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

  // Handle init command separately (doesn't need config)
  if (command === "init") {
    console.log(formatInfo("Initializing Nagare in current directory..."));

    // Create nagare-launcher.ts
    const launcherContent = `#!/usr/bin/env deno run -A

/**
 * Nagare launcher - Local context wrapper that bypasses CLI
 * Auto-generated by: nagare init
 */

// Import the CLI function and types we need
import { cli } from "@rick/nagare/cli";
import type { NagareConfig } from "@rick/nagare/types";
import { LogLevel } from "@rick/nagare/config";

// Import config locally (this works because we're in local context)
import config from "./nagare.config.ts";

// Store original import function
const g = globalThis as any;
const originalImport = g.import;

// Override the import function to intercept config loads
g.import = function (specifier: string): Promise<any> {
  // Intercept attempts to import config files
  if (
    specifier.includes("nagare.config") ||
    specifier.includes("release.config") ||
    specifier.includes(".nagarerc")
  ) {
    // Return our pre-loaded config
    return Promise.resolve({ default: config });
  }
  // Otherwise use original import
  return originalImport.call(this, specifier);
};

// Now run the CLI normally - it will use our intercepted import
await cli(Deno.args);
`;

    try {
      await Deno.writeTextFile("./nagare-launcher.ts", launcherContent);
      console.log(formatSuccess("Created nagare-launcher.ts"));
    } catch (error) {
      console.error(
        formatError(
          `Failed to create nagare-launcher.ts: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
      Deno.exit(1);
    }

    // Check for existing nagare.config.ts
    try {
      await Deno.stat("./nagare.config.ts");
      console.log(formatInfo("Found existing nagare.config.ts"));
    } catch {
      // Create a minimal nagare.config.ts
      console.log(formatInfo("Creating minimal nagare.config.ts..."));
      try {
        await Deno.writeTextFile("./nagare.config.ts", EXAMPLE_MINIMAL_CONFIG);
        console.log(formatSuccess("Created nagare.config.ts"));
      } catch (error) {
        console.error(
          formatError(
            `Failed to create nagare.config.ts: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
      }
    }

    // Check if deno.json exists and provide guidance
    console.log(formatInfo("Checking for deno.json..."));
    try {
      const denoJsonContent = await Deno.readTextFile("./deno.json");
      const denoJson = JSON.parse(denoJsonContent);

      if (!denoJson.tasks) {
        denoJson.tasks = {};
      }

      // Check if nagare tasks already exist
      const hasTasks = denoJson.tasks.nagare || denoJson.tasks.release;

      if (hasTasks) {
        console.log(formatInfo("Found existing Nagare tasks in deno.json"));
      } else {
        console.log(formatInfo("Add these tasks to your deno.json:"));
        console.log(`
  "tasks": {
    "nagare": "deno run -A nagare-launcher.ts",
    "release": "deno task nagare",
    "release:patch": "deno task nagare patch",
    "release:minor": "deno task nagare minor",
    "release:major": "deno task nagare major",
    "release:dry": "deno task nagare --dry-run",
    "rollback": "deno task nagare rollback"
  }
`);
      }
    } catch {
      console.log(formatInfo("No deno.json found. Create one with the following content:"));
      console.log(`
{
  "tasks": {
    "nagare": "deno run -A nagare-launcher.ts",
    "release": "deno task nagare",
    "release:patch": "deno task nagare patch",
    "release:minor": "deno task nagare minor",
    "release:major": "deno task nagare major",
    "release:dry": "deno task nagare --dry-run",
    "rollback": "deno task nagare rollback"
  }
}
`);
    }

    console.log();
    console.log(formatSuccess("Nagare initialization complete!"));
    console.log();
    console.log("Next steps:");
    console.log("1. Edit nagare.config.ts to configure your project");
    console.log("2. Add the tasks shown above to your deno.json");
    console.log("3. Run 'deno task release' to create your first release");
    console.log();
    console.log("For more information, visit: https://github.com/RickCogley/nagare");
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
    console.error(formatError(sanitizeErrorMessage(error, false)));
    if (options.logLevel === LogLevel.DEBUG) {
      console.error("\nDebug information:");
      console.error(sanitizeErrorMessage(error, true));
    }
    Deno.exit(1);
  }
}

/**
 * Example TypeScript configuration for comprehensive setup
 *
 * @description Complete configuration example showing all available options
 * with detailed comments and safe patterns.
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
        // ✅ SAFE: Line-anchored pattern prevents matching task definitions
        version: /^(\\s*)"version":\\s*"([^"]+)"/m
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

/**
 * Example minimal configuration for simple projects
 *
 * @description Minimal configuration example showing only required fields.
 */
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

/**
 * Example custom template configuration for advanced use cases
 *
 * @description Configuration example showing custom Vento template usage
 * with app-specific metadata.
 */
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
export const VERSION = "{{ version }}";

export const BUILD_INFO = {
  buildDate: "{{ buildDate }}",
  gitCommit: "{{ gitCommit }}",
  buildEnvironment: "{{ environment }}"
} as const;

export const APP_INFO = {
  name: "{{ project.name }}",
  description: "{{ project.description }}",
  author: "{{ project.author }}"
} as const;

{{- if metadata.cryptoFeatures }}
export const CRYPTO_FEATURES = {{ metadata.cryptoFeatures | jsonStringify }} as const;
{{- /if }}

{{- if metadata.securityFeatures }}
export const SECURITY_FEATURES = {{ metadata.securityFeatures | jsonStringify }} as const;
{{- /if }}

export const RELEASE_NOTES = {{ releaseNotes | jsonStringify }} as const;
\`
  },

  releaseNotes: {
    metadata: {
      cryptoFeatures: ['AES-GCM-256', 'PBKDF2-SHA512', 'basE91'],
      securityFeatures: ['Rate limiting', 'API authentication']
    }
  },

  updateFiles: [
    {
      path: './deno.json',
      patterns: {
        // ✅ SAFE: Line-anchored pattern prevents matching task definitions
        version: /^(\\s*)"version":\\s*"([^"]+)"/m
      }
    }
  ]
} as NagareConfig;`;

/**
 * Run CLI if this file is executed directly
 *
 * @description Automatically invokes the CLI when this file is run as a script.
 * Uses Deno.args for command line arguments.
 */
if (import.meta.main) {
  await cli(Deno.args);
}
