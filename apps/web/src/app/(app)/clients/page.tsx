'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';

type ClientRow = {
  id: string;
  name: string;
  status: string;
  category: string;
  industry: string | null;
  _count: { requests: number };
};

export default function ClientsPage() {
  const query = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiFetch<ClientRow[]>('/api/v1/clients'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Clients</h1>
          <p className="text-sm text-muted-foreground">CRM profiles, contacts, and related requests.</p>
        </div>
        <Button asChild>
          <Link href="/clients/new">New client</Link>
        </Button>
      </div>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {query.data?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No clients yet.</CardContent>
        </Card>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Industry</th>
              <th className="px-4 py-3 font-medium">Requests</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((client) => (
              <tr key={client.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link className="font-medium text-primary hover:underline" href={`/clients/${client.id}`}>
                    {client.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{client.status}</Badge>
                </td>
                <td className="px-4 py-3">{client.category}</td>
                <td className="px-4 py-3 text-muted-foreground">{client.industry ?? '—'}</td>
                <td className="px-4 py-3">{client._count.requests}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
