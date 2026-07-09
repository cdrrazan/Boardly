/** A message to broadcast to external notification channels (Slack, email). */
export interface Report {
  /** Feature key that produced this report (for the audit trail). */
  feature: string;
  /** Short title (email subject / Slack heading). */
  title: string;
  /** Full body as GitHub-flavored Markdown; each channel adapts it as needed. */
  markdown: string;
}

/** A destination Boardly can deliver a {@link Report} to. */
export interface NotifyChannel {
  /** Channel kind, e.g. "slack" or "email". */
  readonly name: string;
  /** Human-readable destination, shown in the audit trail. */
  readonly target: string;
  /** Deliver the report. Should throw on a hard failure so the caller can log it. */
  send(report: Report): Promise<void>;
}
