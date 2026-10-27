'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  TASK_STATUSES,
  type ProjectStatus,
  type TaskStatus,
} from '@falconv/shared';
import { TaskKanban } from '@/components/delivery/task-kanban';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';

type ProjectDetail = {
  id: string;
  projectNumber: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: string;
  client: { id: string; name: string };
  serviceRequest: { id: string; requestNumber: string; title: string };
  manager: { user: { name: string } } | null;
  members: Array<{ id: string; userProfile: { user: { name: string; email: string } } }>;
  milestones: Array<{ id: string; name: string; dueDate: string | null }>;
  _count: { tasks: number; issues: number; documents: number };
};

type TaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: string;
  assignee: { user: { name: string } } | null;
};

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [taskTitle, setTaskTitle] = useState('');
  const [milestoneName, setMilestoneName] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const projectQuery = useQuery({
    queryKey: ['project', params.id],
    queryFn: () => apiFetch<ProjectDetail>(`/api/v1/projects/${params.id}`),
  });
  const tasksQuery = useQuery({
    queryKey: ['tasks', params.id],
    queryFn: () => apiFetch<TaskRow[]>(`/api/v1/tasks?projectId=${params.id}`),
  });

  const createTask = useMutation({
    mutationFn: () =>
      apiFetch('/api/v1/tasks', {
        method: 'POST',
        body: JSON.stringify({ projectId: params.id, title: taskTitle }),
      }),
    onSuccess: () => {
      setTaskTitle('');
      toast.success('Task added');
      void queryClient.invalidateQueries({ queryKey: ['tasks', params.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addMilestone = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/projects/${params.id}/milestones`, {
        method: 'POST',
        body: JSON.stringify({ name: milestoneName }),
      }),
    onSuccess: () => {
      setMilestoneName('');
      toast.success('Milestone added');
      void queryClient.invalidateQueries({ queryKey: ['project', params.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setStatus = useMutation({
    mutationFn: (status: ProjectStatus) =>
      apiFetch(`/api/v1/projects/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      toast.success('Project updated');
      void queryClient.invalidateQueries({ queryKey: ['project', params.id] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function moveTask(taskId: string, toStatus: TaskStatus) {
    setPendingId(taskId);
    try {
      await apiFetch(`/api/v1/tasks/${taskId}/transition`, {
        method: 'POST',
        body: JSON.stringify({ toStatus }),
      });
      toast.success('Task moved');
      await queryClient.invalidateQueries({ queryKey: ['tasks', params.id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Move rejected');
    } finally {
      setPendingId(null);
    }
  }

  if (projectQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (!projectQuery.data) {
    return <p className="text-sm text-muted-foreground">Project not found.</p>;
  }
  const project = projectQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{project.projectNumber}</p>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{PROJECT_STATUS_LABELS[project.status]}</Badge>
            <Badge variant="outline">{project.priority}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/issues?projectId=${project.id}`}>Issues</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/documents?projectId=${project.id}`}>Documents</Link>
          </Button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="whitespace-pre-wrap">{project.description ?? 'No description.'}</p>
            <p>
              Client:{' '}
              <Link className="text-primary underline" href={`/clients/${project.client.id}`}>
                {project.client.name}
              </Link>
            </p>
            <p>
              Source request:{' '}
              <Link className="text-primary underline" href={`/service-requests/${project.serviceRequest.id}`}>
                {project.serviceRequest.requestNumber} — {project.serviceRequest.title}
              </Link>
            </p>
            <p>Manager: {project.manager?.user.name ?? 'Unassigned'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <select
              className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
              value={project.status}
              onChange={(event) => setStatus.mutate(event.target.value as ProjectStatus)}
            >
              {PROJECT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PROJECT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {project._count.tasks} tasks · {project._count.issues} issues · {project._count.documents} documents
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Kanban</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (taskTitle.trim().length >= 3) {
                createTask.mutate();
              }
            }}
          >
            <Input
              placeholder="New task title"
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
            />
            <Button type="submit">Add task</Button>
          </form>
          <p className="text-xs text-muted-foreground">
            Drag cards only onto allowed next columns. Invalid moves are rejected by the API.
          </p>
          <TaskKanban tasks={tasksQuery.data ?? []} onMove={moveTask} pendingId={pendingId} />
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {TASK_STATUSES.map((status) => (
              <span key={status}>{status.replaceAll('_', ' ')}</span>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {project.members.length === 0 ? <p className="text-muted-foreground">No members yet.</p> : null}
            {project.members.map((member) => (
              <div key={member.id}>
                {member.userProfile.user.name}{' '}
                <span className="text-muted-foreground">{member.userProfile.user.email}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Milestones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (milestoneName.trim().length >= 2) {
                  addMilestone.mutate();
                }
              }}
            >
              <Input
                placeholder="Milestone name"
                value={milestoneName}
                onChange={(event) => setMilestoneName(event.target.value)}
              />
              <Button type="submit" variant="outline">
                Add
              </Button>
            </form>
            {project.milestones.map((milestone) => (
              <div key={milestone.id} className="text-sm">
                {milestone.name}
                {milestone.dueDate ? (
                  <span className="text-muted-foreground"> · {new Date(milestone.dueDate).toLocaleDateString()}</span>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
