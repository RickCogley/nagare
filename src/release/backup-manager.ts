import { join } from "@std/path";
import { ensureDir, exists } from "@std/fs";
// Simple UUID generator alternative
function generateBackupId(): string {
  return "backup-" + Date.now().toString(36) + "-" + Math.random().toString(36).substr(2, 9);
}
import type { Logger } from "../core/logger.ts";
import { ErrorCodes, NagareError } from "../core/enhanced-error.ts";
import { validateFilePath } from "../validation/security-utils.ts";

export interface BackupInfo {
  id: string;
  timestamp: Date;
  files: string[];
  backupDir: string;
}

export interface FileBackupInfo {
  originalPath: string;
  backupPath: string;
  content: string;
  exists: boolean;
}

/**
 * Manages file backups for pre-commit rollback functionality.
 * Creates temporary backups of files before modification to enable
 * atomic rollback operations if the release process fails.
 */
export class BackupManager {
  private readonly logger: Logger;
  private readonly backupRoot: string;
  private activeBackups: Map<string, BackupInfo> = new Map();

  constructor(logger: Logger, backupRoot = ".nagare-backups") {
    this.logger = logger;
    this.backupRoot = backupRoot;
  }

  /**
   * Creates a backup of the specified files before modification.
   *
   * @param files Array of file paths to backup
   * @returns Backup ID that can be used for restoration
   */
  async createBackup(files: string[]): Promise<string> {
    const backupId = generateBackupId();
    const timestamp = new Date();
    const backupDir = join(this.backupRoot, backupId);

    try {
      // Ensure backup directory exists
      await ensureDir(backupDir);

      // Validate all file paths before processing
      const validatedFiles = await this.validateFiles(files);

      // Create backup manifest
      const backupInfo: BackupInfo = {
        id: backupId,
        timestamp,
        files: validatedFiles,
        backupDir,
      };

      // Backup each file
      const backupPromises = validatedFiles.map((filePath) => this.backupFile(filePath, backupDir));

      await Promise.all(backupPromises);

      // Store backup info
      this.activeBackups.set(backupId, backupInfo);

      this.logger.info(`Created backup ${backupId} for ${validatedFiles.length} files`);
      this.logger.debug(`Backup directory: ${backupDir}`);

      return backupId;
    } catch (error) {
      // Clean up partial backup on failure
      try {
        await this.cleanupBackup(backupId);
      } catch (cleanupError) {
        this.logger.warn(`Failed to cleanup partial backup ${backupId}: ${cleanupError}`);
      }

      throw new NagareError(
        `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCodes.FILE_UPDATE_FAILED,
      );
    }
  }

  /**
   * Restores files from a backup, overwriting current file contents.
   *
   * @param backupId The backup ID to restore from
   */
  async restoreBackup(backupId: string): Promise<void> {
    const backupInfo = this.activeBackups.get(backupId);
    if (!backupInfo) {
      throw new NagareError(`Backup ${backupId} not found`, ErrorCodes.FILE_NOT_FOUND);
    }

    try {
      this.logger.info(`Restoring backup ${backupId}...`);

      // Restore each file
      const restorePromises = backupInfo.files.map((filePath) => this.restoreFile(filePath, backupInfo.backupDir));

      await Promise.all(restorePromises);

      this.logger.info(
        `Successfully restored ${backupInfo.files.length} files from backup ${backupId}`,
      );
    } catch (error) {
      throw new NagareError(
        `Failed to restore backup ${backupId}: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCodes.FILE_UPDATE_FAILED,
      );
    }
  }

  /**
   * Cleans up a backup after successful commit or when no longer needed.
   *
   * @param backupId The backup ID to clean up
   */
  async cleanupBackup(backupId: string): Promise<void> {
    const backupInfo = this.activeBackups.get(backupId);
    if (!backupInfo) {
      this.logger.debug(`Backup ${backupId} not found for cleanup`);
      return;
    }

    try {
      // Remove backup directory
      await Deno.remove(backupInfo.backupDir, { recursive: true });

      // Remove from active backups
      this.activeBackups.delete(backupId);

      this.logger.debug(`Cleaned up backup ${backupId}`);
    } catch (error) {
      this.logger.warn(`Failed to cleanup backup ${backupId}: ${error}`);
      // Don't throw - cleanup failures shouldn't break the release process
    }
  }

  /**
   * Lists all active backups
   */
  getActiveBackups(): BackupInfo[] {
    return Array.from(this.activeBackups.values());
  }

  /**
   * Validates file paths and filters out non-existent files
   */
  private async validateFiles(files: string[]): Promise<string[]> {
    const validatedFiles: string[] = [];

    for (const filePath of files) {
      // Security validation
      validateFilePath(filePath, Deno.cwd());

      // Check if file exists
      const fileExists = await exists(filePath);
      if (fileExists) {
        validatedFiles.push(filePath);
      } else {
        this.logger.debug(`File ${filePath} does not exist, skipping backup`);
      }
    }

    return validatedFiles;
  }

  /**
   * Backs up a single file to the backup directory
   */
  private async backupFile(filePath: string, backupDir: string): Promise<void> {
    try {
      // Read original file content
      const content = await Deno.readTextFile(filePath);

      // Create backup file path (maintain directory structure)
      const backupPath = join(backupDir, filePath.replace(/^\.\//, ""));

      // Ensure backup subdirectory exists
      await ensureDir(join(backupPath, ".."));

      // Write backup file
      await Deno.writeTextFile(backupPath, content);

      this.logger.debug(`Backed up ${filePath} to ${backupPath}`);
    } catch (error) {
      throw new NagareError(
        `Failed to backup file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCodes.FILE_UPDATE_FAILED,
      );
    }
  }

  /**
   * Restores a single file from the backup directory
   */
  private async restoreFile(filePath: string, backupDir: string): Promise<void> {
    try {
      const backupPath = join(backupDir, filePath.replace(/^\.\//, ""));

      // Check if backup file exists
      const backupExists = await exists(backupPath);
      if (!backupExists) {
        this.logger.warn(
          `Backup file ${backupPath} not found, skipping restoration of ${filePath}`,
        );
        return;
      }

      // Read backup content
      const content = await Deno.readTextFile(backupPath);

      // Restore original file
      await Deno.writeTextFile(filePath, content);

      this.logger.debug(`Restored ${filePath} from ${backupPath}`);
    } catch (error) {
      throw new NagareError(
        `Failed to restore file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        ErrorCodes.FILE_UPDATE_FAILED,
      );
    }
  }

  /**
   * Cleans up all backups (useful for testing or maintenance)
   */
  async cleanupAllBackups(): Promise<void> {
    const backupIds = Array.from(this.activeBackups.keys());

    for (const backupId of backupIds) {
      await this.cleanupBackup(backupId);
    }

    // Remove backup root directory if empty
    try {
      await Deno.remove(this.backupRoot);
      this.logger.debug(`Removed backup root directory ${this.backupRoot}`);
    } catch (error) {
      // Ignore errors - directory might not be empty or not exist
      this.logger.debug(`Could not remove backup root directory: ${error}`);
    }
  }
}
