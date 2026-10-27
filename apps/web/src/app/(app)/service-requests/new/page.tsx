'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { REQUEST_CATEGORIES, REQUEST_PRIORITIES } from '@falconv/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';

function NewRequestForm() {
  const router = useRouter();
  const search = useSearchParams();
  const clients = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiFetch<Array<{ id: string; name: string }>>('/api/v1/clients'),
  });
  const form = useForm({
    defaultValues: {
      clientId: search.get('clientId') ?? '',
      title: '',
      description: '',
      category: 'NEW_WORK',
      priority: 'MEDIUM',
      requestedDelivery: '',
    },
  });

  async function onSubmit(values: Record<string, string>) {
    try {
      const created = await apiFetch<{ id: string }>('/api/v1/service-requests', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          requestedDelivery: values.requestedDelivery
            ? new Date(values.requestedDelivery).toISOString()
            : null,
        }),
      });
      toast.success('Request submitted');
      router.push(`/service-requests/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Submit failed');
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>New service request</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>Client</Label>
            <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" {...form.register('clientId', { required: true })}>
              <option value="">Select client</option>
              {(clients.data ?? []).map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input {...form.register('title', { required: true, minLength: 4 })} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...form.register('description', { required: true, minLength: 10 })} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" {...form.register('category')}>
                {REQUEST_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" {...form.register('priority')}>
                {REQUEST_PRIORITIES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Requested delivery</Label>
            <Input type="date" {...form.register('requestedDelivery')} />
          </div>
          <Button type="submit">Submit request</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function NewServiceRequestPage() {
  return (
    <Suspense>
      <NewRequestForm />
    </Suspense>
  );
}
