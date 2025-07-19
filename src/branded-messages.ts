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
 * flow concept with water/river metaphors using marine-themed colors.
 *
 * @example
 * ```typescript
 * import { NagareBrand as Brand } from "./branded-messages.ts";
 *
 * Brand.log("Analyzing your commits...");
 * Brand.success("Release v1.2.0 published!");
 * Brand.error("Can't find version file. Did you run 'init' first?");
 * Brand.showWaveAnimation(); // Display wave startup animation
 * ```
 */

import { blue, bold, brightBlue, brightCyan, cyan, dim, red, yellow } from "@std/fmt/colors";

/**
 * Release flow phase indicators for progress visualization
 */
export type FlowPhase = "analyzing" | "building" | "publishing" | "complete";

/**
 * Marine color palette for consistent ocean theming
 */
export interface MarineColors {
  deepBlue: (text: string) => string;
  oceanCyan: (text: string) => string;
  tealGreen: (text: string) => string;
  waveBlue: (text: string) => string;
  navyBlue: (text: string) => string;
}

/**
 * Centralized branding system for Nagare CLI commands.
 *
 * Ensures consistent messaging across all CLI interactions with proper
 * branding, tone, and user-focused language following established standards.
 * Emphasizes the "flow" concept with water/river metaphors and marine colors.
 */
export class NagareBrand {
  /** Terminal capability detection (cached) */
  private static _terminalCapabilities: {
    isTTY: boolean;
    supportsAnsi: boolean;
    supportsColors: boolean;
  } | null = null;
  /** Primary brand emoji - represents flow/river */
  static readonly EMOJI = "🌊";

  /** Brand name with Japanese meaning */
  static readonly NAME = "Nagare";

  /** Japanese meaning for context */
  static readonly MEANING = "流れ";

  /** Brand prefix for major operations */
  static readonly PREFIX = `${NagareBrand.EMOJI} ${NagareBrand.NAME}:`;

  /** Wave animation frames for startup */
  private static readonly WAVE_FRAMES = [
    "🌊 nAgare",
    "🌊 naGare",
    "🌊 nagAre",
    "🌊 nagaRe",
    "🌊 nagarE",
  ];

  /**
   * Detect terminal capabilities (with caching for performance)
   */
  private static getTerminalCapabilities() {
    if (NagareBrand._terminalCapabilities) {
      return NagareBrand._terminalCapabilities;
    }

    const isTTY = Deno.stdout.isTerminal();
    let supportsAnsi = false;
    let supportsColors = false;

    if (isTTY) {
      try {
        const term = Deno.env.get("TERM");
        const colorTerm = Deno.env.get("COLORTERM");
        const noColor = Deno.env.get("NO_COLOR");
        const ci = Deno.env.get("CI");

        // NO_COLOR takes precedence
        if (noColor) {
          supportsAnsi = false;
          supportsColors = false;
        } else if (ci === "true") {
          // In CI environments, be more conservative
          supportsAnsi = term !== "dumb" && term !== undefined;
          supportsColors = supportsAnsi;
        } else {
          // Check for common terminals that support ANSI
          supportsAnsi = term !== "dumb" && term !== undefined && (
            term.includes("xterm") ||
            term.includes("screen") ||
            term.includes("tmux") ||
            term.includes("color") ||
            colorTerm !== undefined
          );
          supportsColors = supportsAnsi;
        }
      } catch {
        // If we can't access environment variables, assume no support
        supportsAnsi = false;
        supportsColors = false;
      }
    }

    NagareBrand._terminalCapabilities = { isTTY, supportsAnsi, supportsColors };
    return NagareBrand._terminalCapabilities;
  }

  /**
   * Get marine color palette with fallbacks for non-color terminals
   */
  private static getMarineColors(): MarineColors {
    const caps = NagareBrand.getTerminalCapabilities();

    if (!caps.supportsColors) {
      // Return identity functions for non-color terminals
      const identity = (text: string) => text;
      return {
        deepBlue: identity,
        oceanCyan: identity,
        tealGreen: identity,
        waveBlue: identity,
        navyBlue: identity,
      };
    }

    return {
      deepBlue: (text: string) => blue(text),
      oceanCyan: (text: string) => cyan(text),
      tealGreen: (text: string) => brightCyan(text),
      waveBlue: (text: string) => brightBlue(text),
      navyBlue: (text: string) => dim(blue(text)),
    };
  }

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
   * Display wave animation startup sequence
   * Non-blocking, lightweight text animation
   */
  static showWaveAnimation(): void {
    const caps = NagareBrand.getTerminalCapabilities();

    if (!caps.isTTY || !caps.supportsAnsi) {
      // For non-interactive terminals, just show the final frame
      console.log(NagareBrand.WAVE_FRAMES[NagareBrand.WAVE_FRAMES.length - 1]);
      return;
    }

    const colors = NagareBrand.getMarineColors();

    // Simple sequential display - no timing delays to avoid performance impact
    for (const frame of NagareBrand.WAVE_FRAMES) {
      // Use write + flush for smooth animation in TTY
      const coloredFrame = colors.waveBlue(frame);
      Deno.stdout.writeSync(new TextEncoder().encode(`\r${coloredFrame}${"".padEnd(20)}`));
    }

    // Final newline and branded message
    console.log();
    const message = colors.deepBlue(
      `${NagareBrand.PREFIX} Automate your release flow with confidence`,
    );
    console.log(message);
  }

  /**
   * Standard branded log message - for major operations and status updates
   * @param message - User-focused message in present tense
   */
  static log(message: string): void {
    const colors = NagareBrand.getMarineColors();
    const coloredPrefix = colors.deepBlue(NagareBrand.PREFIX);
    console.log(`${coloredPrefix} ${message}`);
  }

  /**
   * Branded error message - solution-oriented and actionable
   * @param message - Helpful error message with next steps
   */
  static error(message: string): void {
    const colors = NagareBrand.getMarineColors();
    const coloredPrefix = colors.deepBlue(NagareBrand.PREFIX);
    console.error(`${coloredPrefix} ${red(message)}`);
  }

  /**
   * Success message - positive confirmation of completed task
   * @param message - Past tense confirmation message with flow metaphor
   */
  static success(message: string): void {
    const colors = NagareBrand.getMarineColors();
    const flowMessage = message.includes("complete") || message.includes("finished")
      ? message.replace(/complete|finished/, "flowing smoothly")
      : message;
    console.log(`✅ ${colors.tealGreen(flowMessage)}`);
  }

  /**
   * Warning message - cautious tone with actionable guidance
   * @param message - Warning with suggested action
   */
  static warning(message: string): void {
    console.log(`⚠️ ${yellow(message)}`);
  }

  /**
   * Progress message with optional flow phase indicator
   * @param message - Specific ongoing action
   * @param phase - Optional flow phase for visual context
   */
  static progress(message: string, phase?: FlowPhase): void {
    const colors = NagareBrand.getMarineColors();
    const emoji = phase ? NagareBrand.getPhaseEmoji(phase) : "🔄";
    const flowMessage = NagareBrand.enhanceWithFlowLanguage(message);
    console.log(`${emoji} ${colors.oceanCyan(flowMessage)}`);
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
    const colors = NagareBrand.getMarineColors();
    const flowMessage = message.includes("complete")
      ? `${message} 🌊 Flow reached destination successfully!`
      : message;
    console.log(`🎉 ${colors.tealGreen(bold(flowMessage))}`);
  }

  /**
   * Enhance message with flow-focused language
   * @param message - Original message
   * @returns Message with flow metaphors where appropriate
   */
  private static enhanceWithFlowLanguage(message: string): string {
    const flowMappings = {
      "checking": "navigating",
      "bumping": "flowing to",
      "updating": "channeling",
      "building": "preparing current",
      "uploading": "streaming to",
      "downloading": "drawing from",
      "validating": "testing waters",
      "analyzing": "reading currents",
    };

    let enhanced = message;
    for (const [original, flow] of Object.entries(flowMappings)) {
      enhanced = enhanced.replace(new RegExp(`\b${original}\b`, "gi"), flow);
    }

    return enhanced;
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
   * Version bump message with marine theming
   * @param currentVersion - Current version
   * @param newVersion - New version
   * @param bumpType - Type of version bump
   */
  static versionBump(currentVersion: string, newVersion: string, bumpType: string): string {
    const colors = NagareBrand.getMarineColors();
    const coloredPrefix = colors.deepBlue(NagareBrand.PREFIX);
    const flowType = bumpType === "major"
      ? "surging"
      : bumpType === "minor"
      ? "flowing"
      : "rippling";
    return `${coloredPrefix} ${
      colors.oceanCyan(`${flowType} from v${currentVersion} to v${newVersion} (${bumpType})`)
    }...`;
  }

  /**
   * Release creation message with flow theming
   * @param version - Version being released
   */
  static creatingRelease(version: string): string {
    const colors = NagareBrand.getMarineColors();
    const coloredPrefix = colors.deepBlue(NagareBrand.PREFIX);
    return `${coloredPrefix} ${
      colors.oceanCyan(`Channeling release v${version} into the stream`)
    }...`;
  }

  /**
   * GitHub release message with upstream metaphor
   * @param version - Version being published
   */
  static publishingToGitHub(version: string): string {
    const colors = NagareBrand.getMarineColors();
    const coloredPrefix = colors.deepBlue(NagareBrand.PREFIX);
    return `${coloredPrefix} ${colors.oceanCyan(`Streaming v${version} to GitHub upstream`)}...`;
  }

  /**
   * JSR publishing message with registry metaphor
   * @param version - Version being published
   */
  static publishingToJSR(version: string): string {
    const colors = NagareBrand.getMarineColors();
    const coloredPrefix = colors.deepBlue(NagareBrand.PREFIX);
    return `${coloredPrefix} ${colors.oceanCyan(`Flowing v${version} into JSR channels`)}...`;
  }

  /**
   * Rollback message with tide metaphor
   * @param version - Version being rolled back
   */
  static rollingBack(version: string): string {
    const colors = NagareBrand.getMarineColors();
    const coloredPrefix = colors.deepBlue(NagareBrand.PREFIX);
    return `${coloredPrefix} ${colors.navyBlue(`Reversing current back to v${version}`)}...`;
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
