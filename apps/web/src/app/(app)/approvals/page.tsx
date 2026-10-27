'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
  client: { name: string };
};

type ImportRow = { id: string; kind: string; fileName: string; status: string };
type KpiSnapshot = {
  pendingRecords: Array<{
    id: string;
    period: string;
    value: string;
    status: string;
    definition: { code: string };
  }>;
};
type FinanceSnapshot = {
  pendingEntries: Array<{ id: string; amount: string; category: string; status: string }>;
};

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const requests = useQuery({
    queryKey: ['service-requests'],
    queryFn: () => apiFetch<RequestRow[]>('/api/v1/service-requests'),
  });
  const imports = useQuery({
    queryKey: ['imports', 'PENDING_APPROVAL'],
    queryFn: () => apiFetch<ImportRow[]>('/api/v1/imports?status=PENDING_APPROVAL'),
  });
  const kpi = useQuery({
    queryKey: ['kpi'],
    queryFn: () => apiFetch<KpiSnapshot>('/api/v1/kpi'),
  });
  const finance = useQuery({
    queryKey: ['finance'],
    queryFn: () => apiFetch<FinanceSnapshot>('/api/v1/finance'),
  });

  const pendingRequests = (requests.data ?? []).filter((item) => item.status === 'PENDING_APPROVAL');
  const pendingKpi = (kpi.data?.pendingRecords ?? []).filter((item) => item.status === 'PENDING_APPROVAL');
  const pendingSpend = (finance.data?.pendingEntries ?? []).filter((item) => item.status === 'PENDING_APPROVAL');

  const approveKpi = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/kpi/records/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('KPI published');
      void queryClient.invalidateQueries({ queryKey: ['kpi'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const approveSpend = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/finance/expenditures/${id}/approve`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Expenditure published');
      void queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Service requests, KPI records, expenditure, and Excel imports waiting for a decision.
        </p>
      </div>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Service requests</h2>
        {pendingRequests.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">No pending request approvals.</CardContent>
          </Card>
        ) : null}
        {pendingRequests.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex items-center justify-between p-4 text-sm">
              <div>
                <Link className="font-medium text-primary hover:underline" href={`/service-requests/${item.id}`}>
                  {item.requestNumber} — {item.title}
                </Link>
                <div className="text-muted-foreground">{item.client.name}</div>
              </div>
              <Badge>{SERVICE_REQUEST_STATUS_LABELS[item.status]}</Badge>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Excel imports</h2>
        {(imports.data ?? []).length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">No import batches waiting.</CardContent>
          </Card>
        ) : null}
        {(imports.data ?? []).map((item) => (
          <Card key={item.id}>
            <CardContent className="flex items-center justify-between p-4 text-sm">
              <Link className="font-medium text-primary hover:underline" href={`/kpi/imports/${item.id}`}>
                {item.fileName} ({item.kind})
              </Link>
              <Badge variant="warning">{item.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">KPI records</h2>
        {pendingKpi.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">No unpublished KPI records.</CardContent>
          </Card>
        ) : null}
        {pendingKpi.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between p-4 text-sm">
                <span>
                  {item.definition.code} · {item.period} · {item.value}
                </span>
                <Button size="sm" onClick={() => approveKpi.mutate(item.id)}>
                  Approve
                </Button>
              </CardContent>
            </Card>
          ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Expenditure</h2>
        {pendingSpend.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">No pending expenditure.</CardContent>
          </Card>
        ) : null}
        {pendingSpend.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex items-center justify-between p-4 text-sm">
              <span>
                {item.amount} · {item.category}
              </span>
              <Button size="sm" onClick={() => approveSpend.mutate(item.id)}>
                Approve
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
