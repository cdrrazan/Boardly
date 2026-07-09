# 08 · Preview everything safely with dry-run

**Feature:** All features + audit trail · **Who it's for:** anyone adopting the tool on a real board for the first time.

## The problem

You're about to let a bot move cards and comment on issues on your live project. You want to see *exactly* what it would do before it does anything.

## The setup

Add `dry-run: "true"` to the step:

```yaml
- uses: cdrrazan/Boardly@v1
  with:
    token: ${{ secrets.PROJECT_AUTOMATION_TOKEN }}
    config-path: .github/project-automation.yml
    dry-run: "true"
```

Then trigger it manually with **Run workflow** (or wait for the schedule).

## What happens

Every feature runs its full logic — reading the board, computing what to change — but **makes no mutations**. Instead each intended action is written to the **audit trail** in the Actions **job summary**:

| Feature | Action | Target | Detail | Applied |
|---------|--------|--------|--------|---------|
| rollover | move-iteration | #12 Fix flaky test | Sprint 4 → Sprint 5 | dry-run |
| stale-nudge | comment | #30 Billing bug | in "In Progress" for 5d, pinged @alice | dry-run |
| priority-sort | reorder | Team Board | reordered 18 items by priority | dry-run |

Review it, adjust your config, and once it looks right, remove `dry-run` (or set it to `false`).

## Tips

- The audit trail is written on **every** run, not just dry-run — so you always have a record of what changed.
- Combine with `only:` to preview a single feature in isolation — see [use case 10](./10-per-feature-schedules.md).
