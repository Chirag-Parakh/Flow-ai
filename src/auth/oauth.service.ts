import axios from "axios";
import { oauthRepo, type OAuthConnection } from "../db/client.js";
import { logger } from "../utils/logger.js";

// ─── Atlassian OAuth 2.0 (Jira) ───────────────────────────────────────────────

const ATLASSIAN_AUTH_URL = "https://auth.atlassian.com/authorize";
const ATLASSIAN_TOKEN_URL = "https://auth.atlassian.com/oauth/token";
const ATLASSIAN_RESOURCES_URL = "https://api.atlassian.com/oauth/token/accessible-resources";

const ATLASSIAN_SCOPES = [
  "read:jira-user",
  "read:jira-work",
  "write:jira-work",
  "offline_access",
].join(" ");

// ─── Bitbucket OAuth 2.0 ──────────────────────────────────────────────────────

const BITBUCKET_AUTH_URL = "https://bitbucket.org/site/oauth2/authorize";
const BITBUCKET_TOKEN_URL = "https://bitbucket.org/site/oauth2/access_token";

// ─── Generic token response ───────────────────────────────────────────────────

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
}

// ─── Jira ─────────────────────────────────────────────────────────────────────

export function getJiraAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    audience: "api.atlassian.com",
    client_id: process.env.ATLASSIAN_CLIENT_ID!,
    scope: ATLASSIAN_SCOPES,
    redirect_uri: process.env.ATLASSIAN_REDIRECT_URI!,
    state: state ?? "jira",
    response_type: "code",
    prompt: "consent",
  });
  return `${ATLASSIAN_AUTH_URL}?${params}`;
}

export async function exchangeJiraCode(code: string, userId = "default"): Promise<void> {
  const { data } = await axios.post<TokenResponse>(
    ATLASSIAN_TOKEN_URL,
    {
      grant_type: "authorization_code",
      client_id: process.env.ATLASSIAN_CLIENT_ID,
      client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
      code,
      redirect_uri: process.env.ATLASSIAN_REDIRECT_URI,
    },
    { headers: { "Content-Type": "application/json" } }
  );

  // Fetch the Jira cloud ID
  const { data: resources } = await axios.get<Array<{ id: string; name: string }>>(
    ATLASSIAN_RESOURCES_URL,
    { headers: { Authorization: `Bearer ${data.access_token}` } }
  );

  const site = resources[0];
  if (!site) throw new Error("No accessible Jira sites found for this account.");

  const expiresAt = data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : null;

  oauthRepo.upsert("jira", userId, {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? null,
    expires_at: expiresAt,
    cloud_id: site.id,
    cloud_name: site.name,
  });

  logger.info("Jira OAuth connected", { userId, site: site.name });
}

export async function getJiraToken(userId = "default"): Promise<{ token: string; cloudId: string; cloudName: string }> {
  const conn = oauthRepo.find("jira", userId);
  if (!conn || !conn.access_token) {
    throw new Error(
      "Jira not connected. Visit http://localhost:3000/auth/jira to authorize."
    );
  }

  // Refresh if expired (with 60s buffer)
  if (conn.expires_at && conn.expires_at - 60 < Math.floor(Date.now() / 1000)) {
    return refreshJiraToken(conn, userId);
  }

  return { token: conn.access_token, cloudId: conn.cloud_id!, cloudName: conn.cloud_name! };
}

async function refreshJiraToken(
  conn: OAuthConnection,
  userId: string
): Promise<{ token: string; cloudId: string; cloudName: string }> {
  if (!conn.refresh_token) throw new Error("No Jira refresh token. Please re-authorize.");

  logger.debug("Refreshing Jira access token", { userId });

  const { data } = await axios.post<TokenResponse>(
    ATLASSIAN_TOKEN_URL,
    {
      grant_type: "refresh_token",
      client_id: process.env.ATLASSIAN_CLIENT_ID,
      client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
      refresh_token: conn.refresh_token,
    },
    { headers: { "Content-Type": "application/json" } }
  );

  const expiresAt = data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : null;

  oauthRepo.upsert("jira", userId, {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? conn.refresh_token,
    expires_at: expiresAt,
  });

  return { token: data.access_token, cloudId: conn.cloud_id!, cloudName: conn.cloud_name! };
}

// ─── Bitbucket ────────────────────────────────────────────────────────────────

export function getBitbucketAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.BITBUCKET_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.BITBUCKET_REDIRECT_URI!,
    state: state ?? "bitbucket",
  });
  return `${BITBUCKET_AUTH_URL}?${params}`;
}

export async function exchangeBitbucketCode(code: string, userId = "default"): Promise<void> {
  const { data } = await axios.post<TokenResponse>(
    BITBUCKET_TOKEN_URL,
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.BITBUCKET_REDIRECT_URI!,
    }),
    {
      auth: {
        username: process.env.BITBUCKET_CLIENT_ID!,
        password: process.env.BITBUCKET_CLIENT_SECRET!,
      },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  // Fetch account info to derive workspace slug
  const { data: user } = await axios.get<{ account_id: string; username: string; nickname: string }>(
    "https://api.bitbucket.org/2.0/user",
    { headers: { Authorization: `Bearer ${data.access_token}` } }
  );

  // Prefer DEFAULT_BITBUCKET_WORKSPACE env override; otherwise use username (account slug)
  const workspace = process.env.DEFAULT_BITBUCKET_WORKSPACE?.trim() || user.username;

  const expiresAt = data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : null;

  oauthRepo.upsert("bitbucket", userId, {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? null,
    expires_at: expiresAt,
    workspace,
  });

  logger.info("Bitbucket OAuth connected", { userId, workspace });
}

export async function getBitbucketToken(userId = "default"): Promise<{ token: string; workspace: string }> {
  const conn = oauthRepo.find("bitbucket", userId);
  if (!conn || !conn.access_token) {
    throw new Error(
      "Bitbucket not connected. Visit http://localhost:3000/auth/bitbucket to authorize."
    );
  }

  if (conn.expires_at && conn.expires_at - 60 < Math.floor(Date.now() / 1000)) {
    return refreshBitbucketToken(conn, userId);
  }

  return { token: conn.access_token, workspace: conn.workspace! };
}

async function refreshBitbucketToken(
  conn: OAuthConnection,
  userId: string
): Promise<{ token: string; workspace: string }> {
  if (!conn.refresh_token) throw new Error("No Bitbucket refresh token. Please re-authorize.");

  logger.debug("Refreshing Bitbucket access token", { userId });

  const { data } = await axios.post<TokenResponse>(
    BITBUCKET_TOKEN_URL,
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: conn.refresh_token,
    }),
    {
      auth: {
        username: process.env.BITBUCKET_CLIENT_ID!,
        password: process.env.BITBUCKET_CLIENT_SECRET!,
      },
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  const expiresAt = data.expires_in ? Math.floor(Date.now() / 1000) + data.expires_in : null;

  oauthRepo.upsert("bitbucket", userId, {
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? conn.refresh_token,
    expires_at: expiresAt,
  });

  return { token: data.access_token, workspace: conn.workspace! };
}

// ─── Status ───────────────────────────────────────────────────────────────────

export function getAuthStatus(userId = "default") {
  const jira = oauthRepo.find("jira", userId);
  const bitbucket = oauthRepo.find("bitbucket", userId);

  return {
    jira: {
      connected: !!(jira?.access_token),
      site: jira?.cloud_name ?? null,
      expiresAt: jira?.expires_at ? new Date(jira.expires_at * 1000).toISOString() : null,
    },
    bitbucket: {
      connected: !!(bitbucket?.access_token),
      workspace: bitbucket?.workspace ?? null,
      expiresAt: bitbucket?.expires_at ? new Date(bitbucket.expires_at * 1000).toISOString() : null,
    },
  };
}
