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
import { ErrorFactory } from "./src/enhanced-error.ts";
import { initI18n, t } from "./src/i18n.ts";
import { NagareBrand as Brand } from "./src/branded-messages.ts";

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
  /** Language for messages (en or ja) */
  lang?: string;
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

    // Handle the -- separator (everything after it should be treated as arguments)
    if (arg === "--") {
      // Skip the -- and continue processing remaining args
      continue;
    }

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
      case "--lang": {
        i++;
        const lang = validatedArgs[i];
        if (lang && (lang === "en" || lang === "ja")) {
          options.lang = lang;
        }
        break;
      }
      default:
        if (!arg.startsWith("-")) {
          // Check if this is a valid command
          if (["release", "rollback", "init", "retry"].includes(arg)) {
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
    throw ErrorFactory.configNotFound([configPath]);
  }

  throw ErrorFactory.configNotFound(defaultPaths);
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
  // Try to use i18n, fall back to English if not available
  const tryT = (key: string, params?: Record<string, unknown>): string => {
    try {
      return t(key, params);
    } catch {
      // Fallback to key if i18n not initialized
      return key;
    }
  };

  console.log(`
${
    tryT("cli.help.title", {
      name: APP_INFO.name,
      version: VERSION,
      description: APP_INFO.description,
    })
  }

${tryT("cli.help.usage")}
  ${tryT("cli.help.usageLine1")}
  ${tryT("cli.help.usageLine2")}
  ${tryT("cli.help.usageLine3")}

${tryT("cli.help.commands")}
  ${tryT("cli.help.commandRelease")}
  ${tryT("cli.help.commandRollback")}
  ${tryT("cli.help.commandRetry")}
  ${tryT("cli.help.commandInit")}

${tryT("cli.help.bumpTypes")}
  ${tryT("cli.help.bumpMajor")}
  ${tryT("cli.help.bumpMinor")}
  ${tryT("cli.help.bumpPatch")}

${tryT("cli.help.options")}
  ${tryT("cli.help.optionConfig")}
  ${tryT("cli.help.optionDryRun")}
  ${tryT("cli.help.optionSkipConfirm")}
  ${tryT("cli.help.optionLogLevel")}
  --lang <lang>             Set language (en or ja). Falls back to NAGARE_LANG env var
  ${tryT("cli.help.optionHelp")}
  ${tryT("cli.help.optionVersion")}
  ${tryT("cli.help.optionVersionDetailed")}
  ${tryT("cli.help.optionVersionJson")}

${tryT("cli.help.examples")}
  ${tryT("cli.help.exampleInit")}
  ${tryT("cli.help.exampleRelease")}
  ${tryT("cli.help.exampleReleaseMinor")}
  ${tryT("cli.help.exampleDryRun")}
  ${tryT("cli.help.exampleRollback")}
  ${tryT("cli.help.exampleRollbackVersion")}
  ${tryT("cli.help.exampleConfig")}
  ${tryT("cli.help.exampleVersionDetailed")}
  ${tryT("cli.help.exampleVersionJson")}

${tryT("cli.help.configuration")}
  ${tryT("cli.help.configIntro")}

  import type { NagareConfig } from '@rick/nagare';

  export default {
    project: {
      name: 'My App',
      // DevSkim: ignore DS440000 - Standard HTTPS URL in example
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

${tryT("cli.help.safePatterns")}
  ${tryT("cli.help.safePatternsIntro")}
  
  ${tryT("cli.help.safeExample")}
  ${tryT("cli.help.unsafeExample")}
  
  ${tryT("cli.help.safePatternsNote")}
  ${tryT("cli.help.safePatternsWarning")}

${tryT("cli.help.moreInfo", { url: APP_INFO.repository })}
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
  console.log(`${Brand.EMOJI} ${Brand.NAME} v${VERSION}`);
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
  // Try to use i18n, fall back to English if not available
  const tryT = (key: string, params?: Record<string, unknown>): string => {
    try {
      return t(key, params);
    } catch {
      // Fallback to key if i18n not initialized
      return key;
    }
  };

  console.log(`${Brand.EMOJI} ${Brand.NAME} (${Brand.MEANING}) v${VERSION}`);
  console.log(`📝 ${tryT("cli.version.description")}: ${APP_INFO.description}`);
  console.log(`📦 ${tryT("cli.version.repository")}: ${APP_INFO.repository}`);
  console.log(`📄 ${tryT("cli.version.license")}: ${APP_INFO.license}`);
  console.log();
  console.log(`📋 ${tryT("cli.version.buildInfo")}:`);
  console.log(`   📅 ${tryT("cli.version.buildDate")}: ${BUILD_INFO.buildDate}`);
  console.log(`   🔗 ${tryT("cli.version.gitCommit")}: ${BUILD_INFO.gitCommit}`);
  console.log(`   🏗️  ${tryT("cli.version.environment")}: ${BUILD_INFO.buildEnvironment}`);

  // Type guard to ensure RELEASE_NOTES has the expected structure
  if (isValidReleaseNotes(RELEASE_NOTES) && RELEASE_NOTES.version === VERSION) {
    console.log();
    console.log(
      `📰 ${
        tryT("cli.version.releaseNotes", {
          version: RELEASE_NOTES.version,
          date: RELEASE_NOTES.date,
        })
      }:`,
    );

    if (RELEASE_NOTES.added && RELEASE_NOTES.added.length > 0) {
      console.log(`   ✨ ${tryT("cli.version.added")}:`);
      RELEASE_NOTES.added.forEach((item: string) => console.log(`      • ${item}`));
    }

    if (RELEASE_NOTES.changed && RELEASE_NOTES.changed.length > 0) {
      console.log(`   🔄 ${tryT("cli.version.changed")}:`);
      RELEASE_NOTES.changed.forEach((item: string) => console.log(`      • ${item}`));
    }

    if (RELEASE_NOTES.fixed && RELEASE_NOTES.fixed.length > 0) {
      console.log(`   🐛 ${tryT("cli.version.fixed")}:`);
      RELEASE_NOTES.fixed.forEach((item: string) => console.log(`      • ${item}`));
    }

    if (RELEASE_NOTES.deprecated && RELEASE_NOTES.deprecated.length > 0) {
      console.log(`   ⚠️  ${tryT("cli.version.deprecated")}:`);
      RELEASE_NOTES.deprecated.forEach((item: string) => console.log(`      • ${item}`));
    }

    if (RELEASE_NOTES.removed && RELEASE_NOTES.removed.length > 0) {
      console.log(`   🗑️  ${tryT("cli.version.removed")}:`);
      RELEASE_NOTES.removed.forEach((item: string) => console.log(`      • ${item}`));
    }

    if (RELEASE_NOTES.security && RELEASE_NOTES.security.length > 0) {
      console.log(`   🔒 ${tryT("cli.version.security")}:`);
      RELEASE_NOTES.security.forEach((item: string) => console.log(`      • ${item}`));
    }
  }

  console.log();
  console.log(`🚀 ${tryT("cli.version.runtimeInfo")}:`);
  console.log(`   🦕 ${tryT("cli.version.deno")}: ${Deno.version.deno}`);
  console.log(`   🔧 ${tryT("cli.version.v8")}: ${Deno.version.v8}`);
  console.log(`   📘 ${tryT("cli.version.typescript")}: ${Deno.version.typescript}`);
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

// Note: Formatting functions removed - now using Brand.* methods for consistent marine theming

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
  // Parse args first to get lang option
  let command: string | undefined;
  let bumpType: string | undefined;
  let options: CLIOptions;

  try {
    const parsed = parseArgs(args);
    command = parsed.command;
    bumpType = parsed.bumpType;
    options = parsed.options;
  } catch (error) {
    Brand.error(`Invalid arguments: ${sanitizeErrorMessage(error, false)}`);
    Deno.exit(1);
  }

  // Show wave animation for interactive commands (not version/help)
  if (command && !["version", "help"].includes(command)) {
    Brand.showWaveAnimation();
  }

  // Initialize i18n early with language preference
  try {
    // Resolve locales directory based on whether we're running from source or JSR package
    const localesDir = import.meta.url.startsWith("file://")
      ? new URL("./locales", import.meta.url).pathname
      : new URL("./locales", import.meta.url).pathname;

    // Determine language preference:
    // 1. CLI flag takes highest priority
    // 2. Environment variable as fallback
    // 3. Default to "en"
    const lang = options.lang || Deno.env.get("NAGARE_LANG") || "en";

    await initI18n({
      localesDir,
      language: lang,
    });
  } catch (error) {
    Brand.error(`Failed to initialize i18n: ${sanitizeErrorMessage(error, false)}`);
    // Continue without i18n - English will be used as fallback
  }

  // Helper to try translating with fallback
  const tryT = (key: string, params?: Record<string, unknown>) => {
    try {
      return t(key, params);
    } catch {
      return key;
    }
  };

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
    Brand.log(tryT("cli.init.initializing"));

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
      Brand.success(tryT("cli.init.createdLauncher"));
    } catch (error) {
      Brand.error(
        tryT("cli.init.failedLauncher", {
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      Deno.exit(1);
    }

    // Check for existing nagare.config.ts
    try {
      await Deno.stat("./nagare.config.ts");
      Brand.progress(tryT("cli.init.foundConfig"));
    } catch {
      // Ask about AI features
      Brand.log("Would you like to enable AI-powered auto-fix features? (y/N)");
      const enableAI = prompt("Enable AI features?")?.toLowerCase() === "y";

      let configTemplate = EXAMPLE_MINIMAL_CONFIG;

      if (enableAI) {
        Brand.progress("Detecting available AI tools...");

        // Check for available AI tools
        const availableTools: string[] = [];

        // Check for Claude CLI
        try {
          const claudeCheck = new Deno.Command("claude", {
            args: ["--version"],
            stdout: "piped",
            stderr: "piped",
          });
          const result = await claudeCheck.output();
          if (result.success) {
            availableTools.push("claude");
            Brand.success("Found Claude CLI");
          }
        } catch {
          // Claude not available
        }

        // Check for GitHub Copilot CLI
        try {
          const ghCheck = new Deno.Command("gh", {
            args: ["copilot", "--version"],
            stdout: "piped",
            stderr: "piped",
          });
          const result = await ghCheck.output();
          if (result.success) {
            availableTools.push("gh-copilot");
            Brand.success("Found GitHub Copilot CLI");
          }
        } catch {
          // GitHub Copilot not available
        }

        if (availableTools.length === 0) {
          Brand.progress("No AI tools detected. You can install them later:");
          Brand.progress("  - Claude CLI: https://claude.ai/cli");
          Brand.progress("  - GitHub Copilot: gh extension install github/gh-copilot");
        }

        // Ask about thinking level for Claude
        let thinkingLevel = "think";
        if (availableTools.includes("claude")) {
          Brand.progress("\nClaude Code thinking level affects token usage:");
          Brand.progress(
            "  1. think - Basic analysis (lowest token usage, good for limited plans)",
          );
          Brand.progress("  2. megathink - Deeper analysis (medium token usage)");
          console.log(
            "  3. ultrathink - Deepest analysis (highest token usage, best for complex issues)",
          );
          const level = prompt("Choose thinking level (1-3) [1]:") || "1";
          switch (level) {
            case "2":
              thinkingLevel = "megathink";
              break;
            case "3":
              thinkingLevel = "ultrathink";
              break;
            default:
              thinkingLevel = "think";
          }
        }

        // Generate config with AI features
        const aiProvider = availableTools.includes("claude")
          ? "claude-code"
          : availableTools.includes("gh-copilot")
          ? "github-copilot"
          : "claude-code";

        configTemplate = `import type { NagareConfig } from '@rick/nagare';

export default {
  project: {
    name: 'My App',
    // DevSkim: ignore DS440000 - Standard HTTPS URL in example
    repository: 'https://github.com/user/my-app'
  },
  
  versionFile: {
    path: './version.ts',
    template: 'typescript'
  },
  
  release: {
    autoFix: {
      basic: true,  // Enable deterministic fixes (formatting, version bumps, etc.)
      ai: {
        enabled: ${availableTools.length > 0},
        provider: '${aiProvider}',
        thinkingLevel: '${thinkingLevel}',  // Controls token usage: think, megathink, ultrathink
        maxAttempts: 3,
        timeout: 30000
      },
      // Types of errors to auto-fix
      types: ['lint', 'format', 'security-scan', 'type-check', 'version-conflict']
    }
  }
} as NagareConfig;`;
      }

      // Create nagare.config.ts
      Brand.progress(tryT("cli.init.creatingConfig"));
      try {
        await Deno.writeTextFile("./nagare.config.ts", configTemplate);
        Brand.success(tryT("cli.init.createdConfig"));

        if (enableAI) {
          console.log();
          Brand.progress("AI auto-fix features have been configured!");
          console.log("When CI checks fail, Nagare will automatically attempt to fix:");
          console.log("  - Formatting issues (deno fmt)");
          console.log("  - Linting issues (deno lint)");
          console.log("  - Security scan violations");
          console.log("  - Type checking errors");
          console.log("  - Version conflicts");
          console.log();
          console.log("The AI assistant will analyze error messages and suggest fixes,");
          console.log("which can be automatically applied with your approval.");
        }
      } catch (error) {
        Brand.error(
          tryT("cli.init.failedConfig", {
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      }
    }

    // Check if deno.json exists and provide guidance
    Brand.progress(tryT("cli.init.checkingDeno"));
    try {
      const denoJsonContent = await Deno.readTextFile("./deno.json");
      const denoJson = JSON.parse(denoJsonContent);

      if (!denoJson.tasks) {
        denoJson.tasks = {};
      }

      // Check if nagare tasks already exist
      const hasTasks = denoJson.tasks.nagare || denoJson.tasks.release;

      if (hasTasks) {
        Brand.progress(tryT("cli.init.foundTasks"));
      } else {
        Brand.progress(tryT("cli.init.addTasks"));
        console.log(`
  "tasks": {
    "nagare": "deno run -A nagare-launcher.ts",
    "release": "deno task nagare",
    "release:patch": "deno task nagare patch",
    "release:minor": "deno task nagare minor",
    "release:major": "deno task nagare major",
    "release:dry": "deno task nagare --dry-run",
    "rollback": "deno task nagare rollback",
    "retry": "deno task nagare retry"
  }
`);
      }
    } catch {
      Brand.progress(tryT("cli.init.noDeno"));
      console.log(`
{
  "tasks": {
    "nagare": "deno run -A nagare-launcher.ts",
    "release": "deno task nagare",
    "release:patch": "deno task nagare patch",
    "release:minor": "deno task nagare minor",
    "release:major": "deno task nagare major",
    "release:dry": "deno task nagare --dry-run",
    "rollback": "deno task nagare rollback",
    "retry": "deno task nagare retry"
  }
}
`);
    }

    console.log();
    Brand.celebrate(tryT("cli.init.complete"));
    console.log();
    console.log(tryT("cli.init.nextSteps"));
    console.log(tryT("cli.init.nextStep1"));
    console.log(tryT("cli.init.nextStep2"));
    console.log(tryT("cli.init.nextStep3"));
    console.log();
    console.log(tryT("cli.init.moreInfo", { url: "https://github.com/RickCogley/nagare" }));
    return;
  }

  try {
    // Load configuration
    Brand.log("Navigating configuration channels...");
    const config = await loadConfig(options.config);

    // Apply locale from config if specified
    if (config.locale) {
      try {
        const { setLocale } = await import("./src/i18n.ts");
        await setLocale(config.locale);
      } catch (error) {
        Brand.warning(
          `Could not set locale to ${config.locale}: ${sanitizeErrorMessage(error, false)}`,
        );
      }
    }

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
    Brand.progress("Testing waters for configuration validity...");
    const validation = ReleaseManager.validateConfig(config);
    if (!validation.valid) {
      Brand.error("Configuration validation failed:");
      validation.errors.forEach((error) => Brand.error(`   • ${error}`));
      Deno.exit(1);
    }

    Brand.success("Configuration flowing smoothly!");

    // Execute command
    switch (command) {
      case "rollback": {
        Brand.log("Initiating rollback current...");
        const rollbackManager = new RollbackManager(config);
        const result = await rollbackManager.rollback(bumpType); // bumpType is version in this case
        if (!result.success) {
          Brand.error(`Rollback current blocked: ${result.error}`);
          Deno.exit(1);
        }
        Brand.success("Rollback current flowing smoothly!");
        break;
      }

      case "retry": {
        Brand.log("Retrying failed release current...");

        // Get the last failed version from git tags or ask user
        let version = bumpType; // User can provide version as argument

        if (!version) {
          // Try to detect the last tag that might have failed
          try {
            const gitCommand = new Deno.Command("git", {
              args: ["describe", "--tags", "--abbrev=0"],
              stdout: "piped",
              stderr: "piped",
            });
            const { stdout } = await gitCommand.output();
            const lastTag = new TextDecoder().decode(stdout).trim();
            if (lastTag && lastTag.startsWith("v")) {
              version = lastTag.substring(1);
              Brand.progress(`Found last tag: v${version}`);
            }
          } catch {
            // Ignore errors, user will need to provide version
          }

          if (!version) {
            Brand.error("No version specified. Usage: nagare retry <version>");
            Brand.progress("Example: nagare retry 1.2.3");
            Deno.exit(1);
          }
        }

        Brand.log(`Attempting to retry release current for version ${version}`);

        // Delete local and remote tags
        Brand.progress("Clearing debris from previous attempt...");

        // Delete local tag
        try {
          await new Deno.Command("git", {
            args: ["tag", "-d", `v${version}`],
            stdout: "piped",
            stderr: "piped",
          }).output();
          Brand.success(`Cleared local tag v${version}`);
        } catch {
          Brand.progress(`Local tag v${version} not found (already cleared)`);
        }

        // Delete remote tag
        try {
          await new Deno.Command("git", {
            args: ["push", "origin", `:refs/tags/v${version}`],
            stdout: "piped",
            stderr: "piped",
          }).output();
          Brand.success(`Cleared remote tag v${version}`);
        } catch {
          Brand.progress(`Remote tag v${version} not found (already cleared)`);
        }

        // Pull latest changes
        Brand.progress("Drawing fresh current from upstream...");
        await new Deno.Command("git", {
          args: ["pull"],
          stdout: "piped",
          stderr: "piped",
        }).output();

        // Now run release with the specific version
        Brand.log(`Channeling release current for version ${version}...`);
        const releaseManager = new ReleaseManager({
          ...config,
          options: {
            ...config.options,
            ...options,
            skipConfirmation: true, // Skip confirmation for retry
          },
        });

        // We need to override the version calculation
        // This is a bit hacky but necessary for retry functionality
        const result = await releaseManager.release();

        if (!result.success) {
          Brand.error(`Release retry current blocked: ${result.error}`);
          Deno.exit(1);
        }

        Brand.celebrate(`Successfully retried release ${version}!`);
        if (result.githubReleaseUrl) {
          Brand.progress(`GitHub Release: ${result.githubReleaseUrl}`);
        }
        break;
      }

      case "release":
      default: {
        Brand.log(
          `Starting release current${bumpType ? ` with ${bumpType} flow` : ""}...`,
        );
        const releaseManager = new ReleaseManager(config);
        const result = await releaseManager.release(bumpType as BumpType);
        if (!result.success) {
          Brand.error(`Release current blocked: ${result.error}`);
          Deno.exit(1);
        }
        Brand.celebrate("Release completed successfully!");
        break;
      }
    }
  } catch (error) {
    Brand.error(sanitizeErrorMessage(error, false));
    if (options.logLevel === LogLevel.DEBUG) {
      Brand.debug("Debug information:");
      Brand.debug(sanitizeErrorMessage(error, true));
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
    // DevSkim: ignore DS440000 - Standard HTTPS URLs in example configuration
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
    // DevSkim: ignore DS440000 - Standard HTTPS URL in example
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
    // DevSkim: ignore DS440000 - Standard HTTPS URL in example
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
      cryptoFeatures: ['AES-GCM-256', 'PBKDF2-SHA512', 'basE91'], // DevSkim: ignore DS440000,DS440011 - These are descriptive strings for documentation, not protocol configuration
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
