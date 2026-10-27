'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ISSUE_SEVERITIES, RISK_LIKELIHOODS } from '@falconv/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';

type ProjectRow = { id: string; name: string; projectNumber: string };
type StaffRow = { id: string; user: { name: string; email: string } };

export default function NewRiskPage() {
  const router = useRouter();
  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiFetch<ProjectRow[]>('/api/v1/projects'),
  });
  const staff = useQuery({
    queryKey: ['staff'],
    queryFn: () => apiFetch<StaffRow[]>('/api/v1/staff'),
  });
  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      severity: 'MEDIUM',
      likelihood: 'MEDIUM',
      ownerId: '',
      projectId: '',
    },
  });

  async function onSubmit(values: Record<string, string>) {
    try {
      const created = await apiFetch<{ id: string }>('/api/v1/risks', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          ownerId: values.ownerId || null,
          projectId: values.projectId || null,
        }),
      });
      toast.success('Risk opened');
      router.push(`/risks/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Create failed');
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>New risk</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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
                {ISSUE_SEVERITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Likelihood</Label>
              <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" {...form.register('likelihood')}>
                {RISK_LIKELIHOODS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Owner</Label>
            <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" {...form.register('ownerId')}>
              <option value="">Unassigned</option>
              {(staff.data ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.user.name} ({person.user.email})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Project (optional)</Label>
            <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" {...form.register('projectId')}>
              <option value="">None</option>
              {(projects.data ?? []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectNumber} — {project.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Create risk</Button>
        </form>
      </CardContent>
    </Card>
  );
}
