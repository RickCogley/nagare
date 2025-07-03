#!/usr/bin/env -S deno run --allow-read
/**
 * Find all NagareError instances that need i18n updates
 */

import { walk } from "https://deno.land/std@0.208.0/fs/walk.ts";

const errorPattern = /new NagareError\s*\(/g;

async function findNagareErrors() {
  const results: Array<{ file: string; line: number; code: string }> = [];

  for await (const entry of walk("./src", { exts: [".ts"], skip: [/test/, /types/] })) {
    if (entry.isFile) {
      const content = await Deno.readTextFile(entry.path);
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        if (errorPattern.test(line)) {
          // Look ahead to get more context
          const contextLines = lines.slice(index, Math.min(index + 10, lines.length));
          const context = contextLines.join("\n");

          results.push({
            file: entry.path,
            line: index + 1,
            code: context,
          });
        }
      });
    }
  }

  console.log(`Found ${results.length} NagareError instances to update:\n`);

  results.forEach((result) => {
    console.log(`${result.file}:${result.line}`);
    console.log(result.code.split("\n")[0].trim());
    console.log();
  });

  // Group by file
  const byFile = results.reduce((acc, curr) => {
    if (!acc[curr.file]) acc[curr.file] = [];
    acc[curr.file].push(curr.line);
    return acc;
  }, {} as Record<string, number[]>);

  console.log("\nSummary by file:");
  Object.entries(byFile).forEach(([file, lines]) => {
    console.log(`${file}: ${lines.length} instances at lines ${lines.join(", ")}`);
  });
}

await findNagareErrors();
