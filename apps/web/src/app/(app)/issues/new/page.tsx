'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ISSUE_SEVERITIES, REQUEST_PRIORITIES } from '@falconv/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';

type ProjectRow = { id: string; name: string; projectNumber: string };

function NewIssueForm() {
  const router = useRouter();
  const search = useSearchParams();
  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiFetch<ProjectRow[]>('/api/v1/projects'),
  });
  const form = useForm({
    defaultValues: {
      projectId: search.get('projectId') ?? '',
      title: '',
      description: '',
      severity: 'MEDIUM',
      priority: 'MEDIUM',
      reproductionSteps: '',
    },
  });

  async function onSubmit(values: Record<string, string>) {
    try {
      const created = await apiFetch<{ id: string }>('/api/v1/issues', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      toast.success('Issue opened');
      router.push(`/issues/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Create failed');
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>New issue</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>Project</Label>
            <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" {...form.register('projectId', { required: true })}>
              <option value="">Select project</option>
              {(projects.data ?? []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectNumber} — {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input {...form.register('title', { required: true, minLength: 3 })} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...form.register('description', { required: true, minLength: 5 })} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Severity</Label>
              <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" {...form.register('severity')}>
                {ISSUE_SEVERITIES.map((severity) => (
                  <option key={severity} value={severity}>
                    {severity}
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
          <div className="space-y-2">
            <Label>Reproduction steps</Label>
            <Textarea {...form.register('reproductionSteps')} />
          </div>
          <Button type="submit">Open issue</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function NewIssuePage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <NewIssueForm />
    </Suspense>
  );
}
