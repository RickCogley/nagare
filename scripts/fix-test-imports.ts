#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Fix import paths in test files after folder migration
 */

interface ImportFix {
  file: string;
  fixes: Array<{
    from: string;
    to: string;
  }>;
}

const importFixes: ImportFix[] = [
  {
    file: "tests/additional-exports_test.ts",
    fixes: [
      // Already fixed: { from: `from "../src/template-processor.ts"`, to: `from "../src/templates/template-processor.ts"` },
    ]
  },
  {
    file: "tests/changelog-generator_test.ts",
    fixes: [
      { from: `from "../src/changelog-generator.ts"`, to: `from "../src/templates/changelog-generator.ts"` },
    ]
  },
  {
    file: "tests/cli-utils-i18n_test.ts",
    fixes: [
      { from: `from "../src/cli-utils.ts"`, to: `from "../src/utils/cli-utils.ts"` },
      { from: `from "../src/i18n.ts"`, to: `from "../src/core/i18n.ts"` },
    ]
  },
  {
    file: "tests/enhanced-error_test.ts",
    fixes: [
      { from: `from "../src/enhanced-error.ts"`, to: `from "../src/core/enhanced-error.ts"` },
    ]
  },
  {
    file: "tests/enhanced-error-backward-compat_test.ts",
    fixes: [
      { from: `from "../src/enhanced-error.ts"`, to: `from "../src/core/enhanced-error.ts"` },
    ]
  },
  {
    file: "tests/enhanced-error-i18n_test.ts",
    fixes: [
      { from: `from "../src/enhanced-error.ts"`, to: `from "../src/core/enhanced-error.ts"` },
      { from: `from "../src/i18n.ts"`, to: `from "../src/core/i18n.ts"` },
    ]
  },
  {
    file: "tests/git-operations_test.ts",
    fixes: [
      { from: `from "../src/git-operations.ts"`, to: `from "../src/git/git-operations.ts"` },
    ]
  },
  {
    file: "tests/i18n_test.ts",
    fixes: [
      { from: `from "../src/i18n.ts"`, to: `from "../src/core/i18n.ts"` },
    ]
  },
  {
    file: "tests/logger_test.ts",
    fixes: [
      { from: `from "../src/logger.ts"`, to: `from "../src/core/logger.ts"` },
    ]
  },
  {
    file: "tests/logger-i18n_test.ts",
    fixes: [
      { from: `from "../src/logger.ts"`, to: `from "../src/core/logger.ts"` },
      { from: `from "../src/i18n.ts"`, to: `from "../src/core/i18n.ts"` },
    ]
  },
  {
    file: "tests/nagare_test.ts",
    fixes: [
      { from: `from "../src/release-manager.ts"`, to: `from "../src/release/release-manager.ts"` },
    ]
  },
  {
    file: "tests/template-security_test.ts",
    fixes: [
      { from: `from "../src/template-processor.ts"`, to: `from "../src/templates/template-processor.ts"` },
    ]
  },
  {
    file: "tests/version-utils_test.ts",
    fixes: [
      { from: `from "../src/version-utils.ts"`, to: `from "../src/release/version-utils.ts"` },
    ]
  },
  {
    file: "tests/ui/app-context.test.ts",
    fixes: [
      { from: `from "../../src/ui/app-context.ts"`, to: `from "../../src/ui/app-context.ts"` }, // Already correct
    ]
  },
  {
    file: "tests/ui/release-header.test.ts",
    fixes: [
      { from: `from "../../src/ui/release-header.ts"`, to: `from "../../src/ui/release-header.ts"` }, // Already correct
    ]
  },
];

async function fixImports() {
  let totalFixes = 0;
  
  for (const fileConfig of importFixes) {
    if (fileConfig.fixes.length === 0) continue;
    
    try {
      let content = await Deno.readTextFile(fileConfig.file);
      let fixCount = 0;
      
      for (const fix of fileConfig.fixes) {
        if (content.includes(fix.from)) {
          content = content.replace(fix.from, fix.to);
          fixCount++;
        }
      }
      
      if (fixCount > 0) {
        await Deno.writeTextFile(fileConfig.file, content);
        console.log(`✅ Fixed ${fixCount} imports in ${fileConfig.file}`);
        totalFixes += fixCount;
      }
    } catch (error) {
      console.error(`❌ Error processing ${fileConfig.file}:`, error.message);
    }
  }
  
  console.log(`\n🎉 Total: Fixed ${totalFixes} import statements`);
}

if (import.meta.main) {
  await fixImports();
}