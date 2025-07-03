// Auto-generated from locales/en.yaml
// DO NOT EDIT MANUALLY
// Run: deno task i18n:types to regenerate

/**
 * Structure of translation keys
 */
export interface TranslationKeys {
  errors: {
    gitNotInitialized: string;
    gitNotRepo: string;
    gitNotClean: string;
    gitUncommittedChanges: string;
    gitUserNotConfigured: string;
    gitNoCommits: string;
    gitTagExists: string;
    gitRemoteError: string;
    configNotFound: string;
    configInvalid: string;
    configMissingRequired: string;
    versionNotFound: string;
    versionInvalidFormat: string;
    versionFileNotFound: string;
    versionBumpInvalid: string;
    fileNotFound: string;
    fileUpdateFailed: string;
    filePatternNoMatch: string;
    fileHandlerNotFound: string;
    fileJsonInvalid: string;
    githubCliNotFound: string;
    githubAuthFailed: string;
    githubReleaseFailed: string;
    templateInvalid: string;
    templateProcessingFailed: string;
    templateSecurityViolation: string;
    securityInvalidGitRef: string;
    securityEmptyGitRef: string;
    securityInvalidGitRefChars: string;
    securityInvalidGitRefPattern: string;
    securityGitTagTooLong: string;
    securityInvalidCommitHash: string;
    securityInvalidFilePath: string;
    securityPathTraversal: string;
    securityPathEscape: string;
    securityInvalidVersion: string;
    securityInvalidSemverFormat: string;
    securityInvalidCliArgType: string;
    securityShellInjection: string;
    securityNullByteInjection: string;
    dependencyNotFound: string;
    permissionDenied: string;
    operationCancelled: string;
    unknownError: string;
    invalidBumpType: string;
    breakingRequiresMajor: string;
    commandFailed: string;
    noCommits: string;
    tagExists: string;
    rollbackFailed: string;
    templateError: string;
  };
  cli: {
    release: {
      description: string;
      calculating: string;
      currentVersion: string;
      newVersion: string;
      updating: string;
      committing: string;
      pushing: string;
      creatingGithub: string;
      success: string;
      dryRun: string;
      noChanges: string;
    };
    rollback: {
      description: string;
      confirm: string;
      rollingBack: string;
      restoringFiles: string;
      removingTag: string;
      success: string;
      cancelled: string;
    };
    init: {
      description: string;
      creating: string;
      success: string;
      exists: string;
    };
    commands: {
      patch: string;
      minor: string;
      major: string;
      auto: string;
    };
    options: {
      dryRun: string;
      skipConfirmation: string;
      skipGithub: string;
      skipDocs: string;
      verbose: string;
      quiet: string;
    };
  };
  prompts: {
    confirm: string;
    yes: string;
    no: string;
  };
  suggestions: {
    checkPath: string;
    verifyPermissions: string;
    runGitInit: string;
    navigateToRepo: string;
    checkProjectDir: string;
    commitChanges: string;
    stashChanges: string;
    discardChanges: string;
    viewChanges: string;
    runNagareInit: string;
    createConfigManually: string;
    specifyConfigPath: string;
    addVersionPattern: string;
    configureCustomPattern: string;
    ensureFileReadable: string;
    addCustomUpdateFn: string;
    useBuiltInHandler: string;
    defineCustomPatterns: string;
    checkJsonSyntax: string;
    validateJson: string;
    checkJsonCommas: string;
    revertRecentChanges: string;
    installGitHubCli: string;
    installGitHubCliMac: string;
    installGitHubCliWindows: string;
    disableGitHubReleases: string;
    useValidType: string;
    checkGitHub: string;
    checkConfig: string;
  };
  changelog: {
    title: string;
    unreleased: string;
    added: string;
    changed: string;
    deprecated: string;
    removed: string;
    fixed: string;
    security: string;
    breakingChanges: string;
  };
  commitTypes: {
    feat: string;
    fix: string;
    docs: string;
    style: string;
    refactor: string;
    perf: string;
    test: string;
    build: string;
    ci: string;
    chore: string;
    revert: string;
  };
  log: {
    error: string;
    warn: string;
    info: string;
    debug: string;
  };
  fileHandlers: {
    updating: string;
    skipping: string;
    preview: string;
    pattern: string;
    customHandler: string;
  };
  version: {
    current: string;
    previous: string;
    bump: string;
  };
  git: {
    status: string;
    clean: string;
    uncommitted: string;
    tag: string;
    commit: string;
    push: string;
  };
  time: {
    just_now: string;
    seconds_ago: string;
    minutes_ago: string;
    hours_ago: string;
    days_ago: string;
  };
}

/**
 * All available translation keys as string literals
 */
export type TranslationKey =
  | "errors.gitNotInitialized"
  | "errors.gitNotRepo"
  | "errors.gitNotClean"
  | "errors.gitUncommittedChanges"
  | "errors.gitUserNotConfigured"
  | "errors.gitNoCommits"
  | "errors.gitTagExists"
  | "errors.gitRemoteError"
  | "errors.configNotFound"
  | "errors.configInvalid"
  | "errors.configMissingRequired"
  | "errors.versionNotFound"
  | "errors.versionInvalidFormat"
  | "errors.versionFileNotFound"
  | "errors.versionBumpInvalid"
  | "errors.fileNotFound"
  | "errors.fileUpdateFailed"
  | "errors.filePatternNoMatch"
  | "errors.fileHandlerNotFound"
  | "errors.fileJsonInvalid"
  | "errors.githubCliNotFound"
  | "errors.githubAuthFailed"
  | "errors.githubReleaseFailed"
  | "errors.templateInvalid"
  | "errors.templateProcessingFailed"
  | "errors.templateSecurityViolation"
  | "errors.securityInvalidGitRef"
  | "errors.securityEmptyGitRef"
  | "errors.securityInvalidGitRefChars"
  | "errors.securityInvalidGitRefPattern"
  | "errors.securityGitTagTooLong"
  | "errors.securityInvalidCommitHash"
  | "errors.securityInvalidFilePath"
  | "errors.securityPathTraversal"
  | "errors.securityPathEscape"
  | "errors.securityInvalidVersion"
  | "errors.securityInvalidSemverFormat"
  | "errors.securityInvalidCliArgType"
  | "errors.securityShellInjection"
  | "errors.securityNullByteInjection"
  | "errors.dependencyNotFound"
  | "errors.permissionDenied"
  | "errors.operationCancelled"
  | "errors.unknownError"
  | "errors.invalidBumpType"
  | "errors.breakingRequiresMajor"
  | "errors.commandFailed"
  | "errors.noCommits"
  | "errors.tagExists"
  | "errors.rollbackFailed"
  | "errors.templateError"
  | "cli.release.description"
  | "cli.release.calculating"
  | "cli.release.currentVersion"
  | "cli.release.newVersion"
  | "cli.release.updating"
  | "cli.release.committing"
  | "cli.release.pushing"
  | "cli.release.creatingGithub"
  | "cli.release.success"
  | "cli.release.dryRun"
  | "cli.release.noChanges"
  | "cli.rollback.description"
  | "cli.rollback.confirm"
  | "cli.rollback.rollingBack"
  | "cli.rollback.restoringFiles"
  | "cli.rollback.removingTag"
  | "cli.rollback.success"
  | "cli.rollback.cancelled"
  | "cli.init.description"
  | "cli.init.creating"
  | "cli.init.success"
  | "cli.init.exists"
  | "cli.commands.patch"
  | "cli.commands.minor"
  | "cli.commands.major"
  | "cli.commands.auto"
  | "cli.options.dryRun"
  | "cli.options.skipConfirmation"
  | "cli.options.skipGithub"
  | "cli.options.skipDocs"
  | "cli.options.verbose"
  | "cli.options.quiet"
  | "prompts.confirm"
  | "prompts.yes"
  | "prompts.no"
  | "suggestions.checkPath"
  | "suggestions.verifyPermissions"
  | "suggestions.runGitInit"
  | "suggestions.navigateToRepo"
  | "suggestions.checkProjectDir"
  | "suggestions.commitChanges"
  | "suggestions.stashChanges"
  | "suggestions.discardChanges"
  | "suggestions.viewChanges"
  | "suggestions.runNagareInit"
  | "suggestions.createConfigManually"
  | "suggestions.specifyConfigPath"
  | "suggestions.addVersionPattern"
  | "suggestions.configureCustomPattern"
  | "suggestions.ensureFileReadable"
  | "suggestions.addCustomUpdateFn"
  | "suggestions.useBuiltInHandler"
  | "suggestions.defineCustomPatterns"
  | "suggestions.checkJsonSyntax"
  | "suggestions.validateJson"
  | "suggestions.checkJsonCommas"
  | "suggestions.revertRecentChanges"
  | "suggestions.installGitHubCli"
  | "suggestions.installGitHubCliMac"
  | "suggestions.installGitHubCliWindows"
  | "suggestions.disableGitHubReleases"
  | "suggestions.useValidType"
  | "suggestions.checkGitHub"
  | "suggestions.checkConfig"
  | "changelog.title"
  | "changelog.unreleased"
  | "changelog.added"
  | "changelog.changed"
  | "changelog.deprecated"
  | "changelog.removed"
  | "changelog.fixed"
  | "changelog.security"
  | "changelog.breakingChanges"
  | "commitTypes.feat"
  | "commitTypes.fix"
  | "commitTypes.docs"
  | "commitTypes.style"
  | "commitTypes.refactor"
  | "commitTypes.perf"
  | "commitTypes.test"
  | "commitTypes.build"
  | "commitTypes.ci"
  | "commitTypes.chore"
  | "commitTypes.revert"
  | "log.error"
  | "log.warn"
  | "log.info"
  | "log.debug"
  | "fileHandlers.updating"
  | "fileHandlers.skipping"
  | "fileHandlers.preview"
  | "fileHandlers.pattern"
  | "fileHandlers.customHandler"
  | "version.current"
  | "version.previous"
  | "version.bump"
  | "git.status"
  | "git.clean"
  | "git.uncommitted"
  | "git.tag"
  | "git.commit"
  | "git.push"
  | "time.just_now"
  | "time.seconds_ago"
  | "time.minutes_ago"
  | "time.hours_ago"
  | "time.days_ago";

/**
 * Helper type to ensure all locales have the same keys
 */
export type TranslationData = {
  [K in TranslationKey]: string;
};
