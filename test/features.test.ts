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
import { runSprintStart } from "../src/features/sprintStart.js";
import { runAutoAssign } from "../src/features/autoAssign.js";
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

test("rollover adds the new sprint label, creating it once per repo, and skips items already labelled", async () => {
  const cfg = makeConfig({ features: { rollover: { enabled: true, addSprintLabel: true, sprintLabelColor: "772fd1" } } });
  const fields = [statusField(["Todo", "Done"]), iterationField([{ id: "it2", title: "2026-S06" }], [{ id: "it1", title: "2026-S05" }])];
  const needsLabel = makeItem([statusValue("Todo", "2026-07-01T00:00:00Z"), iterationValue("it1", "2026-S05")], { number: 1 });
  const alreadyLabelled = makeItem([statusValue("Todo", "2026-07-01T00:00:00Z"), iterationValue("it1", "2026-S05")], { number: 2, labels: ["2026-S06"] });
  const client = new FakeClient();

  await runRollover(makeCtx(makeGraph(fields, [needsLabel, alreadyLabelled]), cfg, client));

  // Both items move iterations...
  assert.equal(client.iterations.length, 2);
  // ...but only the unlabelled one gets the label, and the label is created once.
  assert.deepEqual(client.ensuredLabels, [{ name: "2026-S06", color: "772fd1" }]);
  assert.deepEqual(client.labelsAdded, [{ number: 1, labels: ["2026-S06"] }]);
});

test("rollover label add in dry-run records intent but creates/adds nothing", async () => {
  const cfg = makeConfig({ features: { rollover: { enabled: true, addSprintLabel: true } } });
  const fields = [statusField(["Todo", "Done"]), iterationField([{ id: "it2", title: "S6" }], [{ id: "it1", title: "S5" }])];
  const item = makeItem([statusValue("Todo", "2026-07-01T00:00:00Z"), iterationValue("it1", "S5")], { number: 1 });
  const client = new FakeClient();
  const ctx = makeCtx(makeGraph(fields, [item]), cfg, client, true);

  await runRollover(ctx);

  assert.equal(client.ensuredLabels.length, 0);
  assert.equal(client.labelsAdded.length, 0);
  // one move-iteration record + one add-label record
  assert.equal(ctx.audit.count, 2);
});

test("sprint-start promotes cards parked before the sprint started, skipping mid-sprint moves and non-backlog", async () => {
  const cfg = makeConfig({ features: { sprintStart: { enabled: true, fromStatuses: ["Backlog"], toStatus: "Ready" } } });
  // Helper's iterationField start date is 2026-06-01, before NOW (2026-07-09) → the sprint has started.
  const fields = [statusField(["Backlog", "Ready", "Done"]), iterationField([{ id: "it1", title: "2026-S08" }], [])];
  const parked = makeItem([statusValue("Backlog", "2026-05-01T00:00:00Z"), iterationValue("it1", "2026-S08")], { number: 1 });
  const movedBack = makeItem([statusValue("Backlog", "2026-07-01T00:00:00Z"), iterationValue("it1", "2026-S08")], { number: 2 });
  const alreadyReady = makeItem([statusValue("Ready", "2026-05-01T00:00:00Z"), iterationValue("it1", "2026-S08")], { number: 3 });
  const client = new FakeClient();

  await runSprintStart(makeCtx(makeGraph(fields, [parked, movedBack, alreadyReady]), cfg, client));

  assert.deepEqual(client.singleSelects, [{ itemId: parked.id, optionId: "opt-Ready" }]);
});

test("sprint-start does nothing until the iteration has actually started", async () => {
  const cfg = makeConfig({ features: { sprintStart: { enabled: true } } });
  const futureSprint: import("../src/types.js").ProjectField = {
    id: "F_sprint", name: "Sprint", dataType: "ITERATION",
    iterations: [{ id: "it1", title: "2026-S09", startDate: "2026-08-01", duration: 14 }],
    completedIterations: [],
  };
  const fields = [statusField(["Backlog", "Ready"]), futureSprint];
  const parked = makeItem([statusValue("Backlog", "2026-05-01T00:00:00Z"), iterationValue("it1", "2026-S09")], { number: 1 });
  const client = new FakeClient();

  await runSprintStart(makeCtx(makeGraph(fields, [parked]), cfg, client));

  assert.equal(client.singleSelects.length, 0);
});

test("sprint-start in dry-run records intent but mutates nothing", async () => {
  const cfg = makeConfig({ features: { sprintStart: { enabled: true } } });
  const fields = [statusField(["Backlog", "Ready", "Done"]), iterationField([{ id: "it1", title: "2026-S08" }], [])];
  const parked = makeItem([statusValue("Backlog", "2026-05-01T00:00:00Z"), iterationValue("it1", "2026-S08")], { number: 1 });
  const client = new FakeClient();
  const ctx = makeCtx(makeGraph(fields, [parked]), cfg, client, true);

  await runSprintStart(ctx);

  assert.equal(client.singleSelects.length, 0);
  assert.equal(ctx.audit.count, 1);
});

test("auto-assign maps labels to owners, unions multiple matches, and skips assigned/non-Ready/unmapped", async () => {
  const cfg = makeConfig({
    features: {
      autoAssign: {
        enabled: true,
        onlyStatuses: ["Ready"],
        rules: [
          { label: "UI", assignees: ["zach"] },
          { label: "security", assignees: ["rajan"] },
        ],
      },
    },
  });
  const fields = [statusField(["Ready", "Backlog", "Done"])];
  const ui = makeItem([statusValue("Ready", "2026-07-09T00:00:00Z")], { number: 1, labels: ["UI"] });
  const both = makeItem([statusValue("Ready", "2026-07-09T00:00:00Z")], { number: 2, labels: ["UI", "security"] });
  const alreadyOwned = makeItem([statusValue("Ready", "2026-07-09T00:00:00Z")], { number: 3, labels: ["UI"], assignees: ["someone"] });
  const notReady = makeItem([statusValue("Backlog", "2026-07-09T00:00:00Z")], { number: 4, labels: ["UI"] });
  const unmapped = makeItem([statusValue("Ready", "2026-07-09T00:00:00Z")], { number: 5, labels: ["docs"] });
  const client = new FakeClient();

  await runAutoAssign(makeCtx(makeGraph(fields, [ui, both, alreadyOwned, notReady, unmapped]), cfg, client));

  assert.deepEqual(client.assigneesAdded, [
    { number: 1, assignees: ["zach"] },
    { number: 2, assignees: ["zach", "rajan"] },
  ]);
});

test("auto-assign matches labels case-insensitively (rule casing vs board casing)", async () => {
  const cfg = makeConfig({
    features: { autoAssign: { enabled: true, onlyStatuses: ["Ready"], rules: [{ label: "uI", assignees: ["zach"] }] } },
  });
  const fields = [statusField(["Ready"])];
  // Rule says "uI"; board labels use assorted casings — all must match.
  const a = makeItem([statusValue("Ready", "2026-07-09T00:00:00Z")], { number: 1, labels: ["UI"] });
  const b = makeItem([statusValue("Ready", "2026-07-09T00:00:00Z")], { number: 2, labels: ["ui"] });
  const c = makeItem([statusValue("Ready", "2026-07-09T00:00:00Z")], { number: 3, labels: ["Ui"] });
  const client = new FakeClient();

  await runAutoAssign(makeCtx(makeGraph(fields, [a, b, c]), cfg, client));

  assert.deepEqual(client.assigneesAdded, [
    { number: 1, assignees: ["zach"] },
    { number: 2, assignees: ["zach"] },
    { number: 3, assignees: ["zach"] },
  ]);
});

test("auto-assign in dry-run records intent but assigns nobody", async () => {
  const cfg = makeConfig({
    features: { autoAssign: { enabled: true, onlyStatuses: ["Ready"], rules: [{ label: "UI", assignees: ["zach"] }] } },
  });
  const item = makeItem([statusValue("Ready", "2026-07-09T00:00:00Z")], { number: 1, labels: ["UI"] });
  const client = new FakeClient();
  const ctx = makeCtx(makeGraph([statusField(["Ready"])], [item]), cfg, client, true);

  await runAutoAssign(ctx);

  assert.equal(client.assigneesAdded.length, 0);
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
