import { getJiraToken, getBitbucketToken } from "../auth/oauth.service.js";

export type Provider = "jira" | "bitbucket";

export interface AuthContext {
  userId: string;
  provider: Provider;
  token: string;
  cloudId?: string;   // Jira
  workspace?: string; // Bitbucket
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
    const { token, cloudId } = await getJiraToken(userId);
    return { userId, provider, token, cloudId };
  }

  const { token, workspace } = await getBitbucketToken(userId);
  return { userId, provider, token, workspace };
}
