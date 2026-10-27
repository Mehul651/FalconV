'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiUpload } from '@/lib/upload';

export default function KpiImportPage() {
  const router = useRouter();
  const [kind, setKind] = useState<'KPI' | 'EXPENDITURE'>('KPI');
  const [file, setFile] = useState<File | null>(null);

  async function onUpload() {
    if (!file) {
      toast.error('Choose an Excel file');
      return;
    }
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', kind);
      const batch = await apiUpload<{ id: string }>('/api/v1/imports', form);
      toast.success('Preview stored. Totals are unchanged until this batch is approved.');
      router.push(`/kpi/imports/${batch.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Excel import</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload creates a preview only. Approved KPI and spend totals do not change until a reviewer approves the batch.
        </p>
        <select
          className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
          value={kind}
          onChange={(event) => setKind(event.target.value as 'KPI' | 'EXPENDITURE')}
        >
          <option value="KPI">KPI values</option>
          <option value="EXPENDITURE">Expenditure lines</option>
        </select>
        <Input type="file" accept=".xlsx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        <div className="flex gap-2">
          <Button onClick={() => void onUpload()}>Upload preview</Button>
          <Button asChild variant="outline">
            <a href={`/api/v1/imports/template?kind=${kind}`}>Download template</a>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/kpi">Back</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
