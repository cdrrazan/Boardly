import * as github from "@actions/github";
import type { ProjectField, ProjectGraph, ProjectItem } from "../types.js";
import { normalizeFields, normalizeItem } from "./normalize.js";
import {
  projectQuery,
  setIterationMutation,
  setNumberMutation,
  setPositionMutation,
  setSingleSelectMutation,
} from "./queries.js";

type Octokit = ReturnType<typeof github.getOctokit>;

// Sub-issue fields (`subIssuesSummary`, `parent`) live behind a feature flag header.
const SUB_ISSUE_HEADERS = { "GraphQL-Features": "sub_issues" };

/** Thin wrapper over Octokit that speaks the Projects (v2) GraphQL API. */
export class ProjectClient {
  private readonly octokit: Octokit;

  constructor(token: string) {
    this.octokit = github.getOctokit(token);
  }

  /** Fetch the whole project (all fields + all items, paged) as a normalized graph. */
  async fetchProject(owner: string, type: "org" | "user", number: number): Promise<ProjectGraph> {
    const query = projectQuery(type);
    const items: ProjectItem[] = [];
    let cursor: string | null = null;
    let head: { id: string; title: string; fields: ProjectField[] } | undefined;

    do {
      const resp: any = await this.octokit.graphql(query, {
        owner,
        number,
        cursor,
        headers: SUB_ISSUE_HEADERS,
      });
      const project = type === "org" ? resp.organization?.projectV2 : resp.user?.projectV2;
      if (!project) {
        throw new Error(
          `Project #${number} not found for ${type} "${owner}". Check project.owner/type/number and that the token can read it.`,
        );
      }
      if (!head) {
        head = { id: project.id, title: project.title, fields: normalizeFields(project.fields.nodes) };
      }
      for (const node of project.items.nodes) {
        items.push(normalizeItem(node));
      }
      cursor = project.items.pageInfo.hasNextPage ? project.items.pageInfo.endCursor : null;
    } while (cursor);

    return { id: head!.id, title: head!.title, fields: head!.fields, items };
  }

  /**
   * Set a single-select field (e.g. Status/Priority) on an item.
   * @param optionId The option's node id, resolved via {@link import("../util/project.js").optionId}.
   */
  async setSingleSelect(projectId: string, itemId: string, fieldId: string, optionId: string): Promise<void> {
    await this.octokit.graphql(setSingleSelectMutation, { projectId, itemId, fieldId, optionId });
  }

  /**
   * Assign an item to an iteration.
   * @param iterationId The iteration id from the iteration field's configuration.
   */
  async setIteration(projectId: string, itemId: string, fieldId: string, iterationId: string): Promise<void> {
    await this.octokit.graphql(setIterationMutation, { projectId, itemId, fieldId, iterationId });
  }

  /** Set a Number field on an item (used for the sub-issue progress roll-up). */
  async setNumber(projectId: string, itemId: string, fieldId: string, value: number): Promise<void> {
    await this.octokit.graphql(setNumberMutation, { projectId, itemId, fieldId, number: value });
  }

  /**
   * Move an item within the project's manual order.
   * @param afterId Place the item immediately after this item id, or `null` to move it to the top.
   */
  async setPosition(projectId: string, itemId: string, afterId: string | null): Promise<void> {
    await this.octokit.graphql(setPositionMutation, { projectId, itemId, afterId });
  }

  /** Create a comment on an issue/PR (used for nudges, gate warnings, digests, and standups). */
  async comment(owner: string, repo: string, issueNumber: number, body: string): Promise<void> {
    await this.octokit.rest.issues.createComment({ owner, repo, issue_number: issueNumber, body });
  }

  /**
   * List recent comment bodies on an issue/PR, newest page last.
   * Used to de-duplicate nudges/gate warnings by scanning for hidden markers.
   */
  async listComments(owner: string, repo: string, issueNumber: number): Promise<{ body: string; createdAt: string }[]> {
    const resp = await this.octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100,
    });
    return resp.data.map((c) => ({ body: c.body ?? "", createdAt: c.created_at }));
  }

  /** Create a new issue and return its number. */
  async createIssue(owner: string, repo: string, title: string, body: string, labels: string[]): Promise<number> {
    const resp = await this.octokit.rest.issues.create({ owner, repo, title, body, labels });
    return resp.data.number;
  }
}
