/**
 * Centralized branding system for consistent Nagare CLI messaging.
 *
 * This module provides standardized messaging methods that ensure all CLI output
 * maintains consistent branding with the 🌊 Nagare prefix and appropriate tone.
 * Based on established CLI guidelines including Google's documentation style,
 * 12-Factor CLI principles, and Command Line Interface Guidelines.
 *
 * Nagare (流れ) means "flow" in Japanese, reflecting the smooth, automated
 * flow from commits to releases. The branding emphasizes this continuous
 * flow concept with water/river metaphors.
 *
 * @example
 * ```typescript
 * import { NagareBrand as Brand } from "./branded-messages.ts";
 *
 * Brand.log("Analyzing your commits...");
 * Brand.success("Release v1.2.0 published!");
 * Brand.error("Can't find version file. Did you run 'init' first?");
 * ```
 */

/**
 * Release flow phase indicators for progress visualization
 */
export type FlowPhase = "analyzing" | "building" | "publishing" | "complete";

/**
 * Centralized branding system for Nagare CLI commands.
 *
 * Ensures consistent messaging across all CLI interactions with proper
 * branding, tone, and user-focused language following established standards.
 * Emphasizes the "flow" concept with water/river metaphors.
 */
export class NagareBrand {
  /** Primary brand emoji - represents flow/river */
  static readonly EMOJI = "🌊";

  /** Brand name with Japanese meaning */
  static readonly NAME = "Nagare";

  /** Japanese meaning for context */
  static readonly MEANING = "流れ";

  /** Brand prefix for major operations */
  static readonly PREFIX = `${NagareBrand.EMOJI} ${NagareBrand.NAME}:`;

  /**
   * Get flow phase emoji for progress indicators
   * @param phase - The current flow phase
   * @returns Appropriate emoji for the phase
   */
  private static getPhaseEmoji(phase: FlowPhase): string {
    const emojis = {
      analyzing: "🔍", // Analyzing commits
      building: "🔧", // Building release
      publishing: "📤", // Publishing release
      complete: "✨", // Flow complete
    };
    return emojis[phase];
  }

  /**
   * Standard branded log message - for major operations and status updates
   * @param message - User-focused message in present tense
   */
  static log(message: string): void {
    console.log(`${NagareBrand.PREFIX} ${message}`);
  }

  /**
   * Branded error message - solution-oriented and actionable
   * @param message - Helpful error message with next steps
   */
  static error(message: string): void {
    console.error(`${NagareBrand.PREFIX} ${message}`);
  }

  /**
   * Success message - positive confirmation of completed task
   * @param message - Past tense confirmation message
   */
  static success(message: string): void {
    console.log(`✅ ${message}`);
  }

  /**
   * Warning message - cautious tone with actionable guidance
   * @param message - Warning with suggested action
   */
  static warning(message: string): void {
    console.log(`⚠️ ${message}`);
  }

  /**
   * Progress message with optional flow phase indicator
   * @param message - Specific ongoing action
   * @param phase - Optional flow phase for visual context
   */
  static progress(message: string, phase?: FlowPhase): void {
    const emoji = phase ? NagareBrand.getPhaseEmoji(phase) : "🔄";
    console.log(`${emoji} ${message}`);
  }

  /**
   * Information message - neutral status without branding prefix
   * @param message - Factual information or status
   */
  static info(message: string): void {
    console.log(message);
  }

  /**
   * Debug message - detailed technical information (only in verbose mode)
   * @param message - Technical details for troubleshooting
   */
  static debug(message: string): void {
    if (Deno.env.get("DEBUG") || Deno.env.get("NAGARE_DEBUG")) {
      console.log(`🔍 ${message}`);
    }
  }

  /**
   * Celebration message for major milestones
   * @param message - Achievement to celebrate
   */
  static celebrate(message: string): void {
    console.log(`🎉 ${message}`);
  }

  // Pre-built message templates for common scenarios

  /**
   * Welcome message for initialization
   * @param version - Current version being set up
   */
  static welcome(version?: string): string {
    const versionText = version ? ` (v${version})` : "";
    return `${NagareBrand.PREFIX} Setting up automated release flow${versionText}...`;
  }

  /**
   * Release analysis message
   */
  static analyzingCommits(): string {
    return `${NagareBrand.PREFIX} Analyzing your commits since last release...`;
  }

  /**
   * Version bump message
   * @param currentVersion - Current version
   * @param newVersion - New version
   * @param bumpType - Type of version bump
   */
  static versionBump(currentVersion: string, newVersion: string, bumpType: string): string {
    return `${NagareBrand.PREFIX} Flowing from v${currentVersion} to v${newVersion} (${bumpType})...`;
  }

  /**
   * Release creation message
   * @param version - Version being released
   */
  static creatingRelease(version: string): string {
    return `${NagareBrand.PREFIX} Creating release v${version}...`;
  }

  /**
   * GitHub release message
   * @param version - Version being published
   */
  static publishingToGitHub(version: string): string {
    return `${NagareBrand.PREFIX} Publishing v${version} to GitHub...`;
  }

  /**
   * JSR publishing message
   * @param version - Version being published
   */
  static publishingToJSR(version: string): string {
    return `${NagareBrand.PREFIX} Publishing v${version} to JSR...`;
  }

  /**
   * Rollback message
   * @param version - Version being rolled back
   */
  static rollingBack(version: string): string {
    return `${NagareBrand.PREFIX} Rolling back to v${version}...`;
  }

  /**
   * Help introduction message
   */
  static helpIntro(): string {
    return `${NagareBrand.PREFIX} Automate your release flow with confidence...`;
  }

  /**
   * Initialization complete message
   */
  static initComplete(): string {
    return `🎉 Nagare initialized! Your release flow is ready to begin.`;
  }

  /**
   * Release complete message
   * @param version - Version that was released
   * @param commitCount - Number of commits included
   */
  static releaseComplete(version: string, commitCount: number): string {
    const commitText = commitCount === 1 ? "commit" : "commits";
    return `🎉 Release v${version} complete! (${commitCount} ${commitText} included)`;
  }

  /**
   * Dry run message
   */
  static dryRunMode(): string {
    return `${NagareBrand.PREFIX} Preview mode - no changes will be made`;
  }

  /**
   * Backup creation message
   */
  static creatingBackup(): string {
    return `${NagareBrand.PREFIX} Creating backup before modification...`;
  }

  /**
   * Backup restoration message
   */
  static restoringBackup(): string {
    return `${NagareBrand.PREFIX} Restoring from backup due to error...`;
  }

  /**
   * File operation message
   * @param action - What's being done (updated, created, etc.)
   * @param filename - Name of file
   */
  static fileOperation(action: string, filename: string): string {
    return `📄 ${action} ${filename}`;
  }

  /**
   * Network operation message
   * @param action - What's being done (fetching, uploading, etc.)
   * @param target - Where to/from
   */
  static networkOperation(action: string, target: string): string {
    return `🌐 ${action} ${target}...`;
  }

  /**
   * Git operation message
   * @param action - What's being done (committing, tagging, etc.)
   * @param details - Additional details
   */
  static gitOperation(action: string, details?: string): string {
    const detailsText = details ? ` ${details}` : "";
    return `🔧 ${action}${detailsText}`;
  }

  /**
   * Verification message
   * @param target - What's being verified
   */
  static verifying(target: string): string {
    return `🔍 Verifying ${target}...`;
  }

  /**
   * Error recovery helper
   * @param problem - What went wrong
   * @param solution - Suggested fix
   */
  static errorWithSolution(problem: string, solution: string): string {
    return `${NagareBrand.PREFIX} ${problem}\n\n💡 Try: ${solution}`;
  }

  /**
   * Configuration validation message
   */
  static validatingConfig(): string {
    return `${NagareBrand.PREFIX} Validating configuration...`;
  }

  /**
   * Environment check message
   */
  static checkingEnvironment(): string {
    return `${NagareBrand.PREFIX} Checking environment...`;
  }

  /**
   * Dependencies check message
   */
  static checkingDependencies(): string {
    return `${NagareBrand.PREFIX} Checking dependencies...`;
  }

  /**
   * Version file generation message
   * @param templateType - Type of template being used
   */
  static generatingVersionFile(templateType: string): string {
    return `📄 Generating version file using ${templateType} template`;
  }

  /**
   * Changelog update message
   */
  static updatingChangelog(): string {
    return `📝 Updating CHANGELOG.md`;
  }

  /**
   * Template processing message
   * @param templateName - Name of template being processed
   */
  static processingTemplate(templateName: string): string {
    return `🔄 Processing ${templateName} template`;
  }

  /**
   * Pre-flight checks message
   */
  static runningPreflightChecks(): string {
    return `${NagareBrand.PREFIX} Running pre-flight checks...`;
  }

  /**
   * Security validation message
   */
  static validateingSecurity(): string {
    return `🔒 Validating security requirements`;
  }

  /**
   * Post-release hook message
   * @param hookName - Name of hook being executed
   */
  static executingHook(hookName: string): string {
    return `🔗 Executing ${hookName} hook`;
  }
}

/**
 * Shorter alias for common usage
 */
export const Brand = NagareBrand;
