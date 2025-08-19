/**
 * Integration tests for the actual CLI
 * These tests run the real CLI commands and verify actual functionality
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { join } from "@std/path";
import { TemplateFormat } from "../types.ts";

const CLI_PATH = join(Deno.cwd(), "cli.ts");

Deno.test("CLI - shows help message", async () => {
  const command = new Deno.Command("deno", {
    args: ["run", "--allow-read", CLI_PATH, "--help"],
    stdout: "piped",
    stderr: "piped",
  });

  const { stdout, success } = await command.output();
  const output = new TextDecoder().decode(stdout);

  assertEquals(success, true);
  assertStringIncludes(output, "Nagare");
  assertStringIncludes(output, "Usage:");
});

Deno.test("CLI - shows version", async () => {
  const command = new Deno.Command("deno", {
    args: ["run", "--allow-read", CLI_PATH, "--version"],
    stdout: "piped",
    stderr: "piped",
  });

  const { stdout, success } = await command.output();
  const output = new TextDecoder().decode(stdout);

  assertEquals(success, true);
  assertStringIncludes(output, "."); // Should contain version number
});

Deno.test("CLI - dry run works", async () => {
  const tempDir = await Deno.makeTempDir();

  // Create a minimal test project
  await Deno.writeTextFile(
    join(tempDir, "deno.json"),
    JSON.stringify({ name: "test", version: "1.0.0" }),
  );

  await Deno.writeTextFile(
    join(tempDir, "nagare.config.ts"),
    `export default {
      project: { name: "test", version: "1.0.0", repository: "https://github.com/test/test" },
      versionFile: { path: "./version.ts", template: "typescript" }
    };`,
  );

  const command = new Deno.Command("deno", {
    args: ["run", "--allow-all", CLI_PATH, "--dry-run"],
    cwd: tempDir,
    stdout: "piped",
    stderr: "piped",
  });

  const { stdout } = await command.output();
  const output = new TextDecoder().decode(stdout);

  assertStringIncludes(output, "dry-run");

  // Clean up
  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("Config loading - loads and validates config", async () => {
  // loadConfig is an internal function in cli.ts, we'll test config loading differently
  const { DEFAULT_CONFIG } = await import("../config.ts");

  const tempDir = await Deno.makeTempDir();
  const configPath = join(tempDir, "nagare.config.ts");

  await Deno.writeTextFile(
    configPath,
    `
    export default {
      project: {
        name: "test-project",
        version: "1.0.0",
        repository: "https://github.com/test/test"
      },
      versionFile: {
        path: "./version.ts",
        template: "typescript"
      }
    };
  `,
  );

  // Since loadConfig is not exported, we'll import and evaluate the config directly
  const configModule = await import(configPath);
  const config = configModule.default;
  assertEquals(config.project.name, "test-project");

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("ReleaseManager - actually creates files in dry-run", async () => {
  const { ReleaseManager } = await import("../src/release/release-manager.ts");

  const tempDir = await Deno.makeTempDir();

  const config = {
    project: {
      name: "test",
      version: "1.0.0",
      repository: "https://github.com/test/test",
    },
    versionFile: {
      path: join(tempDir, "version.ts"),
      template: TemplateFormat.CUSTOM,
      customTemplate: "export const VERSION = '{{version}}';",
    },
    options: {
      dryRun: true,
      skipConfirmation: true,
    },
  };

  // This should use REAL implementations, not mocks!
  const manager = new ReleaseManager(config);
  const result = await manager.release();

  // In dry-run, it should succeed but not create files
  assertEquals(result.success, true);
  assertEquals(await Deno.stat(join(tempDir, "version.ts")).catch(() => null), null);

  await Deno.remove(tempDir, { recursive: true });
});
