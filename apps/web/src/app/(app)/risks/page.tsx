'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { RISK_STATUS_LABELS, type RiskStatus } from '@falconv/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';

type RiskRow = {
  id: string;
  riskNumber: string;
  title: string;
  severity: string;
  likelihood: string;
  status: RiskStatus;
  project: { projectNumber: string } | null;
};

export default function RisksPage() {
  const query = useQuery({
    queryKey: ['risks'],
    queryFn: () => apiFetch<RiskRow[]>('/api/v1/risks'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Risks</h1>
          <p className="text-sm text-muted-foreground">Operational risks with an enforced OPEN → MITIGATING → CLOSED path.</p>
        </div>
        <Button asChild>
          <Link href="/risks/new">New risk</Link>
        </Button>
      </div>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {query.data?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No risks recorded yet.</CardContent>
        </Card>
      ) : null}
      {(query.data ?? []).length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Number</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Likelihood</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Project</th>
              </tr>
            </thead>
            <tbody>
              {(query.data ?? []).map((risk) => (
                <tr key={risk.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">{risk.riskNumber}</td>
                  <td className="px-4 py-3">
                    <Link className="font-medium text-primary hover:underline" href={`/risks/${risk.id}`}>
                      {risk.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{risk.severity}</td>
                  <td className="px-4 py-3">{risk.likelihood}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{RISK_STATUS_LABELS[risk.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">{risk.project?.projectNumber ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
