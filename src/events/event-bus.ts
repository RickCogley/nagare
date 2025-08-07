/**
 * @module EventBus
 * @description Event-driven architecture for Nagare release management
 *
 * Provides a robust publish-subscribe system for decoupling release components.
 * All release lifecycle events flow through this centralized event bus.
 *
 * @since 2.18.0
 */

import type { Result } from "../../types.ts";

/**
 * Release event types with strongly-typed payloads
 */
export interface ReleaseEvents {
  // Lifecycle events
  "release.started": { version: string; type: "patch" | "minor" | "major"; timestamp: Date };
  "release.validated": { config: unknown; preflightPassed: boolean };
  "release.prepared": { backupPath: string; stateFile: string };
  "release.completed": { version: string; duration: number; filesUpdated: number };
  "release.failed": { error: Error; phase: string; canRollback: boolean };

  // File operation events
  "file.updating": { path: string; fileType: string };
  "file.updated": { path: string; oldVersion: string; newVersion: string };
  "file.backed-up": { originalPath: string; backupPath: string };
  "file.restored": { path: string; fromBackup: string };

  // Git operation events
  "git.committing": { message: string; files: string[] };
  "git.committed": { hash: string; message: string };
  "git.tagging": { tag: string; annotated: boolean };
  "git.tagged": { tag: string; hash: string };
  "git.pushing": { remote: string; branch: string; tags: boolean };
  "git.pushed": { remote: string; branch: string };

  // GitHub events
  "github.creating-release": { tag: string; draft: boolean };
  "github.release-created": { url: string; id: string };

  // Rollback events
  "rollback.started": { targetVersion: string; reason: string };
  "rollback.completed": { restoredVersion: string; filesRestored: number };

  // Hook events
  "hook.executing": { name: string; type: "pre" | "post" };
  "hook.completed": { name: string; duration: number };
  "hook.failed": { name: string; error: Error };

  // Progress events
  "progress.update": { phase: string; percent: number; message: string };
  "progress.complete": { phase: string };
}

type EventName = keyof ReleaseEvents;
type EventPayload<T extends EventName> = ReleaseEvents[T];
type EventHandler<T extends EventName> = (payload: EventPayload<T>) => void | Promise<void>;
type WildcardHandler = (event: EventName, payload: unknown) => void | Promise<void>;

/**
 * Priority levels for event handlers
 */
export enum HandlerPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

interface HandlerEntry<T extends EventName> {
  handler: EventHandler<T>;
  priority: HandlerPriority;
  once: boolean;
}

/**
 * Event bus implementation with typed events and priority handling
 *
 * @class EventBus
 * @since 2.18.0
 *
 * @example
 * ```typescript
 * const eventBus = new EventBus();
 *
 * // Type-safe event subscription
 * eventBus.on("release.started", ({ version, type }) => {
 *   console.log(`Starting ${type} release for version ${version}`);
 * });
 *
 * // Priority handlers for critical operations
 * eventBus.on("release.failed", async ({ error, canRollback }) => {
 *   if (canRollback) {
 *     await performRollback();
 *   }
 * }, HandlerPriority.CRITICAL);
 *
 * // Wildcard handler for logging all events
 * eventBus.onAny((event, payload) => {
 *   logger.debug(`Event: ${event}`, payload);
 * });
 * ```
 */
export class EventBus {
  private handlers = new Map<EventName, Set<HandlerEntry<EventName>>>();
  private wildcardHandlers = new Set<WildcardHandler>();
  private eventHistory: Array<{ event: EventName; payload: unknown; timestamp: Date }> = [];
  private maxHistorySize = 100;
  private asyncQueue: Promise<void> = Promise.resolve();
  private isPaused = false;

  /**
   * Subscribe to a specific event with optional priority
   *
   * @param event - Event name to subscribe to
   * @param handler - Handler function to call when event fires
   * @param priority - Handler priority (higher priority handlers execute first)
   * @returns Unsubscribe function
   */
  on<T extends EventName>(
    event: T,
    handler: EventHandler<T>,
    priority: HandlerPriority = HandlerPriority.NORMAL,
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    const entry: HandlerEntry<T> = { handler, priority, once: false };
    this.handlers.get(event)!.add(entry);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(event);
      if (handlers) {
        handlers.delete(entry);
        if (handlers.size === 0) {
          this.handlers.delete(event);
        }
      }
    };
  }

  /**
   * Subscribe to an event for one-time execution
   *
   * @param event - Event name to subscribe to
   * @param handler - Handler function to call once when event fires
   * @param priority - Handler priority
   * @returns Unsubscribe function
   */
  once<T extends EventName>(
    event: T,
    handler: EventHandler<T>,
    priority: HandlerPriority = HandlerPriority.NORMAL,
  ): () => void {
    const entry: HandlerEntry<T> = { handler, priority, once: true };

    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    this.handlers.get(event)!.add(entry);

    return () => {
      const handlers = this.handlers.get(event);
      if (handlers) {
        handlers.delete(entry);
      }
    };
  }

  /**
   * Subscribe to all events (wildcard handler)
   *
   * @param handler - Handler function to call for any event
   * @returns Unsubscribe function
   */
  onAny(handler: WildcardHandler): () => void {
    this.wildcardHandlers.add(handler);
    return () => this.wildcardHandlers.delete(handler);
  }

  /**
   * Emit an event to all registered handlers
   *
   * @param event - Event name to emit
   * @param payload - Event payload data
   * @returns Promise that resolves when all handlers complete
   */
  async emit<T extends EventName>(
    event: T,
    payload: EventPayload<T>,
  ): Promise<Result<void, Error>> {
    if (this.isPaused) {
      return { success: true, data: undefined };
    }

    // Record in history
    this.recordEvent(event, payload);

    // Queue async execution to maintain order
    this.asyncQueue = this.asyncQueue.then(async () => {
      try {
        // Execute event-specific handlers
        const handlers = this.handlers.get(event);
        if (handlers) {
          // Sort by priority (highest first)
          const sortedHandlers = Array.from(handlers).sort(
            (a, b) => b.priority - a.priority,
          );

          for (const entry of sortedHandlers) {
            try {
              await entry.handler(payload);

              // Remove if one-time handler
              if (entry.once) {
                handlers.delete(entry);
              }
            } catch (error) {
              console.error(`Handler error for event "${event}":`, error);
              // Continue executing other handlers
            }
          }
        }

        // Execute wildcard handlers
        for (const wildcardHandler of this.wildcardHandlers) {
          try {
            await wildcardHandler(event, payload);
          } catch (error) {
            console.error(`Wildcard handler error for event "${event}":`, error);
          }
        }
      } catch (error) {
        throw error instanceof Error ? error : new Error(String(error));
      }
    });

    try {
      await this.asyncQueue;
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Emit an event synchronously (blocks until handlers complete)
   *
   * @param event - Event name to emit
   * @param payload - Event payload data
   */
  emitSync<T extends EventName>(event: T, payload: EventPayload<T>): void {
    if (this.isPaused) return;

    this.recordEvent(event, payload);

    const handlers = this.handlers.get(event);
    if (handlers) {
      const sortedHandlers = Array.from(handlers).sort(
        (a, b) => b.priority - a.priority,
      );

      for (const entry of sortedHandlers) {
        try {
          const result = entry.handler(payload);
          // If handler returns promise, warn about sync usage
          if (result instanceof Promise) {
            console.warn(`Async handler called in sync emit for event "${event}"`);
          }

          if (entry.once) {
            handlers.delete(entry);
          }
        } catch (error) {
          console.error(`Sync handler error for event "${event}":`, error);
        }
      }
    }

    // Execute wildcard handlers
    for (const wildcardHandler of this.wildcardHandlers) {
      try {
        const result = wildcardHandler(event, payload);
        if (result instanceof Promise) {
          console.warn(`Async wildcard handler called in sync emit for event "${event}"`);
        }
      } catch (error) {
        console.error(`Sync wildcard handler error for event "${event}":`, error);
      }
    }
  }

  /**
   * Remove a specific handler for an event
   *
   * @param event - Event name
   * @param handler - Handler function to remove
   */
  off<T extends EventName>(event: T, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      // Find and remove matching handler
      for (const entry of handlers) {
        if (entry.handler === handler) {
          handlers.delete(entry);
          break;
        }
      }

      if (handlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  /**
   * Remove all handlers for a specific event
   *
   * @param event - Event name
   */
  offAll(event?: EventName): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
      this.wildcardHandlers.clear();
    }
  }

  /**
   * Wait for an event to occur
   *
   * @param event - Event name to wait for
   * @param timeout - Optional timeout in milliseconds
   * @returns Promise that resolves with event payload
   */
  waitFor<T extends EventName>(
    event: T,
    timeout?: number,
  ): Promise<EventPayload<T>> {
    return new Promise((resolve, reject) => {
      let timeoutId: number | undefined;

      const unsubscribe = this.once(event, (payload) => {
        if (timeoutId) clearTimeout(timeoutId);
        resolve(payload);
      });

      if (timeout) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for event "${event}"`));
        }, timeout);
      }
    });
  }

  /**
   * Pause event processing
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume event processing
   */
  resume(): void {
    this.isPaused = false;
  }

  /**
   * Get event history
   *
   * @param event - Optional event name to filter by
   * @returns Array of historical events
   */
  getHistory(event?: EventName): Array<{ event: EventName; payload: unknown; timestamp: Date }> {
    if (event) {
      return this.eventHistory.filter((entry) => entry.event === event);
    }
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get handler count for an event
   *
   * @param event - Event name
   * @returns Number of registered handlers
   */
  getHandlerCount(event?: EventName): number {
    if (event) {
      return this.handlers.get(event)?.size || 0;
    }

    let total = 0;
    for (const handlers of this.handlers.values()) {
      total += handlers.size;
    }
    return total + this.wildcardHandlers.size;
  }

  /**
   * Record event in history
   */
  private recordEvent(event: EventName, payload: unknown): void {
    this.eventHistory.push({
      event,
      payload,
      timestamp: new Date(),
    });

    // Trim history if needed
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }
}

/**
 * Global event bus singleton instance
 */
export const globalEventBus = new EventBus();

/**
 * Create a scoped event bus for isolated event handling
 *
 * @returns New EventBus instance
 */
export function createEventBus(): EventBus {
  return new EventBus();
}

/**
 * Event bus middleware for logging, metrics, etc.
 */
export interface EventMiddleware {
  before?<T extends EventName>(event: T, payload: EventPayload<T>): void | Promise<void>;
  after?<T extends EventName>(event: T, payload: EventPayload<T>): void | Promise<void>;
  error?<T extends EventName>(event: T, payload: EventPayload<T>, error: Error): void | Promise<void>;
}

/**
 * Apply middleware to an event bus
 *
 * @param eventBus - Event bus to enhance
 * @param middleware - Middleware to apply
 */
export function applyMiddleware(eventBus: EventBus, middleware: EventMiddleware): void {
  const originalEmit = eventBus.emit.bind(eventBus);

  eventBus.emit = async function <T extends EventName>(
    event: T,
    payload: EventPayload<T>,
  ): Promise<Result<void, Error>> {
    try {
      // Before middleware
      if (middleware.before) {
        await middleware.before(event, payload);
      }

      // Original emit
      const result = await originalEmit(event, payload);

      // After middleware
      if (middleware.after) {
        await middleware.after(event, payload);
      }

      return result;
    } catch (error) {
      // Error middleware
      if (middleware.error) {
        await middleware.error(
          event,
          payload,
          error instanceof Error ? error : new Error(String(error)),
        );
      }

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  };
}
