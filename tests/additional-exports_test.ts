/**
 * @fileoverview Tests for additional exports functionality
 * @description Verify that the additional exports feature works correctly
 */

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { TemplateProcessor } from "../src/template-processor.ts";
import type { NagareConfig, TemplateData } from "../types.ts";
import { TemplateFormat } from "../config.ts";

Deno.test("TemplateProcessor - Additional Exports", async (t) => {
  const baseConfig: NagareConfig = {
    project: {
      name: "Test Project",
      description: "Test Description",
      repository: "https://github.com/test/test",
    },
    versionFile: {
      path: "./version.ts",
      template: TemplateFormat.TYPESCRIPT,
    },
  };

  const baseData: TemplateData = {
    version: "1.0.0",
    buildDate: new Date().toISOString(),
    gitCommit: "abcdef123456",
    environment: "production",
    releaseNotes: {
      version: "1.0.0",
      date: new Date().toISOString().split("T")[0],
      added: ["New feature"],
      changed: [],
      deprecated: [],
      fixed: [],
      removed: [],
      security: [],
    },
    metadata: {},
    project: {
      name: "Test Project",
      description: "Test Description",
      repository: "https://github.com/test/test",
    },
  };

  await t.step("should add const exports with values", async () => {
    const config: NagareConfig = {
      ...baseConfig,
      versionFile: {
        ...baseConfig.versionFile,
        additionalExports: [
          {
            name: "API_CONFIG",
            type: "const",
            value: { url: "https://api.example.com", timeout: 5000 },
            description: "API configuration",
            asConst: true,
          },
        ],
      },
    };

    const processor = new TemplateProcessor(config);
    const content = await processor.generateVersionFile(baseData);

    assertStringIncludes(content, "// Additional exports configured in nagare.config.ts");
    assertStringIncludes(content, "/** API configuration */");
    assertStringIncludes(content, "export const API_CONFIG =");
    assertStringIncludes(content, '"url": "https://api.example.com"');
    assertStringIncludes(content, '"timeout": 5000');
    assertStringIncludes(content, "as const;");
  });

  await t.step("should add class exports", async () => {
    const config: NagareConfig = {
      ...baseConfig,
      versionFile: {
        ...baseConfig.versionFile,
        additionalExports: [
          {
            name: "VersionUtils",
            type: "class",
            description: "Utility class for version operations",
            content: `
  static getFullVersion(): string {
    return \`\${VERSION} (Build: \${BUILD_INFO.buildDate})\`;
  }

  static getMajorVersion(): number {
    return BUILD_INFO.versionComponents.major;
  }`,
          },
        ],
      },
    };

    const processor = new TemplateProcessor(config);
    const content = await processor.generateVersionFile(baseData);

    assertStringIncludes(content, "/** Utility class for version operations */");
    assertStringIncludes(content, "export class VersionUtils {");
    assertStringIncludes(content, "static getFullVersion(): string {");
    assertStringIncludes(content, "static getMajorVersion(): number {");
  });

  await t.step("should add function exports", async () => {
    const config: NagareConfig = {
      ...baseConfig,
      versionFile: {
        ...baseConfig.versionFile,
        additionalExports: [
          {
            name: "formatVersion",
            type: "function",
            content: `(prefix: string = "v"): string {
  return \`\${prefix}\${VERSION}\`;
}`,
            description: "Format version with prefix",
          },
          {
            name: "checkVersion",
            type: "function",
            async: true,
            content: `(): Promise<boolean> {
  // Async version check logic
  return Promise.resolve(true);
}`,
          },
        ],
      },
    };

    const processor = new TemplateProcessor(config);
    const content = await processor.generateVersionFile(baseData);

    assertStringIncludes(content, "/** Format version with prefix */");
    assertStringIncludes(content, "export function formatVersion");
    assertStringIncludes(content, "export async function checkVersion");
  });

  await t.step("should support extend prepend and append", async () => {
    const config: NagareConfig = {
      ...baseConfig,
      versionFile: {
        ...baseConfig.versionFile,
        extend: {
          prepend: "// This file is auto-generated\n// Do not edit manually\n\n",
          append: "\n\n// End of auto-generated content",
        },
      },
    };

    const processor = new TemplateProcessor(config);
    const content = await processor.generateVersionFile(baseData);

    assertEquals(content.startsWith("// This file is auto-generated"), true);
    assertStringIncludes(content, "// End of auto-generated content");
  });

  await t.step("should combine all extension features", async () => {
    const config: NagareConfig = {
      ...baseConfig,
      versionFile: {
        ...baseConfig.versionFile,
        extend: {
          prepend: "// Auto-generated file\n\n",
          append: "\n// EOF",
        },
        additionalExports: [
          {
            name: "CONFIG",
            type: "const",
            value: { feature: "enabled" },
            asConst: true,
          },
          {
            name: "Utils",
            type: "class",
            content: `
  static isEnabled(): boolean {
    return CONFIG.feature === "enabled";
  }`,
          },
        ],
      },
    };

    const processor = new TemplateProcessor(config);
    const content = await processor.generateVersionFile(baseData);

    // Check order: prepend -> original content -> additional exports -> append
    assertEquals(content.startsWith("// Auto-generated file"), true);
    assertStringIncludes(content, "export const VERSION");
    assertStringIncludes(content, "// Additional exports configured");
    assertStringIncludes(content, "export const CONFIG");
    assertStringIncludes(content, "export class Utils");
    assertEquals(content.endsWith("// EOF"), true);
  });

  await t.step("should validate export names", async () => {
    const config: NagareConfig = {
      ...baseConfig,
      versionFile: {
        ...baseConfig.versionFile,
        additionalExports: [
          {
            name: "123invalid", // Invalid name starting with number
            type: "const",
            value: "test",
          },
        ],
      },
    };

    const processor = new TemplateProcessor(config);
    try {
      await processor.generateVersionFile(baseData);
      throw new Error("Should have thrown error for invalid export name");
    } catch (error) {
      // Check for either the translation key or the actual error message
      const errorMessage = (error as Error).message;
      const hasValidError = errorMessage.includes("errors.configInvalid") ||
        errorMessage.includes("Invalid export name") ||
        errorMessage.includes("123invalid");
      assertEquals(
        hasValidError,
        true,
        `Expected error about invalid export name, got: ${errorMessage}`,
      );
    }
  });

  await t.step("should handle TypeScript types and interfaces", async () => {
    const config: NagareConfig = {
      ...baseConfig,
      versionFile: {
        ...baseConfig.versionFile,
        additionalExports: [
          {
            name: "VersionInfo",
            type: "interface",
            content: `{
  version: string;
  major: number;
  minor: number;
  patch: number;
}`,
          },
          {
            name: "VersionString",
            type: "type",
            content: "`v${number}.${number}.${number}`",
          },
        ],
      },
    };

    const processor = new TemplateProcessor(config);
    const content = await processor.generateVersionFile(baseData);

    assertStringIncludes(content, "export interface VersionInfo {");
    assertStringIncludes(content, "export type VersionString =");
  });

  await t.step("should warn for JSON/YAML templates", async () => {
    const config: NagareConfig = {
      ...baseConfig,
      versionFile: {
        path: "./version.json",
        template: TemplateFormat.JSON,
        additionalExports: [
          {
            name: "TEST",
            type: "const",
            value: "test",
          },
        ],
      },
    };

    const processor = new TemplateProcessor(config);
    const content = await processor.generateVersionFile(baseData);

    // Should not include additional exports for JSON
    assertEquals(content.includes("Additional exports"), false);
  });
});
