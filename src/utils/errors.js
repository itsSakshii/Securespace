// Backends often return `error` as a string OR as an object like { code, message }.
// Rendering that object directly in JSX crashes React (error #31), so always go through this.
export function getErrorMessage(err, fallback = 'Something went wrong') {
  const data = err?.response?.data;
  const e = data?.error ?? data?.message ?? data;

  if (typeof e === 'string' && e.trim()) return e;
  if (e && typeof e === 'object') {
    if (typeof e.message === 'string' && e.message) return e.message;
    if (typeof e.error === 'string' && e.error) return e.error;
  }
  if (err?.response?.status === 404) return 'Service not reachable (API endpoint not found).';
  if (typeof err?.message === 'string' && err.message) return err.message;
  return fallback;
}
