import { test } from "node:test";
import assert from "node:assert/strict";
import { toSlackMrkdwn } from "../src/notify/slack.js";
import { Notifier, buildNotifier } from "../src/notify/notifier.js";
import { Audit } from "../src/util/audit.js";
import type { NotifyChannel, Report } from "../src/notify/types.js";
import {
  FakeChannel,
  FakeClient,
  makeConfig,
  makeCtx,
  makeGraph,
  makeItem,
  statusField,
  statusValue,
  iterationField,
  iterationValue,
} from "./helpers.js";
import { runDigest } from "../src/features/digest.js";
import { runStaleNudge } from "../src/features/staleNudge.js";

test("toSlackMrkdwn converts headings, bold, and links", () => {
  const out = toSlackMrkdwn("## Title\nSome **bold** and a [link](https://x.dev).");
  assert.match(out, /^\*Title\*/m);
  assert.match(out, /\*bold\*/);
  assert.match(out, /<https:\/\/x\.dev\|link>/);
});

test("Notifier broadcasts to every channel and records the audit trail", async () => {
  const audit = new Audit(false);
  const a = new FakeChannel("slack");
  const b = new FakeChannel("email");
  const notifier = new Notifier([a, b], false, audit);

  await notifier.broadcast({ feature: "digest", title: "Sprint digest", markdown: "body" });

  assert.equal(a.sent.length, 1);
  assert.equal(b.sent.length, 1);
  assert.equal(audit.count, 2);
});

test("Notifier in dry-run records but does not send", async () => {
  const audit = new Audit(true);
  const ch = new FakeChannel("slack");
  const notifier = new Notifier([ch], true, audit);

  await notifier.broadcast({ feature: "standup", title: "Standup", markdown: "body" });

  assert.equal(ch.sent.length, 0);
  assert.equal(audit.count, 1);
});

test("Notifier isolates a failing channel from the others", async () => {
  const audit = new Audit(false);
  const boom: NotifyChannel = {
    name: "boom",
    target: "x",
    send: async () => {
      throw new Error("down");
    },
  };
  const ok = new FakeChannel("ok");
  const notifier = new Notifier([boom, ok], false, audit);

  await notifier.broadcast({ feature: "digest", title: "t", markdown: "b" });

  assert.equal(ok.sent.length, 1); // sibling still delivered
});

test("buildNotifier creates a Slack channel only when the webhook env is set", () => {
  const cfg = makeConfig({ notifications: { slack: { enabled: true, webhookEnv: "HOOK" } } });
  assert.equal(buildNotifier(cfg, {}, false, new Audit(false)).channelCount, 0); // env missing
  assert.equal(buildNotifier(cfg, { HOOK: "https://hooks.slack" }, false, new Audit(false)).channelCount, 1);
});

test("buildNotifier adds an email channel when email is enabled", () => {
  const cfg = makeConfig({
    notifications: { email: { enabled: true, host: "smtp.x", from: "a@x", to: ["b@x"] } },
  });
  assert.equal(buildNotifier(cfg, {}, false, new Audit(false)).channelCount, 1);
});

test("digest broadcasts to external channels", async () => {
  const cfg = makeConfig({ features: { digest: { enabled: true, postTo: { issue: 1 } } } });
  const fields = [statusField(["Done"]), iterationField([], [{ id: "it1", title: "S1" }])];
  const done = makeItem([statusValue("Done", "t"), iterationValue("it1", "S1")], { number: 1 });
  const ch = new FakeChannel("slack");

  await runDigest(makeCtx(makeGraph(fields, [done]), cfg, new FakeClient(), false, [ch]));

  assert.equal(ch.sent.length, 1);
  assert.equal(ch.sent[0].feature, "digest");
});

test("stale-nudge broadcasts an alert to external channels", async () => {
  const cfg = makeConfig({
    features: { staleNudge: { enabled: true, rules: [{ status: "In Progress", days: 1 }] } },
  });
  const item = makeItem([statusValue("In Progress", "2026-07-01T00:00:00Z")], { number: 5, assignees: ["alice"] });
  const ch = new FakeChannel("slack");

  await runStaleNudge(makeCtx(makeGraph([statusField(["In Progress"])], [item]), cfg, new FakeClient().withComments([]), false, [ch]));

  assert.equal(ch.sent.length, 1);
  assert.match(ch.sent[0].markdown, /In Progress/);
});
