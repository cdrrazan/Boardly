# 🗺️ Roadmap

This is a living document — priorities shift based on community feedback. Have an idea or a vote? Open an [issue](https://github.com/cdrrazan/Boardly/issues) or a [discussion](https://github.com/cdrrazan/Boardly/discussions).

Legend: ✅ shipped · 🛠️ in progress · 🔭 planned · 💡 idea / needs discussion

## ✅ v0.1 — Foundation (shipped)

The initial release: a config-driven Action with six features and an audit trail.

- ✅ Sprint rollover
- ✅ Stale-card nudges (with de-dup)
- ✅ Sub-issue Done-gating + progress roll-up
- ✅ Sprint digest (completed / carried-over / velocity)
- ✅ Daily standup summary
- ✅ Priority auto-sort
- ✅ Audit trail → job summary + `dry-run`

## 🔭 v0.2 — Correctness & trust

Making the existing features smarter and safer to adopt.

- 🔭 **Working-days & holiday awareness** — a shared calendar so "X days" in rollover/stale/standup skips weekends and configured holidays.
- 🔭 **Escalation ladder** — multi-step stale handling: nudge → label → escalate to a lead → reassign, with per-step thresholds.
- 🔭 **Iteration auto-assignment** — drop newly-added items into the current active iteration automatically.
- 🔭 **Richer templating** — more placeholders and per-rule formatting for nudge/digest/standup messages.

## 🔭 v0.3 — Planning signals

Helping teams plan, not just tidy.

- 🔭 **Missing-metadata guard** — before a sprint starts, flag cards lacking estimate / assignee / priority.
- 🔭 **Overcommit / capacity warning** — warn when an iteration's total estimate exceeds a configured team capacity.
- 🔭 **Multi-sprint velocity trend** — the digest shows a rolling velocity chart across the last N sprints.
- 🔭 **Blocked-time tracking** — surface how long items have sat in a Blocked status, in standups and digests.

## 💡 Under consideration

Ideas we like but haven't committed to. Feedback especially welcome here.

- 💡 **More notification channels** — Slack / Discord / email delivery for nudges and digests.
- 💡 **Lifecycle status sync** — auto-move cards as issues/PRs open, get reviewed, merge, or close.
- 💡 **Auto-add + auto-triage** — add new issues/PRs to the project and set fields from label rules (round-robin assignment).
- 💡 **WIP limits** — warn when a column exceeds N cards.
- 💡 **SLA / time-in-status metrics** — flag cards exceeding a configured time in any column.
- 💡 **Cross-project sync** — mirror an item's status across multiple boards.
- 💡 **Config presets** — shareable rule bundles ("Scrum", "Kanban", "solo maintainer").

## 🧱 Engineering / project health

Not user-facing, but on the list.

- 🔭 CI workflow (typecheck + test + verify `dist/` is in sync on every PR).
- 🔭 Integration smoke test against a sandbox project in `dry-run`.
- 💡 Published changelog + release automation.
- 💡 Marketplace listing once `v1` stabilizes.

## Toward v1.0

`v1.0` ships when the v0.2 correctness work lands, the API surface (config schema + inputs) is stable enough to promise backward compatibility, and we have CI + an integration smoke test guarding releases.

---

_Dates are intentionally omitted — this is a community project and scope is driven by real usage. The ordering above reflects rough priority, not a fixed schedule._
