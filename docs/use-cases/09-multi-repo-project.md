# 09 · Automate a project spanning many repos

**Feature:** All · **Who it's for:** orgs where one Project (v2) tracks issues from several repositories.

## The problem

Your team's board pulls issues from `api`, `web`, and `infra`. You want one automation config, not three.

## The setup

Projects (v2) are owned by the **org or user**, not a repo — so the config targets the project directly:

```yaml
project:
  owner: my-org
  type: org
  number: 7          # the org-level project number
```

Host the workflow in any one repo (e.g. a central `.github` or `ops` repo). Comments and moves land on whichever repo each card's issue lives in — the action reads each item's owning repository from the API.

## What happens

- **Nudges / gate comments** post to the correct source repo automatically.
- **Digests / standups** are posted in the repo where the *workflow* runs (`postTo.issue` / `createIssueTitle` refer to that repo).
- All other logic operates on the single org-level board.

## Tips

- Use a **GitHub App token** or an org-scoped fine-grained PAT so it can write to every source repo, not just the workflow's repo.
- The default `GITHUB_TOKEN` won't work here — it's scoped to the single workflow repo and can't read the org project.
