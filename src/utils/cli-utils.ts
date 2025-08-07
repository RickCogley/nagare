/**
 * @fileoverview CLI output helpers with i18n support
 * @description Provides consistent output formatting for CLI commands
 */

import { getI18n, t } from "../core/i18n.ts";
import type { TranslationKey } from "../../locales/schema.ts";

/**
 * Helper to check if i18n is available
 */
function hasI18n(): boolean {
  try {
    getI18n();
    return true;
  } catch {
    return false;
  }
}

/**
 * Print a message with i18n support
 * Falls back to the key if i18n is not available
 *
 * @param key - Translation key or raw message
 * @param params - Parameters for message interpolation
 */
export function print(key: TranslationKey | string, params?: Record<string, unknown>): void {
  const message = hasI18n() && key.includes(".") ? t(key as TranslationKey, params) : key;
  console.log(message);
}

/**
 * Print a success message with i18n support
 * Adds a green checkmark prefix
 *
 * @param key - Translation key or raw message
 * @param params - Parameters for message interpolation
 */
export function printSuccess(key: TranslationKey | string, params?: Record<string, unknown>): void {
  const message = hasI18n() && key.includes(".") ? t(key as TranslationKey, params) : key;
  console.log(`✅ ${message}`);
}

/**
 * Print an error message with i18n support
 * Adds a red X prefix
 *
 * @param key - Translation key or raw message
 * @param params - Parameters for message interpolation
 */
export function printError(key: TranslationKey | string, params?: Record<string, unknown>): void {
  const message = hasI18n() && key.includes(".") ? t(key as TranslationKey, params) : key;
  console.error(`❌ ${message}`);
}

/**
 * Print a warning message with i18n support
 * Adds a yellow warning sign prefix
 *
 * @param key - Translation key or raw message
 * @param params - Parameters for message interpolation
 */
export function printWarning(key: TranslationKey | string, params?: Record<string, unknown>): void {
  const message = hasI18n() && key.includes(".") ? t(key as TranslationKey, params) : key;
  console.warn(`⚠️  ${message}`);
}

/**
 * Print an info message with i18n support
 * Adds a blue info icon prefix
 *
 * @param key - Translation key or raw message
 * @param params - Parameters for message interpolation
 */
export function printInfo(key: TranslationKey | string, params?: Record<string, unknown>): void {
  const message = hasI18n() && key.includes(".") ? t(key as TranslationKey, params) : key;
  console.log(`ℹ️  ${message}`);
}

/**
 * Print a step in a process with i18n support
 * Adds a right arrow prefix
 *
 * @param key - Translation key or raw message
 * @param params - Parameters for message interpolation
 */
export function printStep(key: TranslationKey | string, params?: Record<string, unknown>): void {
  const message = hasI18n() && key.includes(".") ? t(key as TranslationKey, params) : key;
  console.log(`→ ${message}`);
}

/**
 * Print a debug message with i18n support (only in development)
 * Adds a bug icon prefix
 *
 * @param key - Translation key or raw message
 * @param params - Parameters for message interpolation
 */
export function printDebug(key: TranslationKey | string, params?: Record<string, unknown>): void {
  if (Deno.env.get("NODE_ENV") === "development" || Deno.env.get("DEBUG")) {
    const message = hasI18n() && key.includes(".") ? t(key as TranslationKey, params) : key;
    console.log(`🐛 ${message}`);
  }
}

/**
 * Print a list item with i18n support
 * Adds a bullet point prefix
 *
 * @param key - Translation key or raw message
 * @param params - Parameters for message interpolation
 */
export function printListItem(
  key: TranslationKey | string,
  params?: Record<string, unknown>,
): void {
  const message = hasI18n() && key.includes(".") ? t(key as TranslationKey, params) : key;
  console.log(`  • ${message}`);
}

/**
 * Print a section header with i18n support
 * Adds formatting for visibility
 *
 * @param key - Translation key or raw message
 * @param params - Parameters for message interpolation
 */
export function printSection(key: TranslationKey | string, params?: Record<string, unknown>): void {
  const message = hasI18n() && key.includes(".") ? t(key as TranslationKey, params) : key;
  console.log(`\n📋 ${message.toUpperCase()}\n`);
}

/**
 * Print a confirmation prompt with i18n support
 * Adds a question mark prefix
 *
 * @param key - Translation key or raw message
 * @param params - Parameters for message interpolation
 */
export function printPrompt(key: TranslationKey | string, params?: Record<string, unknown>): void {
  const message = hasI18n() && key.includes(".") ? t(key as TranslationKey, params) : key;
  console.log(`❓ ${message}`);
}

/**
 * Show a confirmation prompt with i18n support
 * Uses Deno's built-in confirm() function
 *
 * @param key - Translation key or raw message
 * @param params - Parameters for message interpolation
 * @returns True if user confirmed, false otherwise
 */
export function confirmI18n(
  key: TranslationKey | string,
  params?: Record<string, unknown>,
): boolean {
  const message = hasI18n() && key.includes(".") ? t(key as TranslationKey, params) : key;
  return confirm(`\n❓ ${message}`);
}
