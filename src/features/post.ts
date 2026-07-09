import type { RunContext } from "./context.js";

export interface PostTarget {
  issue?: number;
  createIssueTitle?: string;
  labels: string[];
}

/** Post a report body either as a comment on a fixed issue or as a fresh issue. */
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
    return;
  }

  const title = target.createIssueTitle ?? fallbackTitle;
  audit.record(feature, "create-issue", `${runRepo.owner}/${runRepo.repo}`, title);
  if (!ctx.dryRun) {
    await client.createIssue(runRepo.owner, runRepo.repo, title, body, target.labels);
  }
}
