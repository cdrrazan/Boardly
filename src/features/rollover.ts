import * as core from "@actions/core";
import type { RunContext } from "./context.js";
import { iterationOf, isDone, requireField, statusOf } from "../util/project.js";

/**
 * Sprint rollover.
 *
 * When an iteration ends, move every item that is still in that iteration and
 * not "done" into the next (current) iteration, so unfinished work carries over
 * automatically instead of being stranded in a closed sprint.
 */
export async function runRollover(ctx: RunContext): Promise<void> {
  const { cfg, graph, client, audit } = ctx;
  const iterationField = requireField(graph, cfg.fields.iteration, "rollover");

  const completed = iterationField.completedIterations ?? [];
  const upcoming = iterationField.iterations ?? [];
  if (completed.length === 0) {
    core.info("rollover: no completed iterations — nothing to roll over.");
    return;
  }
  if (upcoming.length === 0) {
    core.warning("rollover: an iteration has completed but there is no next iteration to roll into. Add one to the project.");
    return;
  }

  const from = completed[0]; // most recently completed
  const to = upcoming[0]; // current/next active iteration
  const onlyStatuses = cfg.features.rollover.onlyStatuses.map((s) => s.toLowerCase());
  const { addSprintLabel, sprintLabelColor, removeLabels } = cfg.features.rollover;
  const sprintLabel = to.title; // label named after the iteration items roll into
  const labelEnsured = new Set<string>(); // repos where the sprint label has been created this run
  // Fuzzy label key: case-insensitive and ignoring spaces/hyphens/underscores, so a single
  // `pulled-in` entry also matches "Pulled In", "pulled_in", etc. (List "pull-in" separately —
  // "pull" and "pulled" are different words and normalize differently.)
  const normLabel = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const removeSet = new Set(removeLabels.map(normLabel));

  for (const item of graph.items) {
    const itemIteration = iterationOf(item, cfg);
    if (!itemIteration || itemIteration.iterationId !== from.id) continue;
    if (isDone(item, cfg)) continue;

    const status = statusOf(item, cfg);
    if (onlyStatuses.length > 0 && !(status && onlyStatuses.includes(status.toLowerCase()))) continue;

    const label = item.content ? `#${item.content.number} ${item.content.title}` : item.id;
    audit.record(
      "rollover",
      "move-iteration",
      label,
      `${from.title} → ${to.title}${status ? ` (status: ${status})` : ""}`,
    );

    if (!ctx.dryRun) {
      await client.setIteration(graph.id, item.id, iterationField.id, to.id);
    }

    // Optionally tag the rolled item with the new sprint's label (additive; existing labels are kept).
    // Draft items have no linked issue/PR, so there is nothing to label.
    if (addSprintLabel && item.content && !item.content.labels.includes(sprintLabel)) {
      const { repoOwner, repoName, number } = item.content;
      audit.record("rollover", "add-label", label, `+${sprintLabel}`);
      if (!ctx.dryRun) {
        const repoKey = `${repoOwner}/${repoName}`;
        if (!labelEnsured.has(repoKey)) {
          await client.ensureLabel(repoOwner, repoName, sprintLabel, sprintLabelColor);
          labelEnsured.add(repoKey);
        }
        await client.addLabels(repoOwner, repoName, number, [sprintLabel]);
      }
    }

    // Strip stale labels (e.g. "pulled-in") from each rolled card, matching any casing/spacing.
    if (removeSet.size > 0 && item.content) {
      const { repoOwner, repoName, number } = item.content;
      for (const existing of item.content.labels) {
        if (!removeSet.has(normLabel(existing))) continue;
        audit.record("rollover", "remove-label", label, `-${existing}`);
        if (!ctx.dryRun) {
          await client.removeLabel(repoOwner, repoName, number, existing);
        }
      }
    }
  }
}
