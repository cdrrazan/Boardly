import * as core from "@actions/core";
import type { RunContext } from "./context.js";
import { requireField } from "../util/project.js";

/**
 * Sprint runway warning.
 *
 * GitHub never creates iterations automatically — the iteration list is a fixed,
 * manually-managed set. When the current sprint ends and nothing is planned
 * beyond it, `rollover`/`sprintStart` have no iteration to act on. This feature
 * is read-only: it counts how many iterations start *in the future* and warns
 * (job summary + Action annotation) when that runway drops below `minFuture`,
 * so someone adds the next sprint before the board runs dry.
 */
export async function runSprintRunway(ctx: RunContext): Promise<void> {
  const { cfg, graph, audit } = ctx;
  const field = requireField(graph, cfg.fields.iteration, "sprintRunway");
  const { minFuture } = cfg.features.sprintRunway;

  const now = ctx.now.getTime();
  const iterations = field.iterations ?? [];
  const planned = iterations.filter((it) => new Date(`${it.startDate}T00:00:00Z`).getTime() > now);

  if (planned.length >= minFuture) {
    core.info(`sprintRunway: ${planned.length} future iteration(s) planned (min ${minFuture}) — OK.`);
    return;
  }

  const have = planned.length === 0
    ? "no future iterations are planned"
    : `only ${planned.length} future iteration(s) planned`;
  const msg = `Sprint runway low: ${have} (want at least ${minFuture}). Add the next sprint in the "${field.name}" field settings — GitHub does not create iterations automatically.`;

  audit.record("sprintRunway", "warn-runway", field.name, msg);
  core.warning(`sprintRunway: ${msg}`);
}
