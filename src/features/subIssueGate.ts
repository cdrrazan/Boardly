import * as core from "@actions/core";
import type { RunContext } from "./context.js";
import { findField, optionId, requireField, statusOf, statusUpdatedAt } from "../util/project.js";

const GATE_MARKER = "<!-- boardly:sub-issue-gate -->";

/**
 * Sub-issue Done-gating + parent roll-up.
 *
 * 1. Gating: a parent item may not sit in a "done" status while it still has
 *    open sub-issues. Depending on config we either warn (comment) or revert the
 *    item to `revertStatus`.
 * 2. Roll-up: if a `progress` number field is configured, write each parent's
 *    sub-issue completion percentage into it so the board shows live progress.
 */
export async function runSubIssueGate(ctx: RunContext): Promise<void> {
  const { cfg, graph, client, audit } = ctx;
  const feature = cfg.features.subIssueGate;
  const guard = feature.guardStatuses.map((s) => s.toLowerCase());
  const statusField = requireField(graph, cfg.fields.status, "sub-issue gate");
  const progressField = cfg.fields.progress ? findField(graph, cfg.fields.progress) : undefined;
  if (cfg.fields.progress && !progressField) {
    core.warning(`sub-issue-gate: progress field "${cfg.fields.progress}" not found; skipping roll-up.`);
  }

  let revertOptionId: string | undefined;
  if (feature.action === "revert") {
    if (!feature.revertStatus) throw new Error('sub-issue-gate: action "revert" requires "revertStatus".');
    revertOptionId = optionId(statusField, feature.revertStatus);
    if (!revertOptionId) throw new Error(`sub-issue-gate: revertStatus "${feature.revertStatus}" is not a valid Status option.`);
  }

  for (const item of graph.items) {
    const content = item.content;
    if (!content || content.type !== "Issue" || !content.subIssues) continue;
    const { total, completed, percentCompleted } = content.subIssues;

    // Roll-up progress for every parent with children.
    if (progressField && total > 0) {
      audit.record("sub-issue-gate", "rollup-progress", `#${content.number}`, `${completed}/${total} (${percentCompleted}%)`);
      if (!ctx.dryRun) {
        await client.setNumber(graph.id, item.id, progressField.id, percentCompleted);
      }
    }

    // Gate: guarded status but not all children done.
    const status = statusOf(item, cfg);
    const isGuarded = status !== undefined && guard.includes(status.toLowerCase());
    if (!isGuarded || total === 0 || completed >= total) continue;

    const label = `#${content.number} ${content.title}`;
    const detail = `${completed}/${total} sub-issues complete while in "${status}"`;

    if (feature.action === "revert" && revertOptionId) {
      audit.record("sub-issue-gate", "revert-status", label, `${detail} → "${feature.revertStatus}"`);
      if (!ctx.dryRun) {
        await client.setSingleSelect(graph.id, item.id, statusField.id, revertOptionId);
        await client.comment(
          content.repoOwner,
          content.repoName,
          content.number,
          `${GATE_MARKER}\nMoved back to **${feature.revertStatus}**: ${completed}/${total} sub-issues are still open, so this can't be **${status}** yet.`,
        );
      }
      continue;
    }

    // comment-only action, de-duped against the current status stint
    const since = statusUpdatedAt(item, cfg) ?? item.updatedAt;
    const existing = await client.listComments(content.repoOwner, content.repoName, content.number);
    const already = existing.some((c) => c.body.includes(GATE_MARKER) && new Date(c.createdAt) >= new Date(since));
    if (already) continue;

    audit.record("sub-issue-gate", "comment", label, detail);
    if (!ctx.dryRun) {
      await client.comment(
        content.repoOwner,
        content.repoName,
        content.number,
        `${GATE_MARKER}\n⚠️ This item is in **${status}** but only ${completed}/${total} sub-issues are complete. Close the remaining sub-issues before marking it done.`,
      );
    }
  }
}
