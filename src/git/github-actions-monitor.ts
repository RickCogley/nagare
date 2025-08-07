/**
 * GitHub Actions workflow monitoring module
 * Uses gh CLI to monitor workflow runs and extract logs
 */

import { runCommand } from "../utils/utils.ts";
import { delay } from "@std/async/delay";

export interface WorkflowRun {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion?: "success" | "failure" | "cancelled" | "skipped";
  createdAt: string;
  url: string;
}

export interface WorkflowJob {
  id: number;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion?: "success" | "failure" | "cancelled" | "skipped";
  steps?: WorkflowStep[];
}

export interface WorkflowStep {
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion?: "success" | "failure" | "cancelled" | "skipped";
  number: number;
}

export interface MonitorResult {
  run: WorkflowRun;
  jobs: WorkflowJob[];
  logs?: string;
  error?: string;
}

export class GitHubActionsMonitor {
  constructor(
    private owner: string,
    private repo: string,
  ) {}

  /**
   * Get latest workflow run for a specific workflow file
   */
  async getLatestRun(workflowFile: string): Promise<WorkflowRun | null> {
    try {
      const result = await runCommand("gh", [
        "run",
        "list",
        "--workflow",
        workflowFile,
        "--repo",
        `${this.owner}/${this.repo}`,
        "--limit",
        "1",
        "--json",
        "databaseId,name,status,conclusion,createdAt,url",
      ]);

      const runs = JSON.parse(result.stdout);
      if (runs.length === 0) {
        return null;
      }

      const run = runs[0];
      return {
        id: run.databaseId,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        createdAt: run.createdAt,
        url: run.url,
      };
    } catch (error) {
      console.debug(`Failed to get workflow runs: ${error}`);
      return null;
    }
  }

  /**
   * Get workflow run by ID
   */
  async getRun(runId: number): Promise<WorkflowRun | null> {
    try {
      const result = await runCommand("gh", [
        "run",
        "view",
        runId.toString(),
        "--repo",
        `${this.owner}/${this.repo}`,
        "--json",
        "databaseId,name,status,conclusion,createdAt,url",
      ]);

      const run = JSON.parse(result.stdout);
      return {
        id: run.databaseId,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        createdAt: run.createdAt,
        url: run.url,
      };
    } catch (error) {
      console.debug(`Failed to get workflow run ${runId}: ${error}`);
      return null;
    }
  }

  /**
   * Get jobs for a workflow run
   */
  async getJobs(runId: number): Promise<WorkflowJob[]> {
    try {
      const result = await runCommand("gh", [
        "api",
        `repos/${this.owner}/${this.repo}/actions/runs/${runId}/jobs`,
        "--jq",
        ".jobs",
      ]);

      const jobs = JSON.parse(result.stdout);
      return jobs.map((job: {
        id: number;
        name: string;
        status: string;
        conclusion?: string;
        steps?: Array<{
          name: string;
          status: string;
          conclusion?: string;
          number: number;
        }>;
      }) => ({
        id: job.id,
        name: job.name,
        status: job.status,
        conclusion: job.conclusion,
        steps: job.steps?.map((step) => ({
          name: step.name,
          status: step.status,
          conclusion: step.conclusion,
          number: step.number,
        })),
      }));
    } catch (error) {
      console.debug(`Failed to get jobs for run ${runId}: ${error}`);
      return [];
    }
  }

  /**
   * Get logs for a specific job
   */
  async getJobLogs(jobId: number): Promise<string | null> {
    try {
      const result = await runCommand("gh", [
        "api",
        `repos/${this.owner}/${this.repo}/actions/jobs/${jobId}/logs`,
        "--include",
      ]);

      // The logs are returned as plain text, not JSON
      return result.stdout;
    } catch (error) {
      console.debug(`Failed to get logs for job ${jobId}: ${error}`);
      return null;
    }
  }

  /**
   * Monitor a workflow run until completion
   */
  async monitorRun(
    runId: number,
    options: {
      pollInterval?: number;
      timeout?: number;
      onProgress?: (run: WorkflowRun, jobs: WorkflowJob[]) => void | Promise<void>;
    } = {},
  ): Promise<MonitorResult> {
    const {
      pollInterval = 10000, // 10s
      timeout = 600000, // 10 min
      onProgress,
    } = options;

    const startTime = Date.now();
    const timeoutTime = startTime + timeout;

    while (Date.now() < timeoutTime) {
      const run = await this.getRun(runId);
      if (!run) {
        return {
          run: { id: runId } as WorkflowRun,
          jobs: [],
          error: "Failed to get workflow run status",
        };
      }

      const jobs = await this.getJobs(runId);
      await onProgress?.(run, jobs);

      if (run.status === "completed") {
        // Get logs for failed jobs
        let logs: string | undefined;
        if (run.conclusion === "failure") {
          const failedJobs = jobs.filter((j) => j.conclusion === "failure");
          for (const job of failedJobs) {
            const jobLog = await this.getJobLogs(job.id);
            if (jobLog) {
              logs = (logs || "") + `\n=== Job: ${job.name} ===\n${jobLog}`;
            }
          }
        }

        return { run, jobs, logs };
      }

      await delay(pollInterval);
    }

    const finalRun = await this.getRun(runId);
    const finalJobs = await this.getJobs(runId);

    return {
      run: finalRun || ({ id: runId } as WorkflowRun),
      jobs: finalJobs,
      error: "Monitoring timeout exceeded",
    };
  }

  /**
   * Trigger a workflow manually
   */
  async triggerWorkflow(
    workflowFile: string,
    ref: string = "main",
    inputs?: Record<string, string>,
  ): Promise<number | null> {
    try {
      const args = [
        "workflow",
        "run",
        workflowFile,
        "--repo",
        `${this.owner}/${this.repo}`,
        "--ref",
        ref,
      ];

      // Add inputs if provided
      if (inputs) {
        for (const [key, value] of Object.entries(inputs)) {
          args.push("--field", `${key}=${value}`);
        }
      }

      await runCommand("gh", args);

      // Wait a bit for the run to be created
      await delay(3000);

      // Get the latest run
      const latestRun = await this.getLatestRun(workflowFile);
      return latestRun?.id ?? null;
    } catch (error) {
      console.error(`Failed to trigger workflow: ${error}`);
      return null;
    }
  }

  /**
   * Get repository info from git remote
   */
  static async getRepoInfo(): Promise<{ owner: string; repo: string } | null> {
    try {
      const result = await runCommand("gh", ["repo", "view", "--json", "owner,name"]);
      const data = JSON.parse(result.stdout);
      return {
        owner: data.owner.login,
        repo: data.name,
      };
    } catch {
      return null;
    }
  }
}
