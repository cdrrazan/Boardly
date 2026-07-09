import nodemailer, { type Transporter } from "nodemailer";
import type { NotifyChannel, Report } from "./types.js";

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  to: string[];
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Sends reports as email over SMTP (via nodemailer). */
export class EmailChannel implements NotifyChannel {
  readonly name = "email";
  readonly target: string;
  private readonly transport: Transporter;

  constructor(private readonly cfg: EmailConfig) {
    this.target = cfg.to.join(", ");
    this.transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
  }

  async send(report: Report): Promise<void> {
    await this.transport.sendMail({
      from: this.cfg.from,
      to: this.cfg.to,
      subject: report.title,
      text: report.markdown,
      // Preserve the markdown layout in HTML-capable clients without a full renderer.
      html: `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(report.markdown)}</pre>`,
    });
  }
}
