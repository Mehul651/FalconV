'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { SERVICE_REQUEST_STATUS_LABELS } from '@falconv/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';

type RequestRow = {
  id: string;
  requestNumber: string;
  title: string;
  status: keyof typeof SERVICE_REQUEST_STATUS_LABELS;
  priority: string;
  client: { id: string; name: string };
};

export default function ServiceRequestsPage() {
  const query = useQuery({
    queryKey: ['service-requests'],
    queryFn: () => apiFetch<RequestRow[]>('/api/v1/service-requests'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Service requests</h1>
          <p className="text-sm text-muted-foreground">Engineering intake, triage, and approval.</p>
        </div>
        <Button asChild>
          <Link href="/service-requests/new">New request</Link>
        </Button>
      </div>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {query.data?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No service requests yet.</CardContent>
        </Card>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs">{item.requestNumber}</td>
                <td className="px-4 py-3">
                  <Link className="font-medium text-primary hover:underline" href={`/service-requests/${item.id}`}>
                    {item.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{item.client.name}</td>
                <td className="px-4 py-3">{item.priority}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{SERVICE_REQUEST_STATUS_LABELS[item.status]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
