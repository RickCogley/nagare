#!/usr/bin/env deno run --allow-read --allow-write

/**
 * @fileoverview Post-processes generated documentation to replace ~ with URL-friendly alternatives
 * @description Fixes URLs in generated docs to work with Deno Deploy's URL handling
 *
 * InfoSec: Path traversal protection via validatePath function ensures only docs directory is modified
 */

import { walk } from "@std/fs";
import { join, relative, resolve } from "@std/path";

const DOCS_DIR = "./docs/api";
const TILDE_REPLACEMENT = "__SYMBOLS__"; // URL-friendly replacement for ~

/**
 * Validates that a path is within the docs directory to prevent path traversal
 * InfoSec: Prevents directory traversal attacks by ensuring all paths remain within DOCS_DIR
 */
function validatePath(path: string): boolean {
  const resolvedPath = resolve(path);
  const resolvedDocsDir = resolve(DOCS_DIR);
  return resolvedPath.startsWith(resolvedDocsDir);
}

/**
 * Renames directories containing ~ to use a URL-friendly alternative
 */
async function renameDirectories(): Promise<Map<string, string>> {
  const renamedPaths = new Map<string, string>();

  console.log("🔍 Scanning for directories with ~ character...");

  // First pass: identify and rename directories
  for await (const entry of walk(DOCS_DIR, { includeDirs: true, includeFiles: false })) {
    if (entry.name === "~") {
      const oldPath = entry.path;
      const parentDir = join(oldPath, "..");
      const newPath = join(parentDir, TILDE_REPLACEMENT);

      // Security check
      if (!validatePath(oldPath) || !validatePath(newPath)) {
        console.error(`❌ Security: Path validation failed for ${oldPath}`);
        continue;
      }

      try {
        await Deno.rename(oldPath, newPath);
        renamedPaths.set(relative(DOCS_DIR, oldPath), relative(DOCS_DIR, newPath));
        console.log(`✅ Renamed: ${relative(DOCS_DIR, oldPath)} → ${relative(DOCS_DIR, newPath)}`);
      } catch (error) {
        console.error(`❌ Failed to rename ${oldPath}:`, error);
      }
    }
  }

  return renamedPaths;
}

/**
 * Updates HTML files to replace references to ~ directories
 */
async function updateHtmlFiles(_renamedPaths: Map<string, string>) {
  console.log("\n📝 Updating HTML file references...");

  let updatedFiles = 0;

  for await (const entry of walk(DOCS_DIR, { exts: [".html"] })) {
    // Security check
    if (!validatePath(entry.path)) {
      console.error(`❌ Security: Path validation failed for ${entry.path}`);
      continue;
    }

    try {
      let content = await Deno.readTextFile(entry.path);
      let modified = false;

      // Replace all references to /~/ with the new path
      const tildePattern = /\/~\//g;
      if (tildePattern.test(content)) {
        content = content.replace(tildePattern, `/${TILDE_REPLACEMENT}/`);
        modified = true;
      }

      // Also handle URL-encoded tildes
      const encodedTildePattern = /\/%7E\//g;
      if (encodedTildePattern.test(content)) {
        content = content.replace(encodedTildePattern, `/${TILDE_REPLACEMENT}/`);
        modified = true;
      }

      // Handle HTML-encoded tildes in visible text
      const htmlEncodedPattern = /&#x2F;~&#x2F;/g;
      if (htmlEncodedPattern.test(content)) {
        content = content.replace(htmlEncodedPattern, `&#x2F;${TILDE_REPLACEMENT}&#x2F;`);
        modified = true;
      }

      if (modified) {
        await Deno.writeTextFile(entry.path, content);
        updatedFiles++;
        console.log(`✅ Updated: ${relative(DOCS_DIR, entry.path)}`);
      }
    } catch (error) {
      console.error(`❌ Failed to update ${entry.path}:`, error);
    }
  }

  console.log(`\n✨ Updated ${updatedFiles} HTML files`);
}

/**
 * Creates a redirect mapping file for the server to handle old URLs
 */
async function createRedirectMap(renamedPaths: Map<string, string>) {
  const redirects: Record<string, string> = {};

  for (const [oldPath, newPath] of renamedPaths) {
    // Create redirect entries for the directory itself
    redirects[`/${oldPath}/`] = `/${newPath}/`;

    // Also create redirects for common index patterns
    redirects[`/${oldPath}/index.html`] = `/${newPath}/index.html`;
  }

  const redirectMapPath = join(DOCS_DIR, "redirects.json");

  // Security check
  if (!validatePath(redirectMapPath)) {
    console.error("❌ Security: Invalid redirect map path");
    return;
  }

  await Deno.writeTextFile(
    redirectMapPath,
    JSON.stringify(redirects, null, 2),
  );

  console.log(`\n📋 Created redirect map at ${redirectMapPath}`);
}

/**
 * Main function to fix documentation URLs
 */
async function fixDocsUrls() {
  console.log("🚀 Fixing documentation URLs for Deno Deploy compatibility...\n");

  try {
    // Ensure docs directory exists
    const docsInfo = await Deno.stat(DOCS_DIR).catch(() => null);
    if (!docsInfo?.isDirectory) {
      console.error("❌ Documentation directory not found. Run 'deno task docs' first.");
      Deno.exit(1);
    }

    // Step 1: Rename directories
    const renamedPaths = await renameDirectories();

    if (renamedPaths.size === 0) {
      console.log("ℹ️  No directories with ~ character found. Documentation may already be fixed.");
      return;
    }

    // Step 2: Update HTML files
    await updateHtmlFiles(renamedPaths);

    // Step 3: Create redirect map
    await createRedirectMap(renamedPaths);

    console.log("\n✅ Documentation URLs fixed successfully!");
    console.log(`\nℹ️  The ~ character has been replaced with '${TILDE_REPLACEMENT}' in all URLs.`);
    console.log("ℹ️  Updated docs-server.ts will handle redirects automatically.");
  } catch (error) {
    console.error("❌ Error fixing documentation URLs:", error);
    Deno.exit(1);
  }
}

// Run the script
if (import.meta.main) {
  await fixDocsUrls();
}
