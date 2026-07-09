# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing yet._

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
