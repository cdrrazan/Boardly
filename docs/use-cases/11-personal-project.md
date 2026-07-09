# 11 · Solo maintainer / personal project board

**Feature:** All · **Who it's for:** individual maintainers using a **user-owned** project.

## The problem

You run an open-source project solo with a personal Projects (v2) board. You still want rollover, stale reminders, and a weekly digest — without team overhead.

## The setup

Set the owner type to `user`:

```yaml
project:
  owner: cdrrazan
  type: user          # user-owned, not org
  number: 3
fields:
  status: Status
  iteration: Cycle
doneStatuses: ["Done"]
features:
  staleNudge:
    enabled: true
    rules:
      - status: "Doing"
        days: 7
        notify: ["cdrrazan"]     # nudge yourself
  digest:
    enabled: true
    postTo:
      createIssueTitle: "Weekly digest"
```

## What happens

Everything works exactly as for org projects — the only difference is `type: user`, which tells the action to query the user-owned project.

## Tips

- You still need a **fine-grained PAT** with Projects + Issues scope; the default `GITHUB_TOKEN` can't read user projects either.
- Nudging yourself (`notify: ["your-login"]`) is a surprisingly effective way to keep a solo board honest.
- Longer thresholds (`days: 7`) fit a solo cadence better than the tight team defaults.
