const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

const TOKEN_KEY = 'issuehub.token';

/** Fired when the API rejects our token, so AuthContext can log out once, centrally. */
export const UNAUTHORIZED_EVENT = 'issuehub:unauthorized';

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
};

export type FieldErrors = Record<string, string[]>;

/** The server's error envelope, turned into something components can branch on. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: FieldErrors;

  constructor(status: number, code: string, message: string, details?: FieldErrors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** First message for a field, for rendering inline under the input. */
  fieldError(field: string): string | undefined {
    return this.details?.[field]?.[0];
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Login/signup must surface their own 401 instead of triggering a global logout. */
  skipAuthRedirect?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuthRedirect = false } = options;
  const token = tokenStorage.get();

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Is the API running?');
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const envelope = (payload as { error?: { code?: string; message?: string; details?: FieldErrors } } | null)
      ?.error;

    if (response.status === 401 && !skipAuthRedirect) {
      tokenStorage.clear();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }

    throw new ApiError(
      response.status,
      envelope?.code ?? 'UNKNOWN_ERROR',
      envelope?.message ?? 'Something went wrong. Please try again.',
      envelope?.details,
    );
  }

  return payload as T;
}

/** Drops empty values so the URL only ever carries active filters. */
export function toQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
