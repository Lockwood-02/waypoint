import { useMemo, useState } from 'react'
import type { Task } from '../tasks/taskService'

type CalendarDashboardProps = {
  tasks: Task[]
  isLoadingTasks: boolean
  tasksError: string
  onRefreshTasks: () => void
  onOpenTask: (task: Task) => void
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateFromKey(value: string) {
  return new Date(`${value}T00:00:00`)
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function CalendarDashboard({ tasks, isLoadingTasks, tasksError, onRefreshTasks, onOpenTask }: CalendarDashboardProps) {
  const today = useMemo(() => new Date(), [])
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(today))
  const [selectedDate, setSelectedDate] = useState(() => dateKey(today))
  const [isDayModalOpen, setIsDayModalOpen] = useState(false)

  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, Task[]>()
    tasks.forEach((task) => {
      if (!task.due_date) return
      const existing = grouped.get(task.due_date) ?? []
      existing.push(task)
      grouped.set(task.due_date, existing)
    })
    grouped.forEach((datedTasks) => datedTasks.sort((first, second) => {
      if (first.status === 'Completed' && second.status !== 'Completed') return 1
      if (first.status !== 'Completed' && second.status === 'Completed') return -1
      if (first.is_urgent !== second.is_urgent) return first.is_urgent ? -1 : 1
      return first.title.localeCompare(second.title)
    }))
    return grouped
  }, [tasks])

  const calendarDays = useMemo(() => {
    const firstDay = monthStart(visibleMonth)
    const gridStart = new Date(firstDay)
    gridStart.setDate(1 - firstDay.getDay())
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart)
      date.setDate(gridStart.getDate() + index)
      return date
    })
  }, [visibleMonth])

  const selectedTasks = tasksByDate.get(selectedDate) ?? []
  const selectedDateObject = dateFromKey(selectedDate)

  function changeMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  function selectDay(date: Date) {
    setSelectedDate(dateKey(date))
    setIsDayModalOpen(true)
    if (date.getMonth() !== visibleMonth.getMonth() || date.getFullYear() !== visibleMonth.getFullYear()) {
      setVisibleMonth(monthStart(date))
    }
  }

  function returnToToday() {
    setVisibleMonth(monthStart(today))
    setSelectedDate(dateKey(today))
  }

  function openTaskFromDay(task: Task) {
    setIsDayModalOpen(false)
    onOpenTask(task)
  }

  return (
    <>
    <section className="rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-cyan-950/30">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-2xl font-bold">Calendar</h2><p className="mt-1 text-sm text-slate-300">See personal tasks on the dates they are due.</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={returnToToday} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200">Today</button><button type="button" onClick={onRefreshTasks} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200">Refresh</button></div>
      </div>

      {tasksError ? <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">Tasks could not be loaded: {tasksError}</p> : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="rounded-md border border-white/15 px-3 py-2 text-lg font-bold transition hover:border-cyan-300 hover:text-cyan-200">‹</button>
        <h3 className="text-xl font-bold">{new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(visibleMonth)}</h3>
        <button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="rounded-md border border-white/15 px-3 py-2 text-lg font-bold transition hover:border-cyan-300 hover:text-cyan-200">›</button>
      </div>

      <div className="mt-4 overflow-x-auto pb-2">
        <div className="min-w-[48rem]">
          <div className="grid grid-cols-7 border-b border-white/10">{weekdayLabels.map((label) => <div key={label} className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">{label}</div>)}</div>
          <div className="grid grid-cols-7 overflow-hidden rounded-b-lg border-l border-t border-white/10">
            {calendarDays.map((date) => {
              const key = dateKey(date)
              const dayTasks = tasksByDate.get(key) ?? []
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth()
              const isToday = key === dateKey(today)
              const isSelected = key === selectedDate
              return (
                <button key={key} type="button" onClick={() => selectDay(date)} className={`min-h-32 border-b border-r border-white/10 p-2 text-left align-top transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-300 ${isSelected ? 'bg-cyan-300/10' : 'hover:bg-white/[0.05]'} ${isCurrentMonth ? '' : 'bg-slate-950/30 text-slate-500'}`}>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-cyan-300 text-slate-950' : isCurrentMonth ? 'text-white' : 'text-slate-500'}`}>{date.getDate()}</span>
                  <span className="mt-1 block space-y-1">{dayTasks.slice(0, 3).map((task) => <span key={task.id} className={`block truncate rounded border px-1.5 py-1 text-xs font-semibold ${task.status === 'Completed' ? 'border-white/10 bg-white/[0.04] text-slate-500 line-through' : task.is_urgent ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100'}`} title={task.title}>{task.title}</span>)}{dayTasks.length > 3 ? <span className="block px-1 text-xs font-semibold text-slate-400">+{dayTasks.length - 3} more</span> : null}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

    </section>

    {isDayModalOpen ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="calendar-day-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsDayModalOpen(false) }}>
        <section className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/60">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Tasks due</p><h3 id="calendar-day-title" className="mt-2 text-2xl font-bold">{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(selectedDateObject)}</h3><p className="mt-2 text-sm text-slate-300">{selectedTasks.length} task{selectedTasks.length === 1 ? '' : 's'} due on this day.</p></div><button type="button" onClick={() => setIsDayModalOpen(false)} className="shrink-0 rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200">Close</button></div>
          <div className="mt-6 space-y-3">
            {isLoadingTasks ? <p className="text-sm text-slate-300">Loading tasks…</p> : null}
            {!isLoadingTasks && selectedTasks.length === 0 ? <div className="rounded-lg border border-dashed border-white/15 p-6 text-center"><p className="font-semibold text-white">Nothing due</p><p className="mt-2 text-sm text-slate-300">No tasks are due on this day.</p></div> : null}
            {selectedTasks.map((task) => <button key={task.id} type="button" onClick={() => openTaskFromDay(task)} className={`w-full rounded-lg border bg-slate-900/70 p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-300 ${task.is_urgent && task.status !== 'Completed' ? 'border-amber-300/60 hover:border-amber-200' : 'border-white/10 hover:border-cyan-300/70'}`}><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3"><div className="min-w-0"><h4 className={`truncate font-semibold ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-white'}`} title={task.title}>{task.title}</h4><p className="mt-1 line-clamp-2 text-sm text-slate-300">{task.description || 'No description added.'}</p></div><span className="shrink-0 self-start rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold leading-none text-slate-950">{task.points} pts</span></div><div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-400"><span>{task.status}</span><span>{task.task_steps.length ? `${task.task_steps.filter((step) => step.is_completed).length}/${task.task_steps.length} steps` : 'No steps'}</span></div></button>)}
          </div>
        </section>
      </div>
    ) : null}
    </>
  )
}
