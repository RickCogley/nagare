/**
 * @fileoverview CHANGELOG.md management following "Keep a Changelog" format
 */

import type { ReleaseNotes } from '../types.ts';

/**
 * ChangelogGenerator - CHANGELOG.md management
 */
export class ChangelogGenerator {
  private config: any; // Will be properly typed when integrated

  constructor(config: any) {
    this.config = config;
  }

  /**
   * Update CHANGELOG.md with new release notes
   */
  async updateChangelog(releaseNotes: ReleaseNotes): Promise<void> {
    const changelogPath = './CHANGELOG.md';
    
    try {
      let existingContent = '';
      try {
        existingContent = await Deno.readTextFile(changelogPath);
      } catch {
        // File doesn't exist, create header
        existingContent = this.createChangelogHeader();
      }

      // Generate new entry
      const newEntry = this.generateChangelogEntry(releaseNotes);

      // Insert new entry after header
      const newContent = this.insertNewEntry(existingContent, newEntry);
      
      await Deno.writeTextFile(changelogPath, newContent);
      console.log('✅ Updated CHANGELOG.md');
    } catch (error) {
      console.error('❌ Error updating CHANGELOG.md:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Create changelog header
   */
  private createChangelogHeader(): string {
    return `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;
  }

  /**
   * Generate changelog entry for release
   */
  private generateChangelogEntry(releaseNotes: ReleaseNotes): string {
    let entry = `## [${releaseNotes.version}] - ${releaseNotes.date}\n\n`;
    
    if (releaseNotes.added.length > 0) {
      entry += `### Added\n${releaseNotes.added.map(item => `- ${item}`).join('\n')}\n\n`;
    }
    if (releaseNotes.changed.length > 0) {
      entry += `### Changed\n${releaseNotes.changed.map(item => `- ${item}`).join('\n')}\n\n`;
    }
    if (releaseNotes.deprecated.length > 0) {
      entry += `### Deprecated\n${releaseNotes.deprecated.map(item => `- ${item}`).join('\n')}\n\n`;
    }
    if (releaseNotes.removed.length > 0) {
      entry += `### Removed\n${releaseNotes.removed.map(item => `- ${item}`).join('\n')}\n\n`;
    }
    if (releaseNotes.fixed.length > 0) {
      entry += `### Fixed\n${releaseNotes.fixed.map(item => `- ${item}`).join('\n')}\n\n`;
    }
    if (releaseNotes.security.length > 0) {
      entry += `### Security\n${releaseNotes.security.map(item => `- ${item}`).join('\n')}\n\n`;
    }

    return entry;
  }

  /**
   * Insert new entry into existing changelog
   */
  private insertNewEntry(existingContent: string, newEntry: string): string {
    const headerEnd = existingContent.indexOf('\n## ');
    
    if (headerEnd === -1) {
      // No existing releases
      return existingContent + newEntry;
    } else {
      // Insert after header
      return existingContent.slice(0, headerEnd + 1) + newEntry + existingContent.slice(headerEnd + 1);
    }
  }
}