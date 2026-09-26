/* Drop this in src/services/http.ts.
 * Thin fetch wrapper: adds the API base URL, attaches the bearer token,
 * and turns non-2xx responses into thrown errors with the server's message.
 */

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1';

let authToken: string | null = localStorage.getItem('erp_token');

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem('erp_token', token);
  else localStorage.removeItem('erp_token');
}

export function getAuthToken() {
  return authToken;
}

export async function http<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers ?? {})
    }
  });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? `Request to ${path} failed with status ${res.status}`);
  }
  return body as T;
}
