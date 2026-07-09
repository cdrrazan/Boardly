/** Normalized view of a Projects (v2) board, decoupled from the raw GraphQL shape. */

export interface IterationInfo {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  duration: number; // days
}

export interface ProjectField {
  id: string;
  name: string;
  dataType: "SINGLE_SELECT" | "ITERATION" | "NUMBER" | "TEXT" | "DATE" | "OTHER";
  options?: { id: string; name: string }[]; // for SINGLE_SELECT
  iterations?: IterationInfo[]; // active/future iterations, soonest first
  completedIterations?: IterationInfo[]; // most recent first
}

export interface IssueContent {
  type: "Issue" | "PullRequest";
  nodeId: string;
  number: number;
  title: string;
  url: string;
  state: string;
  merged?: boolean;
  closedAt: string | null;
  updatedAt: string;
  repoOwner: string;
  repoName: string;
  assignees: string[];
  subIssues?: { total: number; completed: number; percentCompleted: number };
  parent?: { number: number; title: string; url: string };
}

export interface FieldValue {
  fieldName: string;
  updatedAt: string;
  // exactly one of the following is set depending on the field type
  singleSelect?: { name: string; optionId: string };
  iteration?: { title: string; iterationId: string };
  number?: number;
  text?: string;
  date?: string;
}

export interface ProjectItem {
  id: string;
  updatedAt: string;
  fieldValues: FieldValue[];
  content?: IssueContent;
}

export interface ProjectGraph {
  id: string;
  title: string;
  fields: ProjectField[];
  items: ProjectItem[];
}
