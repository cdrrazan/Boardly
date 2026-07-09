# 04 · Show live epic progress on the board

**Feature:** Sub-issue roll-up · **Who it's for:** anyone tracking epics as parent issues.

## The problem

You can see an epic has sub-issues, but not at a glance how *done* it is. You want a "63%" column that updates itself.

## The setup

Add a **Number** field to your project (e.g. `Progress`) and point the config at it:

```yaml
fields:
  status: Status
  progress: Progress      # a Number field on the project
features:
  subIssueGate:
    enabled: true
    guardStatuses: ["Done"]
    action: comment
```

## What happens

Independently of gating, for **every** parent issue that has sub-issues, the action writes its completion percentage (`percentCompleted` from GitHub's sub-issue summary) into the `Progress` field. Group or sort your board by that field to get an instant epic-health view.

## Tips

- Roll-up runs for all parents with children, not just guarded ones — so in-flight epics show progress too.
- No `progress` field configured? Roll-up is simply skipped; gating still works.
- The percentage is GitHub's own count of completed vs total sub-issues, so it matches what you see in the issue UI.
