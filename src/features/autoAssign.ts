import type { RunContext } from "./context.js";
import { isDone, statusOf } from "../util/project.js";

/**
 * Auto-assign by label.
 *
 * A CODEOWNERS-style map from ticket **label** → GitHub **assignees**. When a
 * ticket in one of `onlyStatuses` (default "Ready") is still unassigned and
 * carries a mapped label, assign the configured users. Pairs naturally with
 * `sprintStart`: a sprint flips → parked cards become Ready → their owners get
 * assigned in the same run. A ticket matching no rule is left untouched.
 */
export async function runAutoAssign(ctx: RunContext): Promise<void> {
  const { cfg, graph, client, audit } = ctx;
  const { onlyStatuses, rules } = cfg.features.autoAssign;
  if (rules.length === 0) return; // opt-in: nothing to do without a mapping

  const only = onlyStatuses.map((s) => s.toLowerCase());

  for (const item of graph.items) {
    if (!item.content) continue; // draft cards have no issue to assign
    if (isDone(item, cfg)) continue;

    const status = statusOf(item, cfg);
    if (only.length > 0 && !(status && only.includes(status.toLowerCase()))) continue;

    // Only assign tickets nobody owns yet — never override a human's choice.
    if (item.content.assignees.length > 0) continue;

    const itemLabels = item.content.labels.map((l) => l.toLowerCase());
    const toAssign = new Set<string>();
    for (const rule of rules) {
      if (itemLabels.includes(rule.label.toLowerCase())) {
        for (const a of rule.assignees) toAssign.add(a);
      }
    }
    if (toAssign.size === 0) continue;

    const assignees = [...toAssign];
    const { repoOwner, repoName, number } = item.content;
    const label = `#${number} ${item.content.title}`;
    audit.record("autoAssign", "assign", label, `→ ${assignees.map((a) => `@${a}`).join(", ")}`);

    if (!ctx.dryRun) {
      await client.addAssignees(repoOwner, repoName, number, assignees);
    }
  }
}
