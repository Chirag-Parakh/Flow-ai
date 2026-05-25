import { getJiraToken, getBitbucketToken } from "../auth/oauth.service.js";

export type Provider = "jira" | "bitbucket";

export interface AuthContext {
  userId: string;
  provider: Provider;
  token: string;
  cloudId?: string;    // Jira
  cloudName?: string;  // Jira site name (e.g. "chiragparakh")
  workspace?: string;  // Bitbucket
}

/**
 * Resolves a valid OAuth token for the given provider.
 * Throws a user-friendly error if the provider is not connected.
 */
export async function authMiddleware(
  provider: Provider,
  userId = "default"
): Promise<AuthContext> {
  if (provider === "jira") {
    const { token, cloudId, cloudName } = await getJiraToken(userId);
    return { userId, provider, token, cloudId, cloudName };
  }

  const { token, workspace } = await getBitbucketToken(userId);
  // Allow DEFAULT_BITBUCKET_WORKSPACE env var to override the stored workspace slug
  const resolvedWorkspace = process.env.DEFAULT_BITBUCKET_WORKSPACE?.trim() || workspace;
  return { userId, provider, token, workspace: resolvedWorkspace };
}
