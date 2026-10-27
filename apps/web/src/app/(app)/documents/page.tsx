'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';

type DocRow = {
  id: string;
  title: string;
  category: string;
  status: string;
  project: { id: string; projectNumber: string };
  versions: Array<{ version: number }>;
};

function DocumentsBody() {
  const search = useSearchParams();
  const projectId = search.get('projectId') ?? '';
  const query = useQuery({
    queryKey: ['documents', projectId || 'all'],
    queryFn: () => apiFetch<DocRow[]>(`/api/v1/documents${projectId ? `?projectId=${projectId}` : ''}`),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Documents</h1>
          <p className="text-sm text-muted-foreground">Versioned engineering files. Stored locally until object storage is available.</p>
        </div>
        <Button asChild>
          <Link href={`/documents/new${projectId ? `?projectId=${projectId}` : ''}`}>New document</Link>
        </Button>
      </div>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {query.data?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No documents yet.</CardContent>
        </Card>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Version</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((doc) => (
              <tr key={doc.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link className="font-medium text-primary hover:underline" href={`/documents/${doc.id}`}>
                    {doc.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{doc.project.projectNumber}</td>
                <td className="px-4 py-3">{doc.category}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{doc.status}</Badge>
                </td>
                <td className="px-4 py-3">{doc.versions[0]?.version ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <DocumentsBody />
    </Suspense>
  );
}
