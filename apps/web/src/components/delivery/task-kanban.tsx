'use client';

import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { TASK_STATUSES, TASK_STATUS_LABELS, TASK_TRANSITIONS, type TaskStatus } from '@falconv/shared';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type KanbanTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: string;
  assignee?: { user: { name: string } } | null;
};

export function TaskKanban({
  tasks,
  onMove,
  pendingId,
}: {
  tasks: KanbanTask[];
  onMove: (taskId: string, toStatus: TaskStatus) => void;
  pendingId?: string | null;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragEnd(event: DragEndEvent) {
    const overId = event.over?.id;
    const taskId = String(event.active.id);
    if (!overId) {
      return;
    }
    const toStatus = String(overId) as TaskStatus;
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === toStatus) {
      return;
    }
    onMove(taskId, toStatus);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid gap-3 overflow-x-auto pb-2 md:grid-cols-6">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasks.filter((task) => task.status === status)}
            pendingId={pendingId}
          />
        ))}
      </div>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  tasks,
  pendingId,
}: {
  status: TaskStatus;
  tasks: KanbanTask[];
  pendingId?: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[28rem] rounded-lg border border-border bg-muted/40 p-2',
        isOver && 'ring-2 ring-primary',
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {TASK_STATUS_LABELS[status]}
        </p>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} disabled={pendingId === task.id} />
        ))}
      </div>
    </div>
  );
}

function KanbanCard({ task, disabled }: { task: KanbanTask; disabled?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled,
  });
  const allowed = TASK_TRANSITIONS[task.status];
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      }}
      className={cn(
        'cursor-grab rounded-md border border-border bg-card p-3 shadow-sm',
        isDragging && 'opacity-70',
        disabled && 'opacity-50',
      )}
    >
      <p className="text-sm font-medium">{task.title}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline">{task.priority}</Badge>
        {task.assignee ? <Badge variant="outline">{task.assignee.user.name}</Badge> : null}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Next: {allowed.map((item) => TASK_STATUS_LABELS[item]).join(', ') || '—'}</p>
    </div>
  );
}
