import type { FormEvent } from 'react'
import { TrashIcon } from '../../components/TrashIcon'
import { formatDueDateBound, getDueDateBounds } from '../../lib/dueDateLimits'
import { MAX_TASK_POINTS, MIN_TASK_POINTS } from '../../lib/pointEconomy'
import { INPUT_LIMITS } from '../../lib/inputLimits'
import type { GroupMember } from './groupService'

type StepDraft = { title: string; assignedTo: string }

type GroupTaskFormModalProps = {
  isEditing: boolean
  title: string
  description: string
  points: string
  isUrgent: boolean
  dueDate: string
  steps: StepDraft[]
  members: GroupMember[]
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onPointsChange: (value: string) => void
  onUrgencyChange: (value: boolean) => void
  onDueDateChange: (value: string) => void
  onStepsChange: (steps: StepDraft[]) => void
  onClose: () => void
  onSubmit: (event: FormEvent) => void
}

export function GroupTaskFormModal({
  isEditing,
  title,
  description,
  points,
  isUrgent,
  dueDate,
  steps,
  members,
  onTitleChange,
  onDescriptionChange,
  onPointsChange,
  onUrgencyChange,
  onDueDateChange,
  onStepsChange,
  onClose,
  onSubmit,
}: GroupTaskFormModalProps) {
  const dueDateBounds = getDueDateBounds()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="group-task-form-title">
      <section className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/60">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">{isEditing ? 'Edit task' : 'New task'}</p>
            <h2 id="group-task-form-title" className="mt-2 text-2xl font-bold">{isEditing ? 'Save group task details' : 'Create a group task'}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200">Close</button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-amber-300/30 bg-amber-300/10 p-3 text-sm font-semibold text-amber-100">
            <input type="checkbox" checked={isUrgent} onChange={(event) => onUrgencyChange(event.target.checked)} className="h-4 w-4 accent-amber-300" />
            Mark this task as urgent
          </label>
          <label className="block"><span className="text-sm font-medium text-slate-200">Title</span><input required maxLength={INPUT_LIMITS.groupTaskTitle} value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Plan the next group milestone" className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30" /></label>
          <label className="block"><span className="text-sm font-medium text-slate-200">Description</span><textarea maxLength={INPUT_LIMITS.groupTaskDescription} value={description} onChange={(event) => onDescriptionChange(event.target.value)} placeholder="Add the shared task details here." className="mt-2 min-h-28 w-full resize-y rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30" /></label>
          <label className="block"><span className="text-sm font-medium text-slate-200">Points</span><input type="number" min={MIN_TASK_POINTS} max={MAX_TASK_POINTS} step="1" required value={points} onChange={(event) => onPointsChange(event.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30" /><span className="mt-1 block text-xs text-slate-400">Choose between {MIN_TASK_POINTS} and {MAX_TASK_POINTS} points.</span></label>
          <label className="block"><span className="text-sm font-medium text-slate-200">Due date <span className="font-normal text-slate-400">(optional)</span></span><input type="date" min={dueDateBounds.min} max={dueDateBounds.max} value={dueDate} onChange={(event) => onDueDateChange(event.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30" /><span className="mt-1 block text-xs text-slate-400">Choose between {formatDueDateBound(dueDateBounds.min)} and {formatDueDateBound(dueDateBounds.max)}.</span></label>

          <div>
            <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-200">Checklist steps</p><button type="button" disabled={steps.length >= INPUT_LIMITS.groupTaskStepCount} onClick={() => onStepsChange([...steps, { title: '', assignedTo: '' }])} className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">Add step</button></div>
            <div className="mt-2 space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[1fr_12rem_auto]">
                  <input maxLength={INPUT_LIMITS.groupTaskStepText} value={step.title} onChange={(event) => onStepsChange(steps.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} placeholder={`Step ${index + 1}`} className="col-span-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 sm:col-span-1" />
                  <select value={step.assignedTo} onChange={(event) => onStepsChange(steps.map((item, itemIndex) => itemIndex === index ? { ...item, assignedTo: event.target.value } : item))} aria-label={`Assign step ${index + 1}`} className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"><option value="">Unassigned</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.display_name}</option>)}</select>
                  <button type="button" onClick={() => onStepsChange(steps.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove step ${index + 1}`} title="Remove step" className="flex h-10 w-10 items-center justify-center justify-self-end rounded-md border border-white/15 text-slate-200 transition hover:border-rose-300 hover:bg-rose-300/10 hover:text-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-300"><TrashIcon /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-md border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200">Cancel</button>
            <button type="submit" className="rounded-md bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950">{isEditing ? 'Save task' : 'Create task'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
