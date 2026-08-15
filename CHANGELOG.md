# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Sprint start** — when an iteration becomes active, promote cards pre-parked in it (e.g. `Backlog → Ready`). Only cards parked *before* the sprint started are touched, so a deliberate mid-sprint move back is respected.
- **Auto-assign by label** — a CODEOWNERS-style `label → owner` map assigns unassigned tickets in a given status. Opt-in, case-insensitive matching, and it never overrides an existing assignee.
- **Sprint runway warning** — GitHub never auto-creates iterations, so Boardly warns (job summary + workflow annotation) when too few future sprints are planned, before rollover and sprint-start run dry.
- **Sprint label hygiene on rollover** — `addSprintLabel` tags each rolled card with the new sprint's label (creating it once per repo if missing), and `removeLabels` strips stale markers like `pulled-in` as the card carries over.
- **`reviewers` notify token for stale nudges** — resolves to the *pending* review requests on the card's PR (or the PR that closes the issue), falling back to the assignees when no review is outstanding. Works bare or mixed into a `notify:` list alongside literal logins.
- New `only:` values for the added features: `sprint-start`, `sprint-runway`, `auto-assign`.

### Documentation
- Three new use-case recipes — [14 · Sprint start](./docs/use-cases/14-sprint-start.md), [15 · Auto-assign](./docs/use-cases/15-auto-assign.md), [16 · Sprint runway](./docs/use-cases/16-sprint-runway.md) — bringing the cookbook to 16.
- A worked end-to-end sample under [`examples/`](./examples) — a full config plus the workflow that runs it, with Slack and email enabled.
- Marketing site refreshed: eleven automations, the reviewer-aware nudge story, and an animated config walkthrough.

### Tooling
- Test suite grown to 62 unit tests, covering the new features plus their dry-run paths.

## [1.0.0] — 2026-07-09

First stable release: a config-driven GitHub Action for GitHub Projects (v2).

### Features
- **Sprint rollover** — carry unfinished items into the next iteration.
- **Stale-card nudges** — @-mention owners when a card sits in a status too long (de-duped).
- **Sub-issue gating + roll-up** — block "Done" while sub-issues remain open; write completion % into a progress field.
- **Sprint digest** — completed vs carried-over counts and velocity at iteration end.
- **Daily standup** — what moved in the last _N_ hours, grouped by assignee.
- **Priority auto-sort** — reorder the board by a configured priority order.
- **Slack & email notifications** — also deliver digests, standups, and stale alerts to a Slack Incoming Webhook and/or over SMTP email. Secrets are referenced by environment-variable name.
- **Audit trail** — every action written to the Actions job summary, plus a `dry-run` mode.
- YAML configuration with schema validation, an example config, and a consumer workflow.

### Documentation
- README, 13 use-case recipes, architecture, contributing, security, code of conduct, and roadmap.

### Tooling
- **CI** — typecheck + tests + build + `dist/` sync check on pushes to `main`.
- **PR checks** — gates pull requests on tests, build, `dist/` sync, and no merge conflicts, via an aggregate "PR ready to merge" status check.
- **PR lint** — enforces Conventional Commit PR titles (blocking) and nudges for a triage label (advisory).
- **Major-tag automation** — moves the `v1` alias to the latest release on publish.
- Test suite of 48 unit tests covering feature logic, normalization, notifications, config, and util helpers.

[Unreleased]: https://github.com/cdrrazan/Boardly/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/cdrrazan/Boardly/releases/tag/v1.0.0
