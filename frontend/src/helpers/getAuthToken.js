export function getStoredAuthToken() {
  if (typeof window === 'undefined') return null;
  try {
    const fromStorage = localStorage.getItem('authToken');
    if (fromStorage && fromStorage !== 'undefined' && fromStorage !== 'null' && fromStorage.trim()) {
      return fromStorage.trim();
    }
  } catch {
    /* private mode */
  }
  if (window.authToken && String(window.authToken).trim()) {
    return String(window.authToken).trim();
  }
  return null;
}

export function persistAuthToken(token) {
  if (typeof window === 'undefined' || !token) return;
  try {
    localStorage.setItem('authToken', token);
  } catch {
    /* ignore */
  }
  window.authToken = token;
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('authToken');
  } catch {
    /* ignore */
  }
  try {
    delete window.authToken;
  } catch {
    window.authToken = null;
  }
}
