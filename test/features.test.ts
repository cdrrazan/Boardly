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
  numberField,
  iterationField,
  iterationValue,
  estimateValue,
} from "./helpers.js";
import { runRollover } from "../src/features/rollover.js";
import { runStaleNudge } from "../src/features/staleNudge.js";
import { runSubIssueGate } from "../src/features/subIssueGate.js";
import { runPrioritySort } from "../src/features/prioritySort.js";
import { runDigest } from "../src/features/digest.js";

test("rollover moves unfinished items from the completed iteration into the active one", async () => {
  const cfg = makeConfig({ features: { rollover: { enabled: true } } });
  const fields = [statusField(["Todo", "In Progress", "Done"]), iterationField([{ id: "it2", title: "Sprint 2" }], [{ id: "it1", title: "Sprint 1" }])];
  const toMove = makeItem([statusValue("In Progress", "2026-07-01T00:00:00Z"), iterationValue("it1", "Sprint 1")], { number: 1 });
  const doneItem = makeItem([statusValue("Done", "2026-07-01T00:00:00Z"), iterationValue("it1", "Sprint 1")], { number: 2 });
  const nextSprint = makeItem([statusValue("Todo", "2026-07-01T00:00:00Z"), iterationValue("it2", "Sprint 2")], { number: 3 });
  const client = new FakeClient();

  await runRollover(makeCtx(makeGraph(fields, [toMove, doneItem, nextSprint]), cfg, client));

  assert.deepEqual(client.iterations, [{ itemId: toMove.id, iterationId: "it2" }]);
});

test("rollover in dry-run records intent but mutates nothing", async () => {
  const cfg = makeConfig({ features: { rollover: { enabled: true } } });
  const fields = [statusField(["Todo", "Done"]), iterationField([{ id: "it2", title: "S2" }], [{ id: "it1", title: "S1" }])];
  const item = makeItem([statusValue("Todo", "2026-07-01T00:00:00Z"), iterationValue("it1", "S1")], { number: 1 });
  const client = new FakeClient();
  const ctx = makeCtx(makeGraph(fields, [item]), cfg, client, true);

  await runRollover(ctx);

  assert.equal(client.iterations.length, 0);
  assert.equal(ctx.audit.count, 1);
});

test("stale-nudge comments and @-mentions assignees past the threshold", async () => {
  const cfg = makeConfig({
    features: { staleNudge: { enabled: true, rules: [{ status: "In Progress", days: 3, notify: "assignees" }] } },
  });
  const stale = makeItem([statusValue("In Progress", "2026-07-01T00:00:00Z")], { number: 5, assignees: ["alice"] });
  const fresh = makeItem([statusValue("In Progress", "2026-07-08T12:00:00Z")], { number: 6, assignees: ["bob"] });
  const client = new FakeClient().withComments([]);

  await runStaleNudge(makeCtx(makeGraph([statusField(["In Progress"])], [stale, fresh]), cfg, client));

  assert.equal(client.comments.length, 1);
  assert.equal(client.comments[0].number, 5);
  assert.match(client.comments[0].body, /@alice/);
});

test("stale-nudge does not re-nudge when a marker comment already exists for this stint", async () => {
  const cfg = makeConfig({
    features: { staleNudge: { enabled: true, rules: [{ status: "In Progress", days: 3, notify: "assignees" }] } },
  });
  const stale = makeItem([statusValue("In Progress", "2026-07-01T00:00:00Z")], { number: 5, assignees: ["alice"] });
  const client = new FakeClient().withComments([
    { body: "<!-- boardly:stale-nudge:in progress -->\nnudge", createdAt: "2026-07-05T00:00:00Z" },
  ]);

  await runStaleNudge(makeCtx(makeGraph([statusField(["In Progress"])], [stale]), cfg, client));

  assert.equal(client.comments.length, 0);
});

test("sub-issue gate warns when a Done item has open sub-issues and rolls up progress", async () => {
  const cfg = makeConfig({ features: { subIssueGate: { enabled: true, guardStatuses: ["Done"], action: "comment" } } });
  const item = makeItem([statusValue("Done", "2026-07-08T00:00:00Z")], {
    number: 7,
    subIssues: { total: 3, completed: 1, percentCompleted: 33 },
  });
  const client = new FakeClient().withComments([]);

  await runSubIssueGate(makeCtx(makeGraph([statusField(["Done", "In Progress"]), numberField("Progress")], [item]), cfg, client));

  assert.equal(client.comments.length, 1);
  assert.match(client.comments[0].body, /1\/3 sub-issues/);
  assert.deepEqual(client.numbers, [{ itemId: item.id, value: 33 }]);
});

test("sub-issue gate reverts status when action is revert", async () => {
  const cfg = makeConfig({
    features: { subIssueGate: { enabled: true, guardStatuses: ["Done"], action: "revert", revertStatus: "In Progress" } },
  });
  const item = makeItem([statusValue("Done", "2026-07-08T00:00:00Z")], {
    number: 8,
    subIssues: { total: 2, completed: 0, percentCompleted: 0 },
  });
  const client = new FakeClient().withComments([]);

  await runSubIssueGate(makeCtx(makeGraph([statusField(["Done", "In Progress"])], [item]), cfg, client));

  assert.deepEqual(client.singleSelects, [{ itemId: item.id, optionId: "opt-In Progress" }]);
});

test("priority sort reorders items highest priority first, unknown last", async () => {
  const cfg = makeConfig({ features: { prioritySort: { enabled: true, order: ["High", "Medium", "Low"] } } });
  const low = makeItem([priorityValue("Low")], { number: 1 });
  const high = makeItem([priorityValue("High")], { number: 2 });
  const none = makeItem([], { number: 3 });
  const medium = makeItem([priorityValue("Medium")], { number: 4 });
  const client = new FakeClient();

  await runPrioritySort(makeCtx(makeGraph([priorityField(["High", "Medium", "Low"])], [low, high, none, medium]), cfg, client));

  assert.deepEqual(
    client.positions.map((p) => p.itemId),
    [high.id, medium.id, low.id, none.id],
  );
  assert.equal(client.positions[0].afterId, null);
  assert.equal(client.positions[1].afterId, high.id);
});

test("priority sort is a no-op when already ordered", async () => {
  const cfg = makeConfig({ features: { prioritySort: { enabled: true, order: ["High", "Low"] } } });
  const high = makeItem([priorityValue("High")], { number: 1 });
  const low = makeItem([priorityValue("Low")], { number: 2 });
  const client = new FakeClient();

  await runPrioritySort(makeCtx(makeGraph([priorityField(["High", "Low"])], [high, low]), cfg, client));

  assert.equal(client.positions.length, 0);
});

test("digest reports completed vs carried-over and velocity for the last iteration", async () => {
  const cfg = makeConfig({ features: { digest: { enabled: true, postTo: { issue: 42 } } } });
  const fields = [statusField(["Todo", "Done"]), iterationField([], [{ id: "it1", title: "Sprint 1" }]), numberField("Estimate")];
  const doneItem = makeItem([statusValue("Done", "2026-07-08T00:00:00Z"), iterationValue("it1", "Sprint 1"), estimateValue(5)], { number: 1 });
  const carried = makeItem([statusValue("Todo", "2026-07-08T00:00:00Z"), iterationValue("it1", "Sprint 1"), estimateValue(3)], { number: 2 });
  const client = new FakeClient();

  await runDigest(makeCtx(makeGraph(fields, [doneItem, carried]), cfg, client));

  assert.equal(client.comments.length, 1);
  const body = client.comments[0].body;
  assert.match(body, /Completed:\*\* 1 \/ 2/);
  assert.match(body, /Carried over:\*\* 1/);
  assert.match(body, /Velocity:\*\* 5 of 8/);
});
