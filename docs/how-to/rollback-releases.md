# How to Rollback Releases

This guide shows you how to rollback releases when something goes wrong. Use rollback when you need to revert to a
previous version after a problematic release.

## Before you begin

Ensure you have:

- A release created with Nagare (tagged and committed)
- Git push access to your repository
- GitHub CLI configured (if using GitHub releases)

## Solution

### Option 1: Rollback Latest Release

Use this approach to quickly revert the most recent release.

1. Run the rollback command without arguments:
   ```bash
   deno task nagare:rollback
   ```

2. Nagare will detect the latest release and show preview:
   ```
   🔄 Rolling back release v1.2.3

   Changes to revert:
   - version.ts: 1.2.3 → 1.2.2
   - deno.json: 1.2.3 → 1.2.2
   - CHANGELOG.md: Remove v1.2.3 entry

   Continue with rollback? (y/n)
   ```

3. Confirm to proceed with rollback:
   ```
   ✅ Reverted files to v1.2.2
   ✅ Removed local tag v1.2.3
   ✅ Removed remote tag v1.2.3
   ✅ Deleted GitHub release v1.2.3
   ✅ Created rollback commit

   🔄 Rollback completed successfully
   ```

### Option 2: Rollback Specific Version

Use this approach when you need to rollback to a specific version.

1. Specify the version to rollback:
   ```bash
   deno task nagare rollback 1.2.0
   ```

2. For versions further back, Nagare shows cumulative changes:
   ```
   🔄 Rolling back to v1.2.0

   This will revert 3 releases:
   - v1.2.3 → v1.2.2
   - v1.2.2 → v1.2.1
   - v1.2.1 → v1.2.0

   Continue? (y/n)
   ```

### Option 3: Partial Rollback (Keep GitHub Release)

Use this when you want to revert code but keep the GitHub release for documentation.

1. Configure rollback options in your config:
   ```typescript
   export default {
     // ... other config ...

     rollback: {
       keepGitHubRelease: true,
       commitMessage: "revert: rollback to v{{version}} (keeping GitHub release)",
     },
   } as NagareConfig;
   ```

2. Run rollback:
   ```bash
   deno task nagare:rollback
   ```

### Option 4: Rollback with Custom Commit Message

Use this to provide context for the rollback.

1. Create a custom rollback script:
   ```typescript
   // scripts/rollback-with-reason.ts
   import { RollbackManager } from "jsr:@rick/nagare";
   import config from "../nagare.config.ts";

   const reason = Deno.args[0] || "unspecified reason";
   const version = Deno.args[1];

   const rollbackConfig = {
     ...config,
     rollback: {
       commitMessage: `revert: rollback to v{{version}} - ${reason}`,
     },
   };

   const manager = new RollbackManager(rollbackConfig);
   await manager.rollback(version);
   ```

2. Run with reason:
   ```bash
   deno run -A scripts/rollback-with-reason.ts "critical bug in auth module" 1.2.2
   ```

### Option 5: Rollback with Pre-checks

Use hooks to validate before rollback.

```typescript
export default {
  // ... other config ...

  hooks: {
    preRollback: [
      async (targetVersion) => {
        // Ensure no active deployments
        const deploymentStatus = await checkDeploymentStatus();
        if (deploymentStatus.active) {
          throw new Error("Cannot rollback while deployment is active");
        }

        // Verify target version exists
        const tags = await getGitTags();
        if (!tags.includes(`v${targetVersion}`)) {
          throw new Error(`Version ${targetVersion} not found in git history`);
        }

        // Check if rollback would lose data
        const commits = await getCommitsSince(`v${targetVersion}`);
        if (commits.some((c) => c.type === "feat")) {
          console.warn("⚠️  Rollback will remove features:");
          commits.filter((c) => c.type === "feat")
            .forEach((c) => console.warn(`  - ${c.description}`));
        }
      },
    ],

    postRollback: [
      async (version) => {
        // Notify team
        await sendSlackNotification({
          text: `⚠️ Rolled back to v${version}`,
          color: "warning",
        });

        // Trigger re-deployment
        await triggerDeployment(version);
      },
    ],
  },
} as NagareConfig;
```

### Option 6: Emergency Rollback

Use this for critical situations where normal rollback might fail.

```bash
# Force rollback without confirmations
deno task nagare rollback --skip-confirmation --force

# Rollback with minimal checks (use carefully!)
deno run -A jsr:@rick/nagare/cli rollback 1.2.0 --emergency
```

## Verify rollback success

After rollback, verify the changes:

```bash
# Check current version
cat version.ts

# Verify git history
git log --oneline -5

# Check tags
git tag -l

# Verify GitHub (if applicable)
gh release list --limit 5
```

## Troubleshooting

**Problem**: "Cannot rollback: uncommitted changes" **Solution**: Commit or stash changes first: `git stash` or
`git commit -am "WIP"`

**Problem**: "Tag not found" **Solution**: Ensure the version was released with Nagare and tag exists: `git tag -l`

**Problem**: "GitHub release deletion failed" **Solution**: Check GitHub CLI auth: `gh auth status`, or manually delete
from GitHub

**Problem**: "Files cannot be reverted" **Solution**: Check if files were manually modified after release, may need
manual intervention

## Recovery from failed rollback

If a rollback fails midway:

1. Check current state:
   ```bash
   git status
   git log --oneline -3
   ```

2. Manually complete rollback:
   ```bash
   # Reset to previous commit if needed
   git reset --hard HEAD~1

   # Remove tags manually
   git tag -d v1.2.3
   git push origin :refs/tags/v1.2.3
   ```

3. Re-run Nagare to fix version files:
   ```bash
   deno task nagare patch --skip-confirmation
   ```

## Related tasks

- [Tutorial: Getting Started](./tutorial-getting-started.md)
- [How to Configure Nagare](./how-to-configure-nagare.md)
- [Concepts: Release Workflow](./concepts-release-workflow.md)
