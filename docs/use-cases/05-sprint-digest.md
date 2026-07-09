# 05 · Auto-post a sprint retro digest

**Feature:** Sprint digest · **Who it's for:** teams that want a sprint summary without assembling it by hand.

## The problem

At retro someone screenshots the board and eyeballs "what did we finish vs carry over." It's manual and inconsistent.

## The setup

```yaml
fields:
  status: Status
  iteration: Sprint
  estimate: Estimate      # optional Number field → enables velocity
doneStatuses: ["Done", "Released"]
features:
  digest:
    enabled: true
    postTo:
      issue: 42           # comment on a standing "Sprint reports" issue
      # or: createIssueTitle: "Sprint digest"   # open a fresh issue each time
      # labels: ["report"]
```

```yaml
on:
  schedule:
    - cron: "30 6 * * 1"   # Monday, just after the sprint closes
```

## What happens

The action summarizes the most recently completed iteration and posts:

- **Completed:** N / M items
- **Carried over:** K items (with a linked list)
- **Velocity:** sum of `Estimate` on completed items, out of the committed total (only if an estimate field is configured)

You get a clean, linkable retro artifact automatically.

## Tips

- No estimate field? You still get completed/carried counts — velocity is just omitted.
- Post to a fixed issue for a running log, or `createIssueTitle` for one issue per sprint.
- Runs on the same completed-iteration logic as [rollover](./01-sprint-rollover.md), so scheduling them together is natural.
