'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_TRANSITIONS,
  type ServiceRequestStatus,
} from '@falconv/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';

type RequestDetail = {
  id: string;
  requestNumber: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: ServiceRequestStatus;
  requestedDelivery: string | null;
  client: { id: string; name: string };
  project: { id: string; name: string; projectNumber: string } | null;
  events: Array<{
    id: string;
    fromStatus: ServiceRequestStatus | null;
    toStatus: ServiceRequestStatus;
    comment: string | null;
    createdAt: string;
  }>;
};

export default function ServiceRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const query = useQuery({
    queryKey: ['service-request', params.id],
    queryFn: () => apiFetch<RequestDetail>(`/api/v1/service-requests/${params.id}`),
  });

  const transition = useMutation({
    mutationFn: (toStatus: ServiceRequestStatus) =>
      apiFetch(`/api/v1/service-requests/${params.id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ toStatus, comment }),
      }),
    onSuccess: () => {
      toast.success('Status updated');
      setComment('');
      void queryClient.invalidateQueries({ queryKey: ['service-request', params.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!query.data) {
    return <p className="text-sm text-muted-foreground">Request not found.</p>;
  }
  const request = query.data;
  const nextStatuses = SERVICE_REQUEST_TRANSITIONS[request.status].filter(
    (status) => status !== 'PROJECT_CREATED',
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs text-muted-foreground">{request.requestNumber}</p>
        <h1 className="text-2xl font-semibold">{request.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{SERVICE_REQUEST_STATUS_LABELS[request.status]}</Badge>
          <Badge variant="outline">{request.priority}</Badge>
          <Badge variant="outline">{request.category}</Badge>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{request.description}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Client:{' '}
              <Link className="text-primary underline" href={`/clients/${request.client.id}`}>
                {request.client.name}
              </Link>
            </p>
            <p>Requested delivery: {request.requestedDelivery ? new Date(request.requestedDelivery).toLocaleDateString() : '—'}</p>
            {request.status === 'APPROVED' ? (
              <Button asChild className="mt-2">
                <Link href={`/projects/new?requestId=${request.id}`}>Create project</Link>
              </Button>
            ) : null}
            {request.project ? (
              <p className="mt-2">
                Project:{' '}
                <Link className="text-primary underline" href={`/projects/${request.project.id}`}>
                  {request.project.projectNumber} — {request.project.name}
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
          <Textarea placeholder="Comment for this transition" value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {nextStatuses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No further transitions from this status.</p>
            ) : null}
            {nextStatuses.map((status) => (
              <Button key={status} size="sm" variant="outline" onClick={() => transition.mutate(status)}>
                Move to {SERVICE_REQUEST_STATUS_LABELS[status]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {request.events.map((event) => (
            <div key={event.id} className="border-b border-border py-2">
              <div>
                {event.fromStatus ? SERVICE_REQUEST_STATUS_LABELS[event.fromStatus] : 'Start'} →{' '}
                {SERVICE_REQUEST_STATUS_LABELS[event.toStatus]}
              </div>
              {event.comment ? <div className="text-muted-foreground">{event.comment}</div> : null}
              <div className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
