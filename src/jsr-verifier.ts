/**
 * JSR package verification module
 * Polls JSR API to verify package publication status
 */

import { delay } from "@std/async/delay";
import { NagareConfig } from "../types.ts";

export interface JsrPackageInfo {
  scope: string;
  name: string;
  version: string;
}

export interface JsrVerificationResult {
  success: boolean;
  package?: JsrPackageInfo;
  error?: string;
  attempts: number;
  duration: number;
}

export class JsrVerifier {
  private readonly maxAttempts: number;
  private readonly pollInterval: number;
  private readonly timeout: number;

  constructor(private config: NagareConfig) {
    const verifyConfig = config.release?.verifyJsrPublish;

    if (typeof verifyConfig === "object" && verifyConfig !== null) {
      // It's a JsrVerificationConfig object
      this.maxAttempts = verifyConfig.maxAttempts ?? 30;
      this.pollInterval = verifyConfig.pollInterval ?? 10000; // 10s
      this.timeout = verifyConfig.timeout ?? 600000; // 10 min
    } else {
      // It's a boolean or undefined, use defaults
      this.maxAttempts = 30;
      this.pollInterval = 10000; // 10s
      this.timeout = 600000; // 10 min
    }
  }

  /**
   * Extract JSR package info from deno.json
   */
  async getPackageInfo(): Promise<JsrPackageInfo | null> {
    try {
      const denoJsonPath = "./deno.json";
      const denoJson = JSON.parse(await Deno.readTextFile(denoJsonPath));

      if (!denoJson.name || !denoJson.version) {
        return null;
      }

      // JSR package names are in format @scope/name
      const match = denoJson.name.match(/^@([^/]+)\/(.+)$/);
      if (!match) {
        return null;
      }

      return {
        scope: match[1],
        name: match[2],
        version: denoJson.version,
      };
    } catch {
      return null;
    }
  }

  /**
   * Check if package version exists on JSR
   */
  async checkJsrPackage(info: JsrPackageInfo): Promise<boolean> {
    try {
      const url = `https://jsr.io/@${info.scope}/${info.name}/${info.version}`;
      const response = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
      });

      // JSR returns 200 for existing packages
      return response.ok;
    } catch (error) {
      console.debug(`JSR check failed: ${error}`);
      return false;
    }
  }

  /**
   * Verify package is published to JSR with retries
   */
  async verifyPublication(
    packageInfo?: JsrPackageInfo,
    onProgress?: (attempt: number, maxAttempts: number) => void | Promise<void>,
  ): Promise<JsrVerificationResult> {
    const startTime = Date.now();

    // Get package info if not provided
    const info = packageInfo ?? await this.getPackageInfo();
    if (!info) {
      return {
        success: false,
        error: "No JSR package configuration found in deno.json",
        attempts: 0,
        duration: Date.now() - startTime,
      };
    }

    let attempts = 0;
    const timeoutTime = startTime + this.timeout;

    while (attempts < this.maxAttempts && Date.now() < timeoutTime) {
      attempts++;
      await onProgress?.(attempts, this.maxAttempts);

      if (await this.checkJsrPackage(info)) {
        return {
          success: true,
          package: info,
          attempts,
          duration: Date.now() - startTime,
        };
      }

      // Don't delay after the last attempt
      if (attempts < this.maxAttempts && Date.now() + this.pollInterval < timeoutTime) {
        await delay(this.pollInterval);
      }
    }

    const duration = Date.now() - startTime;
    const timeoutReason = Date.now() >= timeoutTime ? "timeout" : "max attempts reached";

    return {
      success: false,
      error:
        `Package @${info.scope}/${info.name}@${info.version} not found on JSR after ${attempts} attempts (${timeoutReason})`,
      attempts,
      duration,
    };
  }

  /**
   * Get JSR package URL
   */
  getPackageUrl(info: JsrPackageInfo): string {
    return `https://jsr.io/@${info.scope}/${info.name}/${info.version}`;
  }
}
