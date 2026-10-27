'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PROJECT_STATUS_LABELS, type ProjectStatus } from '@falconv/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';

type ProjectRow = {
  id: string;
  projectNumber: string;
  name: string;
  status: ProjectStatus;
  priority: string;
  client: { id: string; name: string };
  _count: { tasks: number; issues: number; documents: number };
};

export default function ProjectsPage() {
  const query = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiFetch<ProjectRow[]>('/api/v1/projects'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Delivery work created from approved service requests.</p>
        </div>
        <Button asChild>
          <Link href="/projects/new">New project</Link>
        </Button>
      </div>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {query.data?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No projects yet. Approve a service request, then create a project from it.
          </CardContent>
        </Card>
      ) : null}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Number</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Tasks</th>
              <th className="px-4 py-3 font-medium">Issues</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((project) => (
              <tr key={project.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs">{project.projectNumber}</td>
                <td className="px-4 py-3">
                  <Link className="font-medium text-primary hover:underline" href={`/projects/${project.id}`}>
                    {project.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{project.client.name}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{PROJECT_STATUS_LABELS[project.status]}</Badge>
                </td>
                <td className="px-4 py-3">{project._count.tasks}</td>
                <td className="px-4 py-3">{project._count.issues}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
