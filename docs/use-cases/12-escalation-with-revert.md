# 12 · Escalate cards ignored after a nudge

**Feature:** Stale nudges + sub-issue gate · **Who it's for:** teams that want more than a gentle reminder.

## The problem

A nudge on a stale card gets ignored. You want a firmer, automatic consequence — and you never want a half-finished epic to sit in Done.

## The setup

Combine a stale nudge that pings a lead with a gate that actively reverts:

```yaml
fields:
  status: Status
doneStatuses: ["Done"]
features:
  staleNudge:
    enabled: true
    rules:
      - status: "In Review"
        days: 2
        notify: assignees
      - status: "Blocked"
        days: 1
        notify: ["eng-lead"]        # escalate blocked items straight to a lead
        message: "🚨 Blocked for {days} day(s). @eng-lead please unblock or reassign."
  subIssueGate:
    enabled: true
    guardStatuses: ["Done"]
    action: revert                   # don't just warn — move it back
    revertStatus: "In Progress"
```

## What happens

- A **Blocked** card older than a day pings the engineering lead directly (not just the assignee).
- Any epic dragged to **Done** with open sub-issues is **moved back** to "In Progress" with an explanatory comment — no manual policing.

## Tips

- This is a lightweight escalation pattern today. A first-class, multi-step **escalation ladder** (nudge → label → escalate → reassign) is on the [roadmap](../../ROADMAP.md).
- Use different `notify` lists per status to route the right people at the right severity.
