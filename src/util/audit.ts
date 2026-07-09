import * as core from "@actions/core";

export interface AuditEntry {
  feature: string;
  action: string;
  target: string;
  detail: string;
  applied: boolean; // false when skipped due to dry-run
}

/**
 * Collects every action a run takes (or would take, under dry-run) and flushes
 * it to the Actions job summary plus the run log. This is the "audit trail"
 * feature: a durable, human-readable record of what the bot did and why.
 */
export class Audit {
  private readonly entries: AuditEntry[] = [];

  constructor(private readonly dryRun: boolean) {}

  record(feature: string, action: string, target: string, detail: string): void {
    const applied = !this.dryRun;
    this.entries.push({ feature, action, target, detail, applied });
    const prefix = this.dryRun ? "[dry-run] would " : "";
    core.info(`${prefix}${feature} · ${action} · ${target} — ${detail}`);
  }

  get count(): number {
    return this.entries.length;
  }

  async flush(projectTitle: string): Promise<void> {
    if (this.entries.length === 0) {
      core.summary.addHeading("Boardly", 2);
      core.summary.addRaw(`No actions taken on **${projectTitle}**.`, true);
      await core.summary.write();
      return;
    }

    core.summary
      .addHeading("Boardly", 2)
      .addRaw(
        `${this.entries.length} action(s) on **${projectTitle}**` +
          (this.dryRun ? " _(dry-run — nothing was changed)_" : ""),
        true,
      )
      .addTable([
        [
          { data: "Feature", header: true },
          { data: "Action", header: true },
          { data: "Target", header: true },
          { data: "Detail", header: true },
          { data: "Applied", header: true },
        ],
        ...this.entries.map((e) => [
          e.feature,
          e.action,
          e.target,
          e.detail,
          e.applied ? "yes" : "dry-run",
        ]),
      ]);
    await core.summary.write();
  }
}
