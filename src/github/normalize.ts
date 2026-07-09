import type { FieldValue, IssueContent, ProjectField, ProjectItem } from "../types.js";

/**
 * Pure translators from raw Projects (v2) GraphQL JSON into our normalized
 * domain model. Kept free of any I/O so they can be unit-tested directly.
 */

/** Map a raw iteration node to {@link import("../types.js").IterationInfo}. */
function mapIteration(i: any) {
  return { id: i.id, title: i.title, startDate: i.startDate, duration: i.duration };
}

/**
 * Normalize the project's `fields.nodes` array.
 * Single-select fields keep their `options`; iteration fields expose their
 * active `iterations` and `completedIterations` (re-ordered most-recent-first,
 * since GitHub returns them oldest-first). Nodes without an `id` (e.g. an empty
 * union member) are dropped.
 */
export function normalizeFields(nodes: any[]): ProjectField[] {
  return nodes
    .filter((n) => n && n.id)
    .map((n) => {
      const field: ProjectField = { id: n.id, name: n.name, dataType: n.dataType ?? "OTHER" };
      if (n.options) field.options = n.options.map((o: any) => ({ id: o.id, name: o.name }));
      if (n.configuration) {
        field.iterations = (n.configuration.iterations ?? []).map(mapIteration);
        // GitHub returns completed iterations oldest-first; reverse to most-recent-first.
        field.completedIterations = (n.configuration.completedIterations ?? []).map(mapIteration).reverse();
      }
      return field;
    });
}

/**
 * Normalize a single `ProjectV2Item` node: its typed field values and, when the
 * content is an Issue or Pull Request, the linked content (assignees, sub-issue
 * summary, parent). Draft issues yield `content: undefined`. Field values of an
 * unrecognized type are skipped.
 */
export function normalizeItem(node: any): ProjectItem {
  const fieldValues: FieldValue[] = [];
  for (const fv of node.fieldValues?.nodes ?? []) {
    const fieldName = fv.field?.name;
    if (!fieldName) continue;
    const base: FieldValue = { fieldName, updatedAt: fv.updatedAt };
    switch (fv.__typename) {
      case "ProjectV2ItemFieldSingleSelectValue":
        base.singleSelect = { name: fv.name, optionId: fv.optionId };
        break;
      case "ProjectV2ItemFieldIterationValue":
        base.iteration = { title: fv.title, iterationId: fv.iterationId };
        break;
      case "ProjectV2ItemFieldNumberValue":
        base.number = fv.number;
        break;
      case "ProjectV2ItemFieldTextValue":
        base.text = fv.text;
        break;
      case "ProjectV2ItemFieldDateValue":
        base.date = fv.date;
        break;
      default:
        continue;
    }
    fieldValues.push(base);
  }

  let content: IssueContent | undefined;
  const c = node.content;
  if (c && (c.__typename === "Issue" || c.__typename === "PullRequest")) {
    content = {
      type: c.__typename,
      nodeId: c.id,
      number: c.number,
      title: c.title,
      url: c.url,
      state: c.state,
      merged: c.merged,
      closedAt: c.closedAt ?? null,
      updatedAt: c.updatedAt,
      repoOwner: c.repository.owner.login,
      repoName: c.repository.name,
      assignees: (c.assignees?.nodes ?? []).map((a: any) => a.login),
      subIssues: c.subIssuesSummary
        ? {
            total: c.subIssuesSummary.total,
            completed: c.subIssuesSummary.completed,
            percentCompleted: c.subIssuesSummary.percentCompleted,
          }
        : undefined,
      parent: c.parent ? { number: c.parent.number, title: c.parent.title, url: c.parent.url } : undefined,
    };
  }

  return { id: node.id, updatedAt: node.updatedAt, fieldValues, content };
}
