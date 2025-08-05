/**
 * @fileoverview Application context utilities for displaying app information in Nagare's release flow
 * @module ui/app-context
 * @description Provides utilities to extract and format application display names consistently
 * across Nagare's user interface, ensuring users always know which project Nagare is releasing.
 */

import type { NagareConfig } from "../../types.ts";

/**
 * Get application display name from configuration
 *
 * @description Extracts the application name from Nagare configuration, providing
 * a consistent way to reference the project being released. This ensures users
 * always know which application Nagare is working with, especially important
 * for multi-project workflows.
 *
 * @param config - Nagare configuration object
 * @returns Application display name or fallback
 *
 * @example
 * ```typescript
 * const config: NagareConfig = {
 *   project: { name: "Nagare (流れ)", repository: "..." }
 *   // ... other config
 * };
 *
 * const appName = getAppDisplayName(config);
 * // Returns: "Nagare (流れ)"
 * ```
 *
 * @example Fallback behavior:
 * ```typescript
 * const config: NagareConfig = {
 *   project: { name: "", repository: "..." }
 *   // ... other config
 * };
 *
 * const appName = getAppDisplayName(config);
 * // Returns: "Unknown Project"
 * ```
 */
export function getAppDisplayName(config: NagareConfig): string {
  return config.project.name || "Unknown Project";
}

/**
 * Get formatted application context for messages
 *
 * @description Creates a formatted application context string suitable for
 * inclusion in progress messages and status updates. Provides consistent
 * formatting across all Nagare UI components.
 *
 * @param config - Nagare configuration object
 * @returns Formatted application context
 *
 * @example
 * ```typescript
 * const config: NagareConfig = {
 *   project: { name: "My App", repository: "..." }
 *   // ... other config
 * };
 *
 * const context = getAppContext(config);
 * // Returns: "My App"
 *
 * // Usage in messages:
 * console.log(`🌊 Nagare: Starting release current for ${context}...`);
 * ```
 */
export function getAppContext(config: NagareConfig): string {
  return getAppDisplayName(config);
}

/**
 * Check if application name is available
 *
 * @description Validates whether the configuration contains a meaningful
 * application name, useful for determining if additional context should
 * be displayed or if fallback messaging should be used.
 *
 * @param config - Nagare configuration object
 * @returns True if application name is available and not empty
 *
 * @example
 * ```typescript
 * const config: NagareConfig = {
 *   project: { name: "My App", repository: "..." }
 *   // ... other config
 * };
 *
 * if (hasAppName(config)) {
 *   // Show app-specific messaging
 *   console.log(`Releasing ${getAppDisplayName(config)}...`);
 * } else {
 *   // Use generic messaging
 *   console.log("Starting release...");
 * }
 * ```
 */
export function hasAppName(config: NagareConfig): boolean {
  return Boolean(config.project.name && config.project.name.trim().length > 0);
}

/**
 * Get application name with repository context
 *
 * @description Provides application name with optional repository information,
 * useful for disambiguating projects with similar names or providing additional
 * context in complex multi-repository workflows.
 *
 * @param config - Nagare configuration object
 * @param includeRepo - Whether to include repository information
 * @returns Application name with optional repository context
 *
 * @example
 * ```typescript
 * const config: NagareConfig = {
 *   project: {
 *     name: "My App",
 *     repository: "https://github.com/user/my-app"
 *   }
 *   // ... other config
 * };
 *
 * const nameOnly = getAppNameWithRepo(config, false);
 * // Returns: "My App"
 *
 * const withRepo = getAppNameWithRepo(config, true);
 * // Returns: "My App (user/my-app)"
 * ```
 */
export function getAppNameWithRepo(config: NagareConfig, includeRepo = false): string {
  const appName = getAppDisplayName(config);

  if (!includeRepo || !config.project.repository) {
    return appName;
  }

  // Extract repo name from URL
  const repoMatch = config.project.repository.match(/github\.com\/([^\/]+\/[^\/]+)/);
  if (repoMatch) {
    const repoName = repoMatch[1];
    return `${appName} (${repoName})`;
  }

  return appName;
}
