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

  const candidates = [header, xAuth, extra, cookie, query];
  const token = candidates.find(isUsableToken) || null;
  let source = 'none';
  if (token === header) source = 'header';
  else if (token === xAuth) source = 'x-auth-token';
  else if (token === extra) source = 'auth-token-header';
  else if (token === cookie) source = 'cookie';
  else if (token === query) source = 'query-param';
  return { token, source };
}

module.exports = { pickAuthToken };
