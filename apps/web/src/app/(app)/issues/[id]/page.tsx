'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  ISSUE_STATUS_LABELS,
  ISSUE_TRANSITIONS,
  type IssueStatus,
} from '@falconv/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';

type IssueDetail = {
  id: string;
  issueNumber: string;
  title: string;
  description: string;
  severity: string;
  priority: string;
  status: IssueStatus;
  resolution: string | null;
  project: { id: string; name: string; projectNumber: string };
  reporter: { user: { name: string } };
  assignee: { user: { name: string } } | null;
};

export default function IssueDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [resolution, setResolution] = useState('');
  const query = useQuery({
    queryKey: ['issue', params.id],
    queryFn: () => apiFetch<IssueDetail>(`/api/v1/issues/${params.id}`),
  });
  const transition = useMutation({
    mutationFn: (toStatus: IssueStatus) =>
      apiFetch(`/api/v1/issues/${params.id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ toStatus, resolution: resolution || undefined }),
      }),
    onSuccess: () => {
      toast.success('Issue updated');
      void queryClient.invalidateQueries({ queryKey: ['issue', params.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!query.data) {
    return <p className="text-sm text-muted-foreground">Issue not found.</p>;
  }
  const issue = query.data;
  const next = ISSUE_TRANSITIONS[issue.status];

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs text-muted-foreground">{issue.issueNumber}</p>
        <h1 className="text-2xl font-semibold">{issue.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{ISSUE_STATUS_LABELS[issue.status]}</Badge>
          <Badge variant="outline">{issue.severity}</Badge>
          <Badge variant="outline">{issue.priority}</Badge>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{issue.description}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Project:{' '}
              <Link className="text-primary underline" href={`/projects/${issue.project.id}`}>
                {issue.project.projectNumber}
              </Link>
            </p>
            <p>Reporter: {issue.reporter.user.name}</p>
            <p>Assignee: {issue.assignee?.user.name ?? '—'}</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder="Resolution notes (required to resolve or close)"
            value={resolution}
            onChange={(event) => setResolution(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {next.length === 0 ? (
              <p className="text-sm text-muted-foreground">No further transitions.</p>
            ) : null}
            {next.map((status) => (
              <Button key={status} size="sm" variant="outline" onClick={() => transition.mutate(status)}>
                Move to {ISSUE_STATUS_LABELS[status]}
              </Button>
            ))}
          </div>
          {issue.resolution ? <p className="text-sm text-muted-foreground">Resolution: {issue.resolution}</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
