import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getNotifications } from '@/lib/server-api';

export default async function NotificationsPage() {
  const notifications = await getNotifications();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Notifications</h1>
      {notifications.length === 0 ? (
        <p className="text-sm text-muted-foreground">No notifications yet.</p>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{item.body}</CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
