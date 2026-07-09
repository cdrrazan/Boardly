import * as core from "@actions/core";
import type { RunContext } from "./context.js";
import type { ProjectItem } from "../types.js";
import { priorityOf, requireField } from "../util/project.js";

/**
 * Priority auto-sort.
 *
 * Reorders the project's items so higher-priority cards float to the top,
 * following the configured priority order. Items without a recognised priority
 * keep their relative order at the bottom.
 *
 * Note: manual ordering only shows on board views whose sort is set to "manual".
 */
export async function runPrioritySort(ctx: RunContext): Promise<void> {
  const { cfg, graph, client, audit } = ctx;
  const feature = cfg.features.prioritySort;
  if (!feature) return;

  // Validate the priority field exists (helps surface config typos early).
  requireField(graph, cfg.fields.priority, "priority sort");
  const order = feature.order.map((s) => s.toLowerCase());
  const rank = (item: ProjectItem): number => {
    const p = priorityOf(item, cfg)?.toLowerCase();
    const idx = p ? order.indexOf(p) : -1;
    return idx === -1 ? order.length : idx; // unknown / unset → bottom
  };

  const current = graph.items;
  // Stable sort by priority rank; ties keep current relative order.
  const desired = current
    .map((item, index) => ({ item, index, rank: rank(item) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((x) => x.item);

  if (sameOrder(current, desired)) {
    core.info("priority-sort: items already ordered by priority.");
    return;
  }

  audit.record("priority-sort", "reorder", graph.title, `reordered ${desired.length} items by priority`);
  if (ctx.dryRun) return;

  let afterId: string | null = null;
  for (const item of desired) {
    await client.setPosition(graph.id, item.id, afterId);
    afterId = item.id;
  }
}

function sameOrder(a: ProjectItem[], b: ProjectItem[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, i) => item.id === b[i].id);
}
