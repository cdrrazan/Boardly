# Contributing to Boardly

First off — thank you! 🎉 This project is open source and community-driven, and contributions of every size are welcome: bug reports, docs fixes, new use-cases, and features.

By participating you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

## Ways to contribute

- 🐛 **Report a bug** — open an issue with steps to reproduce, your config (redact tokens!), and what you expected.
- 💡 **Suggest a feature** — check the [roadmap](./ROADMAP.md) first, then open an issue describing the workflow you're trying to automate.
- 📝 **Improve docs** — READMEs, [use-cases](./docs/use-cases), and inline comments all count.
- 🔧 **Send a PR** — see below.

## Development setup

```bash
git clone https://github.com/cdrrazan/Boardly.git
cd Boardly
npm install
```

Requires **Node.js ≥ 20**.

### Everyday commands

| Command | What it does |
|---------|--------------|
| `npm run typecheck` | Type-check with `tsc --noEmit` |
| `npm test` | Run the unit suite (`node:test` + `tsx`) |
| `npm run build` | Bundle `src/` → `dist/index.js` with `ncc` |
| `npm run all` | typecheck + test + build (run this before every PR) |

## Project layout

```
src/
  index.ts            # entrypoint: loads config, dispatches features
  config.ts           # zod-validated YAML config schema + loader
  types.ts            # normalized ProjectGraph / ProjectItem model
  github/             # GraphQL documents + Octokit client wrapper
  features/           # one file per feature (rollover, staleNudge, …)
  util/               # audit trail, date math, field accessors
test/                 # node:test specs + fake client helpers
dist/                 # bundled action (committed — see below)
```

## Pull request checklist

1. **Branch** from `main` (or the current default branch).
2. **Add or update tests** in `test/` for any behavior change — the fake client in `test/helpers.ts` makes this easy without hitting the real API.
3. **Run `npm run all`** — it must pass (typecheck, tests, build).
4. **Commit the rebuilt `dist/`.** Because this is a JavaScript action, `dist/index.js` is committed and must stay in sync with `src/`. PRs that change `src/` without rebuilding `dist/` will fail review.
5. **Keep commits focused** and write clear messages (we loosely follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
6. **Update docs** — if you add a feature, add a [use-case](./docs/use-cases) and update the README feature table.

## CI & required checks

Every pull request runs the **PR checks** workflow ([`.github/workflows/pr-checks.yml`](./.github/workflows/pr-checks.yml)), which must be green before merge:

- **Typecheck · Test · Build** — `npm run typecheck`, `npm test`, `npm run build`, and a check that committed `dist/` matches `src/`.
- **No merge conflicts** — the PR is test-merged against the base branch.
- **PR ready to merge** — an aggregate gate that passes only when both of the above pass.

A separate, fast **PR lint** workflow ([`pr-lint.yml`](./.github/workflows/pr-lint.yml)) also checks:

- **PR title** must follow [Conventional Commits](https://www.conventionalcommits.org/) — e.g. `feat: add X`, `fix(config): handle Y` (blocking).
- **Labels** — advisory reminder to add at least one label for triage (not blocking, since external contributors can't self-label).

> **Maintainers:** in the branch-protection rule for `main` (Settings → Branches), mark **`PR ready to merge`** as a required status check (it enforces tests, build, `dist/` sync, and conflict-free merges), and optionally **`Lint PR title & labels`** to enforce the title convention. Pushes to `main` are separately validated by the [`CI`](./.github/workflows/ci.yml) workflow.

## Adding a new feature

1. Create `src/features/yourFeature.ts` exporting `async function runYourFeature(ctx: RunContext)`.
2. Add its config shape to `configSchema` in `src/config.ts`.
3. Register it in the `RUNNERS` map and `isEnabled()` in `src/index.ts`.
4. Record every action via `ctx.audit.record(...)` and honor `ctx.dryRun` (never mutate when it's true).
5. Add tests and a use-case page.

## Reporting security issues

Please **do not** open a public issue for vulnerabilities — follow [SECURITY.md](./SECURITY.md) instead.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
