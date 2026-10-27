'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';

type Batch = {
  id: string;
  kind: string;
  status: string;
  fileName: string;
  lines: Array<{
    id: string;
    rowNumber: number;
    code: string | null;
    period: string | null;
    amount: string | null;
    currency: string | null;
    error: string | null;
    notes: string | null;
  }>;
};

export default function ImportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['import', params.id],
    queryFn: () => apiFetch<Batch>(`/api/v1/imports/${params.id}`),
  });

  const act = useMutation({
    mutationFn: (path: 'submit' | 'approve' | 'reject') =>
      apiFetch(`/api/v1/imports/${params.id}/${path}`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: (_data, path) => {
      toast.success(path === 'approve' ? 'Published into approved totals' : path === 'reject' ? 'Rejected' : 'Sent for approval');
      void queryClient.invalidateQueries({ queryKey: ['import', params.id] });
      void queryClient.invalidateQueries({ queryKey: ['kpi'] });
      void queryClient.invalidateQueries({ queryKey: ['finance'] });
      if (path !== 'submit') {
        router.push(query.data?.kind === 'EXPENDITURE' ? '/expenditure' : '/kpi');
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!query.data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  const batch = query.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{batch.fileName}</h1>
        <div className="mt-2 flex gap-2">
          <Badge>{batch.kind}</Badge>
          <Badge variant="outline">{batch.status}</Badge>
        </div>
        {batch.status !== 'APPROVED' ? (
          <p className="mt-2 text-sm text-muted-foreground">This batch is not part of approved totals.</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Published. Previous approved values for the same KPI period were superseded.</p>
        )}
      </div>
      <div className="flex gap-2">
        {batch.status === 'UPLOADED' ? (
          <Button onClick={() => act.mutate('submit')}>Submit for approval</Button>
        ) : null}
        {batch.status === 'PENDING_APPROVAL' ? (
          <>
            <Button onClick={() => act.mutate('approve')}>Approve and publish</Button>
            <Button variant="outline" onClick={() => act.mutate('reject')}>
              Reject
            </Button>
          </>
        ) : null}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Preview rows</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Row</th>
                <th>Code / category</th>
                <th>Period / amount</th>
                <th>Issue</th>
              </tr>
            </thead>
            <tbody>
              {batch.lines.map((line) => (
                <tr key={line.id} className="border-t border-border">
                  <td className="py-2">{line.rowNumber}</td>
                  <td>{line.code ?? '—'}</td>
                  <td>
                    {line.period ?? line.amount ?? '—'} {line.currency ?? ''}
                  </td>
                  <td className="text-destructive">{line.error ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
