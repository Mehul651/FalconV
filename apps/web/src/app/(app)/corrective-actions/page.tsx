'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { CAPA_STATUS_LABELS, type CapaStatus } from '@falconv/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';

type CapaRow = {
  id: string;
  capaNumber: string;
  title: string;
  status: CapaStatus;
  dueOn: string;
  owner: { user: { name: string } };
  risk: { riskNumber: string } | null;
};

export default function CapaPage() {
  const query = useQuery({
    queryKey: ['capa'],
    queryFn: () => apiFetch<CapaRow[]>('/api/v1/capa'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Corrective actions</h1>
          <p className="text-sm text-muted-foreground">CAPA records with OPEN → IN PROGRESS → VERIFIED.</p>
        </div>
        <Button asChild>
          <Link href="/corrective-actions/new">New CAPA</Link>
        </Button>
      </div>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {query.data?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No corrective actions yet.</CardContent>
        </Card>
      ) : null}
      {(query.data ?? []).length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(query.data ?? []).map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">{item.capaNumber}</td>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-primary hover:underline" href={`/corrective-actions/${item.id}`}>
                      {item.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{item.dueOn.slice(0, 10)}</td>
                  <td className="px-4 py-3">{item.owner.user.name}</td>
                  <td className="px-4 py-3">{item.risk?.riskNumber ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{CAPA_STATUS_LABELS[item.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
