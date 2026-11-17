# 0001 · Run on Node 24 and refresh dependencies

- **Status:** Accepted
- **Date:** 2026-11-17
- **Commit:** `b38e4a4`

## Context

Boardly shipped as a `node20` JavaScript action. Node 20 is end-of-life and
GitHub Actions has retired the `node20` runtime, so adopters' workflows would
warn or fail. Several dependencies were also a major version behind, and
`zod` 3 carried a high-severity advisory
([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)).

## Decision

- Run the action on `node24` (`action.yml`) and require Node.js ≥ 24 for development.
- Build and test in CI on Node 24 with `actions/checkout@v7` and `actions/setup-node@v7`.
- Upgrade to current majors: `@actions/core` 3, `@actions/github` 9,
  `@octokit/graphql` 9, `zod` 4, `js-yaml` 5, `nodemailer` 10, `@vercel/ncc` 0.45.

## Consequences

- The config schema and action inputs are unchanged, so `v1.x` consumers need no edits.
  Under `zod` 4 every nested default is spelled out in `config.ts`, so parsed
  configs match the previous behavior.
- `npm audit` is clean.
- Contributors need Node.js ≥ 24 locally. `dist/` must be rebuilt on Node 24
  to stay in sync with CI's check.
