import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findField,
  requireField,
  statusOf,
  statusUpdatedAt,
  priorityOf,
  iterationOf,
  estimateOf,
  isDone,
  optionId,
} from "../src/util/project.js";
import {
  makeConfig,
  makeGraph,
  makeItem,
  statusField,
  statusValue,
  priorityField,
  priorityValue,
  iterationField,
  iterationValue,
  estimateValue,
  numberField,
} from "./helpers.js";

const cfg = makeConfig();
const graph = makeGraph(
  [statusField(["Todo", "Done"]), priorityField(["High", "Low"]), iterationField([{ id: "it1", title: "S1" }], []), numberField("Estimate")],
  [],
);

test("findField is case-insensitive; requireField throws with the available list", () => {
  assert.equal(findField(graph, "status")?.name, "Status");
  assert.equal(findField(graph, "nope"), undefined);
  assert.throws(() => requireField(graph, "Missing", "testing"), /Available fields: Status, Priority, Sprint, Estimate/);
});

test("accessors read status, priority, iteration, and estimate by configured field name", () => {
  const item = makeItem([
    statusValue("Todo", "2026-07-01T00:00:00Z"),
    priorityValue("High"),
    iterationValue("it1", "S1"),
    estimateValue(8),
  ]);
  assert.equal(statusOf(item, cfg), "Todo");
  assert.equal(statusUpdatedAt(item, cfg), "2026-07-01T00:00:00Z");
  assert.equal(priorityOf(item, cfg), "High");
  assert.deepEqual(iterationOf(item, cfg), { title: "S1", iterationId: "it1" });
  assert.equal(estimateOf(item, cfg), 8);
});

test("estimateOf returns undefined when no estimate field is configured", () => {
  const noEstimate = makeConfig({ fields: { status: "Status", iteration: "Sprint", priority: "Priority" } });
  const item = makeItem([estimateValue(8)]);
  assert.equal(estimateOf(item, noEstimate), undefined);
});

test("isDone matches doneStatuses case-insensitively", () => {
  assert.equal(isDone(makeItem([statusValue("done", "t")]), cfg), true);
  assert.equal(isDone(makeItem([statusValue("Todo", "t")]), cfg), false);
  assert.equal(isDone(makeItem([]), cfg), false); // no status
});

test("optionId resolves a single-select option id case-insensitively", () => {
  const field = statusField(["Todo", "In Progress"]);
  assert.equal(optionId(field, "in progress"), "opt-In Progress");
  assert.equal(optionId(field, "unknown"), undefined);
});
