/** The sentinel the Keys page stores for key-optional platforms and auth-off
 * custom endpoints (routes/keys.ts keeps `no-key`), plus the empty string a
 * caller can hand a provider when no credential exists. Anything else is a
 * real key (#1331). */
export const NO_KEY_SENTINEL = 'no-key';

export function isAnonymousCredential(apiKey: string | null | undefined): boolean {
  const v = apiKey?.trim() ?? '';
  return v === '' || v === NO_KEY_SENTINEL;
}

export function isOAuthTokenBundle(apiKey: string | null | undefined): boolean {
  if (!apiKey) return false;
  const v = apiKey.trim();
  if (!v.startsWith('{') || !v.endsWith('}')) return false;
  try {
    const parsed = JSON.parse(v);
    return typeof parsed === 'object' && parsed !== null && typeof parsed.access_token === 'string';
  } catch {
    return false;
  }
}

export function extractAccessToken(apiKey: string | null | undefined): string {
  if (!apiKey) return '';
  const v = apiKey.trim();
  if (v.startsWith('{') && v.endsWith('}')) {
    try {
      const parsed = JSON.parse(v);
      if (typeof parsed.access_token === 'string') {
        return parsed.access_token.trim();
      }
    } catch {
      // not valid JSON, return original
    }
  }
  return v;
}

/** `Authorization: Bearer <key>` for a real key, nothing for the sentinel:
 * upstreams read `Bearer no-key` as an invalid key, so anonymous calls must
 * omit the header entirely (#1331). For OAuth token bundles, extracts access_token. */
export function bearerAuthHeader(apiKey: string | null | undefined): Record<string, string> {
  if (isAnonymousCredential(apiKey)) return {};
  const token = extractAccessToken(apiKey);
  return { Authorization: `Bearer ${token}` };
}

