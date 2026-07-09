import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FakeClient,
  makeConfig,
  makeCtx,
  makeGraph,
  makeItem,
  statusField,
  statusValue,
  priorityField,
  priorityValue,
  iterationField,
  iterationValue,
} from "./helpers.js";
import { runRollover } from "../src/features/rollover.js";
import { runStaleNudge } from "../src/features/staleNudge.js";
import { runSubIssueGate } from "../src/features/subIssueGate.js";
import { runPrioritySort } from "../src/features/prioritySort.js";
import { runDigest } from "../src/features/digest.js";
import { runStandup } from "../src/features/standup.js";

// ---------- rollover ----------

test("rollover respects onlyStatuses", async () => {
  const cfg = makeConfig({ features: { rollover: { enabled: true, onlyStatuses: ["Todo"] } } });
  const fields = [statusField(["Todo", "In Progress", "Done"]), iterationField([{ id: "it2", title: "S2" }], [{ id: "it1", title: "S1" }])];
  const todo = makeItem([statusValue("Todo", "2026-07-01T00:00:00Z"), iterationValue("it1", "S1")], { number: 1 });
  const inProgress = makeItem([statusValue("In Progress", "2026-07-01T00:00:00Z"), iterationValue("it1", "S1")], { number: 2 });
  const client = new FakeClient();

  await runRollover(makeCtx(makeGraph(fields, [todo, inProgress]), cfg, client));

  assert.deepEqual(client.iterations, [{ itemId: todo.id, iterationId: "it2" }]);
});

test("rollover no-ops when there is no completed iteration", async () => {
  const cfg = makeConfig({ features: { rollover: { enabled: true } } });
  const fields = [statusField(["Todo"]), iterationField([{ id: "it1", title: "S1" }], [])];
  const item = makeItem([statusValue("Todo", "t"), iterationValue("it1", "S1")], { number: 1 });
  const client = new FakeClient();

  await runRollover(makeCtx(makeGraph(fields, [item]), cfg, client));

  assert.equal(client.iterations.length, 0);
});

test("rollover no-ops when there is no next iteration to roll into", async () => {
  const cfg = makeConfig({ features: { rollover: { enabled: true } } });
  const fields = [statusField(["Todo"]), iterationField([], [{ id: "it1", title: "S1" }])];
  const item = makeItem([statusValue("Todo", "t"), iterationValue("it1", "S1")], { number: 1 });
  const client = new FakeClient();

  await runRollover(makeCtx(makeGraph(fields, [item]), cfg, client));

  assert.equal(client.iterations.length, 0);
});

// ---------- stale nudge ----------

test("stale-nudge with an explicit notify list mentions those logins, not assignees", async () => {
  const cfg = makeConfig({
    features: { staleNudge: { enabled: true, rules: [{ status: "In Review", days: 1, notify: ["lead"] }] } },
  });
  const item = makeItem([statusValue("In Review", "2026-07-01T00:00:00Z")], { number: 5, assignees: ["alice"] });
  const client = new FakeClient().withComments([]);

  await runStaleNudge(makeCtx(makeGraph([statusField(["In Review"])], [item]), cfg, client));

  assert.equal(client.comments.length, 1);
  assert.match(client.comments[0].body, /@lead/);
  assert.doesNotMatch(client.comments[0].body, /@alice/);
});

test("stale-nudge skips draft items and statuses without a matching rule", async () => {
  const cfg = makeConfig({
    features: { staleNudge: { enabled: true, rules: [{ status: "In Progress", days: 1 }] } },
  });
  const draft = makeItem([statusValue("In Progress", "2026-07-01T00:00:00Z")]); // no content
  const otherStatus = makeItem([statusValue("Todo", "2026-07-01T00:00:00Z")], { number: 9 });
  const client = new FakeClient().withComments([]);

  await runStaleNudge(makeCtx(makeGraph([statusField(["In Progress", "Todo"])], [draft, otherStatus]), cfg, client));

  assert.equal(client.comments.length, 0);
});

// ---------- sub-issue gate ----------

test("sub-issue gate does not warn when all sub-issues are complete", async () => {
  const cfg = makeConfig({ features: { subIssueGate: { enabled: true, guardStatuses: ["Done"], action: "comment" } } });
  const item = makeItem([statusValue("Done", "2026-07-08T00:00:00Z")], {
    number: 7,
    subIssues: { total: 3, completed: 3, percentCompleted: 100 },
  });
  const client = new FakeClient().withComments([]);

  await runSubIssueGate(makeCtx(makeGraph([statusField(["Done"])], [item]), cfg, client));

  assert.equal(client.comments.length, 0);
});

test("sub-issue gate skips a repeat warning when a marker comment exists for this stint", async () => {
  const cfg = makeConfig({ features: { subIssueGate: { enabled: true, guardStatuses: ["Done"], action: "comment" } } });
  const item = makeItem([statusValue("Done", "2026-07-05T00:00:00Z")], {
    number: 7,
    subIssues: { total: 3, completed: 1, percentCompleted: 33 },
  });
  const client = new FakeClient().withComments([
    { body: "<!-- boardly:sub-issue-gate -->\nwarned", createdAt: "2026-07-06T00:00:00Z" },
  ]);

  await runSubIssueGate(makeCtx(makeGraph([statusField(["Done"])], [item]), cfg, client));

  assert.equal(client.comments.length, 0);
});

test("sub-issue gate with revert action but no revertStatus throws a helpful error", async () => {
  const cfg = makeConfig({ features: { subIssueGate: { enabled: true, guardStatuses: ["Done"], action: "revert" } } });
  const item = makeItem([statusValue("Done", "t")], { number: 8, subIssues: { total: 2, completed: 0, percentCompleted: 0 } });
  const client = new FakeClient().withComments([]);

  await assert.rejects(
    () => runSubIssueGate(makeCtx(makeGraph([statusField(["Done", "In Progress"])], [item]), cfg, client)),
    /requires "revertStatus"/,
  );
});

// ---------- digest ----------

test("digest omits velocity when no estimate field is configured", async () => {
  const cfg = makeConfig({
    fields: { status: "Status", iteration: "Sprint", priority: "Priority" },
    features: { digest: { enabled: true, postTo: { issue: 1 } } },
  });
  const fields = [statusField(["Todo", "Done"]), iterationField([], [{ id: "it1", title: "S1" }])];
  const done = makeItem([statusValue("Done", "t"), iterationValue("it1", "S1")], { number: 1 });
  const client = new FakeClient();

  await runDigest(makeCtx(makeGraph(fields, [done]), cfg, client));

  assert.equal(client.comments.length, 1);
  assert.doesNotMatch(client.comments[0].body, /Velocity/);
});

test("digest opens a new issue when createIssueTitle is set", async () => {
  const cfg = makeConfig({ features: { digest: { enabled: true, postTo: { createIssueTitle: "Sprint report" } } } });
  const fields = [statusField(["Done"]), iterationField([], [{ id: "it1", title: "S1" }])];
  const done = makeItem([statusValue("Done", "t"), iterationValue("it1", "S1")], { number: 1 });
  const client = new FakeClient();

  await runDigest(makeCtx(makeGraph(fields, [done]), cfg, client));

  assert.equal(client.comments.length, 0);
  assert.deepEqual(client.createdIssues, [{ title: "Sprint report" }]);
});

// ---------- standup ----------

test("standup groups moved items by assignee, with an unassigned bucket", async () => {
  const cfg = makeConfig({ features: { standup: { enabled: true, sinceHours: 24, postTo: { issue: 1 } } } });
  const recent = "2026-07-08T12:00:00Z"; // within 24h of NOW (2026-07-09T00:00Z)
  const aliceItem = makeItem([statusValue("In Review", recent)], { number: 1, assignees: ["alice"] });
  const orphan = makeItem([statusValue("In Progress", recent)], { number: 2, assignees: [] });
  const client = new FakeClient();

  await runStandup(makeCtx(makeGraph([statusField(["In Review", "In Progress"])], [aliceItem, orphan]), cfg, client));

  assert.equal(client.comments.length, 1);
  const body = client.comments[0].body;
  assert.match(body, /@alice/);
  assert.match(body, /_Unassigned_/);
});

test("standup posts nothing when nothing moved in the window", async () => {
  const cfg = makeConfig({ features: { standup: { enabled: true, sinceHours: 24, postTo: { issue: 1 } } } });
  const old = makeItem([statusValue("In Review", "2026-06-01T00:00:00Z")], { number: 1, assignees: ["alice"] });
  const client = new FakeClient();

  await runStandup(makeCtx(makeGraph([statusField(["In Review"])], [old]), cfg, client));

  assert.equal(client.comments.length, 0);
  assert.equal(client.createdIssues.length, 0);
});

// ---------- priority sort ----------

test("priority sort in dry-run records intent but issues no position calls", async () => {
  const cfg = makeConfig({ features: { prioritySort: { enabled: true, order: ["High", "Low"] } } });
  const low = makeItem([priorityValue("Low")], { number: 1 });
  const high = makeItem([priorityValue("High")], { number: 2 });
  const client = new FakeClient();
  const ctx = makeCtx(makeGraph([priorityField(["High", "Low"])], [low, high]), cfg, client, true);

  await runPrioritySort(ctx);

  assert.equal(client.positions.length, 0);
  assert.equal(ctx.audit.count, 1);
});
