# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Continuous integration (typecheck + tests + build + `dist/` sync check) on every push and PR.
- Issue forms (bug report, feature request) and a pull-request template.
- This changelog.

### Changed
- Extracted GraphQL→domain normalization into `src/github/normalize.ts` (no behavior change).
- Expanded the test suite from 14 to 40 tests.

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

[Unreleased]: https://github.com/cdrrazan/Boardly/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/cdrrazan/Boardly/releases/tag/v0.1.0
