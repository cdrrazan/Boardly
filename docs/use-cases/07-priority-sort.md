# 07 · Keep the backlog sorted by priority

**Feature:** Priority auto-sort · **Who it's for:** teams whose board order drifts from their stated priorities.

## The problem

You maintain a `Priority` field, but the card order in each column doesn't reflect it, so the top of the board isn't actually the most important work.

## The setup

```yaml
fields:
  priority: Priority
features:
  prioritySort:
    enabled: true
    order: ["Urgent", "High", "Medium", "Low"]
```

```yaml
on:
  schedule:
    - cron: "0 * * * *"   # hourly is fine; it no-ops when already sorted
```

## What happens

The action reorders items so they follow your `order` list top-to-bottom, using the `updateProjectV2ItemPosition` API. Items with no priority (or one not in the list) sink to the bottom; ties keep their existing relative order (stable sort). If the board is already correct, it makes **zero** API calls.

## ⚠️ Important

Manual card order only **shows** on a board view whose **Sort** is set to **Manual**. If the view is sorted by a field, GitHub overrides the manual position and you won't see the effect. Set your target view to manual sort.

## Tips

- Safe to run frequently — the no-op-when-sorted behavior keeps it cheap.
- Preview with `dry-run: "true"` to confirm the ordering before it touches the board.
