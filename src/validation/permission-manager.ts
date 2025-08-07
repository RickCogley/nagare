/**
 * @module permission-manager
 * @description Deno permission management for secure runtime access control.
 * Ensures Nagare has the necessary permissions to operate while maintaining security.
 * InfoSec: Implements principle of least privilege for Deno runtime permissions.
 *
 * @example
 * ```typescript
 * import { PermissionManager } from "./permission-manager.ts";
 *
 * const manager = new PermissionManager();
 * const result = await manager.checkAllPermissions();
 *
 * if (!result.success) {
 *   console.error(result.error);
 *   console.log("Run with:", result.data?.suggestedCommand);
 *   Deno.exit(1);
 * }
 * ```
 *
 * @since 2.18.0
 */

import type { AsyncResult } from "../../types.ts";

/**
 * Required permission descriptor
 *
 * @description Describes a permission required by Nagare with context.
 */
export interface RequiredPermission {
  /** Deno permission name */
  name: Deno.PermissionName;
  /** Specific path for read/write permissions */
  path?: string;
  /** Specific host for net permissions */
  host?: string;
  /** Command for run permissions */
  command?: string;
  /** Human-readable description of why this permission is needed */
  description: string;
}

/**
 * Permission check result details
 *
 * @description Detailed information about permission status.
 */
export interface PermissionCheckResult {
  /** Permissions that are granted */
  granted: RequiredPermission[];
  /** Permissions that are missing */
  missing: RequiredPermission[];
  /** Suggested command to run with proper permissions */
  suggestedCommand?: string;
}

/**
 * Manages Deno runtime permissions for Nagare
 *
 * @description Handles permission checking, requesting, and error reporting
 * with helpful user feedback for missing permissions.
 *
 * @example
 * ```typescript
 * const manager = new PermissionManager();
 *
 * // Check all required permissions
 * const result = await manager.checkAllPermissions();
 *
 * // Or check specific permission
 * const readResult = await manager.checkPermission({
 *   name: "read",
 *   path: "./config.ts",
 *   description: "Read configuration file"
 * });
 * ```
 */
export class PermissionManager {
  /**
   * Default required permissions for Nagare
   *
   * @description Core permissions needed for standard release operations.
   * InfoSec: Each permission is documented with its security rationale.
   */
  private readonly requiredPermissions: RequiredPermission[] = [
    {
      name: "read",
      description: "Read project files, configuration, and version information",
    },
    {
      name: "write",
      description: "Update version files, changelogs, and configuration",
    },
    {
      name: "env",
      description: "Access environment variables for configuration and tokens",
    },
    {
      name: "net",
      host: "api.github.com",
      description: "Create GitHub releases via API",
    },
    {
      name: "net",
      host: "jsr.io",
      description: "Verify package publication to JSR registry",
    },
    {
      name: "run",
      command: "git",
      description: "Execute git commands for version control",
    },
    {
      name: "run",
      command: "gh",
      description: "Use GitHub CLI for release creation",
    },
  ];

  constructor(customPermissions?: RequiredPermission[]) {
    if (customPermissions) {
      this.requiredPermissions = customPermissions;
    }
  }

  /**
   * Checks all required permissions
   *
   * @description Verifies that all necessary permissions are granted.
   * Returns detailed information about missing permissions if any.
   *
   * @returns Result with permission status or error details
   */
  async checkAllPermissions(): AsyncResult<PermissionCheckResult> {
    const granted: RequiredPermission[] = [];
    const missing: RequiredPermission[] = [];

    for (const permission of this.requiredPermissions) {
      const result = await this.checkPermission(permission);
      if (result.success && result.data) {
        granted.push(permission);
      } else {
        missing.push(permission);
      }
    }

    if (missing.length === 0) {
      return {
        success: true,
        data: { granted, missing: [] },
      };
    }

    const _suggestedCommand = this.buildSuggestedCommand(missing);
    const errorMessage = this.buildErrorMessage(missing);

    return {
      success: false,
      error: new Error(errorMessage),
    };
  }

  /**
   * Checks a specific permission
   *
   * @description Queries the status of a single permission.
   *
   * @param permission - Permission to check
   * @returns Result indicating if permission is granted
   */
  async checkPermission(permission: RequiredPermission): AsyncResult<boolean> {
    try {
      const descriptor = this.buildDescriptor(permission);
      const status = await Deno.permissions.query(descriptor);

      return {
        success: true,
        data: status.state === "granted",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Requests missing permissions interactively
   *
   * @description Prompts the user to grant missing permissions.
   * Only works in interactive environments, not in CI/CD.
   *
   * @returns Result with updated permission status
   */
  async requestMissingPermissions(): AsyncResult<PermissionCheckResult> {
    const checkResult = await this.checkAllPermissions();

    // If all permissions granted, return success
    if (checkResult.success) {
      return checkResult;
    }

    const granted: RequiredPermission[] = [];
    const stillMissing: RequiredPermission[] = [];

    for (const permission of this.requiredPermissions) {
      try {
        const descriptor = this.buildDescriptor(permission);
        const status = await Deno.permissions.request(descriptor);

        if (status.state === "granted") {
          granted.push(permission);
        } else {
          stillMissing.push(permission);
        }
      } catch {
        stillMissing.push(permission);
      }
    }

    if (stillMissing.length === 0) {
      return {
        success: true,
        data: { granted, missing: [] },
      };
    }

    return {
      success: false,
      error: new Error(this.buildErrorMessage(stillMissing)),
    };
  }

  /**
   * Builds a Deno permission descriptor
   *
   * @description Converts RequiredPermission to Deno's PermissionDescriptor format.
   *
   * @param permission - Permission to convert
   * @returns Deno permission descriptor
   */
  private buildDescriptor(permission: RequiredPermission): Deno.PermissionDescriptor {
    const base: Deno.PermissionDescriptor = { name: permission.name };

    // Add specific parameters based on permission type
    if (permission.path && (permission.name === "read" || permission.name === "write")) {
      return { ...base, path: permission.path } as Deno.PermissionDescriptor;
    }

    if (permission.host && permission.name === "net") {
      return { ...base, host: permission.host } as Deno.PermissionDescriptor;
    }

    if (permission.command && permission.name === "run") {
      return { ...base, command: permission.command } as Deno.PermissionDescriptor;
    }

    return base;
  }

  /**
   * Builds suggested command with required permission flags
   *
   * @description Creates a deno run command with all necessary permission flags.
   *
   * @param missing - Missing permissions
   * @returns Suggested command string
   */
  private buildSuggestedCommand(missing: RequiredPermission[]): string {
    const flags = new Set<string>();

    for (const permission of missing) {
      if (permission.host) {
        flags.add(`--allow-net=${permission.host}`);
      } else if (permission.path) {
        flags.add(`--allow-${permission.name}=${permission.path}`);
      } else if (permission.command) {
        flags.add(`--allow-run=${permission.command}`);
      } else {
        flags.add(`--allow-${permission.name}`);
      }
    }

    return `deno run ${Array.from(flags).join(" ")} jsr:@rick/nagare/cli`;
  }

  /**
   * Builds user-friendly error message for missing permissions
   *
   * @description Creates a detailed error message explaining what permissions
   * are missing and why they're needed.
   *
   * @param missing - Missing permissions
   * @returns Error message
   */
  private buildErrorMessage(missing: RequiredPermission[]): string {
    const lines = [
      "🚨 Missing Required Permissions",
      "",
      "Nagare requires the following permissions to function:",
      "",
    ];

    // Group permissions by type for better readability
    const byType = new Map<string, RequiredPermission[]>();
    for (const perm of missing) {
      const list = byType.get(perm.name) || [];
      list.push(perm);
      byType.set(perm.name, list);
    }

    for (const [type, perms] of byType) {
      lines.push(`📌 ${type.toUpperCase()} Permission:`);
      for (const perm of perms) {
        const detail = perm.host || perm.path || perm.command || "";
        const prefix = detail ? `  • ${detail}: ` : "  • ";
        lines.push(`${prefix}${perm.description}`);
      }
      lines.push("");
    }

    lines.push("To grant these permissions, run with:");
    lines.push(`  ${this.buildSuggestedCommand(missing)}`);
    lines.push("");
    lines.push("Or use --allow-all flag (not recommended for production):");
    lines.push("  deno run --allow-all jsr:@rick/nagare/cli");

    return lines.join("\n");
  }

  /**
   * Gets a summary of current permission status
   *
   * @description Returns a human-readable summary of permission status.
   *
   * @returns Permission status summary
   */
  async getPermissionSummary(): Promise<string> {
    const result = await this.checkAllPermissions();

    if (result.success) {
      return `✅ All ${result.data.granted.length} required permissions are granted`;
    }

    const _checkResult = await this.checkAllPermissions();
    let granted = 0;
    let missing = 0;

    for (const perm of this.requiredPermissions) {
      const result = await this.checkPermission(perm);
      if (result.success && result.data) {
        granted++;
      } else {
        missing++;
      }
    }

    return `⚠️ Permissions: ${granted} granted, ${missing} missing`;
  }
}

/**
 * Default permission manager instance
 *
 * @description Singleton instance for convenient import.
 *
 * @example
 * ```typescript
 * import { permissionManager } from "./permission-manager.ts";
 *
 * const result = await permissionManager.checkAllPermissions();
 * ```
 */
export const permissionManager = new PermissionManager();
