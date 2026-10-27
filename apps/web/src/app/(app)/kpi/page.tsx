'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';

type KpiSnapshot = {
  calculated: Array<{ code: string; name: string; unit: string; value: number; formula: string }>;
  approvedRecords: Array<{
    id: string;
    period: string;
    value: string;
    status: string;
    definition: { code: string; name: string; unit: string };
  }>;
  pendingRecords: Array<{
    id: string;
    period: string;
    value: string;
    status: string;
    definition: { code: string; name: string };
  }>;
  pendingExcludedFromTotals: number;
  definitions: Array<{ id: string; code: string; name: string; source: string; unit: string }>;
};

export default function KpiPage() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['kpi'],
    queryFn: () => apiFetch<KpiSnapshot>('/api/v1/kpi'),
  });
  const [definitionId, setDefinitionId] = useState('');
  const [period, setPeriod] = useState('');
  const [value, setValue] = useState('');

  const create = useMutation({
    mutationFn: () =>
      apiFetch('/api/v1/kpi/records', {
        method: 'POST',
        body: JSON.stringify({ definitionId, period, value: Number(value) }),
      }),
    onSuccess: () => {
      toast.success('Draft KPI saved — not included in approved totals');
      setValue('');
      void queryClient.invalidateQueries({ queryKey: ['kpi'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const submit = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/kpi/records/${id}/submit`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Submitted for approval');
      void queryClient.invalidateQueries({ queryKey: ['kpi'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const data = query.data;
  const importedDefs = (data?.definitions ?? []).filter((item) => item.source !== 'CALCULATED');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">KPI reporting</h1>
          <p className="text-sm text-muted-foreground">
            Calculated figures come from live operations. Imported and manual values only count after approval.
          </p>
        </div>
        <Button asChild>
          <Link href="/kpi/import">Import Excel</Link>
        </Button>
      </div>
      {data && data.pendingExcludedFromTotals > 0 ? (
        <Badge variant="warning">{data.pendingExcludedFromTotals} unpublished rows excluded from approved totals</Badge>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(data?.calculated ?? []).map((item) => (
          <Card key={item.code}>
            <CardHeader>
              <CardTitle className="text-base">{item.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {item.value}
                <span className="ml-1 text-sm font-normal text-muted-foreground">{item.unit}</span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{item.formula}</p>
              <Badge variant="outline" className="mt-2">
                Calculated
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manual draft (unpublished)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border border-input bg-card px-3 text-sm"
            value={definitionId}
            onChange={(event) => setDefinitionId(event.target.value)}
          >
            <option value="">Imported/manual KPI</option>
            {importedDefs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code}
              </option>
            ))}
          </select>
          <Input placeholder="YYYY-MM" value={period} onChange={(event) => setPeriod(event.target.value)} className="w-32" />
          <Input placeholder="Value" value={value} onChange={(event) => setValue(event.target.value)} className="w-28" />
          <Button onClick={() => create.mutate()} disabled={!definitionId || !period}>
            Save draft
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Approved imported / manual records</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.approvedRecords.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No approved imported values yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2">KPI</th>
                  <th>Period</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {data?.approvedRecords.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="py-2">{row.definition.code}</td>
                    <td>{row.period}</td>
                    <td>
                      {row.value} {row.definition.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
      {(data?.pendingRecords.length ?? 0) > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Unpublished records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data?.pendingRecords.map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-2">
                <span>
                  {row.definition.code} · {row.period} · {row.value} · {row.status}
                </span>
                {row.status === 'DRAFT' ? (
                  <Button size="sm" variant="outline" onClick={() => submit.mutate(row.id)}>
                    Submit
                  </Button>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
