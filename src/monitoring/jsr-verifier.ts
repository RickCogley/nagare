/**
 * JSR package verification module
 * Polls JSR API to verify package publication status
 */

import { delay } from "@std/async/delay";
import { NagareConfig } from "../../types.ts";

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
  private readonly gracePeriod: number;

  constructor(private config: NagareConfig) {
    const verifyConfig = config.release?.verifyJsrPublish;

    if (typeof verifyConfig === "object" && verifyConfig !== null) {
      // It's a JsrVerificationConfig object
      this.maxAttempts = verifyConfig.maxAttempts ?? 30;
      this.pollInterval = verifyConfig.pollInterval ?? 10000; // 10s
      this.timeout = verifyConfig.timeout ?? 600000; // 10 min
      this.gracePeriod = verifyConfig.gracePeriod ?? 30000; // 30s grace period
    } else {
      // It's a boolean or undefined, use defaults with improved timings
      this.maxAttempts = 30;
      this.pollInterval = 10000; // 10s
      this.timeout = 600000; // 10 min
      this.gracePeriod = 30000; // 30s grace period
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
   * Check if package version exists on JSR using the official JSR REST API
   */
  async checkJsrPackage(info: JsrPackageInfo): Promise<boolean> {
    try {
      // Use the official JSR REST API instead of HEAD requests
      const apiUrl = `https://jsr.io/api/scopes/${info.scope}/packages/${info.name}`;
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "nagare-release-tool",
        },
      });

      if (!response.ok) {
        console.debug(`JSR API returned ${response.status}: ${response.statusText}`);
        return false;
      }

      const data = await response.json();

      // Check if the requested version is the latest version
      if (data.latestVersion === info.version) {
        return true;
      }

      // If not the latest, check the versions endpoint
      const versionsUrl = `https://jsr.io/api/scopes/${info.scope}/packages/${info.name}/versions`;
      const versionsResponse = await fetch(versionsUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "nagare-release-tool",
        },
      });

      if (versionsResponse.ok) {
        const versionsData = await versionsResponse.json();
        if (Array.isArray(versionsData)) {
          return versionsData.some((v) => v.version === info.version);
        }
      }

      console.debug(`Version ${info.version} not found in JSR API response`);
      return false;
    } catch (error) {
      console.debug(`JSR API check failed: ${error}`);
      return false;
    }
  }

  /**
   * Verify package is published to JSR with retries and grace period
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

    // Wait for grace period before starting verification
    // This allows JSR time to process the package after GitHub Actions complete
    if (this.gracePeriod > 0) {
      console.debug(`Waiting ${this.gracePeriod}ms grace period for JSR processing...`);
      await delay(this.gracePeriod);
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
        `Package @${info.scope}/${info.name}@${info.version} not found on JSR after ${attempts} attempts (${timeoutReason}). JSR API may be slow or the package failed to publish.`,
      attempts,
      duration,
    };
  }

  /**
   * Get detailed JSR package information including all versions
   */
  async getJsrPackageDetails(info: JsrPackageInfo): Promise<{
    exists: boolean;
    hasVersion: boolean;
    latest?: string;
    versions?: string[];
    error?: string;
  }> {
    try {
      const apiUrl = `https://jsr.io/api/scopes/${info.scope}/packages/${info.name}`;
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "nagare-release-tool",
        },
      });

      if (!response.ok) {
        return {
          exists: false,
          hasVersion: false,
          error: `JSR API returned ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();

      // Check if it's the latest version
      let hasVersion = data.latestVersion === info.version;
      let allVersions: string[] = [];

      // If not the latest, check all versions
      if (!hasVersion) {
        try {
          const versionsUrl = `https://jsr.io/api/scopes/${info.scope}/packages/${info.name}/versions`;
          const versionsResponse = await fetch(versionsUrl, {
            method: "GET",
            headers: {
              "Accept": "application/json",
              "User-Agent": "nagare-release-tool",
            },
          });

          if (versionsResponse.ok) {
            const versionsData = await versionsResponse.json();
            if (Array.isArray(versionsData)) {
              allVersions = versionsData.map((v) => v.version);
              hasVersion = allVersions.includes(info.version);
            }
          }
        } catch {
          // Ignore errors when fetching versions
        }
      }

      return {
        exists: true,
        hasVersion,
        latest: data.latestVersion,
        versions: allVersions,
      };
    } catch (error) {
      return {
        exists: false,
        hasVersion: false,
        error: `JSR API error: ${error}`,
      };
    }
  }

  /**
   * Get JSR package URL
   */
  getPackageUrl(info: JsrPackageInfo): string {
    return `https://jsr.io/@${info.scope}/${info.name}/${info.version}`;
  }
}
