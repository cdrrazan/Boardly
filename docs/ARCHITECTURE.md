# Architecture

A tour of how Boardly is put together, for contributors.

## High-level flow

```mermaid
flowchart TD
    idx[index.ts] -->|load + validate| cfg[config.ts<br/>zod schema]
    idx -->|new| client[github/client.ts<br/>ProjectClient]
    client -->|fetchProject · paged GraphQL| graph[(ProjectGraph<br/>types.ts)]
    idx -->|build RunContext| ctx{{RunContext}}
    ctx --> feats
    subgraph feats [features/*]
      f1[rollover]
      f2[staleNudge]
      f3[subIssueGate]
      f4[digest]
      f5[standup]
      f6[prioritySort]
    end
    feats -->|record| audit[util/audit.ts]
    feats -->|mutations| client
    audit -->|flush| summary[[Actions job summary]]
```

## Responsibilities

| Module | Responsibility |
|--------|----------------|
| `index.ts` | Entry point. Reads Action inputs, loads config, fetches the project once, builds `RunContext`, dispatches enabled features, flushes the audit trail. One failing feature is logged and marked failed but doesn't abort the others. |
| `config.ts` | The single source of truth for the config shape — a `zod` schema with defaults, plus `loadConfig()` which turns a YAML file into a validated `Config` (or a friendly error). |
| `types.ts` | The normalized `ProjectGraph` / `ProjectItem` / `ProjectField` model. Everything downstream works against this, never raw GraphQL JSON. |
| `github/queries.ts` | GraphQL documents (project read query + the field/position mutations). |
| `github/client.ts` | `ProjectClient` — pages the project into a `ProjectGraph`, normalizes raw nodes, and exposes typed mutation + comment helpers. Sends the `sub_issues` feature header. |
| `features/*` | One file per feature, each exporting `run<Feature>(ctx: RunContext)`. Pure logic over the fetched graph; side effects go through `ctx.client`. |
| `util/project.ts` | Accessors that map configured **field names** to values on an item (`statusOf`, `iterationOf`, `priorityOf`, `isDone`, `optionId`, …). |
| `util/dates.ts` | Small, dependency-free date math (`daysBetween`, `iterationHasEnded`, …). |
| `util/audit.ts` | `Audit` — accumulates every action and renders the job-summary table; also the seam where `dry-run` is reflected. |

## Key design choices

- **Fetch once, act many.** The project is read a single time into an in-memory graph; every feature operates on that snapshot. This keeps API usage low and makes features trivially unit-testable.
- **Fields are referenced by name.** Users name their own Status/Priority/Iteration fields, so config maps names → the action resolves them to ids at runtime via `util/project.ts`. Missing fields produce a helpful error listing what *is* available.
- **`dry-run` is centralized.** Features check `ctx.dryRun` right before each mutation and always call `ctx.audit.record(...)` first, so the audit trail is identical whether or not changes are applied.
- **De-duplication via hidden markers.** Nudges and gate warnings embed an HTML comment marker; before commenting, the feature scans existing comments and skips if it already acted during the current status "stint" (comment newer than the status's `updatedAt`).
- **"Time in status"** is approximated by each field value's `updatedAt` (exposed by the Projects v2 API) rather than a full timeline walk — cheaper, and accurate enough for nudges/standups.

## Testing

`test/helpers.ts` builds `ProjectGraph`s by hand and provides a `FakeClient` that records every mutation. Feature tests call the real `run*` functions against fabricated boards and assert on the recorded calls — no network, full logic coverage. See [`test/features.test.ts`](../test/features.test.ts).

## Adding a feature

See the step-by-step in [CONTRIBUTING.md](../CONTRIBUTING.md#adding-a-new-feature). In short: add a `features/<name>.ts`, extend the `zod` schema, register it in `index.ts`'s `RUNNERS`/`isEnabled`, record actions through the audit trail, honor `dryRun`, and add tests + a use-case page.
