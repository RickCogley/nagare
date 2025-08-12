# Shape Up: Enable Manual Workflow Execution

## Problem

GitHub workflows in Nagare can only be triggered by their configured events (push, pull_request, schedule). This limits
developers who want to:

- Run security scans on demand
- Test workflow changes without pushing code
- Perform ad-hoc dependency reviews
- Debug workflow issues

## Appetite

**30 minutes** - This is a simple configuration change to existing workflows.

## Solution

Add `workflow_dispatch` trigger to all GitHub workflows, enabling manual execution via:

- GitHub CLI: `gh workflow run "workflow-name"`
- GitHub UI: Actions tab → Select workflow → "Run workflow" button

## Implementation

### Files to Update

1. `.github/workflows/dependency-review.yml`
2. `.github/workflows/codeql.yml`
3. `.github/workflows/security.yml`
4. `.github/workflows/devskim.yml`

### Change Pattern

```yaml
on:
  # Existing triggers...
  workflow_dispatch: # Add this line
```

## Benefits

- **On-demand security scans** without waiting for pushes
- **Easier debugging** of workflow issues
- **More control** over when workflows run
- **No breaking changes** - existing triggers remain

## Success Criteria

- All workflows can be manually triggered
- Existing automatic triggers still work
- `gh workflow run` commands succeed
