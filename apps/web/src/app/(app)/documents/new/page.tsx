'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { DOCUMENT_CATEGORIES } from '@falconv/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';

type ProjectRow = { id: string; name: string; projectNumber: string };

function NewDocumentForm() {
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
      category: 'OTHER',
    },
  });

  async function onSubmit(values: Record<string, string>) {
    try {
      const created = await apiFetch<{ id: string }>('/api/v1/documents', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      toast.success('Document created');
      router.push(`/documents/${created.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Create failed');
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>New document</CardTitle>
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
            <Label>Category</Label>
            <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" {...form.register('category')}>
              {DOCUMENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">Create</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function NewDocumentPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <NewDocumentForm />
    </Suspense>
  );
}
