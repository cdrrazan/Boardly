# 03 · Stop premature "Done" on parent issues

**Feature:** Sub-issue gating · **Who it's for:** teams that break epics into sub-issues.

## The problem

Someone drags an epic card to **Done** while three of its five sub-issues are still open. The board now lies about what's shipped.

## The setup

```yaml
fields:
  status: Status
doneStatuses: ["Done"]
features:
  subIssueGate:
    enabled: true
    guardStatuses: ["Done", "Released"]
    action: comment          # warn only
```

Or enforce it automatically:

```yaml
features:
  subIssueGate:
    enabled: true
    guardStatuses: ["Done"]
    action: revert           # move it back
    revertStatus: "In Progress"
```

## What happens

For every parent item sitting in a guarded status, the action checks GitHub's native sub-issue summary. If not all children are closed:

- **`action: comment`** → posts a warning ("only 2/5 sub-issues complete…") and leaves the card. De-duped until the status changes.
- **`action: revert`** → moves the card back to `revertStatus` and comments explaining why.

## Tips

- Only affects **Issues** — pull requests don't have sub-issues.
- Combine with a roll-up field so the board also shows *how far along* each epic is — see [use case 04](./04-progress-rollup.md).
- Requires GitHub's sub-issues feature (generally available); the action requests it via the `sub_issues` GraphQL header automatically.
