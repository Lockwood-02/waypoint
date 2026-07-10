import { useMemo, useState } from 'react'
import type { Task } from '../tasks/taskService'

type StatsDashboardProps = {
  tasks: Task[]
  isLoadingTasks: boolean
  tasksError: string
  onRefreshTasks: () => void
}

type ChartType = 'pie' | 'bar' | 'line'
type StatsMetric =
  | 'completed-by-tag'
  | 'tasks-by-status'
  | 'points-by-tag'
  | 'steps-by-tag'
  | 'completions-over-time'

type ChartDatum = {
  label: string
  value: number
  color: string
}

const chartColors = [
  '#67e8f9',
  '#fbbf24',
  '#fb7185',
  '#a78bfa',
  '#34d399',
  '#f472b6',
  '#60a5fa',
  '#c4b5fd',
]

const metricOptions: Array<{
  value: StatsMetric
  label: string
  description: string
}> = [
  {
    value: 'completed-by-tag',
    label: 'Completed tasks by tag',
    description: 'Completed tasks grouped by the tag assigned to each task.',
  },
  {
    value: 'tasks-by-status',
    label: 'Tasks by status',
    description: 'All tasks grouped by their current status.',
  },
  {
    value: 'points-by-tag',
    label: 'Points by tag',
    description: 'Total task points grouped by tag.',
  },
  {
    value: 'steps-by-tag',
    label: 'Completed steps by tag',
    description: 'Checklist steps marked complete grouped by tag.',
  },
  {
    value: 'completions-over-time',
    label: 'Completions over time',
    description: 'Completed tasks grouped by completion day.',
  },
]

function getTaskTagName(task: Task) {
  return task.task_tag_links[0]?.task_tags?.name ?? 'No tag'
}

function getCompletedStepCount(task: Task) {
  return task.task_steps.filter((step) => step.is_completed).length
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function colorizeRows(rows: Array<Omit<ChartDatum, 'color'>>) {
  return rows.map((row, index) => ({
    ...row,
    color: chartColors[index % chartColors.length],
  }))
}

function sortRows(rows: Array<Omit<ChartDatum, 'color'>>) {
  return [...rows].sort((first, second) => {
    if (second.value !== first.value) {
      return second.value - first.value
    }

    return first.label.localeCompare(second.label)
  })
}

function buildCountRows(values: string[]) {
  const counts = new Map<string, number>()

  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  })

  return sortRows(
    [...counts.entries()].map(([label, value]) => ({
      label,
      value,
    })),
  )
}

function buildSumRows(tasks: Task[], getLabel: (task: Task) => string) {
  const totals = new Map<string, number>()

  tasks.forEach((task) => {
    const label = getLabel(task)
    totals.set(label, (totals.get(label) ?? 0) + task.points)
  })

  return sortRows(
    [...totals.entries()].map(([label, value]) => ({
      label,
      value,
    })),
  )
}

function buildStepRows(tasks: Task[]) {
  const totals = new Map<string, number>()

  tasks.forEach((task) => {
    const label = getTaskTagName(task)
    totals.set(label, (totals.get(label) ?? 0) + getCompletedStepCount(task))
  })

  return sortRows(
    [...totals.entries()].map(([label, value]) => ({
      label,
      value,
    })),
  )
}

function buildCompletionRows(tasks: Task[]) {
  const counts = new Map<string, number>()

  tasks
    .filter((task) => task.status === 'Completed' && task.completed_at)
    .forEach((task) => {
      const dateKey = task.completed_at?.slice(0, 10) ?? ''
      counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1)
    })

  return [...counts.entries()]
    .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
    .slice(-10)
    .map(([label, value]) => ({
      label: formatDateLabel(label),
      value,
    }))
}

function PieChart({ data }: { data: ChartDatum[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const circumference = 2 * Math.PI * 68
  const segments = data.reduce<
    Array<ChartDatum & { dashLength: number; dashOffset: number }>
  >((currentSegments, item) => {
    const usedLength = currentSegments.reduce(
      (sum, segment) => sum + segment.dashLength,
      0,
    )

    return [
      ...currentSegments,
      {
        ...item,
        dashLength: (item.value / total) * circumference,
        dashOffset: -usedLength,
      },
    ]
  }, [])

  if (total === 0) {
    return <EmptyChart />
  }

  return (
    <svg viewBox="0 0 240 240" role="img" className="h-full w-full">
      <title>Pie chart</title>
      <circle
        cx="120"
        cy="120"
        r="68"
        fill="none"
        stroke="#1e293b"
        strokeWidth="46"
      />
      {segments.map((item) => (
          <circle
            key={item.label}
            cx="120"
            cy="120"
            r="68"
            fill="none"
            stroke={item.color}
            strokeDasharray={`${item.dashLength} ${
              circumference - item.dashLength
            }`}
            strokeDashoffset={item.dashOffset}
            strokeLinecap="butt"
            strokeWidth="46"
            transform="rotate(-90 120 120)"
          />
      ))}
      <text
        x="120"
        y="114"
        textAnchor="middle"
        className="fill-white text-2xl font-bold"
      >
        {total}
      </text>
      <text
        x="120"
        y="138"
        textAnchor="middle"
        className="fill-slate-300 text-xs font-semibold"
      >
        total
      </text>
    </svg>
  )
}

function BarChart({ data }: { data: ChartDatum[] }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1)

  if (data.length === 0) {
    return <EmptyChart />
  }

  return (
    <div className="flex h-full min-h-72 items-end gap-3 pt-8">
      {data.map((item) => {
        const height = `${Math.max((item.value / maxValue) * 100, 6)}%`

        return (
          <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-3">
            <div className="relative flex h-56 w-full items-end rounded-md bg-slate-950/70 px-2">
              <div
                className="w-full rounded-t"
                style={{ height, backgroundColor: item.color }}
              />
              <span className="absolute left-1/2 top-2 -translate-x-1/2 text-xs font-bold text-white">
                {item.value}
              </span>
            </div>
            <span className="max-w-full truncate text-xs font-semibold text-slate-300">
              {item.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function LineChart({ data }: { data: ChartDatum[] }) {
  const maxValue = Math.max(...data.map((item) => item.value), 1)
  const width = 620
  const height = 300
  const padding = 42
  const usableWidth = width - padding * 2
  const usableHeight = height - padding * 2
  const points = data.map((item, index) => {
    const x =
      data.length === 1
        ? width / 2
        : padding + (index / (data.length - 1)) * usableWidth
    const y = padding + usableHeight - (item.value / maxValue) * usableHeight

    return { ...item, x, y }
  })
  const path = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  if (data.length === 0) {
    return <EmptyChart />
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" className="h-full w-full">
      <title>Line chart</title>
      <line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke="#334155"
        strokeWidth="2"
      />
      <line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={height - padding}
        stroke="#334155"
        strokeWidth="2"
      />
      <path d={path} fill="none" stroke="#67e8f9" strokeWidth="4" />
      {points.map((point) => (
        <g key={point.label}>
          <circle cx={point.x} cy={point.y} r="6" fill={point.color} />
          <text
            x={point.x}
            y={point.y - 12}
            textAnchor="middle"
            className="fill-white text-xs font-bold"
          >
            {point.value}
          </text>
          <text
            x={point.x}
            y={height - 12}
            textAnchor="middle"
            className="fill-slate-300 text-[10px] font-semibold"
          >
            {point.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-full min-h-72 items-center justify-center rounded-lg border border-dashed border-white/15 text-center">
      <div>
        <p className="font-semibold text-white">No chart data yet</p>
        <p className="mt-2 max-w-sm text-sm text-slate-300">
          Add or complete tasks with tags to populate this view.
        </p>
      </div>
    </div>
  )
}

function ChartRenderer({
  chartType,
  data,
}: {
  chartType: ChartType
  data: ChartDatum[]
}) {
  if (chartType === 'pie') {
    return <PieChart data={data} />
  }

  if (chartType === 'line') {
    return <LineChart data={data} />
  }

  return <BarChart data={data} />
}

export function StatsDashboard({
  tasks,
  isLoadingTasks,
  tasksError,
  onRefreshTasks,
}: StatsDashboardProps) {
  const [chartType, setChartType] = useState<ChartType>('pie')
  const [metric, setMetric] = useState<StatsMetric>('completed-by-tag')

  const chartData = useMemo(() => {
    const rows =
      metric === 'completed-by-tag'
        ? buildCountRows(
            tasks
              .filter((task) => task.status === 'Completed')
              .map((task) => getTaskTagName(task)),
          )
        : metric === 'tasks-by-status'
          ? buildCountRows(tasks.map((task) => task.status))
          : metric === 'points-by-tag'
            ? buildSumRows(tasks, getTaskTagName)
            : metric === 'steps-by-tag'
              ? buildStepRows(tasks)
              : buildCompletionRows(tasks)

    return colorizeRows(rows.filter((row) => row.value > 0))
  }, [metric, tasks])

  const selectedMetric = metricOptions.find((option) => option.value === metric)
  const completedTasks = tasks.filter((task) => task.status === 'Completed')
  const totalPoints = tasks.reduce((sum, task) => sum + task.points, 0)
  const completedSteps = tasks.reduce(
    (sum, task) => sum + getCompletedStepCount(task),
    0,
  )
  const totalSteps = tasks.reduce((sum, task) => sum + task.task_steps.length, 0)

  return (
    <div className="grid gap-6 xl:grid-cols-[18rem_1fr]">
      <aside className="space-y-4">
        <section className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Stats
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Chart dashboard
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Choose a chart style and variable to explore task progress from a few
            angles.
          </p>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
          <h3 className="text-sm font-semibold text-white">Chart type</h3>
          <div className="mt-3 grid grid-cols-3 rounded-md bg-slate-900/80 p-1 xl:grid-cols-1">
            {[
              ['pie', 'Pie'],
              ['bar', 'Bar'],
              ['line', 'Line'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setChartType(value as ChartType)}
                className={`rounded px-3 py-2 text-xs font-semibold transition ${
                  chartType === value
                    ? 'bg-cyan-300 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.06] p-5">
          <label className="block">
            <span className="text-sm font-semibold text-white">Variable</span>
            <select
              value={metric}
              onChange={(event) => setMetric(event.target.value as StatsMetric)}
              className="mt-3 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
            >
              {metricOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            {selectedMetric?.description}
          </p>
        </section>

        <button
          type="button"
          onClick={onRefreshTasks}
          className="w-full rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200"
        >
          Refresh stats
        </button>
      </aside>

      <section className="min-h-[34rem] rounded-lg border border-white/10 bg-white/[0.06] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">
              {selectedMetric?.label}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {chartData.length} segment{chartData.length === 1 ? '' : 's'} in
              view
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Tasks
              </p>
              <p className="mt-1 text-lg font-bold text-white">{tasks.length}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Done
              </p>
              <p className="mt-1 text-lg font-bold text-white">
                {completedTasks.length}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Points
              </p>
              <p className="mt-1 text-lg font-bold text-white">{totalPoints}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Steps
              </p>
              <p className="mt-1 text-lg font-bold text-white">
                {completedSteps}/{totalSteps}
              </p>
            </div>
          </div>
        </div>

        {tasksError ? (
          <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
            Tasks could not be loaded: {tasksError}
          </p>
        ) : null}

        {isLoadingTasks ? (
          <p className="mt-5 text-sm text-slate-300">Loading stats...</p>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="h-[22rem] rounded-lg border border-white/10 bg-slate-900/70 p-4">
            <ChartRenderer chartType={chartType} data={chartData} />
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-900/70 p-4">
            <h3 className="text-sm font-semibold text-white">Legend</h3>
            <div className="mt-4 space-y-3">
              {chartData.length === 0 ? (
                <p className="text-sm text-slate-300">No values to show.</p>
              ) : null}

              {chartData.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate text-sm text-slate-200">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-white">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
