import { readFileSync } from "node:fs";
import { load as parseYaml } from "js-yaml";
import { z } from "zod";

/**
 * Config schema for Boardly. The config file lives in the adopter's
 * repository (default `.github/project-automation.yml`) and declares which
 * project to operate on, how the project's custom fields are named, and which
 * features are enabled with their parameters.
 */

const postTargetSchema = z.object({
  // Post digests / standups as a comment on this issue number...
  issue: z.number().int().positive().optional(),
  // ...or create a fresh issue with this title (in the repo running the action).
  createIssueTitle: z.string().min(1).optional(),
  // Labels applied when creating a fresh issue.
  labels: z.array(z.string()).default([]),
}).refine((v) => v.issue !== undefined || v.createIssueTitle !== undefined, {
  message: "postTo requires either `issue` or `createIssueTitle`",
});

const autoAssignRuleSchema = z.object({
  // Ticket label to match (case-insensitive).
  label: z.string().min(1),
  // GitHub usernames (logins, not display names) to assign when the label matches.
  assignees: z.array(z.string().min(1)).min(1),
});

const staleRuleSchema = z.object({
  status: z.string().min(1),
  days: z.number().positive(),
  // Who to @mention. A bare token — "assignees" (the card's own assignees) or
  // "reviewers" (pending review requests on the card's PR / linked PR) — or a
  // list mixing those tokens with explicit logins, e.g. ["reviewers", "lead"].
  // "reviewers" falls back to the assignees when no review is pending.
  notify: z
    .union([z.literal("assignees"), z.literal("reviewers"), z.array(z.string().min(1))])
    .default("assignees"),
  message: z.string().optional(),
});

export const configSchema = z.object({
  project: z.object({
    owner: z.string().min(1),
    type: z.enum(["org", "user"]).default("org"),
    number: z.number().int().positive(),
  }),
  fields: z.object({
    status: z.string().default("Status"),
    iteration: z.string().default("Iteration"),
    priority: z.string().default("Priority"),
    estimate: z.string().optional(),
    // Optional number/text field to write the sub-issue completion % into.
    progress: z.string().optional(),
  }).default({ status: "Status", iteration: "Iteration", priority: "Priority" }),
  // Status option names that count as "complete".
  doneStatuses: z.array(z.string().min(1)).default(["Done"]),
  features: z.object({
    rollover: z.object({
      enabled: z.boolean().default(false),
      // Only roll over items currently in these statuses; empty = all non-done.
      onlyStatuses: z.array(z.string()).default([]),
      // Add a label named after the iteration items roll into (e.g. "2026-S06").
      addSprintLabel: z.boolean().default(false),
      // Hex color (no leading '#') used when the sprint label must be created.
      sprintLabelColor: z.string().regex(/^[0-9a-fA-F]{6}$/, "sprintLabelColor must be a 6-digit hex color without a leading '#'").default("772fd1"),
      // Labels to strip from each rolled card (e.g. "pulled-in"). Matched case-insensitively,
      // ignoring spaces/hyphens/underscores.
      removeLabels: z.array(z.string()).default([]),
    }).default({ enabled: false, onlyStatuses: [], addSprintLabel: false, sprintLabelColor: "772fd1", removeLabels: [] }),

    sprintStart: z.object({
      enabled: z.boolean().default(false),
      // Statuses treated as "not started yet" (case-insensitive).
      fromStatuses: z.array(z.string().min(1)).default(["Backlog"]),
      // Status a pre-parked card is promoted to when its sprint becomes active.
      toStatus: z.string().min(1).default("Ready"),
    }).default({ enabled: false, fromStatuses: ["Backlog"], toStatus: "Ready" }),

    sprintRunway: z.object({
      enabled: z.boolean().default(false),
      // Warn when fewer than this many *future* iterations are planned beyond the current one.
      minFuture: z.number().int().positive().default(1),
    }).default({ enabled: false, minFuture: 1 }),

    autoAssign: z.object({
      enabled: z.boolean().default(false),
      // Only assign tickets currently in these statuses; empty = any non-done.
      onlyStatuses: z.array(z.string()).default(["Ready"]),
      // Label → assignee rules. A ticket with no matching rule is left untouched.
      rules: z.array(autoAssignRuleSchema).default([]),
    }).default({ enabled: false, onlyStatuses: ["Ready"], rules: [] }),

    staleNudge: z.object({
      enabled: z.boolean().default(false),
      rules: z.array(staleRuleSchema).default([]),
    }).default({ enabled: false, rules: [] }),

    subIssueGate: z.object({
      enabled: z.boolean().default(false),
      // Statuses that require all sub-issues to be complete.
      guardStatuses: z.array(z.string().min(1)).default(["Done"]),
      // "comment" = warn only; "revert" = move the item back to `revertStatus`.
      action: z.enum(["comment", "revert"]).default("comment"),
      revertStatus: z.string().optional(),
    }).default({ enabled: false, guardStatuses: ["Done"], action: "comment" }),

    digest: z.object({
      enabled: z.boolean().default(false),
      postTo: postTargetSchema,
    }).optional(),

    standup: z.object({
      enabled: z.boolean().default(false),
      // Look-back window in hours for "what moved".
      sinceHours: z.number().positive().default(24),
      postTo: postTargetSchema,
    }).optional(),

    prioritySort: z.object({
      enabled: z.boolean().default(false),
      // Priority option names, highest priority first.
      order: z.array(z.string().min(1)).min(1),
    }).optional(),
  }),

  // Optional external delivery for digests, standups, and stale alerts.
  // Secrets are referenced by env-var NAME, never inlined here.
  notifications: z.object({
    slack: z.object({
      enabled: z.boolean().default(false),
      // Env var holding the Slack Incoming Webhook URL.
      webhookEnv: z.string().default("SLACK_WEBHOOK_URL"),
    }).optional(),
    email: z.object({
      enabled: z.boolean().default(false),
      host: z.string().min(1),
      port: z.number().int().positive().default(587),
      secure: z.boolean().default(false),
      // Env vars holding SMTP credentials (omit for an unauthenticated relay).
      userEnv: z.string().optional(),
      passwordEnv: z.string().optional(),
      from: z.string().min(1),
      to: z.array(z.string().min(1)).min(1),
    }).optional(),
  }).optional(),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Read, parse, and validate the YAML config at `path`.
 * @throws Error with a human-readable message if the file is missing, not valid
 *   YAML, or fails schema validation (with a per-field breakdown).
 */
export function loadConfig(path: string): Config {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(`Could not read config file at "${path}". Set the "config-path" input if it lives elsewhere.`);
  }

  let doc: unknown;
  try {
    doc = parseYaml(raw);
  } catch (err) {
    throw new Error(`Config file "${path}" is not valid YAML: ${(err as Error).message}`);
  }

  const parsed = configSchema.safeParse(doc);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Config file "${path}" is invalid:\n${issues}`);
  }
  return parsed.data;
}
