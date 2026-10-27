'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ISSUE_STATUS_LABELS, type IssueStatus } from '@falconv/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';

type IssueRow = {
  id: string;
  issueNumber: string;
  title: string;
  status: IssueStatus;
  severity: string;
  project: { id: string; name: string; projectNumber: string };
};

function IssuesBody() {
  const search = useSearchParams();
  const projectId = search.get('projectId') ?? '';
  const query = useQuery({
    queryKey: ['issues', projectId || 'all'],
    queryFn: () => apiFetch<IssueRow[]>(`/api/v1/issues${projectId ? `?projectId=${projectId}` : ''}`),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Issues</h1>
          <p className="text-sm text-muted-foreground">Defects and delivery issues with an enforced workflow.</p>
        </div>
        <Button asChild>
          <Link href={`/issues/new${projectId ? `?projectId=${projectId}` : ''}`}>New issue</Link>
        </Button>
      </div>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {query.data?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No issues yet.</CardContent>
        </Card>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((issue) => (
              <tr key={issue.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs">{issue.issueNumber}</td>
                <td className="px-4 py-3">
                  <Link className="font-medium text-primary hover:underline" href={`/issues/${issue.id}`}>
                    {issue.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{issue.project.projectNumber}</td>
                <td className="px-4 py-3">{issue.severity}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{ISSUE_STATUS_LABELS[issue.status]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function IssuesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <IssuesBody />
    </Suspense>
  );
}
