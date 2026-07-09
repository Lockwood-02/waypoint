import { useMemo, useState } from 'react'
import type { Task } from '../tasks/taskService'

type WeeklyReportDashboardProps = {
  tasks: Task[]
  isLoadingTasks: boolean
  tasksError: string
  onRefreshTasks: () => void
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getCurrentWeekStart() {
  const date = new Date()
  const day = date.getDay()
  const daysFromMonday = day === 0 ? 6 : day - 1
  date.setDate(date.getDate() - daysFromMonday)

  return date
}

function parseDateInput(value: string, endOfDay = false) {
  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) {
    return null
  }

  return new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  )
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not dated'
  }

  const dateOnlyValue = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = dateOnlyValue
    ? parseDateInput(value) ?? new Date(value)
    : new Date(value)

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function getTaskTagName(task: Task) {
  return task.task_tag_links[0]?.task_tags?.name ?? 'No tag'
}

function getCompletedStepCount(task: Task) {
  return task.task_steps.filter((step) => step.is_completed).length
}

function isTaskCompletedInPeriod(task: Task, startDate: Date, endDate: Date) {
  if (task.status !== 'Completed' || !task.completed_at) {
    return false
  }

  const completedAt = new Date(task.completed_at)

  return completedAt >= startDate && completedAt <= endDate
}

function ReportTaskCard({ task }: { task: Task }) {
  const completedStepCount = getCompletedStepCount(task)

  return (
    <article className="rounded-lg border border-white/10 bg-slate-900/70 p-4 report-task-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white report-task-title">
            {task.title}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-300 report-meta">
            <span>{getTaskTagName(task)}</span>
            <span>{task.status}</span>
            {task.status === 'Completed' ? (
              <span>Completed {formatDate(task.completed_at)}</span>
            ) : (
              <span>
                {completedStepCount}/{task.task_steps.length} steps complete
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200 report-description">
        {task.description || 'No description added.'}
      </p>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 report-section-label">
          Steps
        </p>
        {task.task_steps.length === 0 ? (
          <p className="mt-2 text-sm text-slate-300 report-description">
            No checklist steps added.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {task.task_steps.map((step) => (
              <li
                key={step.id}
                className="flex items-start gap-2 text-sm text-slate-200 report-step"
              >
                <span
                  className={`mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full border text-xs font-bold ${
                    step.is_completed
                      ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                      : 'border-white/20 text-slate-300'
                  }`}
                >
                  {step.is_completed ? 'Done' : ''}
                </span>
                <span>{step.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

export function WeeklyReportDashboard({
  tasks,
  isLoadingTasks,
  tasksError,
  onRefreshTasks,
}: WeeklyReportDashboardProps) {
  const [periodStart, setPeriodStart] = useState(() =>
    toDateInputValue(getCurrentWeekStart()),
  )
  const [periodEnd, setPeriodEnd] = useState(() => toDateInputValue(new Date()))
  const [selectedProgressTaskIds, setSelectedProgressTaskIds] = useState<
    string[]
  >([])

  const startDate = useMemo(
    () => parseDateInput(periodStart) ?? getCurrentWeekStart(),
    [periodStart],
  )
  const endDate = useMemo(
    () => parseDateInput(periodEnd, true) ?? new Date(),
    [periodEnd],
  )

  const completedTasks = useMemo(
    () =>
      tasks
        .filter((task) => isTaskCompletedInPeriod(task, startDate, endDate))
        .sort(
          (firstTask, secondTask) =>
            new Date(secondTask.completed_at ?? '').getTime() -
            new Date(firstTask.completed_at ?? '').getTime(),
        ),
    [endDate, startDate, tasks],
  )

  const progressTaskOptions = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== 'Completed' && task.status !== 'Archived')
        .sort((firstTask, secondTask) =>
          firstTask.title.localeCompare(secondTask.title),
        ),
    [tasks],
  )

  const progressTasks = useMemo(
    () =>
      progressTaskOptions.filter((task) =>
        selectedProgressTaskIds.includes(task.id),
      ),
    [progressTaskOptions, selectedProgressTaskIds],
  )

  const periodLabel = `${formatDate(periodStart)} - ${formatDate(periodEnd)}`
  const reportTaskCount = completedTasks.length + progressTasks.length

  function toggleProgressTask(taskId: string) {
    setSelectedProgressTaskIds((currentTaskIds) =>
      currentTaskIds.includes(taskId)
        ? currentTaskIds.filter((currentTaskId) => currentTaskId !== taskId)
        : [...currentTaskIds, taskId],
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] weekly-report-screen">
      <section className="space-y-6 print:hidden">
        <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-cyan-950/40">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Build a report</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Completed tasks are pulled from the selected dates. Add open
                tasks below when the report needs a progress section too.
              </p>
            </div>
            <button
              type="button"
              onClick={onRefreshTasks}
              className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200"
            >
              Refresh
            </button>
          </div>

          {tasksError ? (
            <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
              Tasks could not be loaded: {tasksError}
            </p>
          ) : null}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                Report start
              </span>
              <input
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
                className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                Report end
              </span>
              <input
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
                className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-200">
              Report template
            </span>
            <select
              className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
              defaultValue="weekly-progress"
            >
              <option value="weekly-progress">Weekly progress summary</option>
            </select>
          </label>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
              <p className="text-2xl font-bold text-white">
                {completedTasks.length}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Completed
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
              <p className="text-2xl font-bold text-white">
                {progressTasks.length}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                In progress
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
              <p className="text-2xl font-bold text-white">{reportTaskCount}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Total included
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="mt-5 w-full rounded-md bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            Print report
          </button>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
          <h2 className="text-xl font-semibold">Assign in-progress tasks</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Choose tasks that should appear in the progress section even though
            they are not fully completed yet.
          </p>

          <div className="mt-5 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
            {isLoadingTasks ? (
              <p className="text-sm text-slate-300">Loading tasks...</p>
            ) : null}

            {!isLoadingTasks && progressTaskOptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 p-5 text-center">
                <p className="font-semibold">No open tasks</p>
                <p className="mt-2 text-sm text-slate-300">
                  Open tasks will show up here when they are ready to add to a
                  progress report.
                </p>
              </div>
            ) : null}

            {progressTaskOptions.map((task) => {
              const completedStepCount = getCompletedStepCount(task)

              return (
                <label
                  key={task.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-slate-900/70 p-4 transition hover:border-cyan-300/70"
                >
                  <input
                    type="checkbox"
                    checked={selectedProgressTaskIds.includes(task.id)}
                    onChange={() => toggleProgressTask(task.id)}
                    className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-900 accent-cyan-300"
                  />
                  <span>
                    <span className="block font-semibold text-white">
                      {task.title}
                    </span>
                    <span className="mt-1 block text-sm text-slate-300">
                      {getTaskTagName(task)} - {task.status} -{' '}
                      {completedStepCount}/{task.task_steps.length} steps
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.06] p-6 report-preview">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300 report-eyebrow">
              Waypoint report
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white report-title">
              Weekly progress summary
            </h2>
            <p className="mt-2 text-sm text-slate-300 report-period">
              {periodLabel}
            </p>
          </div>
          <div className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-right report-summary">
            <p className="text-2xl font-bold text-cyan-100">
              {reportTaskCount}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-100">
              Tasks
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white report-heading">
                Completed
              </h3>
              <span className="text-sm font-semibold text-slate-300">
                {completedTasks.length} tasks
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {completedTasks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-white/15 p-5 text-sm text-slate-300 report-empty">
                  No tasks were completed in this period.
                </p>
              ) : null}

              {completedTasks.map((task) => (
                <ReportTaskCard key={task.id} task={task} />
              ))}
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white report-heading">
                In progress
              </h3>
              <span className="text-sm font-semibold text-slate-300">
                {progressTasks.length} tasks
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {progressTasks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-white/15 p-5 text-sm text-slate-300 report-empty">
                  No in-progress tasks have been assigned to this report yet.
                </p>
              ) : null}

              {progressTasks.map((task) => (
                <ReportTaskCard key={task.id} task={task} />
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}
