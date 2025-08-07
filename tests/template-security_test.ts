/**
 * Tests for template security validation improvements
 */

import { assertEquals } from "@std/assert";
import { TemplateProcessor } from "../src/templates/template-processor.ts";
import type { NagareConfig } from "../types.ts";
import { TemplateFormat } from "../config.ts";

const createConfig = (templateSandbox: "strict" | "moderate" | "disabled"): NagareConfig => ({
  project: {
    name: "Test Project",
    description: "Test",
    repository: "https://github.com/test/test",
  },
  versionFile: {
    path: "./version.ts",
    template: TemplateFormat.TYPESCRIPT,
  },
  security: {
    templateSandbox,
  },
});

Deno.test("Template Security - Should allow 'window' as object property in strict mode", async () => {
  const config = createConfig("strict");
  const processor = new TemplateProcessor(config);

  // Template with "window" as a property name (should be allowed)
  const template = `
export const CONFIG = {
  rateLimiting: {
    window: "1 hour",
    maxRequests: 20
  }
};
`;

  const result = await processor.validateTemplate(template);
  assertEquals(result.valid, true, "Should allow 'window' as property name");
});

Deno.test("Template Security - Should block 'window' as global object in strict mode", async () => {
  const config = createConfig("strict");
  const processor = new TemplateProcessor(config);

  // Template trying to access window object (should be blocked)
  const template = `
const w = window;
export const CONFIG = { data: w.location };
`;

  const validation = await processor["validateTemplateSecure"](template);
  assertEquals(validation.valid, false, "Should block 'window' as global object");
});

Deno.test("Template Security - Should block 'globalThis' access in strict mode", async () => {
  const config = createConfig("strict");
  const processor = new TemplateProcessor(config);

  // Template trying to access globalThis (should be blocked)
  const template = `
const g = globalThis;
export const CONFIG = { data: g.Deno };
`;

  const validation = await processor["validateTemplateSecure"](template);
  assertEquals(validation.valid, false, "Should block 'globalThis' access");
});

Deno.test("Template Security - Should allow 'global' as property name in strict mode", async () => {
  const config = createConfig("strict");
  const processor = new TemplateProcessor(config);

  // Template with "global" as a property name (should be allowed)
  const template = `
export const SETTINGS = {
  global: {
    timeout: 5000,
    retries: 3
  }
};
`;

  const result = await processor.validateTemplate(template);
  assertEquals(result.valid, true, "Should allow 'global' as property name");
});

Deno.test("Template Security - Should block Deno API access in all modes", async () => {
  const config = createConfig("moderate");
  const processor = new TemplateProcessor(config);

  // Template trying to access Deno APIs (should always be blocked)
  const template = `
const content = await Deno.readTextFile("./secret.txt");
export const SECRET = content;
`;

  const validation = await processor["validateTemplateSecure"](template);
  assertEquals(validation.valid, false, "Should block Deno API access");
});

Deno.test("Template Security - Real-world Salty template should pass validation", async () => {
  const config = createConfig("strict");
  const processor = new TemplateProcessor(config);

  // Simplified version of Salty's SECURITY_INFO export
  const template = `
export const SECURITY_INFO = {
  rateLimiting: {
    window: "1 hour",
    maxRequests: 20,
  },
  maxPayloadSize: "1MB",
  maxKeySize: "1KB",
  securityHeaders: [
    "Content-Security-Policy",
    "Strict-Transport-Security",
  ],
} as const;

export class VersionUtils {
  static getExtendedVersion(): string {
    return \`\${VERSION} (Built: \${BUILD_INFO.buildDate})\`;
  }
}
`;

  const result = await processor.validateTemplate(template);
  assertEquals(result.valid, true, "Should allow Salty's security template");
});
