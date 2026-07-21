import { TaskDueIndicator } from '../../components/TaskDueIndicator'
import type { Group, GroupMember, GroupTask } from './groupService'

type GroupTaskDetailsModalProps = {
  task: GroupTask
  group: Group
  members: GroupMember[]
  currentUserId: string
  onClose: () => void
  onEdit: () => void
  onToggleStep: (stepId: string, isCompleted: boolean) => void
  onDelete: () => void
  onToggleStatus: () => void
}

export function GroupTaskDetailsModal({
  task,
  group,
  members,
  currentUserId,
  onClose,
  onEdit,
  onToggleStep,
  onDelete,
  onToggleStatus,
}: GroupTaskDetailsModalProps) {
  const memberName = (userId: string | null) =>
    members.find((member) => member.user_id === userId)?.display_name ??
    (userId ? 'Group member' : 'Unassigned')
  const canEdit = group.role === 'owner' || task.created_by === currentUserId

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="group-task-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/60">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
              {group.name}
            </p>
            <h2 id="group-task-title" className="mt-2 break-words text-2xl font-bold">
              {task.title}
            </h2>
          </div>
          <div className="flex shrink-0 gap-2">
            {canEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
              >
                Edit
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold text-slate-950">
            {task.points} points
          </span>
          <span className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200">
            {task.status}
          </span>
          <span className="inline-flex items-center rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200">
            Created by {memberName(task.created_by)}
          </span>
          {task.status !== 'Completed' && task.due_date ? (
            <span className="inline-flex items-center rounded-full border border-white/15 px-3 py-1">
              <TaskDueIndicator dueDate={task.due_date} />
            </span>
          ) : null}
          {task.is_urgent ? (
            <span className="inline-flex items-center rounded-full border border-amber-300/50 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-100">
              Urgent
            </span>
          ) : null}
        </div>

        <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-200">
          {task.description || 'No description added.'}
        </p>

        <div className="mt-6">
          <h3 className="text-lg font-semibold">Checklist</h3>
          <div className="mt-3 space-y-2">
            {task.group_task_steps.length === 0 ? (
              <p className="rounded-md border border-dashed border-white/15 p-4 text-sm text-slate-300">
                This task has no checklist steps.
              </p>
            ) : null}
            {task.group_task_steps.map((step) => (
              <label
                key={step.id}
                className="flex items-start justify-between gap-4 rounded-md border border-white/10 bg-white/[0.04] p-3"
              >
                <span className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={step.is_completed}
                    disabled={task.status === 'Completed'}
                    onChange={(event) => onToggleStep(step.id, event.target.checked)}
                    className="mt-1 h-4 w-4 accent-cyan-300"
                  />
                  <span className={`text-sm ${step.is_completed ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                    {step.title}
                  </span>
                </span>
                <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300">
                  {memberName(step.assigned_to)}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-rose-300/50 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-200 hover:bg-rose-300 hover:text-rose-950 hover:shadow-lg hover:shadow-rose-500/20"
          >
            Delete task
          </button>
          <button
            type="button"
            onClick={onToggleStatus}
            className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
          >
            {task.status === 'Completed' ? 'Return to in progress' : 'Complete task'}
          </button>
        </div>
      </section>
    </div>
  )
}
