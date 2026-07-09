import * as core from "@actions/core";
import type { Config } from "../config.js";
import type { Audit } from "../util/audit.js";
import type { NotifyChannel, Report } from "./types.js";
import { SlackChannel } from "./slack.js";
import { EmailChannel } from "./email.js";

/**
 * Fans a {@link Report} out to every configured external channel. Records each
 * delivery in the audit trail, honors `dryRun`, and never lets one channel's
 * failure abort the run (or the other channels).
 */
export class Notifier {
  constructor(
    private readonly channels: NotifyChannel[],
    private readonly dryRun: boolean,
    private readonly audit: Audit,
  ) {}

  /** Number of active channels (0 means notifications are effectively off). */
  get channelCount(): number {
    return this.channels.length;
  }

  async broadcast(report: Report): Promise<void> {
    for (const ch of this.channels) {
      this.audit.record(report.feature, `notify:${ch.name}`, ch.target, report.title);
      if (this.dryRun) continue;
      try {
        await ch.send(report);
      } catch (err) {
        core.warning(`Notification via ${ch.name} failed: ${(err as Error).message}`);
      }
    }
  }
}

/**
 * Build a Notifier from config. Secrets (webhook URL, SMTP credentials) are read
 * from environment variables named in the config — never from the config file
 * itself — so they can be supplied as encrypted CI secrets.
 */
export function buildNotifier(cfg: Config, env: NodeJS.ProcessEnv, dryRun: boolean, audit: Audit): Notifier {
  const channels: NotifyChannel[] = [];
  const n = cfg.notifications;

  if (n?.slack?.enabled) {
    const url = env[n.slack.webhookEnv];
    if (!url) {
      core.warning(`Slack notifications enabled but env var "${n.slack.webhookEnv}" is empty; skipping Slack.`);
    } else {
      channels.push(new SlackChannel(url));
    }
  }

  if (n?.email?.enabled) {
    channels.push(
      new EmailChannel({
        host: n.email.host,
        port: n.email.port,
        secure: n.email.secure,
        user: n.email.userEnv ? env[n.email.userEnv] : undefined,
        pass: n.email.passwordEnv ? env[n.email.passwordEnv] : undefined,
        from: n.email.from,
        to: n.email.to,
      }),
    );
  }

  return new Notifier(channels, dryRun, audit);
}
