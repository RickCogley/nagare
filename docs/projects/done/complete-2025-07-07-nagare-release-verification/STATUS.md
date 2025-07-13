# Status: Complete Release Flow Automation Feature

## Project Info

- **Type**: Feature Shaping (Shape Up)
- **Started**: 2025-07-07
- **Status**: 🔵 Planning - Refining pitch
- **Appetite**: 6 weeks (expanded scope)

## Problem Statement

Nagare currently considers a release complete when it finds the GitHub release, but for projects
published to JSR (like nagare itself and aichaku), the true success criteria is the package
appearing on JSR. Additionally, when CI/CD failures occur (linting, security, type checks), Nagare
just reports failure instead of maintaining the "flow" it's named for.

## Current Activity

- ✅ Created pitch document with problem, solution, and boundaries
- ✅ Expanded scope to include AI-assisted problem fixing
- ✅ Set 6-week appetite for expanded implementation
- ✅ Defined breadboard-level solution approach
- ✅ Created implementation notes for technical approach
- ✅ Defined clear "Definition of Done" at workflow and project levels
- ✅ Designed horizontal flow progress indicators for "you are here" UX
- ✅ Created comprehensive feature summary of all aspects
- ✅ Separated AI features into optional layer with graceful degradation

## Solution Summary

Add intelligent post-release automation that:

- Monitors GitHub Actions workflow status via `gh` CLI
- Parses action logs to identify specific failure types
- **Layer 1 - Basic Auto-Fix** (no AI required):
  - Run formatters with --fix flag
  - Simple version bumps for conflicts
  - Add standard suppressions for false positives
  - Retry transient failures
- **Layer 2 - AI-Enhanced** (optional, off by default):
  - Detect available AI tools (Claude Code, Copilot, etc.)
  - Solve complex lint/type/security issues
  - Gracefully fall back to manual instructions if unavailable
- Only declares success when package is actually live on JSR

This ensures Nagare maintains the complete "flow" from code to published package, with or without
AI.

## Next Steps

- Await approval to proceed with implementation
- If approved: Create detailed implementation plan within 6-week appetite

## Key Documents

1. [pitch.md](./pitch.md) - Feature pitch with problem, appetite, solution
2. [feature-summary.md](./feature-summary.md) - All aspects being shaped
3. [ai-separation-strategy.md](./ai-separation-strategy.md) - How AI features remain optional
4. [definition-of-done.md](./definition-of-done.md) - Clear completion criteria
5. [implementation-notes.md](./implementation-notes.md) - Technical approach
6. [progress-indicators.md](./progress-indicators.md) - Visual progress UX design
