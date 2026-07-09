import type { Config } from "../config.js";
import type { ProjectClient } from "../github/client.js";
import type { ProjectGraph } from "../types.js";
import type { Audit } from "../util/audit.js";
import type { Notifier } from "../notify/notifier.js";

/**
 * Everything a feature needs to run. Built once per invocation in `index.ts`
 * and passed to each `run*` feature function.
 */
export interface RunContext {
  /** Validated configuration loaded from the YAML file. */
  cfg: Config;
  /** Authenticated GraphQL/REST client for the target project. */
  client: ProjectClient;
  /** The whole project fetched once up front (fields + all items). */
  graph: ProjectGraph;
  /** Collects actions for the job-summary audit trail. */
  audit: Audit;
  /** Fans digests/standups/alerts out to Slack/email (no-op when none configured). */
  notifier: Notifier;
  /** When true, features record intended actions but must not mutate anything. */
  dryRun: boolean;
  /** Reference "now" for all time math, captured once so a run is internally consistent. */
  now: Date;
  /** The repository the action is running in — used to post digests/standups and create issues. */
  runRepo: { owner: string; repo: string };
}
