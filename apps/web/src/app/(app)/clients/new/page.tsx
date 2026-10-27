'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { CLIENT_CATEGORIES, CLIENT_STATUSES } from '@falconv/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';

export default function NewClientPage() {
  const router = useRouter();
  const form = useForm({
    defaultValues: { name: '', legalName: '', industry: '', website: '', notes: '', status: 'PROSPECT', category: 'OTHER' },
  });

  async function onSubmit(values: Record<string, string>) {
    try {
      const created = await apiFetch<{ id: string }>('/api/v1/clients', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      toast.success('Client created');
      router.push(`/clients/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Create failed');
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>New client</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...form.register('name', { required: true })} />
          </div>
          <div className="space-y-2">
            <Label>Legal name</Label>
            <Input {...form.register('legalName')} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" {...form.register('status')}>
                {CLIENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" {...form.register('category')}>
                {CLIENT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Industry</Label>
            <Input {...form.register('industry')} />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input {...form.register('website')} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea {...form.register('notes')} />
          </div>
          <Button type="submit">Save client</Button>
        </form>
      </CardContent>
    </Card>
  );
}
