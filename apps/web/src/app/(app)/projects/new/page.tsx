'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { REQUEST_PRIORITIES } from '@falconv/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';

type RequestOption = {
  id: string;
  requestNumber: string;
  title: string;
  status: string;
  client: { name: string };
};

type StaffRow = { id: string; user: { name: string; email: string } };

function NewProjectForm() {
  const router = useRouter();
  const search = useSearchParams();
  const requests = useQuery({
    queryKey: ['service-requests'],
    queryFn: () => apiFetch<RequestOption[]>('/api/v1/service-requests'),
  });
  const staff = useQuery({
    queryKey: ['staff'],
    queryFn: () => apiFetch<StaffRow[]>('/api/v1/staff'),
  });
  const approved = (requests.data ?? []).filter((item) => item.status === 'APPROVED');
  const form = useForm({
    defaultValues: {
      serviceRequestId: search.get('requestId') ?? '',
      name: '',
      description: '',
      managerId: '',
      priority: 'MEDIUM',
    },
  });

  async function onSubmit(values: Record<string, string>) {
    try {
      const created = await apiFetch<{ id: string }>('/api/v1/projects', {
        method: 'POST',
        body: JSON.stringify({
          serviceRequestId: values.serviceRequestId,
          name: values.name,
          description: values.description || null,
          managerId: values.managerId || null,
          priority: values.priority,
        }),
      });
      toast.success('Project created');
      router.push(`/projects/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Create failed');
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
      </CardHeader>
      <CardContent>
        {approved.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No approved requests are waiting for a project.{' '}
            <Link className="text-primary underline" href="/service-requests">
              Open service requests
            </Link>
          </p>
        ) : null}
        <form className="mt-4 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>Approved request</Label>
            <select
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              {...form.register('serviceRequestId', { required: true })}
            >
              <option value="">Select request</option>
              {approved.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.requestNumber} — {request.title} ({request.client.name})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Project name</Label>
            <Input {...form.register('name', { required: true, minLength: 3 })} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...form.register('description')} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Manager</Label>
              <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" {...form.register('managerId')}>
                <option value="">Unassigned</option>
                {(staff.data ?? []).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.user.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" {...form.register('priority')}>
                {REQUEST_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button type="submit" disabled={approved.length === 0}>
            Create project
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <NewProjectForm />
    </Suspense>
  );
}
