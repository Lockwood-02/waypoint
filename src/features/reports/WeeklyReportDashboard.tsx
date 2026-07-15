import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Task } from '../tasks/taskService'
import {
  getCurrentUserId,
  getGroupMembers,
  getGroups,
  getGroupTasks,
  type Group,
  type GroupMember,
  type GroupTask,
} from '../groups/groupService'

type WeeklyReportDashboardProps = {
  tasks: Task[]
  isLoadingTasks: boolean
  tasksError: string
  onRefreshTasks: () => void
}

type ReportTemplate =
  | 'weekly-progress'
  | 'spreadsheet-progress'
  | 'project-status-outline'
type TaskComments = Record<string, string>

type GroupReportTask = GroupTask & {
  group_name: string
  group_members: GroupMember[]
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

function getTaskTagId(task: Task) {
  return task.task_tag_links[0]?.task_tags?.id ?? ''
}

function getCompletedStepCount(task: Task) {
  return task.task_steps.filter((step) => step.is_completed).length
}

function getCompletedGroupStepCount(task: GroupTask) {
  return task.group_task_steps.filter((step) => step.is_completed).length
}

function getGroupMemberName(task: GroupReportTask, userId: string | null) {
  if (!userId) {
    return 'Unassigned'
  }

  return (
    task.group_members.find((member) => member.user_id === userId)
      ?.display_name ?? 'Group member'
  )
}

function getGroupTaskCollaborators(task: GroupReportTask) {
  const collaboratorNames = new Set<string>()

  task.group_task_steps.forEach((step) => {
    if (!step.is_completed) {
      return
    }

    const collaboratorId = step.completed_by ?? step.assigned_to

    if (collaboratorId) {
      collaboratorNames.add(getGroupMemberName(task, collaboratorId))
    }
  })

  return [...collaboratorNames]
}

function isTaskCompletedInPeriod(task: Task, startDate: Date, endDate: Date) {
  if (task.status !== 'Completed' || !task.completed_at) {
    return false
  }

  const completedAt = new Date(task.completed_at)

  return completedAt >= startDate && completedAt <= endDate
}

function getTaskStepsSummary(task: Task) {
  if (task.task_steps.length === 0) {
    return 'No checklist steps added.'
  }

  return task.task_steps
    .map((step) => `${step.is_completed ? 'Done' : 'Open'}: ${step.title}`)
    .join('\n')
}

function getGroupTaskStepsSummary(task: GroupReportTask) {
  if (task.group_task_steps.length === 0) {
    return 'No checklist steps added.'
  }

  return task.group_task_steps
    .map(
      (step) =>
        `${step.is_completed ? 'Done' : 'Open'}: ${step.title}${
          step.assigned_to ? ` (${getGroupMemberName(task, step.assigned_to)})` : ''
        }`,
    )
    .join('\n')
}

function buildProjectStatusOutline(
  completedTasks: Task[],
  progressTasks: Task[],
  groupTasks: GroupReportTask[],
  taskComments: TaskComments,
) {
  const personalRows = [
    ...completedTasks.map((task) => ({ section: 'Completed', task })),
    ...progressTasks.map((task) => ({ section: 'In progress', task })),
  ]

  if (personalRows.length === 0 && groupTasks.length === 0) {
    return 'No tasks have been added to this report yet.'
  }

  const personalText = personalRows.map(({ section, task }) => {
      const description = task.description?.trim() || 'No description added.'
      const statusDetails =
        section === 'Completed' || task.status === 'Completed'
          ? 'Completed'
          : task.status
      const comment =
        taskComments[task.id]?.trim() ||
        'No issues, concerns, or comments added.'
      const nextSteps = task.task_steps.length
        ? task.task_steps
            .map(
              (step) =>
                `              -    ${step.title} (${
                  step.is_completed ? 'Done' : 'Open'
                })`,
            )
            .join('\n')
        : '              -    No checklist steps added.'

      return `${task.title}
          -    Description
              -    ${description}
          -    Status
              -    ${statusDetails || 'No current status added.'}
          -    Next Steps
${nextSteps}
          -    Issues/Concerns/Comments
              -    ${comment}`
    })

  const groupText = groupTasks.map((task) => {
    const description = task.description?.trim() || 'No description added.'
    const collaborators =
      getGroupTaskCollaborators(task).join(', ') ||
      'No completed collaborator steps yet.'
    const comment =
      taskComments[`group:${task.id}`]?.trim() ||
      'No issues, concerns, or comments added.'
    const nextSteps = task.group_task_steps.length
      ? task.group_task_steps
          .map(
            (step) =>
              `              -    ${step.title} (${
                step.is_completed ? 'Done' : 'Open'
              }${
                step.assigned_to
                  ? `, assigned to ${getGroupMemberName(task, step.assigned_to)}`
                  : ''
              })`,
          )
          .join('\n')
      : '              -    No checklist steps added.'

    return `${task.title}
          -    Description
              -    ${description}
          -    Completed With
              -    ${collaborators}
          -    Status
              -    ${task.status || 'No current status added.'}
          -    Next Steps
${nextSteps}
          -    Issues/Concerns/Comments
              -    ${comment}`
  })

  return [...personalText, ...groupText].join('\n\n')
}

function ReportTaskCard({
  task,
  comment,
}: {
  task: Task
  comment: string
}) {
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

      {comment.trim() ? (
        <div className="mt-4 rounded-md border border-cyan-300/20 bg-cyan-300/10 p-3 report-comment">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-100 report-section-label">
            Comment
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-cyan-50 report-description">
            {comment}
          </p>
        </div>
      ) : null}

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

function TaskPickerRow({
  task,
  checked,
  comment,
  isCommentOpen,
  onToggleTask,
  onToggleComment,
  onCommentChange,
}: {
  task: Task
  checked: boolean
  comment: string
  isCommentOpen: boolean
  onToggleTask: () => void
  onToggleComment: () => void
  onCommentChange: (value: string) => void
}) {
  const completedStepCount = getCompletedStepCount(task)

  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4 transition hover:border-cyan-300/70">
      <div className="flex items-start gap-3">
        <label className="flex flex-1 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggleTask}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-900 accent-cyan-300"
          />
          <span>
            <span className="block font-semibold text-white">
              {task.title}
            </span>
            <span className="mt-1 block text-sm text-slate-300">
              {task.status === 'Completed'
                ? `${getTaskTagName(task)} - Completed ${formatDate(
                    task.completed_at,
                  )}`
                : `${getTaskTagName(task)} - ${task.status} - ${completedStepCount}/${task.task_steps.length} steps`}
            </span>
          </span>
        </label>
        <button
          type="button"
          onClick={onToggleComment}
          className="rounded-md border border-white/15 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300"
        >
          {comment.trim() ? 'Edit comment' : 'Add comment'}
        </button>
      </div>

      {isCommentOpen ? (
        <label className="mt-3 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Report comment
          </span>
          <textarea
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            className="mt-2 min-h-24 w-full resize-y rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            placeholder="Add a note for this report."
          />
        </label>
      ) : null}
    </div>
  )
}

function GroupTaskPickerRow({
  task,
  checked,
  comment,
  isCommentOpen,
  onToggleTask,
  onToggleComment,
  onCommentChange,
}: {
  task: GroupReportTask
  checked: boolean
  comment: string
  isCommentOpen: boolean
  onToggleTask: () => void
  onToggleComment: () => void
  onCommentChange: (value: string) => void
}) {
  const completedStepCount = getCompletedGroupStepCount(task)
  const collaborators = getGroupTaskCollaborators(task)

  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4 transition hover:border-cyan-300/70">
      <div className="flex items-start gap-3">
        <label className="flex flex-1 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggleTask}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-900 accent-cyan-300"
          />
          <span>
            <span className="block font-semibold text-white">
              {task.title}
            </span>
            <span className="mt-1 block text-sm text-slate-300">
              {task.group_name} - {task.status} - {completedStepCount}/
              {task.group_task_steps.length} steps
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              Completed collaborators:{' '}
              {collaborators.length ? collaborators.join(', ') : 'None yet'}
            </span>
          </span>
        </label>
        <button
          type="button"
          onClick={onToggleComment}
          className="rounded-md border border-white/15 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300"
        >
          {comment.trim() ? 'Edit comment' : 'Add comment'}
        </button>
      </div>

      {isCommentOpen ? (
        <label className="mt-3 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Report comment
          </span>
          <textarea
            value={comment}
            onChange={(event) => onCommentChange(event.target.value)}
            className="mt-2 min-h-24 w-full resize-y rounded-md border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            placeholder="Add a note for this group task."
          />
        </label>
      ) : null}
    </div>
  )
}

function GroupReportTaskCard({
  task,
  comment,
}: {
  task: GroupReportTask
  comment: string
}) {
  const completedStepCount = getCompletedGroupStepCount(task)
  const collaborators = getGroupTaskCollaborators(task)

  return (
    <article className="rounded-lg border border-white/10 bg-slate-900/70 p-4 report-task-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white report-task-title">
            {task.title}
          </h3>
          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-300 report-meta">
            <span>{task.group_name}</span>
            <span>{task.status}</span>
            <span>
              {completedStepCount}/{task.group_task_steps.length} steps complete
            </span>
          </div>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200 report-description">
        {task.description || 'No description added.'}
      </p>

      <p className="mt-3 text-sm text-slate-300 report-description">
        Completed collaborators:{' '}
        {collaborators.length ? collaborators.join(', ') : 'None yet'}
      </p>

      {comment.trim() ? (
        <div className="mt-4 rounded-md border border-cyan-300/20 bg-cyan-300/10 p-3 report-comment">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-100 report-section-label">
            Comment
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-cyan-50 report-description">
            {comment}
          </p>
        </div>
      ) : null}

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 report-section-label">
          Steps
        </p>
        {task.group_task_steps.length === 0 ? (
          <p className="mt-2 text-sm text-slate-300 report-description">
            No checklist steps added.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {task.group_task_steps.map((step) => (
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
                <span>
                  {step.title}
                  {step.assigned_to
                    ? ` - ${getGroupMemberName(task, step.assigned_to)}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

function CollapsibleReportSection({
  title,
  children,
  isOpen,
  onToggle,
}: {
  title: string
  children: ReactNode
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <h2 className="text-xl font-semibold">{title}</h2>
        <span className="text-lg font-bold text-cyan-200">
          {isOpen ? '^' : 'v'}
        </span>
      </button>
      {isOpen ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}

function SpreadsheetReportTable({
  completedTasks,
  progressTasks,
  groupTasks,
  taskComments,
}: {
  completedTasks: Task[]
  progressTasks: Task[]
  groupTasks: GroupReportTask[]
  taskComments: TaskComments
}) {
  const reportRows = [
    ...completedTasks.map((task) => ({
      kind: 'personal' as const,
      section: 'Completed',
      task,
    })),
    ...progressTasks.map((task) => ({
      kind: 'personal' as const,
      section: 'In progress',
      task,
    })),
    ...groupTasks.map((task) => ({
      kind: 'group' as const,
      section: 'Group task',
      task,
    })),
  ]

  return (
    <div className="mt-6 max-w-full overflow-x-auto report-table-wrap">
      <table className="w-full min-w-[48rem] border-collapse text-left text-sm report-table">
        <thead>
          <tr>
            <th className="border border-white/15 bg-cyan-300 px-3 py-2 font-bold text-slate-950">
              Title
            </th>
            <th className="border border-white/15 bg-cyan-300 px-3 py-2 font-bold text-slate-950">
              Description
            </th>
            <th className="border border-white/15 bg-cyan-300 px-3 py-2 font-bold text-slate-950">
              Steps
            </th>
            <th className="border border-white/15 bg-cyan-300 px-3 py-2 font-bold text-slate-950">
              Comments
            </th>
            <th className="border border-white/15 bg-cyan-300 px-3 py-2 font-bold text-slate-950">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {reportRows.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                className="border border-white/15 bg-slate-900/70 px-3 py-6 text-center text-slate-300 report-table-cell"
              >
                No tasks have been added to this report yet.
              </td>
            </tr>
          ) : null}

          {reportRows.map(({ kind, section, task }) => (
            <tr key={`${section}-${task.id}`}>
              <td className="align-top border border-white/15 bg-slate-900/70 px-3 py-2 font-semibold text-white report-table-cell">
                {task.title}
              </td>
              <td className="align-top border border-white/15 bg-slate-900/70 px-3 py-2 whitespace-pre-wrap text-slate-200 report-table-cell">
                {task.description || 'No description added.'}
              </td>
              <td className="align-top border border-white/15 bg-slate-900/70 px-3 py-2 whitespace-pre-wrap text-slate-200 report-table-cell">
                {kind === 'group'
                  ? getGroupTaskStepsSummary(task)
                  : getTaskStepsSummary(task)}
              </td>
              <td className="align-top border border-white/15 bg-slate-900/70 px-3 py-2 whitespace-pre-wrap text-slate-200 report-table-cell">
                {taskComments[
                  kind === 'group' ? `group:${task.id}` : task.id
                ]?.trim() || ''}
              </td>
              <td className="align-top border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-200 report-table-cell">
                {section}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProjectStatusOutlineReport({ reportText }: { reportText: string }) {
  return (
    <pre className="mt-6 max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-slate-900/70 p-4 font-sans text-sm leading-6 text-slate-100 report-outline">
      {reportText}
    </pre>
  )
}

export function WeeklyReportDashboard({
  tasks,
  isLoadingTasks,
  tasksError,
  onRefreshTasks,
}: WeeklyReportDashboardProps) {
  const [reportTemplate, setReportTemplate] =
    useState<ReportTemplate>('weekly-progress')
  const [periodStart, setPeriodStart] = useState(() =>
    toDateInputValue(getCurrentWeekStart()),
  )
  const [periodEnd, setPeriodEnd] = useState(() => toDateInputValue(new Date()))
  const [selectedProgressTaskIds, setSelectedProgressTaskIds] = useState<
    string[]
  >([])
  const [selectedCompletedTaskIds, setSelectedCompletedTaskIds] = useState<
    string[]
  >([])
  const [excludedCompletedTaskIds, setExcludedCompletedTaskIds] = useState<
    string[]
  >([])
  const [completedTaskSearch, setCompletedTaskSearch] = useState('')
  const [completedTaskTagFilter, setCompletedTaskTagFilter] = useState('')
  const [progressTaskSearch, setProgressTaskSearch] = useState('')
  const [progressTaskTagFilter, setProgressTaskTagFilter] = useState('')
  const [groupTaskSearch, setGroupTaskSearch] = useState('')
  const [selectedGroupTaskIds, setSelectedGroupTaskIds] = useState<string[]>([])
  const [groupReportTasks, setGroupReportTasks] = useState<GroupReportTask[]>([])
  const [isLoadingGroupTasks, setIsLoadingGroupTasks] = useState(false)
  const [groupTasksError, setGroupTasksError] = useState('')
  const [taskComments, setTaskComments] = useState<TaskComments>({})
  const [openCommentTaskIds, setOpenCommentTaskIds] = useState<string[]>([])
  const [copyMessage, setCopyMessage] = useState('')
  const [isCompletedSectionOpen, setIsCompletedSectionOpen] = useState(true)
  const [isProgressSectionOpen, setIsProgressSectionOpen] = useState(true)
  const [isGroupSectionOpen, setIsGroupSectionOpen] = useState(true)

  const startDate = useMemo(
    () => parseDateInput(periodStart) ?? getCurrentWeekStart(),
    [periodStart],
  )
  const endDate = useMemo(
    () => parseDateInput(periodEnd, true) ?? new Date(),
    [periodEnd],
  )

  useEffect(() => {
    let isMounted = true

    async function loadGroupReportTasks() {
      setIsLoadingGroupTasks(true)
      setGroupTasksError('')

      const [groupsResponse, userResponse] = await Promise.all([
        getGroups(),
        getCurrentUserId(),
      ])

      if (!isMounted) {
        return
      }

      if (groupsResponse.error) {
        setGroupTasksError(
          groupsResponse.error instanceof Error
            ? groupsResponse.error.message
            : 'Group tasks could not be loaded.',
        )
        setIsLoadingGroupTasks(false)
        return
      }

      const groups = groupsResponse.data ?? []
      const currentUserId = userResponse.data ?? ''
      const groupTaskResponses = await Promise.all(
        groups.map(async (group: Group) => {
          const [tasksResponse, membersResponse] = await Promise.all([
            getGroupTasks(group.id),
            getGroupMembers(group.id),
          ])

          if (tasksResponse.error) {
            throw tasksResponse.error
          }

          return {
            group,
            members: membersResponse.data ?? [],
            tasks: tasksResponse.data ?? [],
          }
        }),
      ).catch((error: unknown) => {
        if (error instanceof Error) {
          return error
        }

        return new Error('Group tasks could not be loaded.')
      })

      if (!isMounted) {
        return
      }

      if (groupTaskResponses instanceof Error) {
        setGroupTasksError(groupTaskResponses.message)
        setIsLoadingGroupTasks(false)
        return
      }

      const reportTasks = groupTaskResponses.flatMap(({ group, members, tasks }) =>
        tasks
          .filter(
            (task) =>
              !currentUserId ||
              task.created_by === currentUserId ||
              task.group_task_steps.some(
                (step) =>
                  step.assigned_to === currentUserId ||
                  step.completed_by === currentUserId,
              ),
          )
          .map((task) => ({
            ...task,
            group_name: group.name,
            group_members: members,
          })),
      )

      setGroupReportTasks(reportTasks)
      setIsLoadingGroupTasks(false)
    }

    void loadGroupReportTasks()

    return () => {
      isMounted = false
    }
  }, [])

  const completedTaskOptions = useMemo(
    () =>
      tasks
        .filter((task) => task.status === 'Completed')
        .sort(
          (firstTask, secondTask) =>
            new Date(secondTask.completed_at ?? '').getTime() -
            new Date(firstTask.completed_at ?? '').getTime(),
        ),
    [tasks],
  )

  const completedTasksInPeriod = useMemo(
    () =>
      completedTaskOptions.filter((task) =>
        isTaskCompletedInPeriod(task, startDate, endDate),
      ),
    [completedTaskOptions, endDate, startDate],
  )

  const completedTasks = useMemo(
    () =>
      completedTaskOptions.filter((task) => {
        const isInPeriod = isTaskCompletedInPeriod(task, startDate, endDate)
        const isManuallySelected = selectedCompletedTaskIds.includes(task.id)
        const isExcluded = excludedCompletedTaskIds.includes(task.id)

        return (isInPeriod && !isExcluded) || isManuallySelected
      }),
    [
      completedTaskOptions,
      endDate,
      excludedCompletedTaskIds,
      selectedCompletedTaskIds,
      startDate,
    ],
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

  const completedTaskTags = useMemo(() => {
    const tagsById = new Map<string, string>()

    completedTaskOptions.forEach((task) => {
      const tag = task.task_tag_links[0]?.task_tags

      if (tag) {
        tagsById.set(tag.id, tag.name)
      }
    })

    return [...tagsById.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((firstTag, secondTag) => firstTag.name.localeCompare(secondTag.name))
  }, [completedTaskOptions])

  const progressTaskTags = useMemo(() => {
    const tagsById = new Map<string, string>()

    progressTaskOptions.forEach((task) => {
      const tag = task.task_tag_links[0]?.task_tags

      if (tag) {
        tagsById.set(tag.id, tag.name)
      }
    })

    return [...tagsById.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((firstTag, secondTag) => firstTag.name.localeCompare(secondTag.name))
  }, [progressTaskOptions])

  const hasCompletedTaskLookup =
    completedTaskSearch.trim().length > 0 || completedTaskTagFilter.length > 0

  const filteredCompletedTaskOptions = useMemo(() => {
    if (!hasCompletedTaskLookup) {
      return []
    }

    const normalizedSearch = completedTaskSearch.trim().toLowerCase()

    return completedTaskOptions.filter((task) => {
      const matchesSearch = normalizedSearch
        ? task.title.toLowerCase().includes(normalizedSearch)
        : true
      const matchesTag = completedTaskTagFilter
        ? getTaskTagId(task) === completedTaskTagFilter
        : true

      return matchesSearch && matchesTag
    })
  }, [
    completedTaskOptions,
    completedTaskSearch,
    completedTaskTagFilter,
    hasCompletedTaskLookup,
  ])

  const hasProgressTaskLookup =
    progressTaskSearch.trim().length > 0 || progressTaskTagFilter.length > 0

  const filteredProgressTaskOptions = useMemo(() => {
    if (!hasProgressTaskLookup) {
      return []
    }

    const normalizedSearch = progressTaskSearch.trim().toLowerCase()

    return progressTaskOptions.filter((task) => {
      const matchesSearch = normalizedSearch
        ? task.title.toLowerCase().includes(normalizedSearch)
        : true
      const matchesTag = progressTaskTagFilter
        ? getTaskTagId(task) === progressTaskTagFilter
        : true

      return matchesSearch && matchesTag
    })
  }, [
    hasProgressTaskLookup,
    progressTaskOptions,
    progressTaskSearch,
    progressTaskTagFilter,
  ])

  const progressTasks = useMemo(
    () =>
      progressTaskOptions.filter((task) =>
        selectedProgressTaskIds.includes(task.id),
      ),
    [progressTaskOptions, selectedProgressTaskIds],
  )

  const filteredGroupTaskOptions = useMemo(() => {
    const normalizedSearch = groupTaskSearch.trim().toLowerCase()

    if (!normalizedSearch) {
      return []
    }

    return groupReportTasks.filter(
      (task) =>
        task.title.toLowerCase().includes(normalizedSearch) ||
        task.group_name.toLowerCase().includes(normalizedSearch),
    )
  }, [groupReportTasks, groupTaskSearch])

  const selectedGroupTasks = useMemo(
    () =>
      groupReportTasks.filter((task) => selectedGroupTaskIds.includes(task.id)),
    [groupReportTasks, selectedGroupTaskIds],
  )

  const periodLabel = `${formatDate(periodStart)} - ${formatDate(periodEnd)}`
  const reportTaskCount =
    completedTasks.length + progressTasks.length + selectedGroupTasks.length
  const reportTitle =
    reportTemplate === 'project-status-outline'
      ? 'Project status outline'
      : reportTemplate === 'spreadsheet-progress'
      ? 'Spreadsheet progress report'
      : 'Weekly progress summary'
  const projectStatusOutlineText = useMemo(
    () =>
      buildProjectStatusOutline(
        completedTasks,
        progressTasks,
        selectedGroupTasks,
        taskComments,
      ),
    [completedTasks, progressTasks, selectedGroupTasks, taskComments],
  )

  function updateTaskComment(taskId: string, comment: string) {
    setTaskComments((currentComments) => ({
      ...currentComments,
      [taskId]: comment,
    }))
  }

  function toggleTaskComment(taskId: string) {
    setOpenCommentTaskIds((currentTaskIds) =>
      currentTaskIds.includes(taskId)
        ? currentTaskIds.filter((currentTaskId) => currentTaskId !== taskId)
        : [...currentTaskIds, taskId],
    )
  }

  function downloadSpreadsheetCsv() {
    const reportRows = [
      ...completedTasks.map((task) => ({
        kind: 'personal' as const,
        section: 'Completed',
        task,
      })),
      ...progressTasks.map((task) => ({
        kind: 'personal' as const,
        section: 'In progress',
        task,
      })),
      ...selectedGroupTasks.map((task) => ({
        kind: 'group' as const,
        section: 'Group task',
        task,
      })),
    ]
    const headers = ['Title', 'Description', 'Steps', 'Comments', 'Status']
    const csvRows = reportRows.map(({ kind, section, task }) =>
      [
        task.title,
        task.description || 'No description added.',
        kind === 'group'
          ? getGroupTaskStepsSummary(task)
          : getTaskStepsSummary(task),
        taskComments[kind === 'group' ? `group:${task.id}` : task.id]?.trim() ||
          '',
        section,
      ]
        .map((value) => `"${value.replaceAll('"', '""')}"`)
        .join(','),
    )
    const csv = [headers.join(','), ...csvRows].join('\n')
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = `waypoint-${reportTemplate}-${periodStart}-to-${periodEnd}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function copyReportToClipboard() {
    const reportText =
      reportTemplate === 'project-status-outline'
        ? projectStatusOutlineText
        : `${reportTitle}\n${periodLabel}`

    try {
      await navigator.clipboard.writeText(reportText)
      setCopyMessage('Copied to clipboard.')
    } catch {
      setCopyMessage('Clipboard copy was blocked by the browser.')
    }
  }

  function isCompletedTaskIncluded(task: Task) {
    const isInPeriod = isTaskCompletedInPeriod(task, startDate, endDate)

    return (
      selectedCompletedTaskIds.includes(task.id) ||
      (isInPeriod && !excludedCompletedTaskIds.includes(task.id))
    )
  }

  function toggleCompletedTask(task: Task) {
    const isInPeriod = isTaskCompletedInPeriod(task, startDate, endDate)
    const isIncluded = isCompletedTaskIncluded(task)

    if (isIncluded) {
      if (isInPeriod) {
        setExcludedCompletedTaskIds((currentTaskIds) =>
          currentTaskIds.includes(task.id)
            ? currentTaskIds
            : [...currentTaskIds, task.id],
        )
      }

      setSelectedCompletedTaskIds((currentTaskIds) =>
        currentTaskIds.filter((currentTaskId) => currentTaskId !== task.id),
      )
      return
    }

    setExcludedCompletedTaskIds((currentTaskIds) =>
      currentTaskIds.filter((currentTaskId) => currentTaskId !== task.id),
    )
    setSelectedCompletedTaskIds((currentTaskIds) =>
      currentTaskIds.includes(task.id)
        ? currentTaskIds
        : [...currentTaskIds, task.id],
    )
  }

  function toggleProgressTask(taskId: string) {
    setSelectedProgressTaskIds((currentTaskIds) =>
      currentTaskIds.includes(taskId)
        ? currentTaskIds.filter((currentTaskId) => currentTaskId !== taskId)
        : [...currentTaskIds, taskId],
    )
  }

  function toggleGroupTask(taskId: string) {
    setSelectedGroupTaskIds((currentTaskIds) =>
      currentTaskIds.includes(taskId)
        ? currentTaskIds.filter((currentTaskId) => currentTaskId !== taskId)
        : [...currentTaskIds, taskId],
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] weekly-report-screen">
      <section className="min-w-0 space-y-6 print:hidden">
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
              value={reportTemplate}
              onChange={(event) => {
                setReportTemplate(event.target.value as ReportTemplate)
                setCopyMessage('')
              }}
              className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            >
              <option value="weekly-progress">Weekly progress summary</option>
              <option value="spreadsheet-progress">
                Spreadsheet progress report
              </option>
              <option value="project-status-outline">
                Project status outline
              </option>
            </select>
          </label>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              <p className="text-2xl font-bold text-white">
                {selectedGroupTasks.length}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Group tasks
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
              <p className="text-2xl font-bold text-white">{reportTaskCount}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Total included
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-md bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Print report
            </button>
            {reportTemplate === 'spreadsheet-progress' ? (
              <button
                type="button"
                onClick={downloadSpreadsheetCsv}
                className="rounded-md border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200"
              >
                Download CSV
              </button>
            ) : null}
            {reportTemplate === 'project-status-outline' ? (
              <button
                type="button"
                onClick={copyReportToClipboard}
                className="rounded-md border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200"
              >
                Copy report
              </button>
            ) : null}
          </div>
          {copyMessage ? (
            <p className="mt-3 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
              {copyMessage}
            </p>
          ) : null}
        </div>

        <CollapsibleReportSection
          title="Adjust completed tasks"
          isOpen={isCompletedSectionOpen}
          onToggle={() => setIsCompletedSectionOpen((isOpen) => !isOpen)}
        >
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Completed tasks from the selected dates start checked. Uncheck any
            that should not appear, or search for another completed task to add.
          </p>

          <div className="mt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              From selected dates
            </p>

            {isLoadingTasks ? (
              <p className="text-sm text-slate-300">Loading tasks...</p>
            ) : null}

            {!isLoadingTasks && completedTasksInPeriod.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 p-5 text-center">
                <p className="font-semibold">No completed tasks in this range</p>
                <p className="mt-2 text-sm text-slate-300">
                  Search below to add completed tasks manually.
                </p>
              </div>
            ) : null}

            {completedTasksInPeriod.map((task) => (
              <TaskPickerRow
                key={task.id}
                task={task}
                checked={isCompletedTaskIncluded(task)}
                comment={taskComments[task.id] ?? ''}
                isCommentOpen={openCommentTaskIds.includes(task.id)}
                onToggleTask={() => toggleCompletedTask(task)}
                onToggleComment={() => toggleTaskComment(task.id)}
                onCommentChange={(comment) =>
                  updateTaskComment(task.id, comment)
                }
              />
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="sr-only">Search completed tasks</span>
              <input
                type="search"
                value={completedTaskSearch}
                onChange={(event) => setCompletedTaskSearch(event.target.value)}
                className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                placeholder="Search completed tasks"
              />
            </label>
            <label className="block">
              <span className="sr-only">Filter completed tasks by tag</span>
              <select
                value={completedTaskTagFilter}
                onChange={(event) =>
                  setCompletedTaskTagFilter(event.target.value)
                }
                className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 md:w-44"
              >
                <option value="">Search by tag</option>
                {completedTaskTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5 max-h-[18rem] space-y-3 overflow-y-auto pr-1">
            {!isLoadingTasks &&
            completedTaskOptions.length > 0 &&
            !hasCompletedTaskLookup ? (
              <div className="rounded-lg border border-dashed border-white/15 p-5 text-center">
                <p className="font-semibold">Search to add completed tasks</p>
                <p className="mt-2 text-sm text-slate-300">
                  Use the search bar or choose a tag to find other completed
                  tasks for this report.
                </p>
              </div>
            ) : null}

            {!isLoadingTasks &&
            hasCompletedTaskLookup &&
            filteredCompletedTaskOptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 p-5 text-center">
                <p className="font-semibold">No matching tasks</p>
                <p className="mt-2 text-sm text-slate-300">
                  Try a different completed task title or tag.
                </p>
              </div>
            ) : null}

            {!isLoadingTasks && completedTaskOptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 p-5 text-center">
                <p className="font-semibold">No completed tasks yet</p>
                <p className="mt-2 text-sm text-slate-300">
                  Completed tasks will show up here once they exist.
                </p>
              </div>
            ) : null}

            {filteredCompletedTaskOptions.map((task) => (
              <TaskPickerRow
                key={task.id}
                task={task}
                checked={isCompletedTaskIncluded(task)}
                comment={taskComments[task.id] ?? ''}
                isCommentOpen={openCommentTaskIds.includes(task.id)}
                onToggleTask={() => toggleCompletedTask(task)}
                onToggleComment={() => toggleTaskComment(task.id)}
                onCommentChange={(comment) =>
                  updateTaskComment(task.id, comment)
                }
              />
            ))}
          </div>
        </CollapsibleReportSection>

        <CollapsibleReportSection
          title="Assign in-progress tasks"
          isOpen={isProgressSectionOpen}
          onToggle={() => setIsProgressSectionOpen((isOpen) => !isOpen)}
        >
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Choose tasks that should appear in the progress section even though
            they are not fully completed yet.
          </p>

          <div className="mt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Selected for report
            </p>

            {progressTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 p-5 text-center">
                <p className="font-semibold">No in-progress tasks selected</p>
                <p className="mt-2 text-sm text-slate-300">
                  Search below and check tasks to keep them in this report.
                </p>
              </div>
            ) : null}

            {progressTasks.map((task) => (
              <TaskPickerRow
                key={task.id}
                task={task}
                checked
                comment={taskComments[task.id] ?? ''}
                isCommentOpen={openCommentTaskIds.includes(task.id)}
                onToggleTask={() => toggleProgressTask(task.id)}
                onToggleComment={() => toggleTaskComment(task.id)}
                onCommentChange={(comment) =>
                  updateTaskComment(task.id, comment)
                }
              />
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="sr-only">Search in-progress tasks</span>
              <input
                type="search"
                value={progressTaskSearch}
                onChange={(event) => setProgressTaskSearch(event.target.value)}
                className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                placeholder="Search in-progress tasks"
              />
            </label>
            <label className="block">
              <span className="sr-only">Filter in-progress tasks by tag</span>
              <select
                value={progressTaskTagFilter}
                onChange={(event) =>
                  setProgressTaskTagFilter(event.target.value)
                }
                className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 md:w-44"
              >
                <option value="">Search by tag</option>
                {progressTaskTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

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

            {!isLoadingTasks &&
            progressTaskOptions.length > 0 &&
            !hasProgressTaskLookup ? (
              <div className="rounded-lg border border-dashed border-white/15 p-5 text-center">
                <p className="font-semibold">Search to add tasks</p>
                <p className="mt-2 text-sm text-slate-300">
                  Use the search bar or choose a tag to find in-progress tasks
                  for this report.
                </p>
              </div>
            ) : null}

            {!isLoadingTasks &&
            hasProgressTaskLookup &&
            filteredProgressTaskOptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 p-5 text-center">
                <p className="font-semibold">No matching tasks</p>
                <p className="mt-2 text-sm text-slate-300">
                  Try a different task title or tag.
                </p>
              </div>
            ) : null}

            {filteredProgressTaskOptions.map((task) => (
              <TaskPickerRow
                key={task.id}
                task={task}
                checked={selectedProgressTaskIds.includes(task.id)}
                comment={taskComments[task.id] ?? ''}
                isCommentOpen={openCommentTaskIds.includes(task.id)}
                onToggleTask={() => toggleProgressTask(task.id)}
                onToggleComment={() => toggleTaskComment(task.id)}
                onCommentChange={(comment) =>
                  updateTaskComment(task.id, comment)
                }
              />
            ))}
          </div>
        </CollapsibleReportSection>

        <CollapsibleReportSection
          title="Add group tasks"
          isOpen={isGroupSectionOpen}
          onToggle={() => setIsGroupSectionOpen((isOpen) => !isOpen)}
        >
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Add shared tasks from your groups. Completed steps show the assigned
            collaborator for now; if we add step completer tracking later, this
            report will use that instead.
          </p>

          {groupTasksError ? (
            <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
              Group tasks could not be loaded: {groupTasksError}
            </p>
          ) : null}

          <div className="mt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Selected for report
            </p>

            {selectedGroupTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 p-5 text-center">
                <p className="font-semibold">No group tasks selected</p>
                <p className="mt-2 text-sm text-slate-300">
                  Search below and check shared tasks to include them.
                </p>
              </div>
            ) : null}

            {selectedGroupTasks.map((task) => (
              <GroupTaskPickerRow
                key={task.id}
                task={task}
                checked
                comment={taskComments[`group:${task.id}`] ?? ''}
                isCommentOpen={openCommentTaskIds.includes(`group:${task.id}`)}
                onToggleTask={() => toggleGroupTask(task.id)}
                onToggleComment={() => toggleTaskComment(`group:${task.id}`)}
                onCommentChange={(comment) =>
                  updateTaskComment(`group:${task.id}`, comment)
                }
              />
            ))}
          </div>

          <label className="mt-5 block">
            <span className="sr-only">Search group tasks</span>
            <input
              type="search"
              value={groupTaskSearch}
              onChange={(event) => setGroupTaskSearch(event.target.value)}
              className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
              placeholder="Search group task titles or group names"
            />
          </label>

          <div className="mt-5 max-h-[26rem] space-y-3 overflow-y-auto pr-1">
            {isLoadingGroupTasks ? (
              <p className="text-sm text-slate-300">Loading group tasks...</p>
            ) : null}

            {!isLoadingGroupTasks && groupReportTasks.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 p-5 text-center">
                <p className="font-semibold">No connected group tasks</p>
                <p className="mt-2 text-sm text-slate-300">
                  Group tasks you created or have assigned steps on will show
                  up here.
                </p>
              </div>
            ) : null}

            {!isLoadingGroupTasks &&
            groupReportTasks.length > 0 &&
            groupTaskSearch.trim().length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 p-5 text-center">
                <p className="font-semibold">Search to add group tasks</p>
                <p className="mt-2 text-sm text-slate-300">
                  Search by task title or group name to find shared tasks.
                </p>
              </div>
            ) : null}

            {!isLoadingGroupTasks &&
            groupReportTasks.length > 0 &&
            groupTaskSearch.trim().length > 0 &&
            filteredGroupTaskOptions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/15 p-5 text-center">
                <p className="font-semibold">No matching group tasks</p>
                <p className="mt-2 text-sm text-slate-300">
                  Try a different task title or group name.
                </p>
              </div>
            ) : null}

            {filteredGroupTaskOptions.map((task) => (
              <GroupTaskPickerRow
                key={task.id}
                task={task}
                checked={selectedGroupTaskIds.includes(task.id)}
                comment={taskComments[`group:${task.id}`] ?? ''}
                isCommentOpen={openCommentTaskIds.includes(`group:${task.id}`)}
                onToggleTask={() => toggleGroupTask(task.id)}
                onToggleComment={() => toggleTaskComment(`group:${task.id}`)}
                onCommentChange={(comment) =>
                  updateTaskComment(`group:${task.id}`, comment)
                }
              />
            ))}
          </div>
        </CollapsibleReportSection>
      </section>

      <section className="min-w-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] p-6 report-preview">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300 report-eyebrow">
              Waypoint report
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white report-title">
              {reportTitle}
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

        {reportTemplate === 'project-status-outline' ? (
          <ProjectStatusOutlineReport reportText={projectStatusOutlineText} />
        ) : reportTemplate === 'spreadsheet-progress' ? (
          <SpreadsheetReportTable
            completedTasks={completedTasks}
            progressTasks={progressTasks}
            groupTasks={selectedGroupTasks}
            taskComments={taskComments}
          />
        ) : (
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
                <ReportTaskCard
                  key={task.id}
                  task={task}
                  comment={taskComments[task.id] ?? ''}
                />
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
                <ReportTaskCard
                  key={task.id}
                  task={task}
                  comment={taskComments[task.id] ?? ''}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-white report-heading">
                Group tasks
              </h3>
              <span className="text-sm font-semibold text-slate-300">
                {selectedGroupTasks.length} tasks
              </span>
            </div>

            <div className="mt-3 space-y-3">
              {selectedGroupTasks.length === 0 ? (
                <p className="rounded-lg border border-dashed border-white/15 p-5 text-sm text-slate-300 report-empty">
                  No group tasks have been assigned to this report yet.
                </p>
              ) : null}

              {selectedGroupTasks.map((task) => (
                <GroupReportTaskCard
                  key={task.id}
                  task={task}
                  comment={taskComments[`group:${task.id}`] ?? ''}
                />
              ))}
            </div>
          </section>
        </div>
        )}
      </section>
    </div>
  )
}
