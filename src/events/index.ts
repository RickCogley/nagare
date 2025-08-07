/**
 * @module Events
 * @description Event-driven architecture for Nagare
 *
 * Central module for event-based communication between release components.
 * Provides type-safe event handling with priority support.
 *
 * @since 2.18.0
 */

export {
  applyMiddleware,
  createEventBus,
  EventBus,
  type EventMiddleware,
  globalEventBus,
  HandlerPriority,
  type ReleaseEvents,
} from "./event-bus.ts";

// Re-export common event names as constants for convenience
export const RELEASE_EVENTS = {
  // Lifecycle
  STARTED: "release.started",
  VALIDATED: "release.validated",
  PREPARED: "release.prepared",
  COMPLETED: "release.completed",
  FAILED: "release.failed",

  // Files
  FILE_UPDATING: "file.updating",
  FILE_UPDATED: "file.updated",
  FILE_BACKED_UP: "file.backed-up",
  FILE_RESTORED: "file.restored",

  // Git
  GIT_COMMITTING: "git.committing",
  GIT_COMMITTED: "git.committed",
  GIT_TAGGING: "git.tagging",
  GIT_TAGGED: "git.tagged",
  GIT_PUSHING: "git.pushing",
  GIT_PUSHED: "git.pushed",

  // GitHub
  GITHUB_CREATING: "github.creating-release",
  GITHUB_CREATED: "github.release-created",

  // Rollback
  ROLLBACK_STARTED: "rollback.started",
  ROLLBACK_COMPLETED: "rollback.completed",

  // Hooks
  HOOK_EXECUTING: "hook.executing",
  HOOK_COMPLETED: "hook.completed",
  HOOK_FAILED: "hook.failed",

  // Progress
  PROGRESS_UPDATE: "progress.update",
  PROGRESS_COMPLETE: "progress.complete",
} as const;
