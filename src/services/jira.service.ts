import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  jiraExecutor,
  type JiraIssue,
  type JiraComment,
  type JiraUserMatch,
  type JiraWorklog,
  type JiraSprint,
} from "../executors/jira.executor.js";
import { resolveJiraProjectKey } from "../utils/jira-defaults.js";
import type {
  CreateIssueInput,
  GetIssueInput,
  UpdateIssueInput,
  ListIssuesInput,
  AddCommentInput,
  FindUsersInput,
  AddWorklogInput,
  UpdateWorklogInput,
  ListWorklogsInput,
  SetStoryPointsInput,
  ListSprintsInput,
  MoveToSprintInput,
} from "../schemas/jira.schemas.js";

const USER_ID = "default";

export const jiraService = {
  async createIssue(input: CreateIssueInput): Promise<{
    issueKey: string;
    issueId: string;
    url: string;
    message: string;
  }> {
    const { token, cloudId, cloudName } = await authMiddleware("jira", USER_ID);
    const projectKey = resolveJiraProjectKey(input.project_key);

    const result = await jiraExecutor.createIssue(token, cloudId!, cloudName!, {
      projectKey,
      summary: input.title,
      description: input.description,
      issueType: input.issue_type,
      priority: input.priority,
      assigneeAccountId: input.assignee_account_id,
      labels: input.labels,
    });

    return {
      ...result,
      message: `Successfully created ${input.issue_type} ${result.issueKey}: "${input.title}"`,
    };
  },

  async getIssue(input: GetIssueInput): Promise<JiraIssue> {
    const { token, cloudId, cloudName } = await authMiddleware("jira", USER_ID);
    return jiraExecutor.getIssue(token, cloudId!, cloudName!, input.issue_key);
  },

  async updateIssue(input: UpdateIssueInput): Promise<{ message: string }> {
    const { token, cloudId } = await authMiddleware("jira", USER_ID);

    const { status, issue_key, ...updates } = input;

    // Field updates
    if (updates.title || updates.description || updates.priority || updates.assignee_account_id) {
      await jiraExecutor.updateIssue(token, cloudId!, issue_key, {
        summary: updates.title,
        description: updates.description,
        priority: updates.priority,
        assigneeAccountId: updates.assignee_account_id,
      });
    }

    // Status transition
    if (status) {
      await jiraExecutor.transitionIssue(token, cloudId!, issue_key, status);
    }

    return { message: `Successfully updated ${issue_key}` };
  },

  async listIssues(input: ListIssuesInput): Promise<{ issues: JiraIssue[]; count: number }> {
    const { token, cloudId, cloudName } = await authMiddleware("jira", USER_ID);
    const projectKey = resolveJiraProjectKey(input.project_key);

    const issues = await jiraExecutor.listIssues(token, cloudId!, cloudName!, {
      projectKey,
      status: input.status,
      assigneeAccountId: input.assignee_account_id,
      maxResults: input.max_results,
    });

    return { issues, count: issues.length };
  },

  async addComment(input: AddCommentInput): Promise<JiraComment & { message: string }> {
    const { token, cloudId } = await authMiddleware("jira", USER_ID);
    const comment = await jiraExecutor.addComment(token, cloudId!, input.issue_key, input.body);
    return { ...comment, message: `Comment added to ${input.issue_key}` };
  },

  async listWorklogs(input: ListWorklogsInput): Promise<{
    worklogs: JiraWorklog[];
    count: number;
  }> {
    const { token, cloudId } = await authMiddleware("jira", USER_ID);
    const worklogs = await jiraExecutor.listWorklogs(
      token,
      cloudId!,
      input.issue_key,
      input.max_results
    );
    return { worklogs, count: worklogs.length };
  },

  async addWorklog(input: AddWorklogInput): Promise<JiraWorklog & { message: string }> {
    const { token, cloudId } = await authMiddleware("jira", USER_ID);
    const worklog = await jiraExecutor.addWorklog(token, cloudId!, input.issue_key, {
      timeSpent: input.time_spent,
      comment: input.comment,
      started: input.started,
    });
    return {
      ...worklog,
      message: `Logged ${input.time_spent} on ${input.issue_key} (worklog ${worklog.id})`,
    };
  },

  async updateWorklog(input: UpdateWorklogInput): Promise<JiraWorklog & { message: string }> {
    const { token, cloudId } = await authMiddleware("jira", USER_ID);
    const worklog = await jiraExecutor.updateWorklog(
      token,
      cloudId!,
      input.issue_key,
      input.worklog_id,
      {
        timeSpent: input.time_spent,
        comment: input.comment,
        started: input.started,
      }
    );
    return {
      ...worklog,
      message: `Updated worklog ${input.worklog_id} on ${input.issue_key}`,
    };
  },

  async findUsers(input: FindUsersInput): Promise<{
    users: JiraUserMatch[];
    count: number;
    hint: string;
  }> {
    const { token, cloudId } = await authMiddleware("jira", USER_ID);

    let projectKey: string | undefined;
    if (!input.issue_key && input.project_key !== undefined) {
      projectKey = resolveJiraProjectKey(input.project_key);
    }

    const users = await jiraExecutor.searchUsers(token, cloudId!, {
      query: input.query,
      maxResults: input.max_results,
      issueKey: input.issue_key,
      projectKey,
    });

    const hint =
      users.length === 0
        ? "No users matched. Try a different query, or set issue_key (e.g. SCRUM-1) to search only assignable users."
        : users.length === 1
          ? "Use users[0].accountId as assignee_account_id (or in jira_list_issues filter)."
          : "Multiple matches: pick the correct accountId from the list, then call jira_update_issue.";

    return { users, count: users.length, hint };
  },

  async setStoryPoints(input: SetStoryPointsInput): Promise<{ message: string }> {
    const { token, cloudId } = await authMiddleware("jira", USER_ID);
    await jiraExecutor.setStoryPoints(
      token,
      cloudId!,
      input.issue_key,
      input.story_points,
      input.custom_field_id
    );
    return {
      message: `Set story points to ${input.story_points} on ${input.issue_key}`,
    };
  },

  async listSprints(input: ListSprintsInput): Promise<{ sprints: JiraSprint[]; count: number }> {
    const { token, cloudId } = await authMiddleware("jira", USER_ID);
    const projectKey = resolveJiraProjectKey(input.project_key);
    const sprints = await jiraExecutor.listSprints(token, cloudId!, projectKey, {
      state: input.state,
      maxResults: input.max_results,
    });
    return { sprints, count: sprints.length };
  },

  async moveToSprint(input: MoveToSprintInput): Promise<{ message: string }> {
    const { token, cloudId } = await authMiddleware("jira", USER_ID);
    await jiraExecutor.moveToSprint(token, cloudId!, input.sprint_id, input.issue_key);
    return {
      message: `Moved ${input.issue_key} to sprint ${input.sprint_id}`,
    };
  },
};
