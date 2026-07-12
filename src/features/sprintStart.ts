import * as core from "@actions/core";
import type { RunContext } from "./context.js";
import { isDone, iterationOf, optionId, requireField, statusOf, statusUpdatedAt } from "../util/project.js";

/**
 * Sprint start: promote pre-parked backlog cards when their sprint becomes active.
 *
 * Teams often assign tickets to a *future* iteration while the current one is
 * still running; those tickets sit in a "Backlog" status. Once that iteration
 * becomes the active sprint, move each such card into a "Ready" status — but
 * only cards that were parked **before** the sprint started, so a card
 * deliberately moved back to Backlog mid-sprint is left alone.
 */
export async function runSprintStart(ctx: RunContext): Promise<void> {
  const { cfg, graph, client, audit } = ctx;
  const { fromStatuses, toStatus } = cfg.features.sprintStart;

  const iterationField = requireField(graph, cfg.fields.iteration, "sprintStart");
  const statusField = requireField(graph, cfg.fields.status, "sprintStart");

  const current = (iterationField.iterations ?? [])[0];
  if (!current) {
    core.info("sprintStart: no active/upcoming iteration — nothing to promote.");
    return;
  }

  const start = new Date(`${current.startDate}T00:00:00Z`);
  if (start.getTime() > ctx.now.getTime()) {
    core.info(`sprintStart: iteration "${current.title}" hasn't started yet (starts ${current.startDate}).`);
    return;
  }

  const toOptionId = optionId(statusField, toStatus);
  if (!toOptionId) {
    const available = (statusField.options ?? []).map((o) => o.name).join(", ");
    throw new Error(`sprintStart: target status "${toStatus}" not found on the "${statusField.name}" field. Available: ${available}`);
  }

  const fromLower = fromStatuses.map((s) => s.toLowerCase());

  for (const item of graph.items) {
    const it = iterationOf(item, cfg);
    if (!it || it.iterationId !== current.id) continue;
    if (isDone(item, cfg)) continue;

    const status = statusOf(item, cfg);
    if (!status || !fromLower.includes(status.toLowerCase())) continue;

    // Promote only cards parked before the sprint began; a mid-sprint move back
    // to Backlog (status changed on/after the start date) is respected.
    const changedAt = statusUpdatedAt(item, cfg);
    if (!changedAt || new Date(changedAt).getTime() >= start.getTime()) continue;

    const label = item.content ? `#${item.content.number} ${item.content.title}` : item.id;
    audit.record("sprintStart", "promote-status", label, `${status} → ${toStatus} (${current.title})`);

    if (!ctx.dryRun) {
      await client.setSingleSelect(graph.id, item.id, statusField.id, toOptionId);
    }
  }
}
