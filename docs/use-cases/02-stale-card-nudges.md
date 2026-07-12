# 02 · Nudge owners about stale cards

**Feature:** Stale-card nudges · **Who it's for:** teams where cards silently rot in a column.

## The problem

A ticket has been "In Review" for a week. Nobody notices because nothing prompts them. Work-in-progress piles up and cycle time creeps.

## The setup

```yaml
fields:
  status: Status
features:
  staleNudge:
    enabled: true
    rules:
      - status: "In Progress"
        days: 3
        notify: assignees
        message: "Heads up — this has been **In Progress** for {days} days. Any blockers?"
      - status: "In Review"
        days: 2
        notify: reviewers                 # the PR's pending review requests
```

## Who gets @-mentioned

`notify` takes a bare token, or a list mixing tokens with explicit logins:

| Value | Resolves to |
|-------|-------------|
| `assignees` | the card's own assignees |
| `reviewers` | **pending** review requests on the card's PR — or, for an issue card, on the PR that closes it. Falls back to the assignees when nobody's review is still pending. |
| `["team-lead", "qa-bot"]` | those exact logins |
| `["reviewers", "eng-manager"]` | pending reviewers **plus** a fixed escalation contact |

`reviewers` reflects *outstanding* requests only — once a reviewer submits their review GitHub drops the request, so an "In Review" nudge naturally targets whoever the card is still waiting on. Teams (`@org/team`) are mentioned as-is.

Run it on a cadence:

```yaml
on:
  schedule:
    - cron: "0 9 * * 1-5"   # weekday mornings
```

## What happens

For each rule, any card whose status hasn't changed in more than `days` gets a comment that @-mentions whoever `notify` resolves to (see the table above). The message supports `{days}`, `{status}`, `{number}`, and `{title}` placeholders.

**No spam:** each nudge embeds a hidden marker. The card won't be nudged again until its status actually changes, so daily runs won't re-ping the same stale card.

## Tips

- "Time in status" is based on when the Status field last changed, not comment activity — a card people are chatting on but not *moving* still counts as stale (usually what you want).
- Want a harder escalation after the nudge is ignored? See [use case 12](./12-escalation-with-revert.md).
