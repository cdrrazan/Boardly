# Getting started

A linear, first-run walkthrough — from zero to a working automation on your repo. Takes ~15 minutes.

Boardly is a **GitHub Action** that automates a **GitHub Project (v2)** board. It runs in GitHub Actions and acts on your project's issues and fields over the GitHub API. It does **not** touch your source code, so the repo's language or framework (Rails, Node, Go, …) makes no difference — the steps below are identical for every repo.

> **The one prerequisite:** the repo (or its org/user) must already have a **Project (v2)** board. Boardly reads an existing project by number; it does not create one.

---

## Step 0 · Confirm you have a Project (v2)

1. Go to your org or profile → **Projects** tab → open (or create) the board that tracks this repo's issues.
2. Note the **project number** from the URL:
   - Org project: `https://github.com/orgs/<org>/projects/7` → number is `7`, type is `org`.
   - User project: `https://github.com/users/<you>/projects/3` → number is `3`, type is `user`.
3. Make sure the board has the fields you want to automate. Defaults Boardly looks for:
   - **Status** (single-select) — required; drives the board columns.
   - **Priority** (single-select) — only if you use priority sort.
   - **Sprint / Iteration** (iteration field) — only if you use rollover or digests.

   You name these yourself; the config maps your names in Step 3. If a referenced field is missing, Boardly fails with a clear error listing the fields it *did* find.

---

## Step 1 · Create a token

The default `GITHUB_TOKEN` in Actions generally **cannot read org-level Projects (v2)**, so create a dedicated token:

- **Fine-grained PAT** (simplest) — [github.com/settings/tokens](https://github.com/settings/tokens?type=beta):
  - Resource owner: the org/user that owns the project.
  - Permissions: **Projects → Read and write**, **Issues → Read and write**.
- **or a GitHub App token** (best for orgs/teams — not tied to a person). Install the app on the repos, grant the same two permissions, mint a token in the workflow.

Save the token as an **Actions secret** named `PROJECT_AUTOMATION_TOKEN`:
- Single repo: **Repo → Settings → Secrets and variables → Actions → New repository secret**.
- Whole org: **Org → Settings → Secrets and variables → Actions**, then share it to the repos that need it.

---

## Step 2 · Add the config file

Create `.github/project-automation.yml` in the repo. Minimal starting point — enable only what your board supports:

```yaml
project:
  owner: recognize      # org or user login that owns the project
  type: org             # "org" or "user"
  number: 7             # the project number from Step 0

fields:
  status: Status        # match your board's field names
  priority: Priority
  iteration: Sprint

doneStatuses: ["Done"]  # status option(s) that count as complete

features:
  staleNudge:
    enabled: true
    rules:
      - status: "In Progress"
        days: 3
        notify: assignees
  # turn others on once the board has the fields they need:
  # rollover:      { enabled: true }
  # prioritySort:  { enabled: true, order: ["Urgent", "High", "Medium", "Low"] }
```

Full reference: [`project-automation.example.yml`](../project-automation.example.yml) and the [Configuration section](../README.md#%EF%B8%8F-configuration).

---

## Step 3 · Add the workflow

Create `.github/workflows/project-automation.yml`. **Start with `dry-run: true`** so the first runs only *report* what they would do — no changes to the board:

```yaml
name: Project automation

on:
  workflow_dispatch:        # lets you run it manually from the Actions tab
  schedule:
    - cron: "0 * * * *"     # hourly; adjust to taste

permissions:
  contents: read
  issues: write

jobs:
  automate:
    runs-on: ubuntu-latest
    steps:
      - uses: cdrrazan/Boardly@v1
        with:
          token: ${{ secrets.PROJECT_AUTOMATION_TOKEN }}
          config-path: .github/project-automation.yml
          dry-run: "true"   # remove once the preview looks right
```

> **No Marketplace needed.** `uses: cdrrazan/Boardly@v1` works because Boardly is a public repo with a committed action — GitHub fetches it at the `v1` tag and runs it. If your org restricts Actions, an admin must allow `cdrrazan/Boardly@*` under **Org → Settings → Actions → General**.

---

## Step 4 · Dry-run and verify

1. Commit both files to the default branch.
2. **Actions** tab → **Project automation** → **Run workflow**.
3. Open the run → read the **job summary**: it lists every action Boardly *would* take. Confirm the project loaded (title + item count appear in the log) and the intended changes look right.
4. Common first-run issues:
   - *"field not found"* → a name in `fields:` doesn't match the board; fix it (the error lists the real field names).
   - *"could not resolve project"* → wrong `owner`/`type`/`number`, or the token lacks project access.

---

## Step 5 · Go live

Flip `dry-run` off:

```yaml
          dry-run: "false"   # or delete the line — false is the default
```

Commit. From now on the scheduled runs apply changes and record every one in the job summary. Enable more features in the config as your board grows.

---

## Optional · Slack / email

Digests, standups and stale alerts post to GitHub by default. To *also* send them to Slack or email, add a `notifications` block and pass the secrets via the workflow `env:` — see [Notifications](../README.md#-notifications-slack--email). To keep the config but stop sending, set that channel's `enabled: false`.

## Where to go next

- [Use-case recipes](./use-cases/) — copy-paste configs for each feature.
- [Multi-repo project](./use-cases/09-multi-repo-project.md) — one board spanning several repos.
- [Per-feature schedules](./use-cases/10-per-feature-schedules.md) — run standups daily, nudges hourly, etc.
- [Architecture](./ARCHITECTURE.md) — how it works under the hood.
