'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TASK_STATUS_LABELS, type TaskStatus } from '@falconv/shared';
import { TaskKanban } from '@/components/delivery/task-kanban';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { apiFetch } from '@/lib/api';

type TaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: string;
  project: { id: string; name: string; projectNumber: string };
  assignee: { user: { name: string } } | null;
};

function TasksBody() {
  const search = useSearchParams();
  const projectId = search.get('projectId') ?? '';
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['tasks', projectId || 'all'],
    queryFn: () => apiFetch<TaskRow[]>(`/api/v1/tasks${projectId ? `?projectId=${projectId}` : ''}`),
  });

  async function moveTask(taskId: string, toStatus: TaskStatus) {
    setPendingId(taskId);
    try {
      await apiFetch(`/api/v1/tasks/${taskId}/transition`, {
        method: 'POST',
        body: JSON.stringify({ toStatus }),
      });
      toast.success('Task moved');
      await queryClient.invalidateQueries({ queryKey: ['tasks', projectId || 'all'] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Move rejected');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <p className="text-sm text-muted-foreground">List and Kanban. Moves are validated on the server.</p>
      </div>
      {query.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {query.data?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">No tasks yet.</CardContent>
        </Card>
      ) : null}
      <TaskKanban tasks={query.data ?? []} onMove={moveTask} pendingId={pendingId} />
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Task</th>
              <th className="px-4 py-3 font-medium">Project</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Assignee</th>
            </tr>
          </thead>
          <tbody>
            {(query.data ?? []).map((task) => (
              <tr key={task.id} className="border-t border-border">
                <td className="px-4 py-3">{task.title}</td>
                <td className="px-4 py-3">
                  <Link className="text-primary hover:underline" href={`/projects/${task.project.id}`}>
                    {task.project.projectNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{TASK_STATUS_LABELS[task.status]}</Badge>
                </td>
                <td className="px-4 py-3">{task.assignee?.user.name ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <TasksBody />
    </Suspense>
  );
}
