/**
 * @fileoverview Tests for enhanced error handling
 * @description Verify that enhanced errors provide helpful suggestions
 */

import { assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ErrorCodes, ErrorFactory, NagareError } from "../src/enhanced-error.ts";

Deno.test("NagareError - Basic functionality", async (t) => {
  await t.step("should format error with suggestions", () => {
    const error = new NagareError(
      "Test error message",
      "TEST_ERROR",
      ["First suggestion", "Second suggestion"],
      { detail: "some detail" },
    );

    const output = error.toString();
    assertStringIncludes(output, "❌ Test error message");
    assertStringIncludes(output, "💡 To fix this:");
    assertStringIncludes(output, "1. First suggestion");
    assertStringIncludes(output, "2. Second suggestion");
    assertStringIncludes(output, "📋 Details:");
    assertStringIncludes(output, "Detail: some detail");
    assertStringIncludes(output, "🔍 Error code: TEST_ERROR");
  });

  await t.step("should handle array context values", () => {
    const error = new NagareError(
      "File not found",
      "FILE_NOT_FOUND",
      undefined,
      { searchedPaths: ["./path1", "./path2", "./path3"] },
    );

    const output = error.toString();
    assertStringIncludes(output, "Searched Paths:");
    assertStringIncludes(output, "- ./path1");
    assertStringIncludes(output, "- ./path2");
    assertStringIncludes(output, "- ./path3");
  });

  await t.step("should include docs URL if provided", () => {
    const error = new NagareError(
      "Config error",
      "CONFIG_ERROR",
      undefined,
      undefined,
      "https://nagare.dev/docs/errors#config",
    );

    const output = error.toString();
    assertStringIncludes(output, "📚 Learn more: https://nagare.dev/docs/errors#config");
  });
});

Deno.test("ErrorFactory - Pre-built errors", async (t) => {
  await t.step("gitNotInitialized", () => {
    const error = ErrorFactory.gitNotInitialized();
    assertEquals(error.code, ErrorCodes.GIT_NOT_INITIALIZED);
    assertStringIncludes(error.toString(), "Not in a git repository");
    assertStringIncludes(error.toString(), "git init");
  });

  await t.step("uncommittedChanges", () => {
    const error = ErrorFactory.uncommittedChanges();
    assertEquals(error.code, ErrorCodes.GIT_UNCOMMITTED_CHANGES);
    assertStringIncludes(error.toString(), "Uncommitted changes detected");
    assertStringIncludes(error.toString(), "git add . && git commit");
    assertStringIncludes(error.toString(), "git stash");
  });

  await t.step("configNotFound", () => {
    const error = ErrorFactory.configNotFound(["./nagare.config.ts", "./nagare.config.js"]);
    assertEquals(error.code, ErrorCodes.CONFIG_NOT_FOUND);
    assertStringIncludes(error.toString(), "No Nagare configuration file found");
    assertStringIncludes(error.toString(), "nagare init");
    assertStringIncludes(error.toString(), "./nagare.config.ts");
    assertStringIncludes(error.toString(), "./nagare.config.js");
  });

  await t.step("versionNotFound", () => {
    const error = ErrorFactory.versionNotFound("./version.ts", ["export const VERSION"]);
    assertEquals(error.code, ErrorCodes.VERSION_NOT_FOUND);
    assertStringIncludes(error.toString(), "Could not find version in ./version.ts");
    assertStringIncludes(error.toString(), "export const VERSION");
  });

  await t.step("fileHandlerNotFound", () => {
    const error = ErrorFactory.fileHandlerNotFound("./custom.cfg");
    assertEquals(error.code, ErrorCodes.FILE_HANDLER_NOT_FOUND);
    assertStringIncludes(error.toString(), "No file handler found for ./custom.cfg");
    assertStringIncludes(error.toString(), "updateFn");
  });

  await t.step("invalidJson", () => {
    const error = ErrorFactory.invalidJson("./config.json", "Unexpected token");
    assertEquals(error.code, ErrorCodes.FILE_JSON_INVALID);
    assertStringIncludes(error.toString(), "Invalid JSON in ./config.json");
    assertStringIncludes(error.toString(), "jsonlint.com");
    assertStringIncludes(error.toString(), "Unexpected token");
  });

  await t.step("githubCliNotFound", () => {
    const error = ErrorFactory.githubCliNotFound();
    assertEquals(error.code, ErrorCodes.GITHUB_CLI_NOT_FOUND);
    assertStringIncludes(error.toString(), "GitHub CLI (gh) is not installed");
    assertStringIncludes(error.toString(), "brew install gh");
    assertStringIncludes(error.toString(), "github.createRelease = false");
  });
});

Deno.test("NagareError - JSON representation", () => {
  const error = new NagareError(
    "Test error",
    "TEST_CODE",
    ["Fix 1", "Fix 2"],
    { foo: "bar" },
    "https://example.com",
  );

  const json = error.toJSON();
  assertEquals(json.name, "NagareError");
  assertEquals(json.code, "TEST_CODE");
  assertEquals(json.message, "Test error");
  assertEquals(json.suggestions, ["Fix 1", "Fix 2"]);
  assertEquals(json.context, { foo: "bar" });
  assertEquals(json.docsUrl, "https://example.com");
});
