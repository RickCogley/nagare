import { assertEquals } from "jsr:@std/assert@1.0.8";
import { Logger, LogLevel } from "../src/core/logger.ts";
import { initI18n } from "../src/core/i18n.ts";
import type { TranslationKey } from "../locales/schema.ts";

Deno.test("Logger - i18n support", async (t) => {
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  let capturedOutput: string[] = [];

  // Helper to capture console output
  const setupCapture = () => {
    capturedOutput = [];
    console.log = (...args: unknown[]) => {
      capturedOutput.push(args.join(" "));
    };
    console.warn = (...args: unknown[]) => {
      capturedOutput.push(args.join(" "));
    };
    console.error = (...args: unknown[]) => {
      capturedOutput.push(args.join(" "));
    };
  };

  // Restore console methods after tests
  const restoreConsole = () => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  };

  await t.step("works without i18n (fallback to key)", () => {
    setupCapture();
    const logger = new Logger(LogLevel.DEBUG);

    // Without i18n, should just log the key as-is
    logger.infoI18n("cli.release.calculating" as TranslationKey, { count: 5 });

    assertEquals(capturedOutput[0], "[INFO] cli.release.calculating");
    restoreConsole();
  });

  await t.step("works with i18n - English", async () => {
    // Initialize i18n with English
    await initI18n({
      defaultLocale: "en",
      localesDir: new URL("../locales", import.meta.url).pathname,
    });

    setupCapture();
    const logger = new Logger(LogLevel.DEBUG);

    // Test with actual translation keys that exist
    logger.infoI18n("errors.gitNotRepo" as TranslationKey);

    // Should translate to "Not in a git repository"
    assertEquals(capturedOutput[0], "[INFO] Not in a git repository");

    // Test with non-existent key - should fallback to key
    capturedOutput = [];
    logger.infoI18n("nonexistent.key" as TranslationKey);
    assertEquals(capturedOutput[0], "[INFO] nonexistent.key");

    restoreConsole();
  });

  await t.step("log() method detects translation keys", () => {
    setupCapture();
    const logger = new Logger(LogLevel.INFO);

    // Regular string (no dots) - should log as-is
    logger.log(LogLevel.INFO, "This is a regular message");
    assertEquals(capturedOutput[0], "[INFO] This is a regular message");

    // Translation key pattern (contains dots) - tries to translate
    logger.log(LogLevel.INFO, "cli.release.success" as TranslationKey, { version: "1.2.3" });
    // Will either translate or fallback to key
    assertEquals(capturedOutput.length, 2);

    restoreConsole();
  });

  await t.step("maintains backward compatibility", () => {
    setupCapture();
    const logger = new Logger(LogLevel.INFO);

    // Original methods still work
    logger.info("Direct info message");
    logger.warn("Direct warning");
    logger.error("Direct error"); // Note: error() without Error object

    assertEquals(capturedOutput[0], "[INFO] Direct info message");
    assertEquals(capturedOutput[1], "[WARN] Direct warning");
    assertEquals(capturedOutput[2], "[ERROR] Direct error "); // extra space due to undefined error arg

    restoreConsole();
  });
});
