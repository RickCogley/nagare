/**
 * Simple unit tests for pure utility functions
 * These tests don't require mocking or complex setup
 */

import { assertEquals } from "@std/assert";
import { formatCommandOutput, sanitizeForShell } from "../src/utils/utils.ts";

// Test sanitizeForShell - a pure function that removes dangerous shell characters
Deno.test("sanitizeForShell - removes dangerous characters", () => {
  const input = "test; rm -rf / && echo 'hacked'";
  const result = sanitizeForShell(input);
  assertEquals(result, "test rm -rf /  echo 'hacked'");
});

Deno.test("sanitizeForShell - handles normal input", () => {
  const input = "normal text with spaces";
  const result = sanitizeForShell(input);
  assertEquals(result, "normal text with spaces");
});

Deno.test("sanitizeForShell - removes pipes and redirects", () => {
  const input = "cat file.txt | grep test > output.txt";
  const result = sanitizeForShell(input);
  assertEquals(result, "cat file.txt  grep test  output.txt");
});

Deno.test("sanitizeForShell - handles empty string", () => {
  const result = sanitizeForShell("");
  assertEquals(result, "");
});

// Test formatCommandOutput - a pure function that formats command output
Deno.test("formatCommandOutput - removes trailing whitespace", () => {
  const input = "line1   \nline2  \nline3 ";
  const result = formatCommandOutput(input);
  assertEquals(result, "line1\nline2\nline3");
});

Deno.test("formatCommandOutput - removes empty lines at start and end", () => {
  const input = "\n\nline1\nline2\n\n\n";
  const result = formatCommandOutput(input);
  assertEquals(result, "line1\nline2");
});

Deno.test("formatCommandOutput - preserves single empty lines between content", () => {
  const input = "line1\n\nline2\n\n\nline3";
  const result = formatCommandOutput(input);
  assertEquals(result, "line1\n\nline2\n\nline3");
});

Deno.test("formatCommandOutput - handles empty input", () => {
  const result = formatCommandOutput("");
  assertEquals(result, "");
});

Deno.test("formatCommandOutput - handles only whitespace", () => {
  const result = formatCommandOutput("   \n  \n   ");
  assertEquals(result, "");
});
