# 06 · Async daily standup for a distributed team

**Feature:** Daily standup · **Who it's for:** remote/async teams spread across time zones.

## The problem

A live standup doesn't work across five time zones, and "what did you do yesterday" is exactly the info already sitting on the board.

## The setup

```yaml
fields:
  status: Status
features:
  standup:
    enabled: true
    sinceHours: 24
    postTo:
      createIssueTitle: "Daily standup"
      labels: ["standup"]
```

```yaml
on:
  schedule:
    - cron: "0 7 * * 1-5"   # weekday mornings, before people log on
```

## What happens

The action collects every item whose status changed in the last `sinceHours`, groups them by assignee, and posts a summary:

```
## 🗓️ Standup — last 24h
### @alice
- #123 Fix login race — In Review
### @bob
- #130 Billing webhook — In Progress
```

People skim it on their own schedule; no meeting required.

## Tips

- Set `sinceHours: 72` on a Monday-only schedule to cover the weekend.
- Post to a fixed `issue` for one long thread, or `createIssueTitle` for a fresh issue per day (pair with a label so they're easy to filter).
- "Moved" is based on the Status field's last change; unassigned items appear under an _Unassigned_ heading.
