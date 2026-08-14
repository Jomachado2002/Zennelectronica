export function jobsConfig() {
  const key = process.env.REACT_APP_JOBS_API_KEY || 'dev-local-jobs-key';
  const envUrl = (process.env.REACT_APP_JOBS_API_URL || '').replace(/\/$/, '');
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal = host === 'localhost' || host === '127.0.0.1';
  const base = isLocal ? 'http://127.0.0.1:8787' : envUrl;
  return {
    base,
    key,
    headers: {
      'Content-Type': 'application/json',
      'X-Worker-Key': key,
    },
  };
}
