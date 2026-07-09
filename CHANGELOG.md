# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Slack & email notifications** — optionally deliver digests, standups, and stale alerts to a Slack Incoming Webhook and/or over SMTP email, in addition to GitHub comments. Configured under a new `notifications` block; secrets are referenced by environment-variable name. See the [notifications recipe](./docs/use-cases/13-notifications.md).
- **PR checks workflow** — gates every pull request on tests, build, `dist/` sync, and no merge conflicts, via a single aggregate "PR ready to merge" status check.

## [0.1.0] — 2026-07-09

Initial release: a config-driven GitHub Action for Projects (v2).

### Added
- **Sprint rollover** — carry unfinished items into the next iteration.
- **Stale-card nudges** — @-mention owners when a card sits in a status too long (de-duped).
- **Sub-issue gating + roll-up** — block "Done" while sub-issues remain open; write completion % into a progress field.
- **Sprint digest** — completed vs carried-over counts and velocity at iteration end.
- **Daily standup** — what moved in the last _N_ hours, grouped by assignee.
- **Priority auto-sort** — reorder the board by a configured priority order.
- **Audit trail** — every action written to the Actions job summary, plus a `dry-run` mode.
- YAML configuration with schema validation, an example config, and a consumer workflow.
- Documentation: README, 12 use-case recipes, architecture, contributing, security, code of conduct, and roadmap.

### Tooling
- Continuous integration (typecheck + tests + build + `dist/` sync check) on every push and PR.
- Issue forms (bug report, feature request) and a pull-request template.
- Test suite of 40 unit tests covering feature logic, normalization, config, and util helpers.

[Unreleased]: https://github.com/cdrrazan/Boardly/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/cdrrazan/Boardly/releases/tag/v0.1.0
