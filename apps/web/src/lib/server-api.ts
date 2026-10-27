import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { MeResponse, NotificationItem } from './api';

function apiBase() {
  return process.env.API_URL ?? 'http://127.0.0.1:3001';
}

export async function serverApiFetch<T>(path: string): Promise<T | null> {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${apiBase()}${path}`, {
    headers: { cookie: cookieHeader },
    cache: 'no-store',
  });
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    return null;
  }
  return (await response.json()) as T;
}

export async function requireUser() {
  const user = await serverApiFetch<MeResponse>('/api/v1/users/me');
  if (!user) {
    redirect('/login');
  }
  return user;
}

export async function getNotifications() {
  return (await serverApiFetch<NotificationItem[]>('/api/v1/notifications')) ?? [];
}
