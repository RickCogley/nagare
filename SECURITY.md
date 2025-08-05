# Security Policy

## Supported Versions

Currently supported versions for security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

To report a security vulnerability:

1. **DO NOT** open a public issue
2. Email security concerns to: rick.cogley@esolia.co.jp
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

Response time:

- Acknowledgment: Within 48 hours
- Initial assessment: Within 7 days
- Fix timeline: Based on severity

## Security Considerations

### Input Validation

Nagare validates inputs in several areas:

- File paths are checked for valid patterns
- Version strings are validated against semver
- Git commands use Deno's Command API (not shell execution)
- Configuration files are type-checked

### Authentication & Authorization

- GitHub authentication is delegated to the `gh` CLI tool
- No credentials are stored or managed by Nagare
- Uses GitHub's OAuth flow through `gh auth login`

### File System Security

- Operates under Deno's permission model
- Requires explicit `--allow-read`, `--allow-write`, `--allow-run` permissions
- File operations are limited to project directory
- Uses safe regex patterns for file updates

### Dependencies

Nagare minimizes dependencies:

- `@std/semver`: Deno standard library for version handling
- `vento`: Template engine with no known vulnerabilities

All dependencies are:

- Fetched from JSR (Deno's secure registry)
- Version-pinned with integrity checking
- Regularly updated for security patches

### GitHub Security Features

Nagare leverages GitHub's comprehensive security platform to maintain code quality and prevent vulnerabilities:

1. **CodeQL Analysis**: Advanced semantic code analysis that automatically scans for security vulnerabilities
   - Detects: SQL injection, XSS, path traversal, insecure data flow, and more
   - Runs: On every push, pull request, and weekly deep scans
   - Results: Appear in GitHub Security tab with detailed remediation guidance

2. **DevSkim**: Microsoft's lightweight security linter for real-time pattern detection
   - Detects: Common security anti-patterns across multiple languages
   - Runs: On every push and pull request
   - Coverage: Regex-based pattern matching for quick security checks
   - Complements: CodeQL's deep analysis with fast pattern-based scanning

3. **Dependabot**: Automated dependency management that keeps dependencies secure
   - Monitors: All dependencies for known vulnerabilities
   - Creates: Automatic pull requests to update vulnerable packages
   - Groups: Related updates to reduce PR noise
   - Supports: GitHub Actions and npm dependencies (Deno/JSR support pending)

4. **Dependency Review**: Pull request protection that prevents introducing vulnerable dependencies
   - Blocks: PRs containing high-severity vulnerabilities
   - Shows: License changes and vulnerability details
   - Integrates: Directly into PR checks for immediate feedback

5. **Secret Scanning**: Detects and prevents accidental exposure of sensitive data
   - Scans: All commits for API keys, tokens, and credentials
   - Alerts: Repository admins when secrets are detected
   - Push Protection: Can block commits containing secrets (optional)
   - Partners: Works with service providers to revoke exposed credentials

All these features are **free for public repositories** and provide enterprise-grade security monitoring.

### Known Security Considerations

1. **Custom Templates**: Custom Vento templates can execute code. Review all custom templates before use. Key security
   notes:
   - Templates with `autoescape: true` (default) automatically escape HTML entities
   - Use `|> safe` filter only when you trust the content source
   - Always validate template data before processing
   - See [CLAUDE.md](./CLAUDE.md#vento-template-engine-guidelines) for proper Vento usage

2. **Command Execution**: While we use Deno's secure Command API, always validate configuration inputs.

3. **File Patterns**: Custom file update patterns should be carefully reviewed to prevent unintended matches.

## Security Best Practices

### For Users

1. **Minimal Permissions**: Only grant required Deno permissions
   ```bash
   deno run --allow-read=. --allow-write=. --allow-run=git,gh nagare-launcher.ts
   ```

2. **Configuration Security**:
   - Review all file patterns in `nagare.config.ts`
   - Don't commit sensitive data in version files
   - Use environment variables for tokens

3. **CI/CD Security**:
   - Use GitHub Secrets for `GITHUB_TOKEN`
   - Limit workflow permissions
   - Review workflow files for security

### For Contributors

1. **Code Security**:
   - Validate all inputs
   - Use type-safe operations
   - Avoid shell command construction
   - Follow OWASP guidelines

2. **Dependencies**:
   - Minimize new dependencies
   - Audit before adding
   - Keep updated

3. **Testing**:
   - Include security test cases
   - Test with minimal permissions
   - Verify error handling doesn't leak info

## Security Hardening Roadmap

### Completed

- [x] Safe default configurations
- [x] Type-safe interfaces
- [x] Minimal dependency footprint
- [x] Deno permission model integration

### Completed

- [x] Enhanced input validation layer (v1.3.0)
  - Added comprehensive `security-utils.ts` module
  - Git reference validation (`validateGitRef`)
  - File path validation with traversal prevention (`validateFilePath`)
  - Commit message sanitization (`sanitizeCommitMessage`)
  - Version string validation (`validateVersion`)
  - Error message sanitization (`sanitizeErrorMessage`)
  - CLI argument validation (`validateCliArgs`)
- [x] Security-focused logging (v1.3.0)
  - Added `createSecurityLog` function for audit trails
  - Automatic sanitization of sensitive data in logs
  - Integrated audit logging in file handlers and template processor
- [x] Template sandboxing options (v1.6.0)
  - Added `SecurityConfig` interface with sandboxing levels
  - Implemented strict/moderate/disabled sandboxing modes
  - Enhanced template validation with dangerous pattern detection
  - Added template size limits to prevent DoS
- [x] Automated security testing (v1.6.0)
  - Created comprehensive security test suite
  - Added GitHub Actions workflow for security tests
  - Implemented pattern checking script
  - Added command injection and path traversal tests
- [x] Security documentation expansion (v1.6.0)
  - Added comprehensive security section to README.md
  - Documented all security features with examples
  - Created security best practices guide

### Completed (Continued)

- [x] Basic SAST (Static Application Security Testing) integration (v1.6.0)
  - Integrated `deno lint` for static code analysis
  - Created pattern checking script to detect dangerous regex patterns
  - Added checks for hardcoded secrets in CI/CD workflow
  - Validates file permissions and security patterns
- [x] GitHub Security Features integration (v1.6.0)
  - CodeQL semantic code analysis for vulnerability detection
  - Dependabot for automated dependency updates
  - Dependency review action to block vulnerable dependencies in PRs
  - Secret scanning (automatically enabled for public repos)
  - Security insights configuration for transparency

### Possible Future Actions

- [ ] Professional security audit by third-party firm
- [ ] Advanced SAST/DAST tools integration (e.g., Snyk, SonarQube)
- [ ] Dependency vulnerability scanning (when Deno supports it)
- [ ] Security compliance certifications (SOC2, ISO 27001, etc.)

## Compliance

Nagare aims to comply with:

- OWASP Top 10 guidelines
- Security best practices for CLI tools
- Deno security model

For detailed OWASP compliance status, see the Security section in README.md.

## Security Updates

Security updates are released as:

- **Critical**: Immediate patch release
- **High**: Within 7 days
- **Medium**: Within 30 days
- **Low**: Next regular release

Subscribe to releases on GitHub to get notified of security updates.
