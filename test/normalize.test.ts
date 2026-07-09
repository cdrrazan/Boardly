import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeFields, normalizeItem } from "../src/github/normalize.js";

test("normalizeFields maps single-select options and drops empty nodes", () => {
  const fields = normalizeFields([
    { id: "F1", name: "Status", dataType: "SINGLE_SELECT", options: [{ id: "o1", name: "Todo" }] },
    {}, // empty union member → dropped
  ]);
  assert.equal(fields.length, 1);
  assert.equal(fields[0].name, "Status");
  assert.deepEqual(fields[0].options, [{ id: "o1", name: "Todo" }]);
});

test("normalizeFields reverses completed iterations to most-recent-first", () => {
  const [field] = normalizeFields([
    {
      id: "F2",
      name: "Sprint",
      dataType: "ITERATION",
      configuration: {
        iterations: [{ id: "it3", title: "S3", startDate: "2026-07-01", duration: 14 }],
        completedIterations: [
          { id: "it1", title: "S1", startDate: "2026-06-01", duration: 14 },
          { id: "it2", title: "S2", startDate: "2026-06-15", duration: 14 },
        ],
      },
    },
  ]);
  assert.deepEqual(field.iterations?.map((i) => i.id), ["it3"]);
  // GitHub returns oldest-first; we expose most-recent-first.
  assert.deepEqual(field.completedIterations?.map((i) => i.id), ["it2", "it1"]);
});

test("normalizeItem extracts typed field values by field name", () => {
  const item = normalizeItem({
    id: "PVTI_1",
    updatedAt: "2026-07-08T00:00:00Z",
    fieldValues: {
      nodes: [
        { __typename: "ProjectV2ItemFieldSingleSelectValue", name: "In Progress", optionId: "opt1", updatedAt: "t1", field: { name: "Status" } },
        { __typename: "ProjectV2ItemFieldIterationValue", title: "Sprint 1", iterationId: "it1", updatedAt: "t2", field: { name: "Sprint" } },
        { __typename: "ProjectV2ItemFieldNumberValue", number: 5, updatedAt: "t3", field: { name: "Estimate" } },
        { __typename: "ProjectV2ItemFieldTextValue", text: "note", updatedAt: "t4", field: { name: "Notes" } },
        { __typename: "ProjectV2ItemFieldDateValue", date: "2026-07-10", updatedAt: "t5", field: { name: "Due" } },
        { __typename: "ProjectV2ItemFieldSingleSelectValue", name: "orphan", updatedAt: "t6" }, // no field.name → skipped
        { __typename: "SomethingUnknown", updatedAt: "t7", field: { name: "X" } }, // unknown → skipped
      ],
    },
    content: null,
  });

  assert.equal(item.fieldValues.length, 5);
  assert.deepEqual(item.fieldValues.find((v) => v.fieldName === "Status")?.singleSelect, { name: "In Progress", optionId: "opt1" });
  assert.deepEqual(item.fieldValues.find((v) => v.fieldName === "Sprint")?.iteration, { title: "Sprint 1", iterationId: "it1" });
  assert.equal(item.fieldValues.find((v) => v.fieldName === "Estimate")?.number, 5);
  assert.equal(item.fieldValues.find((v) => v.fieldName === "Notes")?.text, "note");
  assert.equal(item.fieldValues.find((v) => v.fieldName === "Due")?.date, "2026-07-10");
  assert.equal(item.content, undefined);
});

test("normalizeItem maps Issue content with assignees, sub-issues, and parent", () => {
  const item = normalizeItem({
    id: "PVTI_2",
    updatedAt: "2026-07-08T00:00:00Z",
    fieldValues: { nodes: [] },
    content: {
      __typename: "Issue",
      id: "I_10",
      number: 10,
      title: "Epic",
      url: "https://github.com/acme/repo/issues/10",
      state: "OPEN",
      closedAt: null,
      updatedAt: "2026-07-07T00:00:00Z",
      repository: { owner: { login: "acme" }, name: "repo" },
      assignees: { nodes: [{ login: "alice" }, { login: "bob" }] },
      subIssuesSummary: { total: 4, completed: 3, percentCompleted: 75 },
      parent: { number: 2, title: "Parent", url: "https://github.com/acme/repo/issues/2" },
    },
  });

  assert.equal(item.content?.type, "Issue");
  assert.deepEqual(item.content?.assignees, ["alice", "bob"]);
  assert.deepEqual(item.content?.subIssues, { total: 4, completed: 3, percentCompleted: 75 });
  assert.equal(item.content?.parent?.number, 2);
  assert.equal(item.content?.repoOwner, "acme");
});

test("normalizeItem treats draft issues as having no content", () => {
  const item = normalizeItem({
    id: "PVTI_3",
    updatedAt: "2026-07-08T00:00:00Z",
    fieldValues: { nodes: [] },
    content: { __typename: "DraftIssue", title: "just an idea" },
  });
  assert.equal(item.content, undefined);
});

test("normalizeItem maps PullRequest content including merged flag", () => {
  const item = normalizeItem({
    id: "PVTI_4",
    updatedAt: "2026-07-08T00:00:00Z",
    fieldValues: { nodes: [] },
    content: {
      __typename: "PullRequest",
      id: "PR_1",
      number: 20,
      title: "Fix",
      url: "https://github.com/acme/repo/pull/20",
      state: "MERGED",
      merged: true,
      closedAt: "2026-07-06T00:00:00Z",
      updatedAt: "2026-07-06T00:00:00Z",
      repository: { owner: { login: "acme" }, name: "repo" },
      assignees: { nodes: [] },
    },
  });
  assert.equal(item.content?.type, "PullRequest");
  assert.equal(item.content?.merged, true);
  assert.deepEqual(item.content?.assignees, []);
  assert.equal(item.content?.subIssues, undefined);
});
