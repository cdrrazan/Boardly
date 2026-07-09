# 01 · Carry unfinished work into the next sprint

**Feature:** Sprint rollover · **Who it's for:** any team running fixed-length iterations.

## The problem

Your sprint ends Friday. A handful of tickets aren't finished. On Monday they're still tagged to last week's (now closed) iteration, invisible on the current board, and someone has to hand-move each one.

## The setup

```yaml
fields:
  status: Status
  iteration: Sprint
doneStatuses: ["Done", "Released"]
features:
  rollover:
    enabled: true
    onlyStatuses: []   # empty = every non-done item rolls over
```

Run it right after the iteration boundary:

```yaml
on:
  schedule:
    - cron: "0 6 * * 1"   # Monday 06:00 UTC, just after the sprint flips
```

## What happens

When the action runs, it finds the **most recently completed** iteration and the **current active** one. Every item still assigned to the completed iteration that isn't in a `doneStatuses` column is moved to the current iteration. Done items are left behind (they belong to the finished sprint's record).

## Tips

- Only want to roll certain columns? Set `onlyStatuses: ["In Progress", "Todo"]` — a card in "Blocked" then stays put for you to review.
- Pair with the [sprint digest](./05-sprint-digest.md) so the same run that carries work over also reports what got carried.
- Test with `dry-run: "true"` first — see [use case 08](./08-dry-run-preview.md).
