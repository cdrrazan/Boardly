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
  }
}
