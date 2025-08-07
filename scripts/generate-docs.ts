#!/usr/bin/env -S deno run --allow-run --allow-read

/**
 * @module GenerateDocs
 * @description Safe documentation generation script for Nagare.
 *
 * This script ensures documentation is always generated in the correct location
 * and prevents accidental overwriting of existing documentation.
 *
 * @example
 * ```bash
 * deno run --allow-run --allow-read scripts/generate-docs.ts
 * ```
 *
 * @since 2.18.0
 */

import { parseArgs } from "@std/cli";

const DOCS_API_DIR = "./docs/api";
const ALLOWED_COMMANDS = {
  "api": ["deno", "doc", "--html", "--name=Nagare API", `--output=${DOCS_API_DIR}`, "./cli.ts"],
  "mod": ["deno", "doc", "--html", "--name=Nagare Library", `--output=${DOCS_API_DIR}`, "./mod.ts"],
  "json": ["deno", "doc", "--json", `--output=${DOCS_API_DIR}/nagare.json`, "./mod.ts"],
  "check": ["deno", "doc", "--lint", "./mod.ts", "./cli.ts"],
};

function showHelp() {
  console.log(`
🌊 Nagare Documentation Generator

Usage: deno run --allow-run --allow-read scripts/generate-docs.ts [command]

Commands:
  api     Generate HTML API documentation for CLI
  mod     Generate HTML API documentation for library
  json    Generate JSON API documentation
  check   Check JSDoc syntax without generating files
  help    Show this help message

Examples:
  deno task docs:api    # Recommended: Use the task instead
  deno run --allow-run scripts/generate-docs.ts api
  deno run --allow-run scripts/generate-docs.ts check

⚠️  IMPORTANT: This script ensures documentation is always generated in ${DOCS_API_DIR}
             Never run 'deno doc' directly without the --output flag!
`);
}

async function main() {
  const args = parseArgs(Deno.args, {
    string: ["_"],
    boolean: ["help", "h"],
    default: {
      help: false,
    },
  });

  if (args.help || args.h || args._.length === 0) {
    showHelp();
    Deno.exit(0);
  }

  const command = args._[0] as string;

  if (!(command in ALLOWED_COMMANDS)) {
    console.error(`❌ Unknown command: ${command}`);
    console.error("Run with --help to see available commands");
    Deno.exit(1);
  }

  // Safety check: Ensure we're not in the docs directory
  const cwd = Deno.cwd();
  if (cwd.endsWith("/docs") || cwd.endsWith("\\docs")) {
    console.error("❌ Error: Cannot run from within the docs directory!");
    console.error("Please run from the project root.");
    Deno.exit(1);
  }

  console.log(`🌊 Nagare: Generating documentation (${command})...`);
  console.log(`📁 Output directory: ${DOCS_API_DIR}`);

  const cmd = ALLOWED_COMMANDS[command as keyof typeof ALLOWED_COMMANDS];

  try {
    const process = new Deno.Command(cmd[0], {
      args: cmd.slice(1),
      stdout: "inherit",
      stderr: "inherit",
    });

    const { code } = await process.output();

    if (code === 0) {
      console.log(`✅ Documentation generated successfully in ${DOCS_API_DIR}`);
    } else {
      console.error(`❌ Documentation generation failed with exit code ${code}`);
      Deno.exit(code);
    }
  } catch (error) {
    console.error(`❌ Error running documentation command:`, error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main();
}
