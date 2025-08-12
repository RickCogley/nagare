# CLAUDE.md Usage Research

_Generated on 2025-06-30 using Claude Code_

## Research Question

Are people committing CLAUDE.md files to their repositories?

## Key Findings

### 1. It's a Growing Practice

Many developers are committing CLAUDE.md files to provide persistent context for Claude Code when working on their
projects.

### 2. Common Use Cases

- **Project-specific commands** (build, test, lint scripts)
- **Code style preferences** and conventions
- **Architecture explanations** that require understanding multiple files
- **Workflow instructions** for common tasks

### 3. Where People Put Them

- Most commonly in the **project root**
- Some use a `.claude/` subdirectory
- Claude Code searches recursively, so it can be placed anywhere

### 4. Types of Projects Using CLAUDE.md

- AI/ML projects
- Web development (full-stack apps, APIs)
- DevOps/Infrastructure projects
- Open source libraries and tools

### 5. Community Activity

- Active feature requests for global CLAUDE.md support
- Repositories like `awesome-claude-code` sharing examples
- Discussions about best practices

## Detailed Findings

### Common Usage Patterns

**Primary Uses:**

- **Command Storage**: Frequently used bash commands (build, test, lint, deploy)
- **Code Style Preferences**: Naming conventions, preferred libraries, formatting rules
- **Project Context**: Architecture decisions, file structure explanations, important notes
- **Workflow Instructions**: Step-by-step procedures for common tasks

### Example CLAUDE.md Structure

```markdown
# Project Commands

- Build: `npm run build`
- Test: `npm test`
- Lint: `eslint . --fix`

# Code Style

- Use TypeScript strict mode
- Prefer functional components in React
- Follow Airbnb style guide

# Project Structure

- `/src` - Source code
- `/tests` - Test files
- `/docs` - Documentation
```

### Future Developments

The Claude Code team is actively working on:

- Support for global CLAUDE.md files in home directories
- Ability to interlink CLAUDE.md with other Markdown files
- Enhanced discovery mechanisms for better context management

## Conclusion

CLAUDE.md files represent a growing practice in AI-assisted development, serving as a bridge between human developers
and AI coding assistants by providing persistent, project-specific context and configuration. The practice makes sense
because it provides consistent context across sessions and team members, similar to how `.editorconfig` or
`.cursorrules` files work for other tools.

## Related Resources

- Claude Code documentation: https://docs.anthropic.com/en/docs/claude-code
- GitHub issues discussing CLAUDE.md features
- Community repositories with CLAUDE.md examples
