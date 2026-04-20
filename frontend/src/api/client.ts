const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api/v1';

export class APIError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(detail);
    this.name = 'APIError';
  }
}

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiFetch<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  const { params, ...init } = config;

  const url = new URL(`${API_BASE_URL}${endpoint}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...init.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const detail = Array.isArray(errorData.detail)
      ? errorData.detail.map((e: any) => e.msg).join(', ')
      : errorData.detail || `HTTP ${response.status}`;
    throw new APIError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
