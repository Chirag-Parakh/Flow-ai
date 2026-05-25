import { z } from "zod";

export const createIssueSchema = z.object({
  project_key: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Jira project key (prefix in SCRUM-1 → SCRUM). Omit to use DEFAULT_JIRA_PROJECT_KEY from server .env."
    ),
  title: z
    .string()
    .min(1)
    .describe("Issue summary / title"),
  description: z
    .string()
    .optional()
    .describe("Issue description (plain text)"),
  issue_type: z
    .enum(["Bug", "Task", "Story", "Epic", "Subtask"])
    .default("Task")
    .describe("Jira issue type"),
  priority: z
    .enum(["Highest", "High", "Medium", "Low", "Lowest"])
    .optional()
    .describe("Issue priority"),
  assignee_account_id: z
    .string()
    .optional()
    .describe(
      "Atlassian account ID of the assignee. Use jira_find_users with email or name to resolve the ID."
    ),
  labels: z
    .array(z.string())
    .optional()
    .describe("Labels to attach to the issue"),
});

export const getIssueSchema = z.object({
  issue_key: z
    .string()
    .min(1)
    .describe("Jira issue key, e.g. AUTH-21"),
});

export const updateIssueSchema = z.object({
  issue_key: z
    .string()
    .min(1)
    .describe("Jira issue key to update, e.g. AUTH-21"),
  title: z
    .string()
    .optional()
    .describe("New summary / title"),
  description: z
    .string()
    .optional()
    .describe("New description (plain text)"),
  status: z
    .string()
    .optional()
    .describe("Transition to this status name, e.g. In Progress, Done"),
  priority: z
    .enum(["Highest", "High", "Medium", "Low", "Lowest"])
    .optional()
    .describe("New priority"),
  assignee_account_id: z
    .string()
    .optional()
    .describe(
      "Atlassian account ID of the new assignee. Use jira_find_users to resolve from email or name."
    ),
});

export const listIssuesSchema = z.object({
  project_key: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Jira project key to list. Omit to use DEFAULT_JIRA_PROJECT_KEY from server .env."
    ),
  status: z
    .string()
    .optional()
    .describe("Filter by status name, e.g. 'In Progress'"),
  assignee_account_id: z
    .string()
    .optional()
    .describe("Filter by assignee account ID (use jira_find_users to resolve from email or name)"),
  max_results: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum number of issues to return (1–100)"),
});

export const addCommentSchema = z.object({
  issue_key: z
    .string()
    .min(1)
    .describe("Jira issue key, e.g. AUTH-21"),
  body: z
    .string()
    .min(1)
    .describe("Comment text"),
});

export const findUsersSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      "Search text: email address, display name, or username fragment (e.g. cparakh53 or user@company.com). Jira matches prefixes on name/email depending on site settings."
    ),
  issue_key: z
    .string()
    .min(1)
    .optional()
    .describe(
      "If set, only users assignable to this issue are returned (best before setting assignee on that issue)."
    ),
  project_key: z
    .string()
    .min(1)
    .optional()
    .describe(
      "If set (and issue_key omitted), only users assignable in this project (pass project key, e.g. SCRUM)."
    ),
  max_results: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(15)
    .describe("Maximum users to return (1–50)"),
});

export const addWorklogSchema = z.object({
  issue_key: z
    .string()
    .min(1)
    .describe("Jira issue key, e.g. SCRUM-15"),
  time_spent: z
    .string()
    .min(1)
    .describe(
      "Time spent in Jira duration format, e.g. 2h 30m, 45m, 1d, 1w 2d 4h"
    ),
  comment: z
    .string()
    .optional()
    .describe("Optional note for the work log entry"),
  started: z
    .string()
    .optional()
    .describe(
      "When the work started (ISO-8601, e.g. 2026-05-25T10:00:00.000+0530). Defaults to now."
    ),
});

export const updateWorklogSchema = z.object({
  issue_key: z
    .string()
    .min(1)
    .describe("Jira issue key, e.g. SCRUM-15"),
  worklog_id: z
    .string()
    .min(1)
    .describe("Worklog ID to update (use jira_list_worklogs to find it)"),
  time_spent: z
    .string()
    .optional()
    .describe("New time spent in Jira duration format, e.g. 3h, 1h 15m"),
  comment: z
    .string()
    .optional()
    .describe("New work log note (plain text)"),
  started: z
    .string()
    .optional()
    .describe("New start time (ISO-8601)"),
});

export const listWorklogsSchema = z.object({
  issue_key: z
    .string()
    .min(1)
    .describe("Jira issue key, e.g. SCRUM-15"),
  max_results: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum work log entries to return (1–100)"),
});

export const setStoryPointsSchema = z.object({
  issue_key: z
    .string()
    .min(1)
    .describe("Jira issue key, e.g. SCRUM-15"),
  story_points: z
    .number()
    .min(0)
    .describe("Story point estimate (e.g. 1, 2, 3, 5, 8)"),
  custom_field_id: z
    .string()
    .optional()
    .describe(
      "Custom field ID for story points if your site uses something other than customfield_10016 (default)."
    ),
});

export const listSprintsSchema = z.object({
  project_key: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Jira project key to find boards for (e.g. SCRUM). Omit to use DEFAULT_JIRA_PROJECT_KEY."
    ),
  state: z
    .enum(["active", "future", "closed"])
    .optional()
    .describe("Filter sprints by state. Omit to return all states."),
  max_results: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Maximum sprints to return (1–100)"),
});

export const listBoardColumnsSchema = z.object({
  project_key: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Jira project key to find boards for (e.g. SCRUM). Omit to use DEFAULT_JIRA_PROJECT_KEY."
    ),
  board_id: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      "Specific board ID to inspect. If omitted, the first board found for the project is used."
    ),
});

export const moveToSprintSchema = z.object({
  issue_key: z
    .string()
    .min(1)
    .describe("Jira issue key to move, e.g. SCRUM-15"),
  sprint_id: z
    .number()
    .int()
    .min(1)
    .describe("Sprint ID (use jira_list_sprints to find it)"),
});

export const userTimeReportSchema = z.object({
  user_query: z
    .string()
    .min(1)
    .default("Chirag Parakh")
    .describe(
      "Display name, email, or name fragment to identify the user. Defaults to 'Chirag Parakh'."
    ),
  account_id: z
    .string()
    .optional()
    .describe("Atlassian account ID of the user. If provided, skips the user-lookup step."),
  days: z
    .number()
    .int()
    .min(1)
    .max(90)
    .default(7)
    .describe("Number of past days to include (default 7 = last week)."),
  project_key: z
    .string()
    .optional()
    .describe(
      "Restrict to a specific project key (e.g. SCRUM). Omit to search across all projects."
    ),
  max_issues: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(50)
    .describe("Maximum issues to scan for worklogs (1–100)."),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type GetIssueInput = z.infer<typeof getIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type ListIssuesInput = z.infer<typeof listIssuesSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type FindUsersInput = z.infer<typeof findUsersSchema>;
export type AddWorklogInput = z.infer<typeof addWorklogSchema>;
export type UpdateWorklogInput = z.infer<typeof updateWorklogSchema>;
export type ListWorklogsInput = z.infer<typeof listWorklogsSchema>;
export type SetStoryPointsInput = z.infer<typeof setStoryPointsSchema>;
export type ListSprintsInput = z.infer<typeof listSprintsSchema>;
export type ListBoardColumnsInput = z.infer<typeof listBoardColumnsSchema>;
export type MoveToSprintInput = z.infer<typeof moveToSprintSchema>;
export type UserTimeReportInput = z.infer<typeof userTimeReportSchema>;
