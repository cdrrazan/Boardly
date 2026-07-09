import type { Config } from "../config.js";
import type { FieldValue, ProjectField, ProjectGraph, ProjectItem } from "../types.js";

/** Look up a project field by (case-insensitive) name. */
export function findField(graph: ProjectGraph, name: string | undefined): ProjectField | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  return graph.fields.find((f) => f.name.toLowerCase() === lower);
}

/** Require a field to exist, throwing a helpful error if the config points at a missing field. */
export function requireField(graph: ProjectGraph, name: string, purpose: string): ProjectField {
  const field = findField(graph, name);
  if (!field) {
    const available = graph.fields.map((f) => f.name).join(", ");
    throw new Error(`Field "${name}" (needed for ${purpose}) not found on project. Available fields: ${available}`);
  }
  return field;
}

function valueFor(item: ProjectItem, fieldName: string): FieldValue | undefined {
  const lower = fieldName.toLowerCase();
  return item.fieldValues.find((v) => v.fieldName.toLowerCase() === lower);
}

export function statusOf(item: ProjectItem, cfg: Config): string | undefined {
  return valueFor(item, cfg.fields.status)?.singleSelect?.name;
}

/** When the Status field value was last changed — our proxy for "time in column". */
export function statusUpdatedAt(item: ProjectItem, cfg: Config): string | undefined {
  return valueFor(item, cfg.fields.status)?.updatedAt;
}

/** The item's Priority option name, or undefined if unset. */
export function priorityOf(item: ProjectItem, cfg: Config): string | undefined {
  return valueFor(item, cfg.fields.priority)?.singleSelect?.name;
}

/** The iteration the item is assigned to (title + id), or undefined if unset. */
export function iterationOf(item: ProjectItem, cfg: Config): { title: string; iterationId: string } | undefined {
  return valueFor(item, cfg.fields.iteration)?.iteration;
}

/** The item's Estimate value, or undefined if no estimate field is configured or set. */
export function estimateOf(item: ProjectItem, cfg: Config): number | undefined {
  if (!cfg.fields.estimate) return undefined;
  return valueFor(item, cfg.fields.estimate)?.number;
}

/** True when the item's status is one of `doneStatuses` (case-insensitive). */
export function isDone(item: ProjectItem, cfg: Config): boolean {
  const status = statusOf(item, cfg);
  if (!status) return false;
  return cfg.doneStatuses.some((d) => d.toLowerCase() === status.toLowerCase());
}

/** Resolve a single-select option id by option name (case-insensitive). */
export function optionId(field: ProjectField, name: string): string | undefined {
  const lower = name.toLowerCase();
  return field.options?.find((o) => o.name.toLowerCase() === lower)?.id;
}
