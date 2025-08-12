/**
 * @fileoverview Dependency injection types and factory for ReleaseManager
 * @module release-manager-deps
 */

import type { NagareConfig } from "../../types.ts";
import { GitOperations } from "../git/git-operations.ts";
import { VersionUtils } from "./version-utils.ts";
import { ChangelogGenerator } from "../templates/changelog-generator.ts";
import { GitHubIntegration } from "../git/github-integration.ts";
import { TemplateProcessor } from "../templates/template-processor.ts";
import { DocGenerator } from "../templates/doc-generator.ts";
import { Logger } from "../core/logger.ts";
import { FileHandlerManager } from "./file-handlers.ts";
import { BackupManager } from "./backup-manager.ts";
import { ReleaseStateTracker } from "./release-state-tracker.ts";
import { LogLevel } from "../../config.ts";

/**
 * Dependencies that can be injected into ReleaseManager
 * All dependencies are optional - if not provided, defaults will be created
 */
export interface ReleaseManagerDeps {
  git?: GitOperations;
  versionUtils?: VersionUtils;
  changelogGenerator?: ChangelogGenerator;
  github?: GitHubIntegration;
  templateProcessor?: TemplateProcessor;
  docGenerator?: DocGenerator;
  logger?: Logger;
  fileHandlerManager?: FileHandlerManager;
  backupManager?: BackupManager;
  stateTracker?: ReleaseStateTracker;
}

/**
 * Factory to create default dependencies if not injected
 */
export class ReleaseManagerDepsFactory {
  /**
   * Create all dependencies with defaults if not provided
   *
   * @param config - Nagare configuration
   * @param deps - Optional injected dependencies
   * @returns Complete set of dependencies
   */
  static createDeps(config: NagareConfig, deps?: ReleaseManagerDeps): Required<ReleaseManagerDeps> {
    // Create logger first as it's used by other deps
    const logger = deps?.logger ?? new Logger(config.options?.logLevel || LogLevel.INFO);

    // Create git operations
    const git = deps?.git ?? new GitOperations(config);

    // Create version utils with git dependency
    const versionUtils = deps?.versionUtils ?? new VersionUtils(config, git);

    // Create other dependencies
    return {
      git,
      versionUtils,
      changelogGenerator: deps?.changelogGenerator ?? new ChangelogGenerator(config),
      github: deps?.github ?? new GitHubIntegration(config),
      templateProcessor: deps?.templateProcessor ?? new TemplateProcessor(config),
      docGenerator: deps?.docGenerator ?? new DocGenerator(config),
      logger,
      fileHandlerManager: deps?.fileHandlerManager ?? new FileHandlerManager(),
      backupManager: deps?.backupManager ?? new BackupManager(logger),
      stateTracker: deps?.stateTracker ?? new ReleaseStateTracker(logger),
    };
  }
}
