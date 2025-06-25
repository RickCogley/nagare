import type { NagareConfig } from './types.ts';

export default {
  project: {
    name: 'Nagare',
    description: 'Deno Release Management Library',
    repository: 'https://github.com/RickCogley/nagare',
    homepage: 'https://jsr.io/@rick/nagare',
    license: 'MIT',
    author: 'Rick Cogley'
  },

  versionFile: {
    path: './version.ts',
    template: 'typescript'
  },

  releaseNotes: {
    includeCommitHashes: true,
    maxDescriptionLength: 100
  },

  github: {
    owner: 'RickCogley',
    repo: 'nagare',
    createRelease: true
  },

  updateFiles: [
    {
      path: './deno.json',
      patterns: {
        version: /"version":\s*"([^"]+)"/
      }
    }
  ],

  docs: {
    enabled: true,
    outputDir: './docs',
    includePrivate: false
  },

  options: {
    tagPrefix: 'v',
    gitRemote: 'origin',
    logLevel: 'INFO'
  }
} as NagareConfig;