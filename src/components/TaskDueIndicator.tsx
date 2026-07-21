export function TaskDueIndicator({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return null

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const due = new Date(`${dueDate}T00:00:00`)
  const daysRemaining = Math.ceil((due.getTime() - today.getTime()) / 86_400_000)
  const hue = Math.round(Math.max(0, Math.min(30, daysRemaining)) * 4)
  const label = daysRemaining < 0
    ? `${Math.abs(daysRemaining)}d overdue`
    : daysRemaining === 0
      ? 'Due today'
      : daysRemaining === 1
        ? 'Due tomorrow'
        : `Due in ${daysRemaining}d`

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300" title={`Due ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(due)}`}>
      <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full shadow-sm" style={{ backgroundColor: `hsl(${hue} 78% 52%)` }} />
      {label}
    </span>
  )
}
