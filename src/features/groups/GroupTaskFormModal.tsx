import type { FormEvent } from 'react'
import type { GroupMember } from './groupService'

type StepDraft = { title: string; assignedTo: string }

type GroupTaskFormModalProps = {
  isEditing: boolean
  title: string
  description: string
  points: string
  isUrgent: boolean
  steps: StepDraft[]
  members: GroupMember[]
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onPointsChange: (value: string) => void
  onUrgencyChange: (value: boolean) => void
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
  steps,
  members,
  onTitleChange,
  onDescriptionChange,
  onPointsChange,
  onUrgencyChange,
  onStepsChange,
  onClose,
  onSubmit,
}: GroupTaskFormModalProps) {
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
          <label className="block"><span className="text-sm font-medium text-slate-200">Title</span><input required maxLength={160} value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Plan the next group milestone" className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30" /></label>
          <label className="block"><span className="text-sm font-medium text-slate-200">Description</span><textarea value={description} onChange={(event) => onDescriptionChange(event.target.value)} placeholder="Add the shared task details here." className="mt-2 min-h-28 w-full resize-y rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30" /></label>
          <label className="block"><span className="text-sm font-medium text-slate-200">Points</span><input type="number" min="0" required value={points} onChange={(event) => onPointsChange(event.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30" /></label>

          <div>
            <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium text-slate-200">Checklist steps</p><button type="button" onClick={() => onStepsChange([...steps, { title: '', assignedTo: '' }])} className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300">Add step</button></div>
            <div className="mt-2 space-y-2">
              {steps.map((step, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_12rem_auto]">
                  <input value={step.title} onChange={(event) => onStepsChange(steps.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} placeholder={`Step ${index + 1}`} className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30" />
                  <select value={step.assignedTo} onChange={(event) => onStepsChange(steps.map((item, itemIndex) => itemIndex === index ? { ...item, assignedTo: event.target.value } : item))} aria-label={`Assign step ${index + 1}`} className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"><option value="">Unassigned</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.display_name}</option>)}</select>
                  <button type="button" onClick={() => onStepsChange(steps.filter((_, itemIndex) => itemIndex !== index))} className="rounded-md border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-rose-300 hover:text-rose-100">Remove</button>
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
