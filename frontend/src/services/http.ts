/* Thin fetch wrapper: adds the API base URL, attaches the bearer token, enforces a timeout,
 * and turns every failure (network down, CORS, 401, 5xx, timeout) into a thrown Error with a
 * message a person can act on. Nothing here ever hangs forever.
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

/** Fired when the backend says the session is gone, so the app can return to the sign-in screen. */
export const UNAUTHORIZED_EVENT = 'erp:unauthorized';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface HttpOptions extends RequestInit {
  /** Abort and fail after this many ms (default 30 s). */
  timeoutMs?: number;
}

export async function http<T>(path: string, options: HttpOptions = {}): Promise<T> {
  const { timeoutMs = 30_000, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(init.headers ?? {})
      }
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new ApiError(`The server did not respond within ${Math.round(timeoutMs / 1000)} seconds.`, 0);
    }
    throw new ApiError(
      `Cannot reach the backend at ${API_BASE}. Check that it is running (npm run dev in /backend) ` +
        `and that this page's address is allowed by CORS_ORIGIN.`,
      0
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    setAuthToken(null);
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError('Your session has expired or you are not signed in. Please sign in again.', 401);
  }
  if (!res.ok) {
    throw new ApiError(body.error ?? `Request to ${path} failed with status ${res.status}`, res.status);
  }
  return body as T;
}
