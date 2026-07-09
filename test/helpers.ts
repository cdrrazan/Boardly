import { configSchema, type Config } from "../src/config.js";
import type { ProjectClient } from "../src/github/client.js";
import type { RunContext } from "../src/features/context.js";
import type { FieldValue, ProjectField, ProjectGraph, ProjectItem } from "../src/types.js";
import { Audit } from "../src/util/audit.js";
import { Notifier } from "../src/notify/notifier.js";
import type { NotifyChannel, Report } from "../src/notify/types.js";

export const NOW = new Date("2026-07-09T00:00:00Z");

/** Records every mutating call so tests can assert on them. */
export class FakeClient {
  positions: { itemId: string; afterId: string | null }[] = [];
  iterations: { itemId: string; iterationId: string }[] = [];
  singleSelects: { itemId: string; optionId: string }[] = [];
  numbers: { itemId: string; value: number }[] = [];
  comments: { number: number; body: string }[] = [];
  createdIssues: { title: string }[] = [];
  private cannedComments: { body: string; createdAt: string }[] = [];

  withComments(comments: { body: string; createdAt: string }[]): this {
    this.cannedComments = comments;
    return this;
  }

  async setPosition(_p: string, itemId: string, afterId: string | null) {
    this.positions.push({ itemId, afterId });
  }
  async setIteration(_p: string, itemId: string, _f: string, iterationId: string) {
    this.iterations.push({ itemId, iterationId });
  }
  async setSingleSelect(_p: string, itemId: string, _f: string, optionId: string) {
    this.singleSelects.push({ itemId, optionId });
  }
  async setNumber(_p: string, itemId: string, _f: string, value: number) {
    this.numbers.push({ itemId, value });
  }
  async comment(_o: string, _r: string, number: number, body: string) {
    this.comments.push({ number, body });
  }
  async listComments() {
    return this.cannedComments;
  }
  async createIssue(_o: string, _r: string, title: string) {
    this.createdIssues.push({ title });
    return 999;
  }
  asClient(): ProjectClient {
    return this as unknown as ProjectClient;
  }
}

export function makeConfig(overrides: Record<string, unknown> = {}): Config {
  return configSchema.parse({
    project: { owner: "acme", type: "org", number: 1 },
    fields: { status: "Status", iteration: "Sprint", priority: "Priority", estimate: "Estimate", progress: "Progress" },
    doneStatuses: ["Done"],
    features: {},
    ...overrides,
  });
}

export function statusValue(name: string, updatedAt: string): FieldValue {
  return { fieldName: "Status", updatedAt, singleSelect: { name, optionId: `opt-${name}` } };
}
export function iterationValue(iterationId: string, title: string): FieldValue {
  return { fieldName: "Sprint", updatedAt: NOW.toISOString(), iteration: { title, iterationId } };
}
export function priorityValue(name: string): FieldValue {
  return { fieldName: "Priority", updatedAt: NOW.toISOString(), singleSelect: { name, optionId: `p-${name}` } };
}
export function estimateValue(n: number): FieldValue {
  return { fieldName: "Estimate", updatedAt: NOW.toISOString(), number: n };
}

let itemSeq = 0;
export function makeItem(
  fieldValues: FieldValue[],
  content?: Partial<ProjectItem["content"]> & { number: number },
): ProjectItem {
  const id = `PVTI_${itemSeq++}`;
  return {
    id,
    updatedAt: NOW.toISOString(),
    fieldValues,
    content: content
      ? {
          type: "Issue",
          nodeId: `I_${content.number}`,
          number: content.number,
          title: content.title ?? `Item ${content.number}`,
          url: content.url ?? `https://github.com/acme/repo/issues/${content.number}`,
          state: content.state ?? "OPEN",
          closedAt: content.closedAt ?? null,
          updatedAt: content.updatedAt ?? NOW.toISOString(),
          repoOwner: content.repoOwner ?? "acme",
          repoName: content.repoName ?? "repo",
          assignees: content.assignees ?? [],
          subIssues: content.subIssues,
          parent: content.parent,
        }
      : undefined,
  };
}

export function statusField(options: string[]): ProjectField {
  return { id: "F_status", name: "Status", dataType: "SINGLE_SELECT", options: options.map((o) => ({ id: `opt-${o}`, name: o })) };
}
export function priorityField(options: string[]): ProjectField {
  return { id: "F_priority", name: "Priority", dataType: "SINGLE_SELECT", options: options.map((o) => ({ id: `p-${o}`, name: o })) };
}
export function numberField(name: string): ProjectField {
  return { id: `F_${name}`, name, dataType: "NUMBER" };
}
export function iterationField(active: { id: string; title: string }[], completed: { id: string; title: string }[]): ProjectField {
  const map = (i: { id: string; title: string }) => ({ id: i.id, title: i.title, startDate: "2026-06-01", duration: 14 });
  return { id: "F_sprint", name: "Sprint", dataType: "ITERATION", iterations: active.map(map), completedIterations: completed.map(map) };
}

export function makeGraph(fields: ProjectField[], items: ProjectItem[]): ProjectGraph {
  return { id: "PVT_1", title: "Test Board", fields, items };
}

/** Records every broadcast so tests can assert on external notifications. */
export class FakeChannel implements NotifyChannel {
  readonly name: string;
  readonly target = "fake";
  sent: Report[] = [];
  constructor(name = "fake") {
    this.name = name;
  }
  async send(report: Report) {
    this.sent.push(report);
  }
}

export function makeCtx(
  graph: ProjectGraph,
  cfg: Config,
  client: FakeClient,
  dryRun = false,
  channels: FakeChannel[] = [],
): RunContext {
  const audit = new Audit(dryRun);
  return {
    cfg,
    client: client.asClient(),
    graph,
    audit,
    notifier: new Notifier(channels, dryRun, audit),
    dryRun,
    now: NOW,
    runRepo: { owner: "acme", repo: "repo" },
  };
}
