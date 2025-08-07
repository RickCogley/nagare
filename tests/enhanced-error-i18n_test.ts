/**
 * @fileoverview Tests for enhanced error handling with i18n
 * @description Verify that enhanced errors work with i18n system
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { ErrorCodes, ErrorFactory } from "../src/core/enhanced-error.ts";
import { initI18n } from "../src/core/i18n.ts";

// Helper to get test locales directory
const testLocalesDir = new URL("../locales", import.meta.url).pathname;

Deno.test("ErrorFactory with i18n - English", async (t) => {
  // Initialize i18n for English
  await initI18n({
    defaultLocale: "en",
    localesDir: testLocalesDir,
  });

  await t.step("gitNotInitialized", () => {
    const error = ErrorFactory.gitNotInitialized();
    assertEquals(error.code, ErrorCodes.GIT_NOT_INITIALIZED);
    assertStringIncludes(error.toString(), "Not in a git repository");
    assertStringIncludes(error.toString(), "Run 'git init' to initialize a repository");
  });

  await t.step("uncommittedChanges", () => {
    const error = ErrorFactory.uncommittedChanges();
    assertEquals(error.code, ErrorCodes.GIT_UNCOMMITTED_CHANGES);
    assertStringIncludes(error.toString(), "Uncommitted changes detected");
    assertStringIncludes(error.toString(), "Commit your changes:");
    assertStringIncludes(error.toString(), "Stash changes temporarily:");
  });

  await t.step("configNotFound", () => {
    const error = ErrorFactory.configNotFound(["./nagare.config.ts", "./nagare.config.js"]);
    assertEquals(error.code, ErrorCodes.CONFIG_NOT_FOUND);
    assertStringIncludes(error.toString(), "Configuration file not found");
    assertStringIncludes(error.toString(), "Run 'nagare init'");
    assertStringIncludes(error.toString(), "./nagare.config.ts");
    assertStringIncludes(error.toString(), "./nagare.config.js");
  });

  await t.step("versionNotFound", () => {
    const error = ErrorFactory.versionNotFound("./version.ts", ["export const VERSION"]);
    assertEquals(error.code, ErrorCodes.VERSION_NOT_FOUND);
    assertStringIncludes(error.toString(), "Could not find version in ./version.ts");
    assertStringIncludes(error.toString(), "Add a version to your file");
  });

  await t.step("fileHandlerNotFound", () => {
    const error = ErrorFactory.fileHandlerNotFound("./custom.cfg");
    assertEquals(error.code, ErrorCodes.FILE_HANDLER_NOT_FOUND);
    assertStringIncludes(error.toString(), "No file handler found for ./custom.cfg");
    assertStringIncludes(error.toString(), "Add a custom updateFn");
  });

  await t.step("invalidJson", () => {
    const error = ErrorFactory.invalidJson("./config.json", "Unexpected token");
    assertEquals(error.code, ErrorCodes.FILE_JSON_INVALID);
    assertStringIncludes(error.toString(), "Invalid JSON in ./config.json");
    assertStringIncludes(error.toString(), "Validate JSON at jsonlint.com");
    assertStringIncludes(error.toString(), "Unexpected token");
  });

  await t.step("githubCliNotFound", () => {
    const error = ErrorFactory.githubCliNotFound();
    assertEquals(error.code, ErrorCodes.GITHUB_CLI_NOT_FOUND);
    assertStringIncludes(error.toString(), "GitHub CLI (gh) not found");
    assertStringIncludes(error.toString(), "Install GitHub CLI:");
    assertStringIncludes(error.toString(), "macOS: brew install gh");
  });
});

Deno.test("ErrorFactory with i18n - Japanese", async (t) => {
  // Initialize i18n for Japanese
  await initI18n({
    defaultLocale: "ja",
    localesDir: testLocalesDir,
  });

  await t.step("gitNotInitialized - Japanese", () => {
    const error = ErrorFactory.gitNotInitialized();
    assertEquals(error.code, ErrorCodes.GIT_NOT_INITIALIZED);
    assertStringIncludes(error.toString(), "Gitリポジトリではありません");
    assertStringIncludes(error.toString(), "'git init' を実行してリポジトリを初期化");
  });

  await t.step("uncommittedChanges - Japanese", () => {
    const error = ErrorFactory.uncommittedChanges();
    assertEquals(error.code, ErrorCodes.GIT_UNCOMMITTED_CHANGES);
    assertStringIncludes(error.toString(), "コミットされていない変更があります");
    assertStringIncludes(error.toString(), "変更をコミット");
  });

  await t.step("configNotFound - Japanese", () => {
    const error = ErrorFactory.configNotFound(["./nagare.config.ts"]);
    assertEquals(error.code, ErrorCodes.CONFIG_NOT_FOUND);
    assertStringIncludes(error.toString(), "設定ファイルが見つかりません");
    assertStringIncludes(error.toString(), "'nagare init' を実行");
  });
});
