import type { NotifyChannel, Report } from "./types.js";

/**
 * Convert the subset of GitHub-flavored Markdown we emit into Slack "mrkdwn":
 * headings → bold, `**bold**` → `*bold*`, and `[text](url)` → `<url|text>`.
 */
export function toSlackMrkdwn(md: string): string {
  return md
    .replace(/^#{1,6}\s+(.*)$/gm, "*$1*")
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<$2|$1>");
}

/** Posts reports to a Slack channel via an Incoming Webhook URL. */
export class SlackChannel implements NotifyChannel {
  readonly name = "slack";
  readonly target = "Slack webhook";

  constructor(private readonly webhookUrl: string) {}

  async send(report: Report): Promise<void> {
    const res = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: toSlackMrkdwn(report.markdown) }),
    });
    if (!res.ok) {
      throw new Error(`Slack webhook returned ${res.status} ${res.statusText}`);
    }
  }
}
