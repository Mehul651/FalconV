'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { CAPA_STATUS_LABELS, CAPA_TRANSITIONS, type CapaStatus } from '@falconv/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';

type CapaDetail = {
  id: string;
  capaNumber: string;
  title: string;
  description: string;
  status: CapaStatus;
  dueOn: string;
  verificationNotes: string | null;
  owner: { user: { name: string } };
  risk: { id: string; riskNumber: string; title: string } | null;
  project: { id: string; projectNumber: string } | null;
};

export default function CapaDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const query = useQuery({
    queryKey: ['capa', params.id],
    queryFn: () => apiFetch<CapaDetail>(`/api/v1/capa/${params.id}`),
  });
  const transition = useMutation({
    mutationFn: (toStatus: CapaStatus) =>
      apiFetch(`/api/v1/capa/${params.id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ toStatus, verificationNotes: notes || undefined }),
      }),
    onSuccess: () => {
      toast.success('CAPA updated');
      void queryClient.invalidateQueries({ queryKey: ['capa', params.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!query.data) {
    return <p className="text-sm text-muted-foreground">Corrective action not found.</p>;
  }
  const capa = query.data;
  const next = CAPA_TRANSITIONS[capa.status];

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs text-muted-foreground">{capa.capaNumber}</p>
        <h1 className="text-2xl font-semibold">{capa.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{CAPA_STATUS_LABELS[capa.status]}</Badge>
          <Badge variant="outline">Due {capa.dueOn.slice(0, 10)}</Badge>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{capa.description}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Owner: {capa.owner.user.name}</p>
            {capa.risk ? (
              <p>
                Risk:{' '}
                <Link className="text-primary underline" href={`/risks/${capa.risk.id}`}>
                  {capa.risk.riskNumber}
                </Link>
              </p>
            ) : (
              <p>Risk: —</p>
            )}
            {capa.project ? (
              <p>
                Project:{' '}
                <Link className="text-primary underline" href={`/projects/${capa.project.id}`}>
                  {capa.project.projectNumber}
                </Link>
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Verification notes (required to mark verified)"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {next.map((status) => (
              <Button key={status} size="sm" variant="outline" onClick={() => transition.mutate(status)}>
                Move to {CAPA_STATUS_LABELS[status]}
              </Button>
            ))}
          </div>
          {capa.verificationNotes ? (
            <p className="text-sm text-muted-foreground">Verification: {capa.verificationNotes}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
