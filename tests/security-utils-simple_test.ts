/**
 * Simple unit tests for security validation functions
 * Tests pure validation logic without i18n dependencies
 */

import { assertEquals, assertThrows } from "@std/assert";
import { sanitizeCommitMessage, validateGitRef, validateVersion } from "../src/validation/security-utils.ts";

// Test validateGitRef - validates git references
Deno.test("validateGitRef - accepts valid tag", () => {
  const result = validateGitRef("v1.2.3", "tag");
  assertEquals(result, "v1.2.3");
});

Deno.test("validateGitRef - accepts valid branch", () => {
  const result = validateGitRef("feature/new-feature", "branch");
  assertEquals(result, "feature/new-feature");
});

Deno.test("validateGitRef - rejects empty string", () => {
  assertThrows(() => {
    validateGitRef("", "tag");
  });
});

Deno.test("validateGitRef - rejects whitespace only", () => {
  assertThrows(() => {
    validateGitRef("   ", "tag");
  });
});

Deno.test("validateGitRef - rejects special characters", () => {
  assertThrows(() => {
    validateGitRef("tag~with~tildes", "tag");
  });
});

Deno.test("validateGitRef - rejects refs starting with hyphen", () => {
  assertThrows(() => {
    validateGitRef("-invalid", "tag");
  });
});

Deno.test("validateGitRef - rejects refs ending with dot", () => {
  assertThrows(() => {
    validateGitRef("tag.", "tag");
  });
});

Deno.test("validateGitRef - rejects refs ending with .lock", () => {
  assertThrows(() => {
    validateGitRef("branch.lock", "branch");
  });
});

// Test validateVersion - validates semantic versions
Deno.test("validateVersion - accepts valid semver", () => {
  const result = validateVersion("1.2.3");
  assertEquals(result, "1.2.3");
});

Deno.test("validateVersion - accepts version with v prefix", () => {
  const result = validateVersion("v2.0.0");
  assertEquals(result, "v2.0.0"); // validateVersion keeps the v prefix
});

Deno.test("validateVersion - rejects invalid format", () => {
  assertThrows(() => {
    validateVersion("not-a-version");
  });
});

Deno.test("validateVersion - rejects empty string", () => {
  assertThrows(() => {
    validateVersion("");
  });
});

// Test sanitizeCommitMessage - sanitizes commit messages
Deno.test("sanitizeCommitMessage - preserves whitespace", () => {
  // sanitizeCommitMessage actually preserves whitespace, just checks length
  const result = sanitizeCommitMessage("  feat: add feature  ");
  assertEquals(result, "  feat: add feature  ");
});

Deno.test("sanitizeCommitMessage - handles multiline messages", () => {
  const input = "feat: add feature\n\nThis is a longer description";
  const result = sanitizeCommitMessage(input);
  assertEquals(result, "feat: add feature\n\nThis is a longer description");
});

Deno.test("sanitizeCommitMessage - removes null bytes", () => {
  // sanitizeCommitMessage removes null bytes but preserves other control characters
  const input = "feat: add\x00feature\x1B[0m";
  const result = sanitizeCommitMessage(input);
  assertEquals(result, "feat: addfeature\x1B[0m");
});

Deno.test("sanitizeCommitMessage - handles empty message", () => {
  const result = sanitizeCommitMessage("");
  assertEquals(result, "");
});
