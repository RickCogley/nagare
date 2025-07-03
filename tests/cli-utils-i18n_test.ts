import { assertEquals } from "jsr:@std/assert@1.0.8";
import {
  print,
  printDebug,
  printError,
  printInfo,
  printListItem,
  printPrompt,
  printSection,
  printStep,
  printSuccess,
  printWarning,
} from "../src/cli-utils.ts";
import { initI18n } from "../src/i18n.ts";
import type { TranslationKey } from "../locales/schema.ts";

Deno.test("CLI Utils - i18n support", async (t) => {
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

    // Without i18n, should just output the key/message as-is
    print("Regular message");
    printSuccess("Success message");
    printError("Error message");
    printWarning("Warning message");
    printInfo("Info message");
    printStep("Step message");
    printListItem("List item");
    printSection("Section header");
    printPrompt("Question prompt");

    assertEquals(capturedOutput[0], "Regular message");
    assertEquals(capturedOutput[1], "✅ Success message");
    assertEquals(capturedOutput[2], "❌ Error message");
    assertEquals(capturedOutput[3], "⚠️  Warning message");
    assertEquals(capturedOutput[4], "ℹ️  Info message");
    assertEquals(capturedOutput[5], "→ Step message");
    assertEquals(capturedOutput[6], "  • List item");
    assertEquals(capturedOutput[7], "\n📋 SECTION HEADER\n");
    assertEquals(capturedOutput[8], "❓ Question prompt");

    restoreConsole();
  });

  await t.step("works with i18n - translation keys", async () => {
    // Initialize i18n with English
    await initI18n({
      defaultLocale: "en",
      localesDir: new URL("../locales", import.meta.url).pathname,
    });

    setupCapture();

    // Test with actual translation keys that exist
    printError("errors.gitNotRepo" as TranslationKey);
    assertEquals(capturedOutput[0], "❌ Not in a git repository");

    // Test with parameters
    capturedOutput = [];
    printSuccess("errors.configNotFound" as TranslationKey, { path: "./nagare.config.ts" });
    assertEquals(capturedOutput[0], "✅ Configuration file not found");

    // Test with non-existent key - should fallback to key
    capturedOutput = [];
    print("nonexistent.key" as TranslationKey);
    assertEquals(capturedOutput[0], "nonexistent.key");

    restoreConsole();
  });

  await t.step("detects translation keys by dot pattern", () => {
    setupCapture();

    // Keys with dots are treated as translation keys
    print("cli.release.success");
    // Will try to translate (and fallback to key if not found)
    assertEquals(capturedOutput.length, 1);

    // Keys without dots are treated as literal messages
    capturedOutput = [];
    print("This is a literal message");
    assertEquals(capturedOutput[0], "This is a literal message");

    restoreConsole();
  });

  await t.step("printDebug respects DEBUG environment", () => {
    setupCapture();

    // Without DEBUG env, nothing should be printed
    printDebug("Debug message");
    assertEquals(capturedOutput.length, 0);

    // With DEBUG env, should print
    const originalDebug = Deno.env.get("DEBUG");
    Deno.env.set("DEBUG", "true");

    printDebug("Debug message");
    assertEquals(capturedOutput[0], "🐛 Debug message");

    // Cleanup
    if (originalDebug) {
      Deno.env.set("DEBUG", originalDebug);
    } else {
      Deno.env.delete("DEBUG");
    }

    restoreConsole();
  });

  await t.step("section header formatting", () => {
    setupCapture();

    printSection("release summary");
    assertEquals(capturedOutput[0], "\n📋 RELEASE SUMMARY\n");

    restoreConsole();
  });
});
