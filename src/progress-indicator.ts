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

  constructor(
    private options: {
      style?: "detailed" | "minimal" | "quiet";
      showElapsedTime?: boolean;
      showEstimates?: boolean;
    } = {},
  ) {
    this.startTime = Date.now();
    this.stages = this.initializeStages();
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
    if (this.currentStage) {
      const current = this.stages.get(this.currentStage);
      if (current && current.status === "active") {
        current.status = "success";
      }
    }

    const stageInfo = this.stages.get(stage);
    if (stageInfo) {
      stageInfo.status = "active";
      stageInfo.message = message;
      this.currentStage = stage;
      await this.render();
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
          this.currentStage = null;
        }
        await this.render();
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
      await this.render();
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

    // Clear previous render
    if (this.lastRender) {
      const lines = this.lastRender.split("\n").length;
      await Deno.stdout.write(new TextEncoder().encode(`\x1b[${lines}A\x1b[0J`));
    }

    const output = this.options.style === "minimal" ? this.renderMinimal() : this.renderDetailed();

    await Deno.stdout.write(new TextEncoder().encode(output));
    this.lastRender = output;
  }

  /**
   * Render detailed horizontal flow
   */
  private renderDetailed(): string {
    const lines: string[] = [];

    // Header
    lines.push(bold("┌─────────────────────── Release Pipeline ───────────────────────┐"));

    // Stage boxes
    const stageBoxes: string[] = [];
    const statusLines: string[] = [];

    for (const [_, stage] of this.stages) {
      const box = this.formatStageBox(stage);
      stageBoxes.push(box);
      statusLines.push(this.formatStatus(stage.status));
    }

    lines.push("│ " + stageBoxes.join(" │ ") + " │");
    lines.push("└────────────────────────────────────────────────────────────────┘");
    lines.push("  " + statusLines.join("     "));

    // Active stage substeps
    if (this.currentStage) {
      const stage = this.stages.get(this.currentStage);
      if (stage?.substeps && stage.substeps.length > 0) {
        lines.push("");
        lines.push(this.renderSubsteps(stage));
      }
    }

    // Status message and elapsed time
    if (this.currentStage) {
      const stage = this.stages.get(this.currentStage);
      if (stage?.message) {
        lines.push("");
        lines.push(dim(stage.message));
      }
    }

    if (this.options.showElapsedTime) {
      const elapsed = this.formatElapsedTime();
      lines.push("");
      lines.push(dim(`⏱️  ${elapsed} elapsed`));
    }

    return lines.join("\n") + "\n";
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
    this.spinnerIndex = (this.spinnerIndex + 1) % this.spinnerFrames.length;
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
   * Clear the progress display
   */
  async clear() {
    if (this.lastRender) {
      const lines = this.lastRender.split("\n").length;
      await Deno.stdout.write(new TextEncoder().encode(`\x1b[${lines}A\x1b[0J`));
      this.lastRender = "";
    }
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
