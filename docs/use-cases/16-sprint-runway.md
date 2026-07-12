# 16 · Get warned before you run out of sprints

**Feature:** Sprint runway · **Who it's for:** any team on iterations — because GitHub never creates the next one for you.

## The problem

GitHub's iteration field is a **fixed, manually-managed list**. As time passes GitHub only advances which iteration is "Current" and retires finished ones to Completed — it **never appends a new future iteration**. If nobody adds the next sprint, the day the current one ends the field has *zero* active iterations, and `rollover` / `sprintStart` quietly no-op with nowhere to go. You usually notice a week late.

## The setup

```yaml
fields:
  iteration: Sprint
features:
  sprintRunway:
    enabled: true
    minFuture: 1     # warn when fewer than this many future sprints are planned
```

Run it on your normal schedule — daily is plenty:

```yaml
on:
  schedule:
    - cron: "0 8 * * 1-5"   # weekday mornings
```

## What happens

Each run, Boardly counts the iterations whose **start date is still in the future** (the ones planned *beyond* the current sprint). If that count is below `minFuture`, it records a **warning** — visible both in the run's **job summary** and as a **GitHub Actions annotation** on the run:

> ⚠️ `sprintRunway: Sprint runway low: no future iterations are planned (want at least 1). Add the next sprint in the "Sprint" field settings — GitHub does not create iterations automatically.`

It **only warns** — Boardly is read-only on iterations and *cannot* create them (GitHub exposes no API to add iterations; it's a UI-only action). Think of it as a smoke alarm, not a fire brigade.

- `minFuture: 1` → warns once you're down to just the current sprint (nothing queued).
- `minFuture: 2` → warns earlier, while one future sprint still remains — more buffer.

## Fixing a warning

Open the project → the **Sprint** field → **⚙ / Edit** → **Add iteration**. GitHub appends the next block at your set duration. Add one or two so you have runway again.

## Tips

- Pair it with [rollover](./01-sprint-rollover.md) and [sprint start](./14-sprint-start.md) — those act *on* iterations, this makes sure there's always a next one for them to act on.
- Bump `minFuture` if your planning horizon is longer than one sprint.
- Nothing to dry-run here — it never changes anything.
