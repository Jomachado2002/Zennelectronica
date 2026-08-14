import { getStoredAuthToken } from './getAuthToken';

function shouldAttach(url) {
  if (!url) return false;
  return url.includes('/api/') || url.startsWith('/api');
}

export function installAuthFetchPatch() {
  if (typeof window === 'undefined' || window.__zennAuthFetchPatched) return;
  window.__zennAuthFetchPatched = true;
  const orig = window.fetch.bind(window);

  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input && input.url;
    const token = getStoredAuthToken();
    if (!token || !shouldAttach(url)) {
      return orig(input, init);
    }

    const headers = new Headers(
      init.headers || (typeof input !== 'string' && input.headers) || undefined
    );
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('x-auth-token')) {
      headers.set('x-auth-token', token);
    }
    const method = String(init.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
    if ((method === 'GET' || method === 'HEAD') && headers.has('Content-Type')) {
      headers.delete('Content-Type');
    }

    return orig(input, {
      ...init,
      credentials: init.credentials || 'include',
      headers,
    });
  };
}
