import axios, { AxiosError } from "axios";
import { logger } from "../utils/logger.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jiraBase(cloudId: string) {
  return `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
}

function agileBase(cloudId: string) {
  return `https://api.atlassian.com/ex/jira/${cloudId}/rest/agile/1.0`;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function handleAxiosError(err: unknown): never {
  if (err instanceof AxiosError) {
    const msg = err.response?.data?.errorMessages?.[0]
      ?? err.response?.data?.errors
      ?? err.response?.statusText
      ?? err.message;
    throw new Error(`Jira API error (${err.response?.status ?? "network"}): ${JSON.stringify(msg)}`);
  }
  throw err;
}

// Plain-text → Atlassian Document Format (minimal paragraph)
function textToAdf(text: string) {
  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  status: string;
  issueType: string;
  priority: string | null;
  assignee: string | null;
  reporter: string | null;
  description: string | null;
  labels: string[];
  created: string;
  updated: string;
  url: string;
}

export interface JiraComment {
  id: string;
  author: string;
  body: string;
  created: string;
}

export interface JiraWorklog {
  id: string;
  author: string;
  timeSpent: string;
  timeSpentSeconds: number;
  started: string;
  created: string;
  updated: string;
  comment: string | null;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: string;
  startDate: string | null;
  endDate: string | null;
  boardId: number;
  boardName: string;
}

export interface JiraBoardColumn {
  name: string;
  statuses: string[];
}

/** User row from Jira user search / assignable search (for assignee accountId). */
export interface JiraUserMatch {
  accountId: string;
  displayName: string;
  emailAddress: string | null;
  active: boolean;
  accountType: string;
}

// ─── Executor ─────────────────────────────────────────────────────────────────

export const jiraExecutor = {
  async createIssue(
    token: string,
    cloudId: string,
    siteName: string,
    payload: {
      projectKey: string;
      summary: string;
      description?: string;
      issueType: string;
      priority?: string;
      assigneeAccountId?: string;
      labels?: string[];
    }
  ): Promise<{ issueKey: string; issueId: string; url: string }> {
    logger.debug("jiraExecutor.createIssue", { project: payload.projectKey });

    const body: Record<string, unknown> = {
      fields: {
        project: { key: payload.projectKey },
        summary: payload.summary,
        issuetype: { name: payload.issueType },
        ...(payload.description && { description: textToAdf(payload.description) }),
        ...(payload.priority && { priority: { name: payload.priority } }),
        ...(payload.assigneeAccountId && { assignee: { accountId: payload.assigneeAccountId } }),
        ...(payload.labels?.length && { labels: payload.labels }),
      },
    };

    try {
      const { data } = await axios.post<{ id: string; key: string; self: string }>(
        `${jiraBase(cloudId)}/issue`,
        body,
        { headers: authHeaders(token) }
      );
      return {
        issueKey: data.key,
        issueId: data.id,
        url: `https://${siteName}.atlassian.net/browse/${data.key}`,
      };
    } catch (err) {
      handleAxiosError(err);
    }
  },

  async getIssue(token: string, cloudId: string, siteName: string, issueKey: string): Promise<JiraIssue> {
    logger.debug("jiraExecutor.getIssue", { issueKey });

    try {
      const { data } = await axios.get<{
        id: string;
        key: string;
        self: string;
        fields: {
          summary: string;
          status: { name: string };
          issuetype: { name: string };
          priority: { name: string } | null;
          assignee: { displayName: string } | null;
          reporter: { displayName: string } | null;
          description: unknown;
          labels: string[];
          created: string;
          updated: string;
        };
      }>(`${jiraBase(cloudId)}/issue/${issueKey}`, {
        headers: authHeaders(token),
      });

      return {
        id: data.id,
        key: data.key,
        summary: data.fields.summary,
        status: data.fields.status.name,
        issueType: data.fields.issuetype.name,
        priority: data.fields.priority?.name ?? null,
        assignee: data.fields.assignee?.displayName ?? null,
        reporter: data.fields.reporter?.displayName ?? null,
        description:
          typeof data.fields.description === "object" && data.fields.description !== null
            ? extractAdfText(data.fields.description as AdfNode)
            : null,
        labels: data.fields.labels ?? [],
        created: data.fields.created,
        updated: data.fields.updated,
        url: `https://${siteName}.atlassian.net/browse/${data.key}`,
      };
    } catch (err) {
      handleAxiosError(err);
    }
  },

  async updateIssue(
    token: string,
    cloudId: string,
    issueKey: string,
    updates: {
      summary?: string;
      description?: string;
      priority?: string;
      assigneeAccountId?: string;
    }
  ): Promise<void> {
    logger.debug("jiraExecutor.updateIssue", { issueKey });

    const fields: Record<string, unknown> = {};
    if (updates.summary) fields.summary = updates.summary;
    if (updates.description) fields.description = textToAdf(updates.description);
    if (updates.priority) fields.priority = { name: updates.priority };
    if (updates.assigneeAccountId) fields.assignee = { accountId: updates.assigneeAccountId };

    try {
      if (Object.keys(fields).length > 0) {
        await axios.put(
          `${jiraBase(cloudId)}/issue/${issueKey}`,
          { fields },
          { headers: authHeaders(token) }
        );
      }
    } catch (err) {
      handleAxiosError(err);
    }
  },

  async transitionIssue(
    token: string,
    cloudId: string,
    issueKey: string,
    statusName: string
  ): Promise<void> {
    logger.debug("jiraExecutor.transitionIssue", { issueKey, statusName });

    try {
      // Get available transitions
      const { data } = await axios.get<{
        transitions: Array<{ id: string; name: string }>;
      }>(`${jiraBase(cloudId)}/issue/${issueKey}/transitions`, {
        headers: authHeaders(token),
      });

      const transition = data.transitions.find(
        (t) => t.name.toLowerCase() === statusName.toLowerCase()
      );

      if (!transition) {
        const available = data.transitions.map((t) => t.name).join(", ");
        throw new Error(
          `Status "${statusName}" not found. Available: ${available}`
        );
      }

      await axios.post(
        `${jiraBase(cloudId)}/issue/${issueKey}/transitions`,
        { transition: { id: transition.id } },
        { headers: authHeaders(token) }
      );
    } catch (err) {
      handleAxiosError(err);
    }
  },

  async listIssues(
    token: string,
    cloudId: string,
    siteName: string,
    opts: {
      projectKey: string;
      status?: string;
      assigneeAccountId?: string;
      maxResults: number;
    }
  ): Promise<JiraIssue[]> {
    logger.debug("jiraExecutor.listIssues", { project: opts.projectKey });

    let jql = `project = "${opts.projectKey}"`;
    if (opts.status) jql += ` AND status = "${opts.status}"`;
    if (opts.assigneeAccountId) jql += ` AND assignee = "${opts.assigneeAccountId}"`;
    jql += " ORDER BY created DESC";

    try {
      const { data } = await axios.post<{
        issues: Array<{
          id: string;
          key: string;
          fields: {
            summary: string;
            status: { name: string };
            issuetype: { name: string };
            priority: { name: string } | null;
            assignee: { displayName: string } | null;
            reporter: { displayName: string } | null;
            description: unknown;
            labels: string[];
            created: string;
            updated: string;
          };
        }>;
      }>(`${jiraBase(cloudId)}/search/jql`, {
        jql,
        maxResults: opts.maxResults,
        fields: ["summary", "status", "issuetype", "priority", "assignee", "reporter", "description", "labels", "created", "updated"],
      }, { headers: authHeaders(token) });

      return data.issues.map((issue) => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        issueType: issue.fields.issuetype.name,
        priority: issue.fields.priority?.name ?? null,
        assignee: issue.fields.assignee?.displayName ?? null,
        reporter: issue.fields.reporter?.displayName ?? null,
        description:
          typeof issue.fields.description === "object" && issue.fields.description !== null
            ? extractAdfText(issue.fields.description as AdfNode)
            : null,
        labels: issue.fields.labels ?? [],
        created: issue.fields.created,
        updated: issue.fields.updated,
        url: `https://${siteName}.atlassian.net/browse/${issue.key}`,
      }));
    } catch (err) {
      handleAxiosError(err);
    }
  },

  /**
   * Resolve Atlassian account IDs from email, display name, or username fragment.
   * Uses global `/user/search`, or `/user/assignable/search` when scoped by issue or project.
   */
  async searchUsers(
    token: string,
    cloudId: string,
    opts: {
      query: string;
      maxResults: number;
      issueKey?: string;
      projectKey?: string;
    }
  ): Promise<JiraUserMatch[]> {
    logger.debug("jiraExecutor.searchUsers", { query: opts.query, issueKey: opts.issueKey, project: opts.projectKey });

    const params: Record<string, string | number> = {
      query: opts.query,
      maxResults: opts.maxResults,
    };

    let path: string;
    if (opts.issueKey) {
      path = "/user/assignable/search";
      params.issueKey = opts.issueKey;
    } else if (opts.projectKey) {
      path = "/user/assignable/search";
      params.project = opts.projectKey;
    } else {
      path = "/user/search";
    }

    try {
      const { data } = await axios.get<
        Array<{
          accountId: string;
          displayName: string;
          emailAddress?: string;
          active: boolean;
          accountType?: string;
        }>
      >(`${jiraBase(cloudId)}${path}`, {
        headers: authHeaders(token),
        params,
      });

      return (Array.isArray(data) ? data : []).map((u) => ({
        accountId: u.accountId,
        displayName: u.displayName,
        emailAddress: u.emailAddress ?? null,
        active: u.active,
        accountType: u.accountType ?? "atlassian",
      }));
    } catch (err) {
      handleAxiosError(err);
    }
  },

  async listWorklogs(
    token: string,
    cloudId: string,
    issueKey: string,
    maxResults: number
  ): Promise<JiraWorklog[]> {
    logger.debug("jiraExecutor.listWorklogs", { issueKey });

    try {
      const { data } = await axios.get<{
        worklogs: Array<{
          id: string;
          author: { displayName: string };
          timeSpent: string;
          timeSpentSeconds: number;
          started: string;
          created: string;
          updated: string;
          comment?: unknown;
        }>;
        total: number;
      }>(`${jiraBase(cloudId)}/issue/${issueKey}/worklog`, {
        headers: authHeaders(token),
        params: { maxResults },
      });

      return (data.worklogs ?? []).map((w) => ({
        id: w.id,
        author: w.author.displayName,
        timeSpent: w.timeSpent,
        timeSpentSeconds: w.timeSpentSeconds,
        started: w.started,
        created: w.created,
        updated: w.updated,
        comment:
          typeof w.comment === "object" && w.comment !== null
            ? extractAdfText(w.comment as AdfNode)
            : typeof w.comment === "string"
              ? w.comment
              : null,
      }));
    } catch (err) {
      handleAxiosError(err);
    }
  },

  async addWorklog(
    token: string,
    cloudId: string,
    issueKey: string,
    payload: { timeSpent: string; comment?: string; started?: string }
  ): Promise<JiraWorklog> {
    logger.debug("jiraExecutor.addWorklog", { issueKey, timeSpent: payload.timeSpent });

    const body: Record<string, unknown> = { timeSpent: payload.timeSpent };
    if (payload.comment) body.comment = textToAdf(payload.comment);
    if (payload.started) body.started = payload.started;

    try {
      const { data } = await axios.post<{
        id: string;
        author: { displayName: string };
        timeSpent: string;
        timeSpentSeconds: number;
        started: string;
        created: string;
        updated: string;
        comment?: unknown;
      }>(
        `${jiraBase(cloudId)}/issue/${issueKey}/worklog`,
        body,
        { headers: authHeaders(token) }
      );

      return {
        id: data.id,
        author: data.author.displayName,
        timeSpent: data.timeSpent,
        timeSpentSeconds: data.timeSpentSeconds,
        started: data.started,
        created: data.created,
        updated: data.updated,
        comment: payload.comment ?? null,
      };
    } catch (err) {
      handleAxiosError(err);
    }
  },

  async updateWorklog(
    token: string,
    cloudId: string,
    issueKey: string,
    worklogId: string,
    updates: { timeSpent?: string; comment?: string; started?: string }
  ): Promise<JiraWorklog> {
    logger.debug("jiraExecutor.updateWorklog", { issueKey, worklogId });

    if (!updates.timeSpent && !updates.comment && !updates.started) {
      throw new Error("Provide at least one of time_spent, comment, or started to update.");
    }

    const body: Record<string, unknown> = {};
    if (updates.timeSpent) body.timeSpent = updates.timeSpent;
    if (updates.comment !== undefined) body.comment = textToAdf(updates.comment);
    if (updates.started) body.started = updates.started;

    try {
      const { data } = await axios.put<{
        id: string;
        author: { displayName: string };
        timeSpent: string;
        timeSpentSeconds: number;
        started: string;
        created: string;
        updated: string;
        comment?: unknown;
      }>(
        `${jiraBase(cloudId)}/issue/${issueKey}/worklog/${worklogId}`,
        body,
        { headers: authHeaders(token) }
      );

      return {
        id: data.id,
        author: data.author.displayName,
        timeSpent: data.timeSpent,
        timeSpentSeconds: data.timeSpentSeconds,
        started: data.started,
        created: data.created,
        updated: data.updated,
        comment:
          typeof data.comment === "object" && data.comment !== null
            ? extractAdfText(data.comment as AdfNode)
            : updates.comment ?? null,
      };
    } catch (err) {
      handleAxiosError(err);
    }
  },

  async setStoryPoints(
    token: string,
    cloudId: string,
    issueKey: string,
    storyPoints: number,
    customFieldId = "customfield_10016"
  ): Promise<void> {
    logger.debug("jiraExecutor.setStoryPoints", { issueKey, storyPoints, customFieldId });

    try {
      await axios.put(
        `${jiraBase(cloudId)}/issue/${issueKey}`,
        { fields: { [customFieldId]: storyPoints } },
        { headers: authHeaders(token) }
      );
    } catch (err) {
      handleAxiosError(err);
    }
  },

  async listSprints(
    token: string,
    cloudId: string,
    projectKey: string,
    opts: { state?: string; maxResults: number }
  ): Promise<JiraSprint[]> {
    logger.debug("jiraExecutor.listSprints", { projectKey, state: opts.state });

    try {
      // Find boards for the project first
      const boardsRes = await axios.get<{
        values: Array<{ id: number; name: string; location?: { projectKey?: string } }>;
      }>(`${agileBase(cloudId)}/board`, {
        headers: authHeaders(token),
        params: { projectKeyOrId: projectKey, maxResults: 10 },
      });

      const boards = boardsRes.data.values ?? [];
      if (boards.length === 0) {
        throw new Error(`No Agile boards found for project "${projectKey}".`);
      }

      // Gather sprints from all boards for the project
      const results: JiraSprint[] = [];
      for (const board of boards) {
        const params: Record<string, unknown> = { maxResults: opts.maxResults };
        if (opts.state) params.state = opts.state;

        const sprintsRes = await axios.get<{
          values: Array<{
            id: number;
            name: string;
            state: string;
            startDate?: string;
            endDate?: string;
          }>;
        }>(`${agileBase(cloudId)}/board/${board.id}/sprint`, {
          headers: authHeaders(token),
          params,
        });

        for (const s of sprintsRes.data.values ?? []) {
          results.push({
            id: s.id,
            name: s.name,
            state: s.state,
            startDate: s.startDate ?? null,
            endDate: s.endDate ?? null,
            boardId: board.id,
            boardName: board.name,
          });
        }
      }

      return results.slice(0, opts.maxResults);
    } catch (err) {
      handleAxiosError(err);
    }
  },

  async moveToSprint(
    token: string,
    cloudId: string,
    sprintId: number,
    issueKey: string
  ): Promise<void> {
    logger.debug("jiraExecutor.moveToSprint", { sprintId, issueKey });

    try {
      await axios.post(
        `${agileBase(cloudId)}/sprint/${sprintId}/issue`,
        { issues: [issueKey] },
        { headers: authHeaders(token) }
      );
    } catch (err) {
      handleAxiosError(err);
    }
  },

  async listBoardColumns(
    token: string,
    cloudId: string,
    projectKey: string,
    boardId?: number
  ): Promise<{ boardId: number; boardName: string; columns: JiraBoardColumn[] }> {
    logger.debug("jiraExecutor.listBoardColumns", { projectKey, boardId });

    try {
      let resolvedBoardId: number;
      let resolvedBoardName: string;

      if (boardId) {
        resolvedBoardId = boardId;
        resolvedBoardName = `Board ${boardId}`;
      } else {
        const boardsRes = await axios.get<{
          values: Array<{ id: number; name: string }>;
        }>(`${agileBase(cloudId)}/board`, {
          headers: authHeaders(token),
          params: { projectKeyOrId: projectKey, maxResults: 1 },
        });

        const boards = boardsRes.data.values ?? [];
        if (boards.length === 0) {
          throw new Error(`No Agile boards found for project "${projectKey}".`);
        }
        resolvedBoardId = boards[0].id;
        resolvedBoardName = boards[0].name;
      }

      const { data } = await axios.get<{
        name: string;
        columnConfig: {
          columns: Array<{
            name: string;
            statuses: Array<{ id: string; self: string }>;
          }>;
        };
      }>(`${agileBase(cloudId)}/board/${resolvedBoardId}/configuration`, {
        headers: authHeaders(token),
      });

      const columns: JiraBoardColumn[] = data.columnConfig.columns.map((col) => ({
        name: col.name,
        statuses: col.statuses.map((s) => {
          // The status id in board config is a URL like .../status/3 — extract the name via self
          // or just return the id; callers can cross-reference with jira_list_issues status filter
          const parts = s.self.split("/");
          return parts[parts.length - 1];
        }),
      }));

      return { boardId: resolvedBoardId, boardName: resolvedBoardName, columns };
    } catch (err) {
      handleAxiosError(err);
    }
  },

  async addComment(
    token: string,
    cloudId: string,
    issueKey: string,
    body: string
  ): Promise<JiraComment> {
    logger.debug("jiraExecutor.addComment", { issueKey });

    try {
      const { data } = await axios.post<{
        id: string;
        author: { displayName: string };
        body: unknown;
        created: string;
      }>(
        `${jiraBase(cloudId)}/issue/${issueKey}/comment`,
        { body: textToAdf(body) },
        { headers: authHeaders(token) }
      );

      return {
        id: data.id,
        author: data.author.displayName,
        body,
        created: data.created,
      };
    } catch (err) {
      handleAxiosError(err);
    }
  },
};

// ─── ADF text extraction ──────────────────────────────────────────────────────

interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
}

function extractAdfText(node: AdfNode): string {
  if (node.type === "text") return node.text ?? "";
  if (!node.content) return "";
  return node.content.map(extractAdfText).join(" ").trim();
}
