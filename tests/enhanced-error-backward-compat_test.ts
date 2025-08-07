import { assertEquals } from "jsr:@std/assert@1.0.8";
import { ErrorCodes, ErrorFactory, NagareError } from "../src/core/enhanced-error.ts";

Deno.test("NagareError - backward compatibility", async (t) => {
  await t.step("supports legacy string-based constructor", () => {
    const error = new NagareError(
      "Test error message",
      ErrorCodes.UNKNOWN_ERROR,
      ["Suggestion 1", "Suggestion 2"],
      { detail: "some context" },
      "https://docs.example.com",
    );

    assertEquals(error.message, "Test error message");
    assertEquals(error.code, ErrorCodes.UNKNOWN_ERROR);
    assertEquals(error.suggestions, ["Suggestion 1", "Suggestion 2"]);
    assertEquals(error.context, { detail: "some context" });
    assertEquals(error.docsUrl, "https://docs.example.com");
  });

  await t.step("supports legacy string-based constructor with minimal args", () => {
    const error = new NagareError(
      "Simple error",
      ErrorCodes.FILE_NOT_FOUND,
    );

    assertEquals(error.message, "Simple error");
    assertEquals(error.code, ErrorCodes.FILE_NOT_FOUND);
    assertEquals(error.suggestions, undefined);
    assertEquals(error.context, undefined);
    assertEquals(error.docsUrl, undefined);
  });
});

Deno.test("ErrorFactory - works without i18n", async (t) => {
  // These tests verify the fallback behavior when i18n is not initialized
  await t.step("gitNotInitialized returns hardcoded message", () => {
    const error = ErrorFactory.gitNotInitialized();
    assertEquals(error.message, "Not in a git repository");
    assertEquals(error.code, ErrorCodes.GIT_NOT_INITIALIZED);
    assertEquals(error.suggestions?.length, 3);
    assertEquals(error.suggestions?.[0], "Initialize a git repository: git init");
  });

  await t.step("uncommittedChanges returns hardcoded message", () => {
    const error = ErrorFactory.uncommittedChanges();
    assertEquals(error.message, "Uncommitted changes in repository");
    assertEquals(error.code, ErrorCodes.GIT_UNCOMMITTED_CHANGES);
    assertEquals(error.suggestions?.length, 4);
    assertEquals(
      error.suggestions?.[0],
      "Commit all changes: git add . && git commit -m 'message'",
    );
  });

  await t.step("configNotFound returns hardcoded message with params", () => {
    const paths = ["./nagare.config.ts", "./nagare.config.js"];
    const error = ErrorFactory.configNotFound(paths);
    assertEquals(
      error.message,
      "Configuration file not found. Searched: ./nagare.config.ts, ./nagare.config.js",
    );
    assertEquals(error.code, ErrorCodes.CONFIG_NOT_FOUND);
    assertEquals(error.suggestions?.length, 3);
    assertEquals(error.context?.searchedPaths, paths);
  });

  await t.step("versionNotFound returns hardcoded message", () => {
    const error = ErrorFactory.versionNotFound("./version.ts", ["export const VERSION"]);
    assertEquals(error.message, "Version pattern not found in ./version.ts");
    assertEquals(error.code, ErrorCodes.VERSION_NOT_FOUND);
    assertEquals(error.suggestions?.length, 3);
    assertEquals(error.context?.filePath, "./version.ts");
  });

  await t.step("fileHandlerNotFound returns hardcoded message", () => {
    const error = ErrorFactory.fileHandlerNotFound("./custom.cfg");
    assertEquals(error.message, "No file handler found for ./custom.cfg");
    assertEquals(error.code, ErrorCodes.FILE_HANDLER_NOT_FOUND);
    assertEquals(error.suggestions?.length, 3);
  });

  await t.step("invalidJson returns hardcoded message", () => {
    const error = ErrorFactory.invalidJson("./config.json", "Unexpected token }");
    assertEquals(error.message, "Invalid JSON in ./config.json");
    assertEquals(error.code, ErrorCodes.FILE_JSON_INVALID);
    assertEquals(error.suggestions?.length, 4);
    assertEquals(error.context?.parseError, "Unexpected token }");
  });

  await t.step("githubCliNotFound returns hardcoded message", () => {
    const error = ErrorFactory.githubCliNotFound();
    assertEquals(error.message, "GitHub CLI (gh) not found");
    assertEquals(error.code, ErrorCodes.GITHUB_CLI_NOT_FOUND);
    assertEquals(error.suggestions?.length, 4);
    assertEquals(error.suggestions?.[1], "On macOS: brew install gh");
  });
});
