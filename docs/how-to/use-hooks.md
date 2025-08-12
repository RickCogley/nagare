# How to Use Lifecycle Hooks

This guide shows you how to use Nagare's lifecycle hooks to customize the release process. Use hooks when you need to
run custom code before or after releases.

## Before you begin

Ensure you have:

- Nagare configured in your project
- Understanding of async/await in TypeScript/JavaScript
- Permissions for any external commands you plan to run

## Solution

### Option 1: Pre-Release Validation

Use this approach to validate conditions before allowing a release.

1. Add test execution before release:
   ```typescript
   export default {
     // ... other config ...

     hooks: {
       preRelease: [
         async () => {
           console.log("🧪 Running tests...");

           const testCmd = new Deno.Command("deno", {
             args: ["test", "--allow-all"],
             stdout: "piped",
             stderr: "piped",
           });

           const result = await testCmd.output();

           if (!result.success) {
             const error = new TextDecoder().decode(result.stderr);
             throw new Error(`Tests failed:\n${error}`);
           }

           console.log("✅ All tests passed");
         },
       ],
     },
   } as NagareConfig;
   ```

2. Add lint and format checks:
   ```typescript
   preRelease: [
     async () => {
       // Check formatting
       const fmtCheck = await new Deno.Command("deno", {
         args: ["fmt", "--check"],
       }).output();

       if (!fmtCheck.success) {
         throw new Error("Code is not formatted. Run 'deno fmt' first.");
       }

       // Check linting
       const lintCheck = await new Deno.Command("deno", {
         args: ["lint"],
       }).output();

       if (!lintCheck.success) {
         throw new Error("Linting errors found. Run 'deno lint' to see details.");
       }
     },
   ];
   ```

### Option 2: Post-Release Notifications

Use this approach to notify team members or trigger deployments after releases.

1. Send Slack notification:
   ```typescript
   postRelease: [
     async (config, result) => {
       if (!result.success) return;

       const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
       if (!webhookUrl) return;

       await fetch(webhookUrl, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           text: `🚀 Released ${config.project.name} v${result.version}`,
           blocks: [
             {
               type: "section",
               text: {
                 type: "mrkdwn",
                 text: `*${config.project.name}* version *${result.version}* has been released!`,
               },
             },
             {
               type: "section",
               fields: [
                 {
                   type: "mrkdwn",
                   text: `*Commits:*\n${result.commitCount}`,
                 },
                 {
                   type: "mrkdwn",
                   text: `*GitHub Release:*\n<${result.githubReleaseUrl}|View>`,
                 },
               ],
             },
           ],
         }),
       });
     },
   ];
   ```

2. Trigger deployment pipeline:
   ```typescript
   postRelease: [
     async (config, result) => {
       if (!result.success) return;

       console.log("🚀 Triggering deployment...");

       const deployCmd = new Deno.Command("gh", {
         args: [
           "workflow",
           "run",
           "deploy.yml",
           "--ref",
           `v${result.version}`,
         ],
       });

       await deployCmd.output();
       console.log("✅ Deployment triggered");
     },
   ];
   ```

### Option 3: Pre-Version Validation

Use this to check version-specific requirements before bumping.

```typescript
hooks: {
  preVersion: [
    async (currentVersion, newVersion, bumpType) => {
      // Prevent major version bumps on main branch
      if (bumpType === "major") {
        const branch = await getCurrentBranch();
        if (branch === "main") {
          throw new Error("Major version bumps must be done on a release branch");
        }
      }
      
      // Ensure version follows naming convention
      if (newVersion.includes("-")) {
        throw new Error("Pre-release versions not allowed in production releases");
      }
    },
  ],
}
```

### Option 4: File Processing Hooks

Use these to process files before or after updates.

```typescript
hooks: {
  preFileUpdate: [
    async (filePath, content) => {
      // Backup critical files
      if (filePath.endsWith("package.json")) {
        await Deno.copyFile(filePath, `${filePath}.backup`);
      }
      
      // Validate JSON files
      if (filePath.endsWith(".json")) {
        try {
          JSON.parse(content);
        } catch {
          throw new Error(`Invalid JSON in ${filePath}`);
        }
      }
      
      return content; // Return potentially modified content
    },
  ],
  
  postFileUpdate: [
    async (filePath, content) => {
      // Format updated files
      if (filePath.endsWith(".ts") || filePath.endsWith(".js")) {
        await new Deno.Command("deno", {
          args: ["fmt", filePath],
        }).output();
      }
    },
  ],
}
```

### Option 5: Error Recovery Hooks

Use this approach to handle failures gracefully.

```typescript
hooks: {
  onError: [
    async (error, phase) => {
      console.error(`❌ Error during ${phase}: ${error.message}`);
      
      // Log to error tracking service
      if (Deno.env.get("SENTRY_DSN")) {
        await logToSentry(error, phase);
      }
      
      // Cleanup on failure
      if (phase === "release") {
        console.log("🧹 Cleaning up failed release...");
        // Remove temporary files, reset state, etc.
      }
    },
  ],
}
```

### Option 6: Multiple Hooks with Dependencies

Chain multiple hooks that depend on each other.

```typescript
hooks: {
  preRelease: [
    // First: ensure clean working directory
    async () => {
      const status = await getGitStatus();
      if (status.hasUncommittedChanges) {
        throw new Error("Uncommitted changes detected");
      }
    },
    
    // Second: run tests (depends on clean state)
    async () => {
      await runTests();
    },
    
    // Third: build project (depends on tests passing)
    async () => {
      await buildProject();
    },
    
    // Fourth: validate build output
    async () => {
      const distExists = await Deno.stat("./dist").catch(() => null);
      if (!distExists) {
        throw new Error("Build output not found");
      }
    },
  ],
}
```

## Verify your hooks

Test hooks without making actual releases:

```bash
# Test with dry run
deno task nagare --dry-run

# Test specific scenarios
deno task nagare:major --dry-run

# Check hook execution in logs
NAGARE_LOG_LEVEL=debug deno task nagare --dry-run
```

## Troubleshooting

**Problem**: Hook throws "Permission denied" **Solution**: Ensure Deno has required permissions or run with
`--allow-all`

**Problem**: Hook doesn't execute **Solution**: Check hook is properly exported in config and function is async

**Problem**: Hook causes release to fail **Solution**: Add try-catch blocks and proper error handling in hooks

## Related tasks

- [How to Configure Nagare](./how-to-configure-nagare.md)
- [How to Customize Templates](./how-to-customize-templates.md)
- [Concepts: Release Workflow](./concepts-release-workflow.md)
