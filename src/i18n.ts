/**
 * @fileoverview Internationalization (i18n) support for Nagare
 * @module i18n
 * @description Lightweight i18n implementation with YAML-based translations
 */

import { parse as parseYAML } from "@std/yaml";

/**
 * Configuration options for i18n
 */
export interface I18nConfig {
  /** Default locale to use (e.g., "en", "ja") */
  defaultLocale?: string;
  /** Fallback locale when translation is missing */
  fallbackLocale?: string;
  /** Directory containing locale files */
  localesDir?: string;
  /** Explicit language to use, overrides defaultLocale and auto-detection */
  language?: string;
}

/**
 * Main i18n class for managing translations
 */
export class I18n {
  private translations: Map<string, Map<string, string>> = new Map();
  private currentLocale: string;
  private fallbackLocale: string;
  private localesDir: string;

  constructor(config: I18nConfig = {}) {
    // Use explicit language if provided, otherwise defaultLocale, otherwise detect
    this.currentLocale = config.language || config.defaultLocale || this.detectLocale();
    this.fallbackLocale = config.fallbackLocale || "en";
    this.localesDir = config.localesDir || "./locales";
  }

  /**
   * Detect locale from environment variables
   */
  private detectLocale(): string {
    // Check NAGARE_LOCALE first, then standard locale env vars
    const nagareLocale = Deno.env.get("NAGARE_LOCALE");
    if (nagareLocale) return nagareLocale;

    const envLocale = Deno.env.get("LANG") || Deno.env.get("LANGUAGE") || "";
    const locale = envLocale.split(".")[0].split("_")[0];
    return locale || "en";
  }

  /**
   * Load translations from YAML file
   */
  async loadLocale(locale: string): Promise<void> {
    try {
      const path = `${this.localesDir}/${locale}.yaml`;
      const content = await Deno.readTextFile(path);
      const data = parseYAML(content) as Record<string, unknown>;

      const flatMap = new Map<string, string>();
      this.flattenObject(data, "", flatMap);
      this.translations.set(locale, flatMap);
    } catch (error) {
      if (locale !== this.fallbackLocale) {
        console.warn(`Failed to load locale ${locale}, falling back to ${this.fallbackLocale}`);
        if (!this.translations.has(this.fallbackLocale)) {
          await this.loadLocale(this.fallbackLocale);
        }
      } else {
        throw new Error(`Failed to load fallback locale ${this.fallbackLocale}: ${error}`);
      }
    }
  }

  /**
   * Flatten nested object into dot-notation keys
   */
  private flattenObject(
    obj: Record<string, unknown>,
    prefix: string,
    result: Map<string, string>,
  ): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "string") {
        result.set(fullKey, value);
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        this.flattenObject(value as Record<string, unknown>, fullKey, result);
      }
    }
  }

  /**
   * Initialize i18n by loading current and fallback locales
   */
  async init(): Promise<void> {
    await this.loadLocale(this.currentLocale);
    if (this.currentLocale !== this.fallbackLocale && !this.translations.has(this.fallbackLocale)) {
      await this.loadLocale(this.fallbackLocale);
    }
  }

  /**
   * Set current locale
   */
  async setLocale(locale: string): Promise<void> {
    if (!this.translations.has(locale)) {
      await this.loadLocale(locale);
    }
    this.currentLocale = locale;
  }

  /**
   * Get current locale
   */
  getLocale(): string {
    return this.currentLocale;
  }

  /**
   * Translate a key with optional parameters
   */
  t(key: string, params?: Record<string, unknown>): string {
    // Try current locale first
    let translation = this.translations.get(this.currentLocale)?.get(key);

    // Fall back to fallback locale
    if (!translation && this.currentLocale !== this.fallbackLocale) {
      translation = this.translations.get(this.fallbackLocale)?.get(key);
    }

    // If still not found, return the key
    if (!translation) {
      if (Deno.env.get("NODE_ENV") === "development") {
        console.warn(`Translation not found: ${key}`);
      }
      return key;
    }

    // Replace parameters
    if (params) {
      return translation.replace(/{(\w+)}/g, (match, paramKey) => {
        const value = params[paramKey];
        return value !== undefined ? String(value) : match;
      });
    }

    return translation;
  }

  /**
   * Check if a translation exists
   */
  has(key: string): boolean {
    return !!(
      this.translations.get(this.currentLocale)?.has(key) ||
      this.translations.get(this.fallbackLocale)?.has(key)
    );
  }

  /**
   * Get all available locales
   */
  getAvailableLocales(): string[] {
    return Array.from(this.translations.keys());
  }

  /**
   * Get all translation keys for current locale
   */
  getKeys(): string[] {
    const currentKeys = Array.from(this.translations.get(this.currentLocale)?.keys() || []);
    const fallbackKeys = Array.from(this.translations.get(this.fallbackLocale)?.keys() || []);
    return [...new Set([...currentKeys, ...fallbackKeys])];
  }
}

// Global instance
let globalI18n: I18n | null = null;

/**
 * Initialize global i18n instance
 * @param configOrLanguage - Either a full I18nConfig object or a language string
 */
export async function initI18n(configOrLanguage?: I18nConfig | string): Promise<I18n> {
  const config = typeof configOrLanguage === "string"
    ? { language: configOrLanguage }
    : configOrLanguage;

  globalI18n = new I18n(config);
  await globalI18n.init();
  return globalI18n;
}

/**
 * Get global i18n instance
 */
export function getI18n(): I18n {
  if (!globalI18n) {
    throw new Error("i18n not initialized. Call initI18n() first.");
  }
  return globalI18n;
}

/**
 * Shorthand translate function
 */
export function t(key: string, params?: Record<string, unknown>): string {
  return getI18n().t(key, params);
}

/**
 * Set locale for global instance
 */
export async function setLocale(locale: string): Promise<void> {
  await getI18n().setLocale(locale);
}

/**
 * Get current locale from global instance
 */
export function getLocale(): string {
  return getI18n().getLocale();
}
