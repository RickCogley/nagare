/**
 * Progress indicator system for visual feedback
 * Provides horizontal flow visualization and progress tracking
 */

import { bold, cyan, dim, green, red, yellow } from "@std/fmt/colors";

export type ProgressStage =
  | "init"
  | "checks"
  | "version"
  | "changelog"
  | "git"
  | "github"
  | "ci-cd"
  | "jsr"
  | "complete";

export type StageStatus = "pending" | "active" | "success" | "error" | "fixing";

export interface StageInfo {
  name: string;
  displayName: string;
  status: StageStatus;
  message?: string;
  substeps?: SubStep[];
}

export interface SubStep {
  name: string;
  status: StageStatus;
}

export class ProgressIndicator {
  private stages: Map<ProgressStage, StageInfo>;
  private currentStage: ProgressStage | null = null;
  private startTime: number;
  private spinnerFrames = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"];
  private spinnerIndex = 0;
  private lastRender = "";
  private supportsAnsi: boolean;
  private isTTY: boolean;
  private lastSimpleOutput = "";
  private animationTimer: number | null = null;
  private isActive = false;
  private reservedLines = 0;
  private lastRenderTime = 0;

  constructor(
    private options: {
      style?: "detailed" | "minimal" | "quiet";
      showElapsedTime?: boolean;
      showEstimates?: boolean;
    } = {},
  ) {
    this.startTime = Date.now();
    this.stages = this.initializeStages();
    this.isTTY = Deno.stdout.isTerminal();
    this.supportsAnsi = this.detectAnsiSupport();

    // Auto-adjust style based on terminal capabilities
    if (!this.isTTY || !this.supportsAnsi) {
      // Fall back to minimal style in non-TTY environments
      if (this.options.style === "detailed") {
        this.options.style = "minimal";
      }
    }

    // Debug info for troubleshooting (only in debug mode)
    if (Deno.env.get("NAGARE_DEBUG") === "true") {
      console.debug("Progress indicator initialized:", {
        isTTY: this.isTTY,
        supportsAnsi: this.supportsAnsi,
        style: this.options.style,
        term: Deno.env.get("TERM"),
        colorTerm: Deno.env.get("COLORTERM"),
        termDetection: {
          isXtermGhostty: Deno.env.get("TERM")?.includes("ghostty"),
          isModernTerminal: ["ghostty", "alacritty", "wezterm", "kitty", "iterm", "hyper"].some(
            (t) => Deno.env.get("TERM")?.toLowerCase().includes(t),
          ),
        },
      });
    }
  }

  /**
   * Detect if the terminal supports ANSI escape sequences
   */
  private detectAnsiSupport(): boolean {
    try {
      // Check if we're in a TTY first
      if (!this.isTTY) {
        return false;
      }

      // Check environment variables that indicate ANSI support
      const term = Deno.env.get("TERM");
      const colorTerm = Deno.env.get("COLORTERM");
      const noColor = Deno.env.get("NO_COLOR");
      const ci = Deno.env.get("CI");

      // NO_COLOR takes precedence
      if (noColor) {
        return false;
      }

      // Enable ANSI for modern terminals, but be conservative for older ones
      const modernTerminals = [
        "ghostty",
        "alacritty",
        "wezterm",
        "kitty",
        "iterm",
        "hyper",
      ];
      const isModernTerminal = modernTerminals.some((t) => term?.toLowerCase().includes(t));

      // Allow override with environment variable
      const forceEnable = Deno.env.get("NAGARE_ENABLE_ANSI_CLEARING") === "true";
      const forceDisable = Deno.env.get("NAGARE_DISABLE_ANSI_CLEARING") === "true";

      if (forceDisable) {
        return false;
      }

      if (forceEnable || isModernTerminal) {
        // Modern terminals should handle ANSI well
      } else {
        // Be conservative with older terminals
        return false;
      }

      // In CI environments, be more conservative
      if (ci === "true") {
        return term !== "dumb" && term !== undefined;
      }

      // Check for common terminals that support ANSI
      return term !== "dumb" && term !== undefined && (
        term.includes("xterm") ||
        term.includes("screen") ||
        term.includes("tmux") ||
        term.includes("color") ||
        colorTerm !== undefined
      );
    } catch {
      // If we can't access environment variables, assume no ANSI support
      return false;
    }
  }

  private initializeStages(): Map<ProgressStage, StageInfo> {
    const stages: Array<[ProgressStage, StageInfo]> = [
      ["init", { name: "init", displayName: "Init", status: "pending" }],
      ["checks", { name: "checks", displayName: "Checks", status: "pending" }],
      ["version", { name: "version", displayName: "Version", status: "pending" }],
      ["changelog", { name: "changelog", displayName: "Changes", status: "pending" }],
      ["git", { name: "git", displayName: "Git", status: "pending" }],
      ["github", { name: "github", displayName: "GitHub", status: "pending" }],
      ["ci-cd", { name: "ci-cd", displayName: "CI/CD", status: "pending" }],
      ["jsr", { name: "jsr", displayName: "JSR", status: "pending" }],
      ["complete", { name: "complete", displayName: "Done", status: "pending" }],
    ];
    return new Map(stages);
  }

  /**
   * Start a new stage
   */
  async startStage(stage: ProgressStage, message?: string) {
    // Complete any currently active stage first
    if (this.currentStage) {
      const current = this.stages.get(this.currentStage);
      if (current && current.status === "active") {
        // This will properly complete the current stage with checkmark display
        await this.completeStage(this.currentStage);
      }
    }

    const stageInfo = this.stages.get(stage);
    if (stageInfo) {
      stageInfo.status = "active";
      stageInfo.message = message;
      this.currentStage = stage;
      this.isActive = true;
      await this.render();
      this.startSpinnerAnimation();
    }
  }

  /**
   * Mark current stage as complete
   */
  async completeStage(stage?: ProgressStage, status: "success" | "error" = "success") {
    const targetStage = stage || this.currentStage;
    if (targetStage) {
      const stageInfo = this.stages.get(targetStage);
      if (stageInfo) {
        stageInfo.status = status;
        if (targetStage === this.currentStage) {
          // Stop spinner animation first
          this.stopSpinnerAnimation();

          // Render one final time to show the checkmark before clearing
          await this.render();

          // Brief pause to let user see the checkmark
          await new Promise((resolve) => setTimeout(resolve, 100));

          this.currentStage = null;

          // Clear progress line before stage completion message
          if (this.reservedLines > 0) {
            await Deno.stdout.write(new TextEncoder().encode(`\r\x1b[K`));
            this.reservedLines = 0;
          }

          // Show brief stage completion in log flow
          const statusIcon = status === "success" ? "✅" : "❌";
          console.log(`${statusIcon} ${stageInfo.displayName} stage complete`);

          // Check if all stages are complete
          const allComplete = Array.from(this.stages.values()).every(
            (s) => s.status === "success" || s.status === "error",
          );
          if (allComplete) {
            this.isActive = false;
            await this.render(); // Show final summary
          }
        }
      }
    }
  }

  /**
   * Update stage with error
   */
  async errorStage(stage: ProgressStage, message: string) {
    const stageInfo = this.stages.get(stage);
    if (stageInfo) {
      stageInfo.status = "error";
      stageInfo.message = message;
      if (stage === this.currentStage) {
        this.stopSpinnerAnimation();
      }
      await this.render();
    }
  }

  /**
   * Set stage to fixing status
   */
  async fixingStage(stage: ProgressStage, message: string) {
    const stageInfo = this.stages.get(stage);
    if (stageInfo) {
      stageInfo.status = "fixing";
      stageInfo.message = message;
      this.currentStage = stage;
      await this.render();
      this.startSpinnerAnimation();
    }
  }

  /**
   * Add substeps to current stage
   */
  async setSubsteps(stage: ProgressStage, substeps: SubStep[]) {
    const stageInfo = this.stages.get(stage);
    if (stageInfo) {
      stageInfo.substeps = substeps;
      await this.render();
    }
  }

  /**
   * Update substep status
   */
  async updateSubstep(stage: ProgressStage, substepName: string, status: StageStatus) {
    const stageInfo = this.stages.get(stage);
    if (stageInfo?.substeps) {
      const substep = stageInfo.substeps.find((s) => s.name === substepName);
      if (substep) {
        substep.status = status;
        await this.render();
      }
    }
  }

  /**
   * Render the progress indicator
   */
  private async render() {
    if (this.options.style === "quiet") {
      return;
    }

    // In non-TTY environments, use simple append-only output
    if (!this.isTTY || !this.supportsAnsi) {
      const output = this.renderSimple();
      await Deno.stdout.write(new TextEncoder().encode(output));
      return;
    }

    const output = this.options.style === "minimal" ? this.renderMinimal() : this.renderDetailed();

    if (this.isActive) {
      // Simple approach: overwrite current line without complex cursor positioning
      if (this.reservedLines > 0) {
        await Deno.stdout.write(new TextEncoder().encode(`\r\x1b[K`));
      }

      // Write progress indicator and stay on same line
      const outputWithoutNewline = output.trimEnd();
      await Deno.stdout.write(new TextEncoder().encode(outputWithoutNewline));
      this.reservedLines = 1;
    } else {
      // Clear progress line and show final summary
      if (this.reservedLines > 0) {
        await Deno.stdout.write(new TextEncoder().encode(`\r\x1b[K`));
        this.reservedLines = 0;
      }

      const finalOutput = this.renderFinalState();
      await Deno.stdout.write(new TextEncoder().encode(finalOutput));
    }

    this.lastRender = output;
  }

  /**
   * Render final state without progress header
   */
  private renderFinalState(): string {
    const stageStates = Array.from(this.stages.values()).map((stage) =>
      this.formatStatus(stage.status)
    );
    return stageStates.join(" ") + "\n";
  }

  /**
   * Render detailed horizontal flow - single line for better terminal compatibility
   */
  private renderDetailed(): string {
    // Build a single line with progress indicators and current stage
    const stageStates = Array.from(this.stages.values()).map((stage) =>
      this.formatStatus(stage.status)
    );
    const progressLine = stageStates.join(" ");

    let output = bold("Release Progress: ") + progressLine;

    // Add current stage info inline
    if (this.currentStage) {
      const stage = this.stages.get(this.currentStage);
      if (stage) {
        output += ` | ${stage.displayName}`;
        if (stage.message) {
          output += ` - ${dim(stage.message)}`;
        }
      }
    }

    if (this.options.showElapsedTime) {
      const elapsed = this.formatElapsedTime();
      output += ` | ${dim(`⏱️ ${elapsed}`)}`;
    }

    return output + "\n";
  }

  /**
   * Render simple append-only output for non-TTY environments
   */
  private renderSimple(): string {
    // Show a single line progress indicator when possible
    if (this.currentStage) {
      const stage = this.stages.get(this.currentStage);
      if (stage && stage.status === "active") {
        const statusSymbol = this.getSimpleStatusSymbol(stage.status);
        const message = stage.message || `${stage.displayName} stage`;
        const output = `[${
          new Date().toISOString().split("T")[1].split(".")[0]
        }] ${statusSymbol} ${message}\n`;

        // Only output if it's different from last time
        if (output === this.lastSimpleOutput) {
          return "";
        }

        this.lastSimpleOutput = output;
        return output;
      }
    }

    // For stage completions, show a summary line
    const completedStages =
      Array.from(this.stages.values()).filter((s) => s.status === "success").length;
    const totalStages = this.stages.size;

    if (completedStages > 0) {
      const output = `Progress: ${completedStages}/${totalStages} stages complete\n`;
      if (output !== this.lastSimpleOutput) {
        this.lastSimpleOutput = output;
        return output;
      }
    }

    return "";
  }

  /**
   * Get simple status symbol for non-TTY environments
   */
  private getSimpleStatusSymbol(status: StageStatus): string {
    switch (status) {
      case "success":
        return "✓";
      case "error":
        return "✗";
      case "active":
        return "→";
      case "fixing":
        return "🔧";
      default:
        return "•";
    }
  }

  /**
   * Render minimal progress line
   */
  private renderMinimal(): string {
    const parts: string[] = [];

    for (const [_, stage] of this.stages) {
      const marker = this.getStatusMarker(stage.status);
      const name = stage.displayName;
      const formatted = stage.status === "active"
        ? bold(cyan(`[${marker}] ${name}`))
        : `[${marker}] ${name}`;
      parts.push(formatted);
    }

    return parts.join(" → ") + "\n";
  }

  /**
   * Format a stage box for detailed view
   */
  private formatStageBox(stage: StageInfo): string {
    const width = 7; // Fixed width for alignment
    const name = stage.displayName.padEnd(width);

    if (stage.status === "active") {
      return bold(cyan(`▶ ${name} ◀`));
    }
    return ` ${name} `;
  }

  /**
   * Format status indicator
   */
  private formatStatus(status: StageStatus): string {
    switch (status) {
      case "success":
        return green("✓");
      case "error":
        return red("✗");
      case "active":
        return cyan(this.getSpinner());
      case "fixing":
        return yellow("🔧");
      default:
        return dim("○");
    }
  }

  /**
   * Get status marker for minimal view
   */
  private getStatusMarker(status: StageStatus): string {
    switch (status) {
      case "success":
        return green("✓");
      case "error":
        return red("✗");
      case "active":
        return cyan("⟳");
      case "fixing":
        return yellow("🔧");
      default:
        return " ";
    }
  }

  /**
   * Render substeps for active stage
   */
  private renderSubsteps(stage: StageInfo): string {
    if (!stage.substeps) return "";

    const lines: string[] = [];
    const indent = " ".repeat(30); // Align with active stage

    lines.push(indent + "│");
    lines.push(indent + `├─── ${stage.displayName} Progress ───┐`);

    for (const substep of stage.substeps) {
      const status = this.formatStatus(substep.status);
      const name = substep.name.padEnd(20);
      lines.push(indent + `│ ${status} ${name} │`);
    }

    lines.push(indent + "└────────────────────────┘");

    return lines.join("\n");
  }

  /**
   * Get spinner frame
   */
  private getSpinner(): string {
    return this.spinnerFrames[this.spinnerIndex];
  }

  /**
   * Format elapsed time
   */
  private formatElapsedTime(): string {
    const elapsed = Date.now() - this.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }

  /**
   * Start spinner animation for active stages
   */
  private startSpinnerAnimation() {
    // Only animate in TTY environments with ANSI support
    if (!this.isTTY || !this.supportsAnsi || this.options.style === "quiet") {
      return;
    }

    // Clear any existing timer
    this.stopSpinnerAnimation();

    // Start animation timer - update every 150ms for smooth animation
    this.animationTimer = setInterval(async () => {
      if (this.currentStage) {
        const stage = this.stages.get(this.currentStage);
        if (stage && (stage.status === "active" || stage.status === "fixing")) {
          // Advance spinner frame for animation
          this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
          await this.render();
        } else {
          this.stopSpinnerAnimation();
        }
      } else {
        this.stopSpinnerAnimation();
      }
    }, 150);
  }

  /**
   * Stop spinner animation
   */
  private stopSpinnerAnimation() {
    if (this.animationTimer !== null) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
    }
  }

  /**
   * Clear the progress display
   */
  async clear() {
    // Stop any running animation
    this.stopSpinnerAnimation();

    // Only clear if we have ANSI support and are in TTY
    if (this.isTTY && this.supportsAnsi && this.lastRender) {
      const lines = this.lastRender.split("\n").length;
      await Deno.stdout.write(new TextEncoder().encode(`\x1b[${lines}A\x1b[0J`));
      this.lastRender = "";
    }
    // In non-TTY environments, just reset the internal state
    this.lastRender = "";
  }

  /**
   * Show a simple progress bar
   */
  static progressBar(current: number, total: number, width: number = 30): string {
    const percent = Math.min(100, Math.round((current / total) * 100));
    const filled = Math.round((width * current) / total);
    const empty = width - filled;

    const bar = "█".repeat(filled) + "░".repeat(empty);
    return `[${bar}] ${percent}%`;
  }
}
