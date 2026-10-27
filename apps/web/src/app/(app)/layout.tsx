import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { getNotifications, requireUser } from '@/lib/server-api';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (user.status === 'PENDING_APPROVAL') {
    redirect('/pending');
  }
  if (user.status !== 'ACTIVE') {
    redirect('/login');
  }
  const notifications = await getNotifications();
  return (
    <AppShell user={user} notifications={notifications}>
      {children}
    </AppShell>
  );
}
