# gh-project-autom8er

A config-driven GitHub Action that automates **GitHub Projects (v2)** boards. Point it at a project, declare a few rules in YAML, and it keeps your board tidy on a schedule.

Every run writes an **audit trail** to the Actions job summary, so you always know exactly what the bot did (or, in `dry-run`, what it *would* do).

## Features

| # | Feature | What it does |
|---|---------|--------------|
| 1 | **Sprint rollover** | When an iteration ends, move unfinished items into the next iteration. |
| 2 | **Stale-card nudges** | @-mention owners when a card sits in a status past a threshold. De-duped so it won't spam. |
| 7 | **Sub-issue gating + roll-up** | Block a card from staying "Done" while it has open sub-issues; optionally write completion % into a progress field. |
| 8 | **Sprint digest** | At iteration end, post completed-vs-carried-over and velocity. |
| 9 | **Daily standup** | Post what moved in the last N hours, grouped by assignee. |
| 12 | **Priority auto-sort** | Reorder the board so higher-priority cards float to the top. |

## Quick start

1. **Create a token.** The default `GITHUB_TOKEN` generally can't read org Projects. Create a fine-grained PAT or GitHub App token with **Projects: read & write** and **Issues: read & write**, and save it as a repo/org secret (e.g. `PROJECT_AUTOMATION_TOKEN`).

2. **Add config** at `.github/project-automation.yml`. Start from [`project-automation.example.yml`](./project-automation.example.yml).

3. **Add a workflow** — see [`.github/workflows/example.yml`](./.github/workflows/example.yml):

   ```yaml
   - uses: cdrrazan/gh-project-autom8er@v0
     with:
       token: ${{ secrets.PROJECT_AUTOMATION_TOKEN }}
       config-path: .github/project-automation.yml
   ```

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `token` | — (required) | Token with `project` + `issues` access to the target project. |
| `config-path` | `.github/project-automation.yml` | Path to the config file. |
| `only` | `""` | Run just one feature: `rollover`, `stale-nudge`, `sub-issue-gate`, `digest`, `standup`, `priority-sort`. Empty runs every enabled feature. |
| `dry-run` | `false` | Log every intended action to the audit trail without making changes. |

**Output:** `actions-count` — number of mutating actions taken (or that would be taken in dry-run).

## How it decides things

- **"Time in status"** is approximated by when the Status field value was last changed (the Projects v2 API exposes each field value's `updatedAt`). It is not a full status-history walk.
- **Iterations** come from the iteration field's configuration. Rollover and digest act on the most recently *completed* iteration; new work rolls into the first *active* iteration.
- **Sub-issues** use the native GitHub sub-issues API (`subIssuesSummary`), requested with the `sub_issues` GraphQL feature header.
- **Priority sort** uses `updateProjectV2ItemPosition`. Manual order only shows on a board view whose sort is set to **manual** — a field-sorted view overrides it.

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run build       # bundle src -> dist/index.js (committed, required for JS actions)
npm run all         # typecheck + test + build
```

The bundled `dist/index.js` is committed so the action runs without a build step. Rebuild and commit it whenever you change `src/`.

## License

[MIT](./LICENSE)
