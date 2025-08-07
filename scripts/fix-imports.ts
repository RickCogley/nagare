#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Fix all import statements after folder migration
 */

interface ImportFix {
  file: string;
  fixes: Array<{ from: string | RegExp; to: string }>;
}

// Define all import fixes needed
const importFixes: ImportFix[] = [
  // Fix imports in moved core files
  {
    file: "src/core/logger.ts",
    fixes: [
      { from: `from "./enhanced-error.ts"`, to: `from "./enhanced-error.ts"` },
      { from: `from "./i18n.ts"`, to: `from "./i18n.ts"` },
    ],
  },
  {
    file: "src/core/enhanced-error.ts",
    fixes: [
      { from: `from "./i18n.ts"`, to: `from "./i18n.ts"` },
    ],
  },

  // Fix imports in utils
  {
    file: "src/utils/utils.ts",
    fixes: [
      { from: `from "./enhanced-error.ts"`, to: `from "../core/enhanced-error.ts"` },
    ],
  },
  {
    file: "src/utils/cli-utils.ts",
    fixes: [
      { from: `from "./i18n.ts"`, to: `from "../core/i18n.ts"` },
    ],
  },

  // Fix imports in validation
  {
    file: "src/validation/security-utils.ts",
    fixes: [
      { from: `from "./enhanced-error.ts"`, to: `from "../core/enhanced-error.ts"` },
    ],
  },

  // Fix imports in git module
  {
    file: "src/git/git-operations.ts",
    fixes: [
      { from: `from "./enhanced-error.ts"`, to: `from "../core/enhanced-error.ts"` },
      { from: `from "./logger.ts"`, to: `from "../core/logger.ts"` },
    ],
  },
  {
    file: "src/git/github-integration.ts",
    fixes: [
      { from: `from "./branded-messages.ts"`, to: `from "../core/branded-messages.ts"` },
      { from: `from "./enhanced-error.ts"`, to: `from "../core/enhanced-error.ts"` },
    ],
  },
  {
    file: "src/git/github-actions-monitor.ts",
    fixes: [
      { from: `from "./utils.ts"`, to: `from "../utils/utils.ts"` },
    ],
  },

  // Fix imports in templates
  {
    file: "src/templates/template-processor.ts",
    fixes: [
      { from: `from "./enhanced-error.ts"`, to: `from "../core/enhanced-error.ts"` },
      { from: `from "./logger.ts"`, to: `from "../core/logger.ts"` },
      { from: `from "./security-utils.ts"`, to: `from "../validation/security-utils.ts"` },
    ],
  },
  {
    file: "src/templates/changelog-generator.ts",
    fixes: [
      { from: `from "./branded-messages.ts"`, to: `from "../core/branded-messages.ts"` },
    ],
  },
  {
    file: "src/templates/doc-generator.ts",
    fixes: [
      { from: `from "./branded-messages.ts"`, to: `from "../core/branded-messages.ts"` },
      { from: `from "./enhanced-error.ts"`, to: `from "../core/enhanced-error.ts"` },
    ],
  },
  {
    file: "src/templates/template-security_test.ts",
    fixes: [
      { from: `from "./template-processor.ts"`, to: `from "./template-processor.ts"` },
    ],
  },

  // Fix imports in release module
  {
    file: "src/release/release-manager.ts",
    fixes: [
      { from: `from "./git-operations.ts"`, to: `from "../git/git-operations.ts"` },
      { from: `from "./version-utils.ts"`, to: `from "./version-utils.ts"` },
      { from: `from "./changelog-generator.ts"`, to: `from "../templates/changelog-generator.ts"` },
      { from: `from "./github-integration.ts"`, to: `from "../git/github-integration.ts"` },
      { from: `from "./template-processor.ts"`, to: `from "../templates/template-processor.ts"` },
      { from: `from "./doc-generator.ts"`, to: `from "../templates/doc-generator.ts"` },
      { from: `from "./logger.ts"`, to: `from "../core/logger.ts"` },
      { from: `from "./file-handlers.ts"`, to: `from "./file-handlers.ts"` },
      { from: `from "./security-utils.ts"`, to: `from "../validation/security-utils.ts"` },
      { from: `from "./enhanced-error.ts"`, to: `from "../core/enhanced-error.ts"` },
      { from: `from "./i18n.ts"`, to: `from "../core/i18n.ts"` },
      { from: `from "./cli-utils.ts"`, to: `from "../utils/cli-utils.ts"` },
      { from: `from "./jsr-verifier.ts"`, to: `from "../monitoring/jsr-verifier.ts"` },
      { from: `from "./github-actions-monitor.ts"`, to: `from "../git/github-actions-monitor.ts"` },
      { from: `from "./log-parser.ts"`, to: `from "../monitoring/log-parser.ts"` },
      { from: `from "./auto-fixer.ts"`, to: `from "../monitoring/auto-fixer.ts"` },
      { from: `from "./std-progress-indicator.ts"`, to: `from "../utils/std-progress-indicator.ts"` },
      { from: `from "./backup-manager.ts"`, to: `from "./backup-manager.ts"` },
      { from: `from "./release-state-tracker.ts"`, to: `from "./release-state-tracker.ts"` },
    ],
  },
  {
    file: "src/release/version-utils.ts",
    fixes: [
      { from: `from "./enhanced-error.ts"`, to: `from "../core/enhanced-error.ts"` },
      { from: `from "./git-operations.ts"`, to: `from "../git/git-operations.ts"` },
    ],
  },
  {
    file: "src/release/file-handlers.ts",
    fixes: [
      { from: `from "./enhanced-error.ts"`, to: `from "../core/enhanced-error.ts"` },
      { from: `from "./logger.ts"`, to: `from "../core/logger.ts"` },
      { from: `from "./security-utils.ts"`, to: `from "../validation/security-utils.ts"` },
    ],
  },
  {
    file: "src/release/rollback-manager.ts",
    fixes: [
      { from: `from "./cli-utils.ts"`, to: `from "../utils/cli-utils.ts"` },
      { from: `from "./enhanced-error.ts"`, to: `from "../core/enhanced-error.ts"` },
      { from: `from "./git-operations.ts"`, to: `from "../git/git-operations.ts"` },
      { from: `from "./i18n.ts"`, to: `from "../core/i18n.ts"` },
      { from: `from "./logger.ts"`, to: `from "../core/logger.ts"` },
      { from: `from "./security-utils.ts"`, to: `from "../validation/security-utils.ts"` },
    ],
  },
  {
    file: "src/release/backup-manager.ts",
    fixes: [
      { from: `from "./enhanced-error.ts"`, to: `from "../core/enhanced-error.ts"` },
      { from: `from "./logger.ts"`, to: `from "../core/logger.ts"` },
      { from: `from "./security-utils.ts"`, to: `from "../validation/security-utils.ts"` },
    ],
  },
  {
    file: "src/release/release-state-tracker.ts",
    fixes: [
      { from: `from "./logger.ts"`, to: `from "../core/logger.ts"` },
    ],
  },

  // Fix imports in monitoring
  {
    file: "src/monitoring/auto-fixer.ts",
    fixes: [
      { from: `from "./log-parser.ts"`, to: `from "./log-parser.ts"` },
      { from: `from "./utils.ts"`, to: `from "../utils/utils.ts"` },
    ],
  },

  // Fix imports in CLI
  {
    file: "cli.ts",
    fixes: [
      { from: `from "./src/release-manager.ts"`, to: `from "./src/release/release-manager.ts"` },
      { from: `from "./src/rollback-manager.ts"`, to: `from "./src/release/rollback-manager.ts"` },
      { from: `from "./src/doc-generator.ts"`, to: `from "./src/templates/doc-generator.ts"` },
      { from: `from "./src/logger.ts"`, to: `from "./src/core/logger.ts"` },
      { from: `from "./src/i18n.ts"`, to: `from "./src/core/i18n.ts"` },
      { from: `from "./src/cli-utils.ts"`, to: `from "./src/utils/cli-utils.ts"` },
      { from: `from "./src/enhanced-error.ts"`, to: `from "./src/core/enhanced-error.ts"` },
      { from: `from "./src/branded-messages.ts"`, to: `from "./src/core/branded-messages.ts"` },
    ],
  },
];

async function fixImports() {
  console.log("🔧 Fixing import statements...\n");

  for (const fix of importFixes) {
    try {
      let content = await Deno.readTextFile(fix.file);
      let modified = false;

      for (const replacement of fix.fixes) {
        const pattern = typeof replacement.from === "string" ? replacement.from : replacement.from;

        if (content.includes(pattern.toString())) {
          content = content.replace(replacement.from, replacement.to);
          modified = true;
          console.log(`  ✅ Fixed import in ${fix.file}`);
        }
      }

      if (modified) {
        await Deno.writeTextFile(fix.file, content);
      }
    } catch (error) {
      console.error(`  ❌ Error fixing ${fix.file}: ${error.message}`);
    }
  }

  console.log("\n✨ Import fixes complete!");
}

if (import.meta.main) {
  await fixImports();
}
