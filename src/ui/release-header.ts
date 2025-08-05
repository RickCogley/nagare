/**
 * @fileoverview Release header display for showing application context in Nagare's release flow
 * @module ui/release-header
 * @description Provides branded header displays that show which application is being released,
 * ensuring users always have clear context about the current operation.
 */

import type { NagareConfig } from "../../types.ts";
import { getAppDisplayName } from "./app-context.ts";
import { NagareBrand } from "../branded-messages.ts";

/**
 * Display branded release header with application context
 *
 * @description Shows a comprehensive header at the start of release operations
 * that clearly identifies the application being released, version transition,
 * and maintains Nagare's marine theme with consistent branding.
 *
 * @param config - Nagare configuration object
 * @param fromVersion - Current version being released from
 * @param toVersion - New version being released to
 *
 * @example
 * ```typescript
 * const config: NagareConfig = {
 *   project: { name: "Nagare (流れ)", repository: "..." }
 *   // ... other config
 * };
 *
 * showReleaseHeader(config, "2.14.0", "2.15.0");
 * // Output:
 * // 🌊 Nagare: Starting release current for Nagare (流れ)...
 * // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * // Project: Nagare (流れ)
 * // Version: 2.14.0 → 2.15.0
 * // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ```
 *
 * @example With unknown project:
 * ```typescript
 * const config: NagareConfig = {
 *   project: { name: "", repository: "..." }
 *   // ... other config
 * };
 *
 * showReleaseHeader(config, "1.0.0", "1.1.0");
 * // Output:
 * // 🌊 Nagare: Starting release current for Unknown Project...
 * // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * // Project: Unknown Project
 * // Version: 1.0.0 → 1.1.0
 * // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ```
 */
export function showReleaseHeader(config: NagareConfig, fromVersion: string, toVersion: string): void {
  const appName = getAppDisplayName(config);

  // Show branded startup message with application context
  console.log(`🌊 Nagare: Starting release current for ${appName}...`);

  // Create divider line (50 characters for visual consistency)
  const divider = "━".repeat(50);
  console.log(divider);

  // Show project context and version transition
  console.log(`Project: ${appName}`);
  console.log(`Version: ${fromVersion} → ${toVersion}`);

  // Close with divider
  console.log(divider);
}

/**
 * Display compact release header for quiet modes
 *
 * @description Shows a minimal header that provides essential context
 * without the full branded display, suitable for CI environments
 * or when user prefers less verbose output.
 *
 * @param config - Nagare configuration object
 * @param fromVersion - Current version being released from
 * @param toVersion - New version being released to
 *
 * @example
 * ```typescript
 * const config: NagareConfig = {
 *   project: { name: "My App", repository: "..." }
 *   // ... other config
 * };
 *
 * showCompactReleaseHeader(config, "1.0.0", "1.1.0");
 * // Output:
 * // Releasing My App: 1.0.0 → 1.1.0
 * ```
 */
export function showCompactReleaseHeader(config: NagareConfig, fromVersion: string, toVersion: string): void {
  const appName = getAppDisplayName(config);
  console.log(`Releasing ${appName}: ${fromVersion} → ${toVersion}`);
}

/**
 * Show application context in progress messages
 *
 * @description Creates branded progress messages that include application
 * context, maintaining the marine theme while ensuring users know which
 * project is being processed.
 *
 * @param config - Nagare configuration object
 * @param action - The action being performed (e.g., "Analyzing", "Updating")
 * @param details - Optional additional details
 *
 * @example
 * ```typescript
 * const config: NagareConfig = {
 *   project: { name: "Aichaku", repository: "..." }
 *   // ... other config
 * };
 *
 * showAppProgress(config, "Analyzing", "commit flow");
 * // Output: 🌊 Nagare: Analyzing Aichaku commit flow...
 *
 * showAppProgress(config, "Updating", "4 files");
 * // Output: 🌊 Nagare: Updating 4 files in Aichaku current...
 * ```
 */
export function showAppProgress(config: NagareConfig, action: string, details?: string): void {
  const appName = getAppDisplayName(config);

  if (details) {
    // Include details with flow language
    const message = details.includes("files") || details.includes("current")
      ? `${action} ${details} in ${appName} current`
      : `${action} ${appName} ${details}`;

    NagareBrand.log(`${message}...`);
  } else {
    // Simple action with app context
    NagareBrand.log(`${action} ${appName}...`);
  }
}

/**
 * Show application completion message
 *
 * @description Displays completion message with application context and
 * marine flow theming, providing clear confirmation of successful operations.
 *
 * @param config - Nagare configuration object
 * @param version - Version that was released
 * @param action - The action that was completed (default: "release")
 *
 * @example
 * ```typescript
 * const config: NagareConfig = {
 *   project: { name: "Nagare (流れ)", repository: "..." }
 *   // ... other config
 * };
 *
 * showAppCompletion(config, "2.15.0");
 * // Output: 🎉 Nagare (流れ) v2.15.0 release flow complete!
 *
 * showAppCompletion(config, "2.14.0", "rollback");
 * // Output: 🎉 Nagare (流れ) v2.14.0 rollback flow complete!
 * ```
 */
export function showAppCompletion(config: NagareConfig, version: string, action = "release"): void {
  const appName = getAppDisplayName(config);
  NagareBrand.celebrate(`${appName} v${version} ${action} flow complete!`);
}

/**
 * Show release summary with application context
 *
 * @description Displays a comprehensive summary of the release operation
 * including application context, version details, and commit information.
 *
 * @param config - Nagare configuration object
 * @param version - Version that was released
 * @param commitCount - Number of commits included in the release
 * @param filesUpdated - Number of files that were updated
 *
 * @example
 * ```typescript
 * const config: NagareConfig = {
 *   project: { name: "My App", repository: "..." }
 *   // ... other config
 * };
 *
 * showReleaseSummary(config, "1.2.0", 12, 4);
 * // Output:
 * // ✨ My App Release Summary
 * // Version: 1.2.0
 * // Commits: 12
 * // Files Updated: 4
 * ```
 */
export function showReleaseSummary(
  config: NagareConfig,
  version: string,
  commitCount: number,
  filesUpdated: number,
): void {
  const appName = getAppDisplayName(config);

  console.log(`✨ ${appName} Release Summary`);
  console.log(`Version: ${version}`);
  console.log(`Commits: ${commitCount}`);
  console.log(`Files Updated: ${filesUpdated}`);
}
