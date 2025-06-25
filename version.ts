export const VERSION = "0.1.0";

export const BUILD_INFO = {
  buildDate: "2025-01-01T00:00:00.000Z",
  gitCommit: "initial",
  buildEnvironment: "development"
} as const;

export const APP_INFO = {
  name: "Nagare",
  description: "Deno Release Management Library",
  license: "MIT"
} as const;

export const RELEASE_NOTES = {
  version: "0.1.0",
  releaseDate: "2025-01-01",
  changes: {
    added: ["Initial release"],
    improved: [],
    removed: [],
    fixed: [],
    security: []
  }
} as const;
