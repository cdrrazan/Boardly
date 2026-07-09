import type { Config } from "../config.js";
import type { ProjectClient } from "../github/client.js";
import type { ProjectGraph } from "../types.js";
import type { Audit } from "../util/audit.js";

export interface RunContext {
  cfg: Config;
  client: ProjectClient;
  graph: ProjectGraph;
  audit: Audit;
  dryRun: boolean;
  now: Date;
  /** The repository the action is running in — used to post digests/standups and create issues. */
  runRepo: { owner: string; repo: string };
}
