/**
 * Professional progress indicator using Deno std CLI Spinner (JSR compatible)
 * Provides reliable spinner animation and clean stage management
 */

import { Spinner } from "jsr:@std/cli/unstable-spinner";
import { blue, bold, cyan, dim, green, red, yellow } from "@std/fmt/colors";

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

export class KiaProgressIndicator {
  private stages: Map<ProgressStage, StageInfo>;
  private currentStage: ProgressStage | null = null;
  private currentSpinner: Spinner | null = null;
  private startTime: number;
  private isTTY: boolean;

  constructor(
    private options: {
      style?: "detailed" | "minimal" | "quiet";
      showElapsedTime?: boolean;
    } = {},
  ) {
    this.startTime = Date.now();
    this.stages = this.initializeStages();
    this.isTTY = Deno.stdout.isTerminal();

    // Auto-adjust style based on terminal capabilities
    if (!this.isTTY && this.options.style === "detailed") {
      this.options.style = "minimal";
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
   * Start a new stage with Kia spinner
   */
  async startStage(stage: ProgressStage, message?: string) {
    // Complete any currently active stage first
    if (this.currentStage && this.currentSpinner) {
      await this.completeStage(this.currentStage);
    }

    const stageInfo = this.stages.get(stage);
    if (stageInfo) {
      stageInfo.status = "active";
      stageInfo.message = message;
      this.currentStage = stage;

      // Show progress overview first
      this.renderProgress();

      // Start Deno std spinner for this stage with marine theme
      if (this.isTTY && this.options.style !== "quiet") {
        const spinnerText = message || `${stageInfo.displayName} stage`;
        this.currentSpinner = new Spinner({
          message: spinnerText,
          color: "cyan", // Marine/ocean color theme
        });
        this.currentSpinner.start();
      }
    }
  }

  /**
   * Mark current stage as complete
   */
  completeStage(stage?: ProgressStage, status: "success" | "error" = "success") {
    const targetStage = stage || this.currentStage;
    if (targetStage) {
      const stageInfo = this.stages.get(targetStage);
      if (stageInfo) {
        stageInfo.status = status;

        if (targetStage === this.currentStage && this.currentSpinner) {
          // Stop the current spinner with appropriate message
          if (status === "success") {
            this.currentSpinner.stop();
            console.log(`✅ ${stageInfo.displayName} stage complete`);
          } else {
            this.currentSpinner.stop();
            console.log(`❌ ${stageInfo.displayName} stage failed`);
          }
          this.currentSpinner = null;
          this.currentStage = null;
        }
      }
    }
  }

  /**
   * Update stage with error
   */
  errorStage(stage: ProgressStage, message: string) {
    const stageInfo = this.stages.get(stage);
    if (stageInfo) {
      stageInfo.status = "error";
      stageInfo.message = message;

      if (stage === this.currentStage && this.currentSpinner) {
        this.currentSpinner.stop();
        console.log(`❌ ${message}`);
        this.currentSpinner = null;
        this.currentStage = null;
      }
    }
  }

  /**
   * Set stage to fixing status
   */
  fixingStage(stage: ProgressStage, message: string) {
    const stageInfo = this.stages.get(stage);
    if (stageInfo) {
      stageInfo.status = "fixing";
      stageInfo.message = message;
      this.currentStage = stage;

      // Update spinner text if it's running
      if (this.currentSpinner) {
        this.currentSpinner.stop();
        this.currentSpinner = new Spinner({
          message: message,
          color: "yellow", // Warning/fixing color
        });
        this.currentSpinner.start();
      } else if (this.isTTY && this.options.style !== "quiet") {
        this.currentSpinner = new Spinner({
          message: message,
          color: "yellow", // Warning/fixing color
        });
        this.currentSpinner.start();
      }
    }
  }

  /**
   * Pause spinner for other output
   */
  pause() {
    if (this.currentSpinner) {
      this.currentSpinner.stop();
    }
  }

  /**
   * Resume spinner after other output
   */
  resume() {
    if (this.currentStage && !this.currentSpinner && this.isTTY && this.options.style !== "quiet") {
      const stage = this.stages.get(this.currentStage);
      if (stage && (stage.status === "active" || stage.status === "fixing")) {
        const spinnerText = stage.message || `${stage.displayName} stage`;
        const color = stage.status === "fixing" ? "yellow" : "cyan";
        this.currentSpinner = new Spinner({
          message: spinnerText,
          color: color,
        });
        this.currentSpinner.start();
      }
    }
  }

  /**
   * Render progress overview
   */
  private renderProgress() {
    if (this.options.style === "quiet" || !this.isTTY) {
      return;
    }

    const stageStates = Array.from(this.stages.values()).map((stage) =>
      this.formatStageStatus(stage)
    );
    const progressLine = stageStates.join(" ");

    let output = bold(cyan("🌊 Release Progress: ")) + progressLine;

    if (this.options.showElapsedTime) {
      const elapsed = this.formatElapsedTime();
      output += ` | ${dim(`⏱️ ${elapsed}`)}`;
    }

    console.log(output);
  }

  /**
   * Format stage status indicator
   */
  private formatStageStatus(stage: StageInfo): string {
    switch (stage.status) {
      case "success":
        return green("✓");
      case "error":
        return red("✗");
      case "active":
        return blue("●"); // Marine blue for active state
      case "fixing":
        return yellow("🔧");
      default:
        return dim("○");
    }
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
   * Add substeps to current stage (simplified implementation for compatibility)
   */
  setSubsteps(stage: ProgressStage, substeps: SubStep[]) {
    const stageInfo = this.stages.get(stage);
    if (stageInfo) {
      stageInfo.substeps = substeps;
      // For Deno std spinner, we update the spinner text if it's the current stage
      if (stage === this.currentStage && this.currentSpinner && substeps.length > 0) {
        const activeSubsteps = substeps.filter((s) => s.status === "active");
        if (activeSubsteps.length > 0) {
          this.currentSpinner.stop();
          this.currentSpinner = new Spinner({
            message: `${stageInfo.displayName} - ${activeSubsteps[0].name}`,
            color: "cyan",
          });
          this.currentSpinner.start();
        }
      }
    }
  }

  /**
   * Update substep status (simplified implementation for compatibility)
   */
  updateSubstep(stage: ProgressStage, substepName: string, status: StageStatus) {
    const stageInfo = this.stages.get(stage);
    if (stageInfo?.substeps) {
      const substep = stageInfo.substeps.find((s) => s.name === substepName);
      if (substep) {
        substep.status = status;
        // Update spinner text if this is the current stage and substep
        if (stage === this.currentStage && this.currentSpinner) {
          const displayText = status === "active"
            ? `${stageInfo.displayName} - ${substepName}`
            : stageInfo.message || `${stageInfo.displayName} stage`;
          this.currentSpinner.stop();
          this.currentSpinner = new Spinner({
            message: displayText,
            color: "cyan",
          });
          this.currentSpinner.start();
        }
      }
    }
  }

  /**
   * Clear any active spinner
   */
  clear() {
    if (this.currentSpinner) {
      this.currentSpinner.stop();
      this.currentSpinner = null;
    }
  }
}
