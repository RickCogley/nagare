# AI Separation Strategy

## Problem

We're assuming Claude Code availability for auto-fixing, but Nagare should remain AI-agnostic with AI features as
optional enhancements.

## Solution: Layered Architecture

### Layer 1: Core Features (No AI Required)

These work for everyone, regardless of AI availability:

1. **JSR Verification**
   - Monitor GitHub Actions via `gh` CLI
   - Poll JSR API for package availability
   - Parse action logs for error messages
   - Display clear error diagnostics
   - Progress indicators and "you are here" UX

2. **Basic Auto-Fix** (Deterministic fixes)
   - Run `deno fmt --fix` for format errors
   - Run `deno lint --fix` for fixable lint rules
   - Bump version for "version already exists" errors
   - Add standard DevSkim suppressions for false positives
   - Retry workflow for transient failures

### Layer 2: AI-Enhanced Features (Optional)

Only activated when AI is available AND enabled:

1. **Complex Problem Solving**
   - Analyze non-trivial lint errors
   - Fix complex type errors
   - Resolve security scan issues requiring code changes
   - Handle edge cases in error patterns

2. **AI Detection & Configuration**
   ```typescript
   {
     release: {
       verifyJsrPublish: true,
       autoFix: {
         basic: true,        // Deterministic fixes (always available)
         ai: {
           enabled: false,   // Opt-in AI features
           provider: "claude-code" | "github-copilot" | "custom",
           command: "claude",  // CLI command to invoke
           flags: ["--extended-thinking"],
           maxAttempts: 3
         }
       }
     }
   }
   ```

### Implementation Strategy

1. **Feature Detection**
   ```typescript
   async function detectAICapability(): Promise<AIProvider | null> {
     // Check for Claude Code
     if (await commandExists("claude")) {
       return { type: "claude-code", command: "claude" };
     }
     // Check for other AI tools
     if (await commandExists("gh copilot")) {
       return { type: "github-copilot", command: "gh copilot" };
     }
     return null;
   }
   ```

2. **Graceful Degradation**
   ```typescript
   async function attemptFix(error: ParsedError): Promise<boolean> {
     // Try basic fixes first
     if (await tryBasicFix(error)) {
       return true;
     }

     // Only try AI if enabled and available
     if (config.autoFix.ai.enabled && aiProvider) {
       return await tryAIFix(error, aiProvider);
     }

     // Provide manual fix instructions
     console.log("Manual fix required:", error.suggestion);
     return false;
   }
   ```

3. **Progressive Enhancement**
   - Without AI: Get clear diagnostics and basic auto-fixes
   - With AI disabled: Same as above
   - With AI enabled: Full auto-fix capabilities

### Error Message Examples

**Without AI:**

```
❌ ESLint error in src/utils.ts:45
   'validateInput' is defined but never used

💡 Suggested fixes:
   1. Remove the unused function
   2. Export it if needed elsewhere
   3. Add /* eslint-disable-line no-unused-vars */
   
Run 'deno lint --fix' attempted but couldn't resolve this issue.
```

**With AI:**

```
❌ ESLint error in src/utils.ts:45
   'validateInput' is defined but never used

🤖 AI-assisted fix available. Enable with:
   config.autoFix.ai.enabled = true
   
Or fix manually as suggested above.
```

### Benefits

1. **No Breaking Changes**: Existing users see no difference
2. **Progressive Enhancement**: AI adds value when available
3. **Provider Agnostic**: Support multiple AI tools
4. **Clear Boundaries**: Users understand what requires AI
5. **Graceful Fallback**: Always provide manual alternatives

### Updated Feature Scope

**Core Release Flow Automation** (No AI):

- JSR verification and monitoring
- Progress indicators
- Log parsing and diagnostics
- Basic deterministic fixes
- Workflow retry logic

**AI-Enhanced Automation** (Optional):

- Complex code fixes
- Intelligent error resolution
- Multi-step problem solving
- Learning from patterns
