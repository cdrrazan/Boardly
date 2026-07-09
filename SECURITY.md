# Security Policy

## Supported versions

Boardly is released from the `v1` major tag. Security fixes are applied to the latest `v1.x` release. Pin to a tag (e.g. `@v1`) rather than a floating branch.

| Version | Supported |
|---------|-----------|
| `v1.x` (latest) | ✅ |
| older `v1.x` | ⚠️ upgrade recommended |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, use one of these private channels:

1. **GitHub Security Advisories** — preferred. Go to the repo's **Security → Advisories → Report a vulnerability** ([privately report here](https://github.com/cdrrazan/Boardly/security/advisories/new)).
2. **Email** — <cdrrazan@gmail.com> with the subject `SECURITY: Boardly`.

Please include:

- A description of the issue and its impact
- Steps to reproduce or a proof of concept
- Affected version(s) and configuration (redact any tokens or secrets)

You'll get an acknowledgement within **72 hours**, and we'll keep you updated as we work on a fix. We'll credit you in the release notes unless you prefer to remain anonymous.

## Scope & threat model

This project is a GitHub Action that operates on your Projects (v2) board using a token **you** supply. Security-relevant considerations:

- **Tokens.** The action needs a token with `project` and `issues` write access. **Store it as an encrypted secret** — never commit it or place it in the config file. The action reads it only from the `token` input.
- **Least privilege.** Prefer a **fine-grained PAT** or a **GitHub App** installation token scoped to only the needed repos/projects over a classic PAT.
- **Untrusted content.** The action reads issue/PR titles, assignees, and comment bodies. It treats them as data (for de-dup markers and message templates) and does not execute them. If you extend the templating, keep it inert.
- **Comment markers.** De-dup markers are HTML comments (`<!-- boardly:... -->`) and carry no executable content.
- **`dry-run`.** Use `dry-run: "true"` to audit exactly what the action would do before granting it write access on a production board.

## Good practices for adopters

- Rotate the automation token periodically.
- Give the workflow the **minimum** `permissions:` block it needs (`contents: read`, `issues: write`).
- Pin the action to a released tag and review the changelog before bumping.
- Review the audit trail in the job summary after enabling a new feature.
