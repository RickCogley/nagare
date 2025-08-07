#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run

/**
 * Migration script to reorganize src/ files into folders
 * Run with: deno run -A scripts/migrate-to-folders.ts
 */

interface FileMigration {
  from: string;
  to: string;
}

const migrations: FileMigration[] = [
  // Core module (no dependencies)
  { from: "src/i18n.ts", to: "src/core/i18n.ts" },
  { from: "src/enhanced-error.ts", to: "src/core/enhanced-error.ts" },
  { from: "src/logger.ts", to: "src/core/logger.ts" },
  { from: "src/branded-messages.ts", to: "src/core/branded-messages.ts" },
  { from: "src/runtime-compat.ts", to: "src/core/runtime-compat.ts" },

  // Utils module
  { from: "src/utils.ts", to: "src/utils/utils.ts" },
  { from: "src/cli-utils.ts", to: "src/utils/cli-utils.ts" },
  { from: "src/std-progress-indicator.ts", to: "src/utils/std-progress-indicator.ts" },

  // Validation module
  { from: "src/validators.ts", to: "src/validation/validators.ts" },
  { from: "src/security-utils.ts", to: "src/validation/security-utils.ts" },
  { from: "src/permission-manager.ts", to: "src/validation/permission-manager.ts" },
  { from: "src/security-utils_test.ts", to: "src/validation/security-utils_test.ts" },

  // Git module
  { from: "src/git-operations.ts", to: "src/git/git-operations.ts" },
  { from: "src/github-integration.ts", to: "src/git/github-integration.ts" },
  { from: "src/github-actions-monitor.ts", to: "src/git/github-actions-monitor.ts" },

  // Templates module
  { from: "src/template-processor.ts", to: "src/templates/template-processor.ts" },
  { from: "src/changelog-generator.ts", to: "src/templates/changelog-generator.ts" },
  { from: "src/doc-generator.ts", to: "src/templates/doc-generator.ts" },
  { from: "src/template-security_test.ts", to: "src/templates/template-security_test.ts" },

  // Release module
  { from: "src/release-manager.ts", to: "src/release/release-manager.ts" },
  { from: "src/version-utils.ts", to: "src/release/version-utils.ts" },
  { from: "src/file-handlers.ts", to: "src/release/file-handlers.ts" },
  { from: "src/rollback-manager.ts", to: "src/release/rollback-manager.ts" },
  { from: "src/backup-manager.ts", to: "src/release/backup-manager.ts" },
  { from: "src/release-state-tracker.ts", to: "src/release/release-state-tracker.ts" },

  // Monitoring module
  { from: "src/log-parser.ts", to: "src/monitoring/log-parser.ts" },
  { from: "src/auto-fixer.ts", to: "src/monitoring/auto-fixer.ts" },
  { from: "src/jsr-verifier.ts", to: "src/monitoring/jsr-verifier.ts" },
  { from: "src/error-reference.ts", to: "src/monitoring/error-reference.ts" },
  // UI module files already in place, no migration needed
];

// Import path updates needed after migration
const importUpdates = [
  // Update imports from moved files to their new locations
  {
    pattern: /from "\.\/i18n\.ts"/g,
    replacement: 'from "./core/i18n.ts"',
  },
  {
    pattern: /from "\.\/enhanced-error\.ts"/g,
    replacement: 'from "./core/enhanced-error.ts"',
  },
  {
    pattern: /from "\.\/logger\.ts"/g,
    replacement: 'from "./core/logger.ts"',
  },
  {
    pattern: /from "\.\/branded-messages\.ts"/g,
    replacement: 'from "./core/branded-messages.ts"',
  },
  // Add cross-module imports
  {
    pattern: /from "\.\.\/i18n\.ts"/g,
    replacement: 'from "../core/i18n.ts"',
  },
  {
    pattern: /from "\.\.\/enhanced-error\.ts"/g,
    replacement: 'from "../core/enhanced-error.ts"',
  },
  // ... many more patterns needed
];

async function moveFile(from: string, to: string): Promise<void> {
  try {
    const content = await Deno.readTextFile(from);
    await Deno.writeTextFile(to, content);
    await Deno.remove(from);
    console.log(`✅ Moved ${from} -> ${to}`);
  } catch (error) {
    console.error(`❌ Failed to move ${from}: ${error.message}`);
    throw error;
  }
}

async function updateImports(filePath: string): Promise<void> {
  try {
    let content = await Deno.readTextFile(filePath);
    let updated = false;

    for (const update of importUpdates) {
      if (update.pattern.test(content)) {
        content = content.replace(update.pattern, update.replacement);
        updated = true;
      }
    }

    if (updated) {
      await Deno.writeTextFile(filePath, content);
      console.log(`📝 Updated imports in ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Failed to update imports in ${filePath}: ${error.message}`);
  }
}

async function main() {
  console.log("🚀 Starting migration to folder structure...\n");

  // Step 1: Check if we're in the right directory
  try {
    await Deno.stat("src");
    await Deno.stat("nagare.config.ts");
  } catch {
    console.error("❌ Please run this script from the Nagare project root");
    Deno.exit(1);
  }

  // Step 2: Create backup
  console.log("📦 Creating backup...");
  const backupResult = await new Deno.Command("git", {
    args: ["stash", "push", "-m", "Pre-migration backup"],
  }).output();

  if (!backupResult.success) {
    console.warn("⚠️  Could not create git stash backup");
  }

  // Step 3: Move files
  console.log("\n📁 Moving files to new structure...");
  for (const migration of migrations) {
    await moveFile(migration.from, migration.to);
  }

  // Step 4: Update imports in all TypeScript files
  console.log("\n🔄 Updating import statements...");

  // Find all TypeScript files
  const files: string[] = [];
  for await (const entry of Deno.readDir("src")) {
    if (entry.isDirectory) {
      for await (const subEntry of Deno.readDir(`src/${entry.name}`)) {
        if (subEntry.name.endsWith(".ts")) {
          files.push(`src/${entry.name}/${subEntry.name}`);
        }
      }
    } else if (entry.name.endsWith(".ts")) {
      files.push(`src/${entry.name}`);
    }
  }

  // Also check root level files that might import from src
  files.push("cli.ts", "nagare.config.ts");

  for (const file of files) {
    try {
      await updateImports(file);
    } catch {
      // File might not exist, that's okay
    }
  }

  // Step 5: Run tests to verify
  console.log("\n🧪 Running tests to verify migration...");
  const testResult = await new Deno.Command("deno", {
    args: ["test", "--allow-all"],
  }).output();

  if (testResult.success) {
    console.log("✅ Tests passed!");
  } else {
    console.error("❌ Tests failed - you may need to manually fix some imports");
  }

  console.log("\n✨ Migration complete!");
  console.log("Next steps:");
  console.log("1. Review the changes with: git status");
  console.log("2. Test the application manually");
  console.log("3. Commit the changes when satisfied");
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("💥 Migration failed:", error);
    Deno.exit(1);
  });
}
