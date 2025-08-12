/**
 * @fileoverview Performance benchmarks for Nagare
 * @description Measures and validates performance of core components
 */

// import { ReleaseManager } from "../src/release/release-manager.ts"; // TODO: Add release manager benchmarks
import { FileHandlerManager } from "../src/release/file-handlers.ts";
import { GitOperations } from "../src/git/git-operations.ts";
import { TemplateProcessor } from "../src/templates/template-processor.ts";
import { validateFilePath } from "../src/validation/security-utils.ts";
import { TemplateFormat } from "../types.ts";
import type { NagareConfig, TemplateData } from "../types.ts";

/**
 * Create a mock config for benchmarking
 */
const createMockConfig = (): NagareConfig => ({
  project: {
    name: "Benchmark Test",
    description: "Performance benchmarking",
    repository: "https://github.com/test/benchmark",
  },
  versionFile: {
    path: "./version.ts",
    template: TemplateFormat.TYPESCRIPT,
  },
  options: {
    dryRun: true,
  },
});

/**
 * Performance thresholds in milliseconds
 * These are the maximum acceptable times for each operation
 */
const THRESHOLDS = {
  fileHandlerInit: 50,
  fileHandlerProcess: 100,
  gitOperations: 100,
  releaseManagerInit: 150,
  versionBump: 200,
  changelogGeneration: 500,
  templateProcessing: 300,
  securityValidation: 20,
  totalRelease: 3000,
} as const;

/**
 * Memory usage thresholds in MB
 */
const MEMORY_THRESHOLDS = {
  baseline: 50,
  peak: 256,
  leakThreshold: 10, // MB increase per operation
} as const;

interface BenchmarkResult {
  name: string;
  duration: number;
  threshold: number;
  passed: boolean;
  memory?: {
    before: number;
    after: number;
    delta: number;
  };
}

/**
 * Run a single benchmark
 */
async function benchmark(
  name: string,
  fn: () => Promise<void> | void,
  threshold: number,
  trackMemory = false,
): Promise<BenchmarkResult> {
  const memBefore = trackMemory ? Deno.memoryUsage().heapUsed / 1024 / 1024 : 0;

  const start = performance.now();
  await fn();
  const duration = performance.now() - start;

  const memAfter = trackMemory ? Deno.memoryUsage().heapUsed / 1024 / 1024 : 0;

  const passed = duration <= threshold;

  const result: BenchmarkResult = {
    name,
    duration,
    threshold,
    passed,
  };

  if (trackMemory) {
    result.memory = {
      before: memBefore,
      after: memAfter,
      delta: memAfter - memBefore,
    };
  }

  // Console output with color coding
  const icon = passed ? "✅" : "❌";
  const color = passed ? "\x1b[32m" : "\x1b[31m"; // Green or Red
  const reset = "\x1b[0m";

  console.log(
    `${icon} ${name}: ${color}${duration.toFixed(2)}ms${reset} (threshold: ${threshold}ms)`,
  );

  if (trackMemory && result.memory) {
    console.log(
      `   💾 Memory: ${result.memory.before.toFixed(2)}MB → ${result.memory.after.toFixed(2)}MB (Δ ${
        result.memory.delta > 0 ? "+" : ""
      }${result.memory.delta.toFixed(2)}MB)`,
    );
  }

  return result;
}

/**
 * Run all performance benchmarks
 */
async function runBenchmarks(): Promise<void> {
  console.log("⚡ Nagare Performance Benchmarks");
  console.log("================================\n");

  const results: BenchmarkResult[] = [];

  // 1. File Handler Initialization
  results.push(
    await benchmark(
      "File Handler Init",
      () => {
        new FileHandlerManager();
      },
      THRESHOLDS.fileHandlerInit,
      true,
    ),
  );

  // 2. File Handler Processing
  results.push(
    await benchmark(
      "File Handler Process",
      async () => {
        const manager = new FileHandlerManager();
        // Test with a mock file update operation
        const testFilePath = "test-deno.json";
        const testContent = '{"name": "test", "version": "1.0.0"}';

        // Create a temporary test file
        await Deno.writeTextFile(testFilePath, testContent);

        try {
          // Use the proper updateFile method
          await manager.updateFile(testFilePath, "version", "1.1.0");
        } finally {
          // Clean up test file
          try {
            await Deno.remove(testFilePath);
          } catch {
            // Ignore cleanup errors
          }
        }
      },
      THRESHOLDS.fileHandlerProcess,
    ),
  );

  // 3. Git Operations
  results.push(
    await benchmark(
      "Git Operations Init",
      () => {
        new GitOperations({
          project: {
            name: "Test",
            repository: "https://github.com/test/test",
          },
          versionFile: {
            path: "./version.ts",
            template: TemplateFormat.TYPESCRIPT,
          },
          options: {
            dryRun: true,
          },
        });
      },
      THRESHOLDS.gitOperations,
      true,
    ),
  );

  // 4. Template Processing
  results.push(
    await benchmark(
      "Template Processing",
      async () => {
        const processor = new TemplateProcessor(createMockConfig());
        await processor.processTemplate(
          "# Changelog\n\n## Version {{ version }}\n\nReleased on {{ buildDate }}",
          {
            version: "1.0.0",
            buildDate: new Date().toISOString(),
            gitCommit: "abc123",
            environment: "production",
            releaseNotes: {
              version: "1.0.0",
              date: new Date().toISOString(),
              added: ["New feature"],
              changed: [],
              deprecated: [],
              removed: [],
              fixed: [],
              security: [],
            },
            metadata: {},
            project: {
              name: "Test Project",
              repository: "https://github.com/test/test",
            },
          } as TemplateData,
        );
      },
      THRESHOLDS.templateProcessing,
    ),
  );

  // 5. Security Validation
  results.push(
    await benchmark(
      "Security Validation",
      () => {
        // Test various input validations
        validateFilePath("./src/file.ts", Deno.cwd());
        validateFilePath("./tests/test.ts", Deno.cwd());
        validateFilePath("./mod.ts", Deno.cwd());
        validateFilePath("./version.ts", Deno.cwd());
        validateFilePath("./cli.ts", Deno.cwd());
      },
      THRESHOLDS.securityValidation,
    ),
  );

  // 6. Memory Stress Test
  console.log("\n📊 Memory Stress Test");
  console.log("--------------------");

  const memStart = Deno.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`Initial memory: ${memStart.toFixed(2)}MB`);

  // Simulate multiple operations
  for (let i = 0; i < 10; i++) {
    new FileHandlerManager();
    new GitOperations(createMockConfig());
    await new TemplateProcessor(createMockConfig()).processTemplate("Test {{ version }}", {
      version: `1.0.${i}`,
      buildDate: new Date().toISOString(),
      gitCommit: "abc123",
      environment: "test",
      releaseNotes: {
        version: `1.0.${i}`,
        date: new Date().toISOString(),
        added: [],
        changed: [],
        deprecated: [],
        removed: [],
        fixed: [],
        security: [],
      },
      metadata: {},
      project: {
        name: "Test",
        repository: "https://github.com/test/test",
      },
    } as TemplateData);
  }

  // Force garbage collection if available
  const g = globalThis as unknown as { gc?: () => void };
  if (typeof g.gc === "function") {
    g.gc();
  }

  const memEnd = Deno.memoryUsage().heapUsed / 1024 / 1024;
  const memDelta = memEnd - memStart;

  console.log(`Final memory: ${memEnd.toFixed(2)}MB`);
  console.log(`Memory delta: ${memDelta > 0 ? "+" : ""}${memDelta.toFixed(2)}MB`);

  if (memEnd > MEMORY_THRESHOLDS.peak) {
    console.log(`❌ Memory usage ${memEnd.toFixed(2)}MB exceeds ${MEMORY_THRESHOLDS.peak}MB limit`);
    results.push({
      name: "Memory Usage",
      duration: memEnd,
      threshold: MEMORY_THRESHOLDS.peak,
      passed: false,
    });
  } else {
    console.log(`✅ Memory usage within limits`);
    results.push({
      name: "Memory Usage",
      duration: memEnd,
      threshold: MEMORY_THRESHOLDS.peak,
      passed: true,
    });
  }

  // Summary
  console.log("\n📈 Benchmark Summary");
  console.log("===================");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results
    .filter((r) => r.name !== "Memory Usage")
    .reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Total time: ${totalDuration.toFixed(2)}ms`);

  // Performance grade
  const successRate = (passed / results.length) * 100;
  let grade = "A";
  if (successRate < 100) grade = "B";
  if (successRate < 90) grade = "C";
  if (successRate < 80) grade = "D";
  if (successRate < 70) grade = "F";

  console.log(`\nPerformance Grade: ${grade} (${successRate.toFixed(0)}%)`);

  // Regression detection
  if (failed > 0) {
    console.log("\n⚠️  Performance Regressions Detected:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        const overBy = ((r.duration - r.threshold) / r.threshold * 100).toFixed(1);
        console.log(`  - ${r.name}: ${overBy}% over threshold`);
      });
  }

  // Export results for CI
  const reportPath = ".metrics/benchmark-results.json";
  try {
    await Deno.mkdir(".metrics", { recursive: true });
    await Deno.writeTextFile(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          results,
          summary: {
            passed,
            failed,
            totalDuration,
            successRate,
            grade,
          },
        },
        null,
        2,
      ),
    );
    console.log(`\n📄 Results saved to ${reportPath}`);
  } catch (error) {
    console.warn(`Could not save results: ${error}`);
  }

  // Exit with error if benchmarks failed
  if (failed > 0) {
    console.error("\n❌ Some benchmarks failed");
    Deno.exit(1);
  } else {
    console.log("\n✅ All performance benchmarks passed");
  }
}

// Run benchmarks if this is the main module
if (import.meta.main) {
  await runBenchmarks();
}

// Export for testing
export { benchmark, MEMORY_THRESHOLDS, runBenchmarks, THRESHOLDS };
export type { BenchmarkResult };
