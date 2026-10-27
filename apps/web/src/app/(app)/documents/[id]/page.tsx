'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { DOCUMENT_STATUSES, type DocumentStatus } from '@falconv/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { apiUpload } from '@/lib/upload';

type DocDetail = {
  id: string;
  title: string;
  category: string;
  status: DocumentStatus;
  project: { id: string; projectNumber: string; name: string };
  versions: Array<{
    id: string;
    version: number;
    fileName: string;
    sizeBytes: number;
    createdAt: string;
  }>;
};

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const query = useQuery({
    queryKey: ['document', params.id],
    queryFn: () => apiFetch<DocDetail>(`/api/v1/documents/${params.id}`),
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error('Choose a file');
      }
      const form = new FormData();
      form.append('file', file);
      return apiUpload(`/api/v1/documents/${params.id}/versions`, form);
    },
    onSuccess: () => {
      setFile(null);
      toast.success('Version uploaded');
      void queryClient.invalidateQueries({ queryKey: ['document', params.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setStatus = useMutation({
    mutationFn: (status: DocumentStatus) =>
      apiFetch(`/api/v1/documents/${params.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      toast.success('Status updated');
      void queryClient.invalidateQueries({ queryKey: ['document', params.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (query.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!query.data) {
    return <p className="text-sm text-muted-foreground">Document not found.</p>;
  }
  const document = query.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{document.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{document.status}</Badge>
          <Badge variant="outline">{document.category}</Badge>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Project</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <Link className="text-primary underline" href={`/projects/${document.project.id}`}>
            {document.project.projectNumber} — {document.project.name}
          </Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Upload version</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <Button onClick={() => upload.mutate()} disabled={!file}>
            Upload
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            className="h-9 rounded-md border border-input bg-card px-3 text-sm"
            value={document.status}
            onChange={(event) => setStatus.mutate(event.target.value as DocumentStatus)}
          >
            {DOCUMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Versions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {document.versions.length === 0 ? <p className="text-muted-foreground">No files uploaded yet.</p> : null}
          {document.versions.map((version) => (
            <div key={version.id} className="flex items-center justify-between border-b border-border py-2">
              <div>
                v{version.version} · {version.fileName} · {(version.sizeBytes / 1024).toFixed(1)} KB
                <div className="text-xs text-muted-foreground">{new Date(version.createdAt).toLocaleString()}</div>
              </div>
              <Button asChild size="sm" variant="outline">
                <a href={`/api/v1/documents/${document.id}/versions/${version.id}/download`}>Download</a>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
