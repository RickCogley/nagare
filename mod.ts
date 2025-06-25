/**
 * Nagare (流れ) - Deno Release Management Library
 */

// ==================================================================
// mod.ts - Main Library Exports
// ==================================================================

export { ReleaseManager } from './src/release-manager.ts';
export { RollbackManager } from './src/rollback-manager.ts';
export { GitOperations } from './src/git-operations.ts';
export { VersionUtils } from './src/version-utils.ts';
export { ChangelogGenerator } from './src/changelog-generator.ts';
export { GitHubIntegration } from './src/github-integration.ts';
export { TemplateProcessor } from './src/template-processor.ts';
export { DocGenerator } from './src/doc-generator.ts';

export type {
  NagareConfig,
  ConventionalCommit,
  ReleaseNotes,
  VersionFile,
  FileUpdatePattern,
  TemplateData,
  CommitTypeMapping,
  GitHubConfig,
  ReleaseResult
} from './types.ts';

export {
  LogLevel,
  BumpType,
  TemplateFormat,
  DEFAULT_CONFIG
} from './config.ts';



