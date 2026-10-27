'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';

type RiskRow = { id: string; riskNumber: string; title: string };
type StaffRow = { id: string; user: { name: string; email: string } };

function NewCapaForm() {
  const router = useRouter();
  const search = useSearchParams();
  const risks = useQuery({
    queryKey: ['risks'],
    queryFn: () => apiFetch<RiskRow[]>('/api/v1/risks'),
  });
  const staff = useQuery({
    queryKey: ['staff'],
    queryFn: () => apiFetch<StaffRow[]>('/api/v1/staff'),
  });
  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      ownerId: '',
      dueOn: '',
      riskId: search.get('riskId') ?? '',
    },
  });

  async function onSubmit(values: Record<string, string>) {
    try {
      const created = await apiFetch<{ id: string }>('/api/v1/capa', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          riskId: values.riskId || null,
        }),
      });
      toast.success('CAPA opened');
      router.push(`/corrective-actions/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Create failed');
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>New corrective action</CardTitle>
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
          <div className="space-y-2">
            <Label>Owner</Label>
            <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" {...form.register('ownerId', { required: true })}>
              <option value="">Select owner</option>
              {(staff.data ?? []).map((person) => (
                <option key={person.id} value={person.id}>
                  {person.user.name} ({person.user.email})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Due date</Label>
            <Input type="date" {...form.register('dueOn', { required: true })} />
          </div>
          <div className="space-y-2">
            <Label>Linked risk (optional)</Label>
            <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" {...form.register('riskId')}>
              <option value="">None</option>
              {(risks.data ?? []).map((risk) => (
                <option key={risk.id} value={risk.id}>
                  {risk.riskNumber} — {risk.title}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Create CAPA</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function NewCapaPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <NewCapaForm />
    </Suspense>
  );
}
