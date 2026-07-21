import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  deleteGroupTask,
  getCurrentUserId,
  getGroupMembers,
  getGroups,
  getGroupTasks,
  updateGroupTask,
  updateGroupTaskStatus,
  updateGroupTaskStepCompletion,
  type Group,
  type GroupMember,
  type GroupTask,
} from '../groups/groupService'
import { GroupTaskDetailsModal } from '../groups/GroupTaskDetailsModal'
import { GroupTaskFormModal } from '../groups/GroupTaskFormModal'
import type { Task } from '../tasks/taskService'
import { clampTaskPoints } from '../../lib/pointEconomy'

type CalendarDashboardProps = {
  tasks: Task[]
  isLoadingTasks: boolean
  tasksError: string
  onRefreshTasks: () => void
  onOpenTask: (task: Task) => void
}

type CalendarGroupTask = {
  task: GroupTask
  group: Group
  members: GroupMember[]
}

type CalendarItem =
  | { kind: 'personal'; key: string; task: Task }
  | ({ kind: 'group'; key: string } & CalendarGroupTask)

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

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

function itemTask(item: CalendarItem) {
  return item.task
}

export function CalendarDashboard({
  tasks,
  isLoadingTasks,
  tasksError,
  onRefreshTasks,
  onOpenTask,
}: CalendarDashboardProps) {
  const today = useMemo(() => new Date(), [])
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(today))
  const [selectedDate, setSelectedDate] = useState(() => dateKey(today))
  const [isDayModalOpen, setIsDayModalOpen] = useState(false)
  const [groupTasks, setGroupTasks] = useState<CalendarGroupTask[]>([])
  const [isLoadingGroupTasks, setIsLoadingGroupTasks] = useState(true)
  const [groupTasksError, setGroupTasksError] = useState('')
  const [currentUserId, setCurrentUserId] = useState('')
  const [selectedGroupTask, setSelectedGroupTask] = useState<CalendarGroupTask | null>(null)
  const [editingGroupTask, setEditingGroupTask] = useState<CalendarGroupTask | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskPoints, setTaskPoints] = useState('10')
  const [taskUrgent, setTaskUrgent] = useState(false)
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskSteps, setTaskSteps] = useState([{ title: '', assignedTo: '' }])

  const loadGroupTasks = useCallback(async () => {
    setIsLoadingGroupTasks(true)
    setGroupTasksError('')

    const [groupsResponse, userResponse] = await Promise.all([
      getGroups(),
      getCurrentUserId(),
    ])
    setCurrentUserId(userResponse.data ?? '')

    if (groupsResponse.error) {
      setGroupTasks([])
      setGroupTasksError(errorMessage(groupsResponse.error))
      setIsLoadingGroupTasks(false)
      return
    }

    const groupResponses = await Promise.all(
      (groupsResponse.data ?? []).map(async (group) => {
        const [tasksResponse, membersResponse] = await Promise.all([
          getGroupTasks(group.id),
          getGroupMembers(group.id),
        ])
        return { group, tasksResponse, membersResponse }
      }),
    )

    const nextGroupTasks: CalendarGroupTask[] = []
    let nextError = ''
    groupResponses.forEach(({ group, tasksResponse, membersResponse }) => {
      if (tasksResponse.error || membersResponse.error) {
        nextError ||= errorMessage(tasksResponse.error ?? membersResponse.error)
        return
      }
      ;(tasksResponse.data ?? []).forEach((task) => {
        nextGroupTasks.push({ task, group, members: membersResponse.data ?? [] })
      })
    })

    setGroupTasks(nextGroupTasks)
    setSelectedGroupTask((current) =>
      current
        ? nextGroupTasks.find((item) => item.task.id === current.task.id) ?? null
        : null,
    )
    setGroupTasksError(nextError)
    setIsLoadingGroupTasks(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadGroupTasks()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadGroupTasks])

  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, CalendarItem[]>()
    const addItem = (dueDate: string | null, item: CalendarItem) => {
      if (!dueDate) return
      const existing = grouped.get(dueDate) ?? []
      existing.push(item)
      grouped.set(dueDate, existing)
    }

    tasks.forEach((task) => {
      addItem(task.due_date, { kind: 'personal', key: `personal-${task.id}`, task })
    })
    groupTasks.forEach((item) => {
      addItem(item.task.due_date, { kind: 'group', key: `group-${item.task.id}`, ...item })
    })

    grouped.forEach((datedItems) => datedItems.sort((first, second) => {
      const firstTask = itemTask(first)
      const secondTask = itemTask(second)
      if (firstTask.status === 'Completed' && secondTask.status !== 'Completed') return 1
      if (firstTask.status !== 'Completed' && secondTask.status === 'Completed') return -1
      if (firstTask.is_urgent !== secondTask.is_urgent) return firstTask.is_urgent ? -1 : 1
      return firstTask.title.localeCompare(secondTask.title)
    }))
    return grouped
  }, [groupTasks, tasks])

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
  const isLoadingCalendar = isLoadingTasks || isLoadingGroupTasks

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

  function openCalendarItem(item: CalendarItem) {
    setIsDayModalOpen(false)
    if (item.kind === 'personal') onOpenTask(item.task)
    else setSelectedGroupTask(item)
  }

  async function refreshCalendar() {
    onRefreshTasks()
    await loadGroupTasks()
  }

  function openEditGroupTask(item: CalendarGroupTask) {
    setEditingGroupTask(item)
    setTaskTitle(item.task.title)
    setTaskDescription(item.task.description ?? '')
    setTaskPoints(String(item.task.points))
    setTaskUrgent(item.task.is_urgent)
    setTaskDueDate(item.task.due_date ?? '')
    setTaskSteps(item.task.group_task_steps.length
      ? item.task.group_task_steps.map((step) => ({
          title: step.title,
          assignedTo: step.assigned_to ?? '',
        }))
      : [{ title: '', assignedTo: '' }])
    setSelectedGroupTask(null)
  }

  async function handleEditGroupTask(event: FormEvent) {
    event.preventDefault()
    if (!editingGroupTask) return
    const response = await updateGroupTask(
      editingGroupTask.task,
      taskTitle,
      taskDescription,
      clampTaskPoints(Number(taskPoints)),
      taskUrgent,
      taskDueDate,
      taskSteps,
    )
    if (response.error) {
      setGroupTasksError(errorMessage(response.error))
      return
    }
    setEditingGroupTask(null)
    await loadGroupTasks()
  }

  async function handleToggleGroupStep(stepId: string, isCompleted: boolean) {
    if (!selectedGroupTask) return
    const response = await updateGroupTaskStepCompletion(stepId, isCompleted)
    if (response.error) {
      setGroupTasksError(errorMessage(response.error))
      return
    }
    const updateItem = (item: CalendarGroupTask) => ({
      ...item,
      task: {
        ...item.task,
        group_task_steps: item.task.group_task_steps.map((step) =>
          step.id === stepId ? { ...step, is_completed: isCompleted } : step,
        ),
      },
    })
    setGroupTasks((current) => current.map((item) =>
      item.task.id === selectedGroupTask.task.id ? updateItem(item) : item,
    ))
    setSelectedGroupTask((current) => current ? updateItem(current) : null)
  }

  async function handleDeleteGroupTask() {
    if (!selectedGroupTask) return
    const response = await deleteGroupTask(selectedGroupTask.task.id)
    if (response.error) {
      setGroupTasksError(errorMessage(response.error))
      return
    }
    setGroupTasks((current) => current.filter((item) => item.task.id !== selectedGroupTask.task.id))
    setSelectedGroupTask(null)
  }

  async function handleToggleGroupTaskStatus() {
    if (!selectedGroupTask) return
    const nextStatus: GroupTask['status'] = selectedGroupTask.task.status === 'Completed'
      ? 'In Progress'
      : 'Completed'
    const response = await updateGroupTaskStatus(selectedGroupTask.task.id, nextStatus)
    if (response.error) {
      setGroupTasksError(errorMessage(response.error))
      return
    }
    const updateItem = (item: CalendarGroupTask) => ({
      ...item,
      task: { ...item.task, status: nextStatus },
    })
    setGroupTasks((current) => current.map((item) =>
      item.task.id === selectedGroupTask.task.id ? updateItem(item) : item,
    ))
    setSelectedGroupTask((current) => current ? updateItem(current) : null)
  }

  return (
    <>
      <section className="rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-cyan-950/30">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Calendar</h2>
            <p className="mt-1 text-sm text-slate-300">
              See personal and group tasks on the dates they are due.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={returnToToday} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200">
              Today
            </button>
            <button type="button" onClick={() => void refreshCalendar()} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200">
              Refresh
            </button>
          </div>
        </div>

        {tasksError ? (
          <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
            Personal tasks could not be loaded: {tasksError}
          </p>
        ) : null}
        {groupTasksError ? (
          <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
            Group tasks could not be loaded: {groupTasksError}
          </p>
        ) : null}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month" className="rounded-md border border-white/15 px-3 py-2 text-lg font-bold transition hover:border-cyan-300 hover:text-cyan-200">‹</button>
          <h3 className="text-xl font-bold">
            {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(visibleMonth)}
          </h3>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Next month" className="rounded-md border border-white/15 px-3 py-2 text-lg font-bold transition hover:border-cyan-300 hover:text-cyan-200">›</button>
        </div>

        <div className="mt-4 overflow-x-auto pb-2">
          <div className="min-w-[48rem]">
            <div className="grid grid-cols-7 border-b border-white/10">
              {weekdayLabels.map((label) => (
                <div key={label} className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400">
                  {label}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 overflow-hidden rounded-b-lg border-l border-t border-white/10">
              {calendarDays.map((date) => {
                const key = dateKey(date)
                const dayTasks = tasksByDate.get(key) ?? []
                const isCurrentMonth = date.getMonth() === visibleMonth.getMonth()
                const isToday = key === dateKey(today)
                const isSelected = key === selectedDate
                return (
                  <button key={key} type="button" onClick={() => selectDay(date)} className={`min-h-32 border-b border-r border-white/10 p-2 text-left align-top transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-300 ${isSelected ? 'bg-cyan-300/10' : 'hover:bg-white/[0.05]'} ${isCurrentMonth ? '' : 'bg-slate-950/30 text-slate-500'}`}>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-cyan-300 text-slate-950' : isCurrentMonth ? 'text-white' : 'text-slate-500'}`}>
                      {date.getDate()}
                    </span>
                    <span className="mt-1 block space-y-1">
                      {dayTasks.slice(0, 3).map((item) => {
                        const task = itemTask(item)
                        const title = item.kind === 'group' ? `${item.group.name}: ${task.title}` : task.title
                        return (
                          <span key={item.key} className={`block truncate rounded border px-1.5 py-1 text-xs font-semibold ${task.status === 'Completed' ? 'border-white/10 bg-white/[0.04] text-slate-500 line-through' : task.is_urgent ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : item.kind === 'group' ? 'border-violet-300/30 bg-violet-300/10 text-violet-100' : 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100'}`} title={title}>
                            {task.title}
                          </span>
                        )
                      })}
                      {dayTasks.length > 3 ? (
                        <span className="block px-1 text-xs font-semibold text-slate-400">
                          +{dayTasks.length - 3} more
                        </span>
                      ) : null}
                    </span>
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
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Tasks due</p>
                <h3 id="calendar-day-title" className="mt-2 text-2xl font-bold">
                  {new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(selectedDateObject)}
                </h3>
                <p className="mt-2 text-sm text-slate-300">
                  {selectedTasks.length} task{selectedTasks.length === 1 ? '' : 's'} due on this day.
                </p>
              </div>
              <button type="button" onClick={() => setIsDayModalOpen(false)} className="shrink-0 rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200">
                Close
              </button>
            </div>
            <div className="mt-6 space-y-3">
              {isLoadingCalendar ? <p className="text-sm text-slate-300">Loading tasks…</p> : null}
              {!isLoadingCalendar && selectedTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/15 p-6 text-center">
                  <p className="font-semibold text-white">Nothing due</p>
                  <p className="mt-2 text-sm text-slate-300">No tasks are due on this day.</p>
                </div>
              ) : null}
              {selectedTasks.map((item) => {
                const task = itemTask(item)
                const stepCount = item.kind === 'personal'
                  ? item.task.task_steps
                  : item.task.group_task_steps
                return (
                  <button key={item.key} type="button" onClick={() => openCalendarItem(item)} className={`w-full rounded-lg border bg-slate-900/70 p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-300 ${task.is_urgent && task.status !== 'Completed' ? 'border-amber-300/60 hover:border-amber-200' : 'border-white/10 hover:border-cyan-300/70'}`}>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                      <div className="min-w-0">
                        <p className={`mb-1 text-xs font-bold uppercase tracking-wider ${item.kind === 'group' ? 'text-violet-200' : 'text-cyan-300'}`}>
                          {item.kind === 'group' ? item.group.name : 'Personal task'}
                        </p>
                        <h4 className={`truncate font-semibold ${task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-white'}`} title={task.title}>
                          {task.title}
                        </h4>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-300">
                          {task.description || 'No description added.'}
                        </p>
                      </div>
                      <span className="shrink-0 self-start rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold leading-none text-slate-950">
                        {task.points} pts
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold text-slate-400">
                      <span>{task.status}</span>
                      <span>
                        {stepCount.length
                          ? `${stepCount.filter((step) => step.is_completed).length}/${stepCount.length} steps`
                          : 'No steps'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      ) : null}

      {selectedGroupTask ? (
        <GroupTaskDetailsModal
          task={selectedGroupTask.task}
          group={selectedGroupTask.group}
          members={selectedGroupTask.members}
          currentUserId={currentUserId}
          onClose={() => setSelectedGroupTask(null)}
          onEdit={() => openEditGroupTask(selectedGroupTask)}
          onToggleStep={(stepId, isCompleted) => void handleToggleGroupStep(stepId, isCompleted)}
          onDelete={handleDeleteGroupTask}
          onToggleStatus={() => void handleToggleGroupTaskStatus()}
        />
      ) : null}

      {editingGroupTask ? (
        <GroupTaskFormModal
          isEditing
          title={taskTitle}
          description={taskDescription}
          points={taskPoints}
          isUrgent={taskUrgent}
          dueDate={taskDueDate}
          steps={taskSteps}
          members={editingGroupTask.members}
          onTitleChange={setTaskTitle}
          onDescriptionChange={setTaskDescription}
          onPointsChange={setTaskPoints}
          onUrgencyChange={setTaskUrgent}
          onDueDateChange={setTaskDueDate}
          onStepsChange={setTaskSteps}
          onClose={() => setEditingGroupTask(null)}
          onSubmit={handleEditGroupTask}
        />
      ) : null}
    </>
  )
}
