#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Generate TypeScript types from translation files
 */

import { parse as parseYAML } from "@std/yaml";

interface TranslationStructure {
  [key: string]: string | TranslationStructure;
}

function generateTypeDefinition(obj: TranslationStructure, indent = 0): string {
  const spaces = "  ".repeat(indent);
  let result = "{\n";

  for (const [key, value] of Object.entries(obj)) {
    // Escape key if needed
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `"${key}"`;

    if (typeof value === "string") {
      result += `${spaces}  ${safeKey}: string;\n`;
    } else {
      result += `${spaces}  ${safeKey}: ${generateTypeDefinition(value, indent + 1)}`;
    }
  }

  result += `${spaces}}`;
  return indent === 0 ? result : result + ";\n";
}

function generateAllKeys(obj: TranslationStructure, prefix = ""): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      keys.push(fullKey);
    } else {
      keys.push(...generateAllKeys(value, fullKey));
    }
  }

  return keys;
}

async function generateTypes() {
  try {
    // Read English translations as the source of truth
    const enContent = await Deno.readTextFile("./locales/en.yaml");
    const translations = parseYAML(enContent) as TranslationStructure;

    // Generate type definition
    const typeDefinition = `// Auto-generated from locales/en.yaml
// DO NOT EDIT MANUALLY
// Run: deno task i18n:types to regenerate

/**
 * Structure of translation keys
 */
export interface TranslationKeys ${generateTypeDefinition(translations)}

/**
 * All available translation keys as string literals
 */
export type TranslationKey = ${
      generateAllKeys(translations)
        .map((k) => `"${k}"`)
        .join(" | ")
    };

/**
 * Helper type to ensure all locales have the same keys
 */
export type TranslationData = {
  [K in TranslationKey]: string;
};
`;

    // Write to schema file
    await Deno.writeTextFile("./locales/schema.ts", typeDefinition);
    console.log("✅ Generated translation types at ./locales/schema.ts");

    // Validate other locale files have the same keys
    const localeFiles = [];
    for await (const entry of Deno.readDir("./locales")) {
      if (entry.isFile && entry.name.endsWith(".yaml") && entry.name !== "en.yaml") {
        localeFiles.push(entry.name);
      }
    }

    const enKeys = new Set(generateAllKeys(translations));

    for (const localeFile of localeFiles) {
      const content = await Deno.readTextFile(`./locales/${localeFile}`);
      const localeData = parseYAML(content) as TranslationStructure;
      const localeKeys = new Set(generateAllKeys(localeData));

      // Check for missing keys
      const missing = [...enKeys].filter((k) => !localeKeys.has(k));
      const extra = [...localeKeys].filter((k) => !enKeys.has(k));

      if (missing.length > 0) {
        console.warn(`⚠️  ${localeFile} is missing keys:`, missing);
      }
      if (extra.length > 0) {
        console.warn(`⚠️  ${localeFile} has extra keys:`, extra);
      }

      if (missing.length === 0 && extra.length === 0) {
        console.log(`✅ ${localeFile} has all required keys`);
      }
    }
  } catch (error) {
    console.error("❌ Failed to generate types:", error);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await generateTypes();
}
