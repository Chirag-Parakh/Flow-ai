/**
 * Resolves the Jira project key from tool input or `DEFAULT_JIRA_PROJECT_KEY` in the server env.
 */
export function resolveJiraProjectKey(explicit?: string): string {
  const fromInput = explicit?.trim();
  if (fromInput) return fromInput;
  const fromEnv = process.env.DEFAULT_JIRA_PROJECT_KEY?.trim();
  if (fromEnv) return fromEnv;
  throw new Error(
    "Missing Jira project_key. Pass it in the tool (e.g. SCRUM from issue SCRUM-1), or set DEFAULT_JIRA_PROJECT_KEY in the Flow server's .env."
  );
}
