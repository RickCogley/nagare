/**
 * @fileoverview Tests for i18n functionality
 */

import {
  assertEquals,
  assertExists,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { getI18n, getLocale, I18n, initI18n, setLocale, t as translate } from "../src/i18n.ts";

// Helper to get test locales directory
const testLocalesDir = new URL("../locales", import.meta.url).pathname;

Deno.test("I18n - initialization", async (t) => {
  await t.step("should initialize with default locale", async () => {
    const i18n = new I18n({ localesDir: testLocalesDir });
    await i18n.init();

    // Should detect locale from environment or default to 'en'
    const locale = i18n.getLocale();
    assertExists(locale);
  });

  await t.step("should initialize with specified locale", async () => {
    const i18n = new I18n({
      defaultLocale: "ja",
      localesDir: testLocalesDir,
    });
    await i18n.init();

    assertEquals(i18n.getLocale(), "ja");
  });

  await t.step("should fall back to English for invalid locale", async () => {
    const i18n = new I18n({
      defaultLocale: "invalid",
      fallbackLocale: "en",
      localesDir: testLocalesDir,
    });
    await i18n.init();

    // Should have loaded fallback
    const translation = i18n.t("errors.fileNotFound", { path: "test.txt" });
    assertEquals(translation, "File not found: test.txt");
  });
});

Deno.test("I18n - translation", async (t) => {
  await t.step("should translate simple keys", async () => {
    const i18n = new I18n({
      defaultLocale: "en",
      localesDir: testLocalesDir,
    });
    await i18n.init();

    const translation = i18n.t("cli.release.description");
    assertEquals(translation, "Create a new release");
  });

  await t.step("should translate with parameters", async () => {
    const i18n = new I18n({
      defaultLocale: "en",
      localesDir: testLocalesDir,
    });
    await i18n.init();

    const translation = i18n.t("errors.fileNotFound", { path: "/test/file.ts" });
    assertEquals(translation, "File not found: /test/file.ts");
  });

  await t.step("should handle multiple parameters", async () => {
    const i18n = new I18n({
      defaultLocale: "en",
      localesDir: testLocalesDir,
    });
    await i18n.init();

    const translation = i18n.t("version.bump", { from: "1.0.0", to: "2.0.0" });
    assertEquals(translation, "Version bump: 1.0.0 → 2.0.0");
  });

  await t.step("should return key for missing translation", async () => {
    const i18n = new I18n({
      defaultLocale: "en",
      localesDir: testLocalesDir,
    });
    await i18n.init();

    const translation = i18n.t("non.existent.key");
    assertEquals(translation, "non.existent.key");
  });

  await t.step("should handle missing parameters gracefully", async () => {
    const i18n = new I18n({
      defaultLocale: "en",
      localesDir: testLocalesDir,
    });
    await i18n.init();

    const translation = i18n.t("errors.fileNotFound", {});
    assertEquals(translation, "File not found: {path}");
  });
});

Deno.test("I18n - Japanese translations", async (t) => {
  await t.step("should translate to Japanese", async () => {
    const i18n = new I18n({
      defaultLocale: "ja",
      localesDir: testLocalesDir,
    });
    await i18n.init();

    const translation = i18n.t("cli.release.description");
    assertEquals(translation, "新しいリリースを作成");
  });

  await t.step("should handle Japanese with parameters", async () => {
    const i18n = new I18n({
      defaultLocale: "ja",
      localesDir: testLocalesDir,
    });
    await i18n.init();

    const translation = i18n.t("errors.fileNotFound", { path: "テスト.txt" });
    assertEquals(translation, "ファイルが見つかりません: テスト.txt");
  });
});

Deno.test("I18n - locale switching", async (t) => {
  await t.step("should switch between locales", async () => {
    const i18n = new I18n({
      defaultLocale: "en",
      localesDir: testLocalesDir,
    });
    await i18n.init();

    // Start in English
    let translation = i18n.t("cli.commands.patch");
    assertEquals(translation, "Bump patch version (1.0.0 → 1.0.1)");

    // Switch to Japanese
    await i18n.setLocale("ja");
    translation = i18n.t("cli.commands.patch");
    assertEquals(translation, "パッチバージョンをバンプ (1.0.0 → 1.0.1)");

    // Switch back to English
    await i18n.setLocale("en");
    translation = i18n.t("cli.commands.patch");
    assertEquals(translation, "Bump patch version (1.0.0 → 1.0.1)");
  });
});

Deno.test("I18n - global instance", async (t) => {
  await t.step("should throw if not initialized", () => {
    // Reset global instance
    (globalThis as any).__nagareI18n = null;

    assertThrows(
      () => translate("any.key"),
      Error,
      "i18n not initialized",
    );
  });

  await t.step("should work with global instance", async () => {
    await initI18n({
      defaultLocale: "en",
      localesDir: testLocalesDir,
    });

    const translation = translate("errors.gitNotRepo");
    assertEquals(translation, "Not in a git repository");
  });

  await t.step("should support global locale switching", async () => {
    await initI18n({
      defaultLocale: "en",
      localesDir: testLocalesDir,
    });

    assertEquals(getLocale(), "en");

    await setLocale("ja");
    assertEquals(getLocale(), "ja");

    const translation = translate("errors.gitNotRepo");
    assertEquals(translation, "Gitリポジトリではありません");
  });
});

Deno.test("I18n - utility methods", async (t) => {
  await t.step("should check if translation exists", async () => {
    const i18n = new I18n({
      defaultLocale: "en",
      localesDir: testLocalesDir,
    });
    await i18n.init();

    assertEquals(i18n.has("errors.fileNotFound"), true);
    assertEquals(i18n.has("non.existent.key"), false);
  });

  await t.step("should get available locales", async () => {
    const i18n = new I18n({
      defaultLocale: "en",
      localesDir: testLocalesDir,
    });
    await i18n.init();
    await i18n.setLocale("ja");

    const locales = i18n.getAvailableLocales();
    assertEquals(locales.includes("en"), true);
    assertEquals(locales.includes("ja"), true);
  });

  await t.step("should get all keys", async () => {
    const i18n = new I18n({
      defaultLocale: "en",
      localesDir: testLocalesDir,
    });
    await i18n.init();

    const keys = i18n.getKeys();
    assertEquals(keys.includes("errors.fileNotFound"), true);
    assertEquals(keys.includes("cli.release.success"), true);
    assertEquals(keys.includes("changelog.added"), true);
  });
});

Deno.test("I18n - nested keys", async (t) => {
  await t.step("should handle deeply nested keys", async () => {
    const i18n = new I18n({
      defaultLocale: "en",
      localesDir: testLocalesDir,
    });
    await i18n.init();

    const translation = i18n.t("cli.release.success", { version: "1.2.3" });
    assertEquals(translation, "✅ Released version 1.2.3");
  });
});

Deno.test("I18n - environment locale detection", async (t) => {
  await t.step("should detect locale from NAGARE_LOCALE", async () => {
    const originalLocale = Deno.env.get("NAGARE_LOCALE");

    try {
      Deno.env.set("NAGARE_LOCALE", "ja");

      const i18n = new I18n({ localesDir: testLocalesDir });
      await i18n.init();

      assertEquals(i18n.getLocale(), "ja");
    } finally {
      if (originalLocale) {
        Deno.env.set("NAGARE_LOCALE", originalLocale);
      } else {
        Deno.env.delete("NAGARE_LOCALE");
      }
    }
  });
});
