function fromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [key, ...rest] = cookie.trim().split('=');
    const value = rest.join('=');
    if (key === 'token' && value && value !== 'undefined') {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}

function isUsableToken(token) {
  return Boolean(token && String(token).trim() && token !== 'undefined' && token !== 'null');
}

/**
 * Prefer Bearer / x-auth-token over cookies so iOS (ITP) still authenticates
 * when a stale or third-party cookie is present.
 * Also returns unique candidates so a bad header token can fall back to cookie.
 */
function pickAuthToken(req) {
  const header = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.substring(7).trim()
    : null;
  const xAuth = req.headers['x-auth-token']
    ? String(req.headers['x-auth-token']).trim()
    : null;
  const cookie = req.cookies?.token || fromCookieHeader(req.headers.cookie);
  const extra = req.headers['authorization-token']
    ? String(req.headers['authorization-token']).trim()
    : null;
  const query = req.query?.token ? String(req.query.token).trim() : null;

  const ordered = [
    { token: header, source: 'header' },
    { token: xAuth, source: 'x-auth-token' },
    { token: extra, source: 'auth-token-header' },
    { token: cookie, source: 'cookie' },
    { token: query, source: 'query-param' }
  ].filter((c) => isUsableToken(c.token));

  const seen = new Set();
  const candidates = [];
  for (const c of ordered) {
    if (seen.has(c.token)) continue;
    seen.add(c.token);
    candidates.push(c);
  }

  const first = candidates[0] || { token: null, source: 'none' };
  return { token: first.token, source: first.source, candidates };
}

module.exports = { pickAuthToken };
