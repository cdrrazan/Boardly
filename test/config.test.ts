import { test } from "node:test";
import assert from "node:assert/strict";
import { configSchema } from "../src/config.js";
import { iterationHasEnded, daysBetween, hoursBetween, iterationEnd } from "../src/util/dates.js";

test("config applies field-name defaults", () => {
  const cfg = configSchema.parse({ project: { owner: "acme", number: 3 }, features: {} });
  assert.equal(cfg.project.type, "org");
  assert.equal(cfg.fields.status, "Status");
  assert.deepEqual(cfg.doneStatuses, ["Done"]);
  assert.equal(cfg.features.rollover.enabled, false);
});

test("config rejects a missing project number", () => {
  const res = configSchema.safeParse({ project: { owner: "acme" }, features: {} });
  assert.equal(res.success, false);
});

test("config rejects a postTo target with neither issue nor createIssueTitle", () => {
  const res = configSchema.safeParse({
    project: { owner: "acme", number: 1 },
    features: { digest: { enabled: true, postTo: {} } },
  });
  assert.equal(res.success, false);
});

test("iterationHasEnded is true once the window has elapsed", () => {
  assert.equal(iterationHasEnded("2026-06-01", 14, new Date("2026-06-16T00:00:00Z")), true);
  assert.equal(iterationHasEnded("2026-06-01", 14, new Date("2026-06-10T00:00:00Z")), false);
});

test("daysBetween counts fractional days", () => {
  assert.equal(daysBetween(new Date("2026-07-01T00:00:00Z"), new Date("2026-07-04T00:00:00Z")), 3);
});

test("hoursBetween counts fractional hours", () => {
  assert.equal(hoursBetween(new Date("2026-07-01T00:00:00Z"), new Date("2026-07-01T06:30:00Z")), 6.5);
});

test("iterationEnd is start + duration days (exclusive)", () => {
  assert.equal(iterationEnd("2026-06-01", 14).toISOString(), "2026-06-15T00:00:00.000Z");
});
