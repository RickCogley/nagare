#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * @fileoverview Inline template files for JSR publishing
 * @description Transforms text imports into string constants for JSR compatibility
 *
 * This script:
 * 1. Finds all files with text imports
 * 2. Reads the imported template files
 * 3. Replaces imports with inline string constants
 * 4. Outputs transformed files to a build directory
 */

import { walk } from "jsr:@std/fs@1.0.8/walk";
import { ensureDir } from "jsr:@std/fs@1.0.8/ensure-dir";
import { dirname, join, relative } from "jsr:@std/path@1.0.8";

const SOURCE_DIR = ".";
const BUILD_DIR = "./build";
const TEMPLATE_DIR = "./templates";

// Regex to match text imports
const TEXT_IMPORT_REGEX =
  /import\s+(\w+)\s+from\s+["']([^"']+)["']\s+with\s+\{\s*type:\s*["']text["']\s*\}/g;

async function readTemplate(templatePath: string): Promise<string> {
  try {
    const content = await Deno.readTextFile(templatePath);
    // Escape the content for use in a template literal
    return content
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\${/g, "\\${");
  } catch (error) {
    console.error(`Failed to read template: ${templatePath}`, error);
    throw error;
  }
}

async function transformFile(filePath: string, outputPath: string): Promise<boolean> {
  const content = await Deno.readTextFile(filePath);

  // Check if file has text imports
  if (!TEXT_IMPORT_REGEX.test(content)) {
    // Just copy the file as-is
    await ensureDir(dirname(outputPath));
    await Deno.copyFile(filePath, outputPath);
    return false;
  }

  // Reset regex
  TEXT_IMPORT_REGEX.lastIndex = 0;

  let transformed = content;
  const imports: Array<{ varName: string; path: string; content: string }> = [];

  // Collect all text imports
  let match;
  while ((match = TEXT_IMPORT_REGEX.exec(content)) !== null) {
    const [_fullMatch, varName, importPath] = match;

    // Resolve the template path
    let templatePath: string;
    if (importPath.startsWith(".")) {
      // Relative import
      templatePath = join(dirname(filePath), importPath);
    } else {
      // Assume it's from templates directory
      templatePath = join(TEMPLATE_DIR, importPath);
    }

    const templateContent = await readTemplate(templatePath);
    imports.push({ varName, path: importPath, content: templateContent });
  }

  // Replace imports with constants
  for (const imp of imports) {
    const importRegex = new RegExp(
      `import\\s+${imp.varName}\\s+from\\s+["']${
        imp.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      }["']\\s+with\\s+\\{\\s*type:\\s*["']text["']\\s*\\}`,
      "g",
    );

    // Create the replacement constant
    const constantDeclaration =
      `// Inlined from ${imp.path}\nconst ${imp.varName} = \`${imp.content}\`;`;

    transformed = transformed.replace(importRegex, constantDeclaration);
  }

  // Write transformed file
  await ensureDir(dirname(outputPath));
  await Deno.writeTextFile(outputPath, transformed);

  return true;
}

async function inlineTemplates() {
  console.log("🔄 Starting template inlining for JSR publishing...");

  // Ensure build directory exists
  await ensureDir(BUILD_DIR);

  let transformedCount = 0;
  let copiedCount = 0;

  // Walk through source files
  for await (
    const entry of walk(SOURCE_DIR, {
      exts: [".ts", ".js"],
      skip: [/test/, /_test\.ts$/, /^build/, /^\.git/, /^node_modules/, /^scripts/, /^docs/],
    })
  ) {
    if (entry.isFile) {
      const relativePath = relative(SOURCE_DIR, entry.path);
      const outputPath = join(BUILD_DIR, relativePath);

      const wasTransformed = await transformFile(entry.path, outputPath);

      if (wasTransformed) {
        transformedCount++;
        console.log(`✅ Transformed: ${relativePath}`);
      } else {
        copiedCount++;
      }
    }
  }

  // Copy other necessary files
  const additionalFiles = [
    "mod.ts",
    "cli.ts",
    "types.ts",
    "version.ts",
    "nagare.config.ts",
    "deno.json",
    "jsr.json",
    "README.md",
    "LICENSE",
    "locales/en.yaml",
    "locales/ja.yaml",
  ];

  for (const file of additionalFiles) {
    try {
      const sourcePath = `./${file}`;
      const outputPath = join(BUILD_DIR, file);

      if (file.endsWith(".ts") || file.endsWith(".js")) {
        await transformFile(sourcePath, outputPath);
      } else {
        await ensureDir(dirname(outputPath));
        await Deno.copyFile(sourcePath, outputPath);
      }

      console.log(`📄 Copied: ${file}`);
    } catch (error) {
      console.warn(
        `⚠️  Skipped ${file}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Create a .gitignore in build directory to prevent exclusion issues
  await Deno.writeTextFile(join(BUILD_DIR, ".gitignore"), "# Empty gitignore to override parent\n");

  console.log(`
🎉 Template inlining complete!
   - Transformed: ${transformedCount} files
   - Copied: ${copiedCount} files
   - Output: ${BUILD_DIR}/
   
📦 Ready for JSR publishing:
   cd ${BUILD_DIR}
   deno publish
  `);
}

// Run if called directly
if (import.meta.main) {
  try {
    await inlineTemplates();
  } catch (error) {
    console.error("❌ Template inlining failed:", error);
    Deno.exit(1);
  }
}
