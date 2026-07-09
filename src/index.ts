import * as core from "@actions/core";
import * as github from "@actions/github";
import { loadConfig } from "./config.js";
import { ProjectClient } from "./github/client.js";
import { Audit } from "./util/audit.js";
import { buildNotifier } from "./notify/notifier.js";
import type { RunContext } from "./features/context.js";
import { runRollover } from "./features/rollover.js";
import { runStaleNudge } from "./features/staleNudge.js";
import { runSubIssueGate } from "./features/subIssueGate.js";
import { runDigest } from "./features/digest.js";
import { runStandup } from "./features/standup.js";
import { runPrioritySort } from "./features/prioritySort.js";

type FeatureKey = "rollover" | "stale-nudge" | "sub-issue-gate" | "digest" | "standup" | "priority-sort";

/** Maps each feature key (also the accepted values of the `only` input) to its runner. */
const RUNNERS: Record<FeatureKey, (ctx: RunContext) => Promise<void>> = {
  rollover: runRollover,
  "stale-nudge": runStaleNudge,
  "sub-issue-gate": runSubIssueGate,
  digest: runDigest,
  standup: runStandup,
  "priority-sort": runPrioritySort,
};

/** Whether a feature is turned on in config. */
function isEnabled(cfg: RunContext["cfg"], key: FeatureKey): boolean {
  switch (key) {
    case "rollover":
      return cfg.features.rollover.enabled;
    case "stale-nudge":
      return cfg.features.staleNudge.enabled;
    case "sub-issue-gate":
      return cfg.features.subIssueGate.enabled;
    case "digest":
      return Boolean(cfg.features.digest?.enabled);
    case "standup":
      return Boolean(cfg.features.standup?.enabled);
    case "priority-sort":
      return Boolean(cfg.features.prioritySort?.enabled);
  }
}

/**
 * Action entry point: read inputs, load + validate config, fetch the project
 * once, then run either the single feature named by `only` or every enabled
 * feature. A failing feature is reported but does not abort the others; the
 * audit trail is always flushed.
 */
async function run(): Promise<void> {
  const token = core.getInput("token", { required: true });
  const configPath = core.getInput("config-path");
  const only = core.getInput("only").trim() as FeatureKey | "";
  const dryRun = core.getBooleanInput("dry-run");

  if (only && !(only in RUNNERS)) {
    throw new Error(`Unknown "only" value "${only}". Valid: ${Object.keys(RUNNERS).join(", ")}.`);
  }

  const cfg = loadConfig(configPath);
  const client = new ProjectClient(token);

  core.info(`Fetching project #${cfg.project.number} (${cfg.project.type}: ${cfg.project.owner})…`);
  const graph = await client.fetchProject(cfg.project.owner, cfg.project.type, cfg.project.number);
  core.info(`Loaded "${graph.title}" — ${graph.items.length} items, ${graph.fields.length} fields.`);

  const audit = new Audit(dryRun);
  const notifier = buildNotifier(cfg, process.env, dryRun, audit);
  if (notifier.channelCount > 0) {
    core.info(`Notifications: ${notifier.channelCount} external channel(s) active.`);
  }
  const ctx: RunContext = {
    cfg,
    client,
    graph,
    audit,
    notifier,
    dryRun,
    now: new Date(),
    runRepo: { owner: github.context.repo.owner, repo: github.context.repo.repo },
  };

  const selected: FeatureKey[] = only ? [only] : (Object.keys(RUNNERS) as FeatureKey[]);
  for (const key of selected) {
    if (!only && !isEnabled(cfg, key)) continue;
    if (only && !isEnabled(cfg, key)) {
      core.warning(`Feature "${key}" was requested via "only" but is not enabled in config; running it anyway.`);
    }
    core.startGroup(`Feature: ${key}`);
    try {
      await RUNNERS[key](ctx);
    } catch (err) {
      // One failing feature shouldn't abort the rest of the run.
      core.error(`Feature "${key}" failed: ${(err as Error).message}`);
      core.setFailed(`Feature "${key}" failed: ${(err as Error).message}`);
    } finally {
      core.endGroup();
    }
  }

  await audit.flush(graph.title);
  core.setOutput("actions-count", audit.count);
  core.info(`Done. ${audit.count} action(s)${dryRun ? " (dry-run)" : ""}.`);
}

run().catch((err) => {
  core.setFailed((err as Error).message);
});
