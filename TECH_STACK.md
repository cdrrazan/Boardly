# Tech Stack

Boardly is two deliverables in one repository: the **GitHub Action** (the product) and the **marketing site** (`web/`). Everything is intentionally dependency-light.

## 🤖 The Action

| Layer | Choice | Notes |
|-------|--------|-------|
| Language | **TypeScript** (strict, ES modules) | `tsconfig.json` with `strict`, `noUnusedLocals`, etc. |
| Runtime | **Node.js ≥ 20** | Ships as a `node20` GitHub Action (`action.yml`) |
| GitHub API | **`@octokit/graphql`** + **`@actions/github`** | Projects v2 via GraphQL; issues/comments via REST |
| Action toolkit | **`@actions/core`** | Inputs, outputs, and the job-summary audit trail |
| Config | **YAML** (`js-yaml`) validated with **Zod** | One `.github/project-automation.yml` file |
| Email | **`nodemailer`** | SMTP delivery for digests/standups/alerts |
| Slack | Native **`fetch`** | Incoming Webhook POST |
| Bundler | **`@vercel/ncc`** | Compiles `src/` → a single committed `dist/index.js` |
| Tests | **`node:test`** + **`tsx`** | 48 unit tests against a fake Octokit client |
| Typecheck | **`tsc --noEmit`** | No runtime framework |

**Source layout**

```
src/
  index.ts            # entry point: inputs → config → fetch → dispatch → audit
  config.ts           # Zod schema + YAML loader
  types.ts            # normalized ProjectGraph / ProjectItem model
  github/             # GraphQL docs, Octokit client, normalization
  features/           # one file per feature (rollover, staleNudge, …)
  notify/             # Slack + email channels + Notifier
  util/               # audit trail, dates, field accessors
test/                 # node:test specs + fake client helpers
dist/                 # ncc bundle (committed — required for JS actions)
```

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for how the pieces fit together.

## 🌐 The website (`web/`)

| Layer | Choice |
|-------|--------|
| Stack | Plain **HTML + CSS + vanilla JS** — no framework, **no build step** |
| Fonts | **Google Sans** (Google Fonts) with Roboto/system fallback |
| Hosting | **Cloudflare Pages** (static, Git-integration deploy) |
| Security | CSP + security headers via `_headers` |
| Theme | Dark-only |

## 🔧 CI/CD & repo automation

All via **GitHub Actions**:

- **CI** (`ci.yml`) — typecheck + tests + build + `dist/` sync check
- **PR checks** (`pr-checks.yml`) — tests/build/no-merge-conflicts gate
- **PR lint** (`pr-lint.yml`) — Conventional Commit title check
- **Major tag** (`major-tag.yml`) — moves the `v1` alias to the latest release

## Principles

- **Minimal dependencies** — a handful of well-maintained libraries, no heavy frameworks.
- **No hosted infrastructure** — the Action runs inside the adopter's own GitHub; the site is static.
- **Everything auditable** — the Action records every action; the site is fully client-side.

## License

[MIT](./LICENSE).
