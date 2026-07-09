import type { RunContext } from "./context.js";

/** Where a digest/standup report should be posted. Exactly one of `issue` or `createIssueTitle` is set. */
export interface PostTarget {
  /** Comment on this existing issue number (in the workflow's repo). */
  issue?: number;
  /** Or open a fresh issue with this title. */
  createIssueTitle?: string;
  /** Labels applied when a fresh issue is created. */
  labels: string[];
}

/**
 * Post a report to GitHub (a comment on a fixed issue or a fresh issue) and then
 * broadcast it to any configured external channels (Slack/email).
 */
export async function postReport(
  ctx: RunContext,
  target: PostTarget,
  feature: string,
  fallbackTitle: string,
  body: string,
): Promise<void> {
  const { runRepo, client, audit } = ctx;

  if (target.issue !== undefined) {
    audit.record(feature, "comment", `${runRepo.owner}/${runRepo.repo}#${target.issue}`, fallbackTitle);
    if (!ctx.dryRun) {
      await client.comment(runRepo.owner, runRepo.repo, target.issue, body);
    }
  } else {
    const title = target.createIssueTitle ?? fallbackTitle;
    audit.record(feature, "create-issue", `${runRepo.owner}/${runRepo.repo}`, title);
    if (!ctx.dryRun) {
      await client.createIssue(runRepo.owner, runRepo.repo, title, body, target.labels);
    }
  }

  await ctx.notifier.broadcast({ feature, title: fallbackTitle, markdown: body });
}
