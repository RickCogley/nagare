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

### Known Security Considerations

1. **Custom Templates**: Custom Vento templates can execute code. Review all custom templates before
   use. Key security notes:
   - Templates with `autoescape: true` (default) automatically escape HTML entities
   - Use `|> safe` filter only when you trust the content source
   - Always validate template data before processing
   - See [CLAUDE.md](./CLAUDE.md#vento-template-engine-guidelines) for proper Vento usage

2. **Command Execution**: While we use Deno's secure Command API, always validate configuration
   inputs.

3. **File Patterns**: Custom file update patterns should be carefully reviewed to prevent unintended
   matches.

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

### In Progress

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
- [ ] Template sandboxing options

### Planned

- [ ] Security audit
- [ ] Automated security testing
- [ ] SAST/DAST integration
- [ ] Security documentation expansion

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
