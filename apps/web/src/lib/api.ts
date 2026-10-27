export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload?: unknown,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!response.ok) {
    const detail =
      data && typeof data === 'object' && 'detail' in data
        ? String((data as { detail: string }).detail)
        : response.statusText;
    throw new ApiError(detail, response.status, data);
  }
  return data as T;
}

export type MeResponse = {
  id: string;
  email: string;
  name: string;
  profileId: string;
  organizationId: string;
  departmentId: string | null;
  clientId: string | null;
  status: 'INVITED' | 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'DISABLED';
  roles: string[];
  permissions: string[];
};

export type PendingUser = {
  id: string;
  jobTitle: string | null;
  requestedAt: string | null;
  user: { id: string; email: string; name: string; createdAt: string };
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
};
