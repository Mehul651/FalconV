'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RISK_STATUS_LABELS, RISK_TRANSITIONS, type RiskStatus } from '@falconv/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';

type RiskDetail = {
  id: string;
  riskNumber: string;
  title: string;
  description: string;
  severity: string;
  likelihood: string;
  status: RiskStatus;
  owner: { user: { name: string } } | null;
  project: { id: string; name: string; projectNumber: string } | null;
  correctiveActions: Array<{ id: string; capaNumber: string; title: string; status: string }>;
};

export default function RiskDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['risk', params.id],
    queryFn: () => apiFetch<RiskDetail>(`/api/v1/risks/${params.id}`),
  });
  const transition = useMutation({
    mutationFn: (toStatus: RiskStatus) =>
      apiFetch(`/api/v1/risks/${params.id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ toStatus }),
      }),
    onSuccess: () => {
      toast.success('Risk updated');
      void queryClient.invalidateQueries({ queryKey: ['risk', params.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!query.data) {
    return <p className="text-sm text-muted-foreground">Risk not found.</p>;
  }
  const risk = query.data;
  const next = RISK_TRANSITIONS[risk.status];

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs text-muted-foreground">{risk.riskNumber}</p>
        <h1 className="text-2xl font-semibold">{risk.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{RISK_STATUS_LABELS[risk.status]}</Badge>
          <Badge variant="outline">{risk.severity}</Badge>
          <Badge variant="outline">{risk.likelihood}</Badge>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{risk.description}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Owner: {risk.owner?.user.name ?? '—'}</p>
            {risk.project ? (
              <p>
                Project:{' '}
                <Link className="text-primary underline" href={`/projects/${risk.project.id}`}>
                  {risk.project.projectNumber}
                </Link>
              </p>
            ) : (
              <p>Project: —</p>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {next.map((status) => (
            <Button key={status} size="sm" variant="outline" onClick={() => transition.mutate(status)}>
              Move to {RISK_STATUS_LABELS[status]}
            </Button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Corrective actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {risk.correctiveActions.length === 0 ? (
            <p className="text-muted-foreground">None linked yet.</p>
          ) : (
            risk.correctiveActions.map((item) => (
              <Link key={item.id} className="block text-primary hover:underline" href={`/corrective-actions/${item.id}`}>
                {item.capaNumber} — {item.title} ({item.status})
              </Link>
            ))
          )}
          <Button asChild size="sm" variant="outline">
            <Link href={`/corrective-actions/new?riskId=${risk.id}`}>Add CAPA</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
