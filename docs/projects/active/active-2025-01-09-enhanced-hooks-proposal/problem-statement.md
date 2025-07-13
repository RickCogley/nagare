# Problem Statement: Limited Lifecycle Control in Nagare

## Current Situation

Nagare currently provides only two hooks:

- `preRelease`: Before the release starts
- `postRelease`: After the release completes

## The Problem

Users need more granular control over the release process for:

1. **Security Integration**: Running vulnerability scans at the right moment
2. **Multi-Platform Publishing**: Coordinating releases across npm, JSR, and private registries
3. **Deployment Automation**: Triggering deployments after successful releases
4. **Custom Validation**: Enforcing organization-specific release policies
5. **Error Recovery**: Handling failures gracefully with automated rollbacks

## Evidence from Real Usage

The Aichaku project demonstrated the need for hooks by implementing:

- Binary compilation and upload in `postRelease`
- Checksum generation for security verification
- Multi-platform build orchestration

This pattern shows users are already working around the limited hook system.

## Impact

Without more hooks, users must:

- Run manual steps outside of Nagare
- Create wrapper scripts around Nagare
- Fork Nagare to add custom logic
- Risk inconsistent release processes

## Success Criteria

A successful solution would:

- Provide hooks at all major decision points
- Maintain backwards compatibility
- Keep simple use cases simple
- Enable complex workflows when needed
- Include proper error handling and recovery
