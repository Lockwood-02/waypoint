import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { signIn, signOut, signUp } from './features/auth/authService'
import { ensureProfile, type Profile } from './features/profiles/profileService'
import {
  completeTask,
  createTask,
  getTask,
  getTasks,
  type Task,
} from './features/tasks/taskService'
import { supabase } from './lib/supabaseClient'

type AuthMode = 'login' | 'signup'

type AuthState = {
  displayName: string
  email: string
  password: string
}

type TaskFormState = {
  title: string
  description: string
  points: string
  steps: string[]
}

const initialAuthState: AuthState = {
  displayName: '',
  email: '',
  password: '',
}

const initialTaskFormState: TaskFormState = {
  title: '',
  description: '',
  points: '10',
  steps: [''],
}

function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [formState, setFormState] = useState<AuthState>(initialAuthState)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [message, setMessage] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState('')
  const [user, setUser] = useState<User | null>(null)
  const [taskForm, setTaskForm] = useState<TaskFormState>(initialTaskFormState)
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksError, setTasksError] = useState('')
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskActionMessage, setTaskActionMessage] = useState('')
  const [isUpdatingTask, setIsUpdatingTask] = useState(false)

  function clearSignedInState() {
    setProfile(null)
    setProfileError('')
    setTasks([])
    setTasksError('')
    setSelectedTask(null)
    setTaskActionMessage('')
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user ?? null
      setUser(sessionUser)
      if (!sessionUser) {
        clearSignedInState()
      }
      setIsLoadingSession(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)
      if (!sessionUser) {
        clearSignedInState()
      }
      setIsLoadingSession(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let isMounted = true

    if (!user) {
      return
    }

    ensureProfile(user).then(({ data, error }) => {
      if (!isMounted) {
        return
      }

      setProfile(data ?? null)
      setProfileError(error?.message ?? '')
    })

    return () => {
      isMounted = false
    }
  }, [user])

  useEffect(() => {
    let isMounted = true

    async function loadTasks() {
      if (!user) {
        return
      }

      setIsLoadingTasks(true)
      const { data, error } = await getTasks()

      if (!isMounted) {
        return
      }

      setTasks(data ?? [])
      setTasksError(error?.message ?? '')
      setIsLoadingTasks(false)
    }

    loadTasks()

    return () => {
      isMounted = false
    }
  }, [user])

  const title = authMode === 'login' ? 'Welcome back' : 'Create your account'
  const subtitle =
    authMode === 'login'
      ? 'Sign in to continue to your Waypoint dashboard.'
      : 'Start with an email and password, then confirm your account if Supabase email verification is enabled.'

  const userRows = useMemo(
    () =>
      user
        ? [
            ['Display name', profile?.display_name ?? 'Player'],
            ['Email', user.email ?? 'Not provided'],
            ['Total points', String(profile?.total_points ?? 0)],
            ['Open tasks', String(tasks.filter((task) => task.status !== 'Completed').length)],
            ['Completed tasks', String(tasks.filter((task) => task.status === 'Completed').length)],
          ]
        : [],
    [profile, tasks, user],
  )

  async function refreshTasks() {
    const { data, error } = await getTasks()
    setTasks(data ?? [])
    setTasksError(error?.message ?? '')
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    const displayName = formState.displayName.trim() || 'Player'
    const { error, data } =
      authMode === 'login'
        ? await signIn(formState.email, formState.password)
        : await signUp(formState.email, formState.password, displayName)

    if (error) {
      setMessage(error.message)
      setIsSubmitting(false)
      return
    }

    if (authMode === 'signup' && !data.session) {
      setMessage('Account created. Check your email to confirm your signup.')
      setFormState(initialAuthState)
    }

    setIsSubmitting(false)
  }

  async function handleSignOut() {
    setMessage('')
    await signOut()
  }

  function switchMode(mode: AuthMode) {
    setAuthMode(mode)
    setMessage('')
    setFormState(initialAuthState)
  }

  async function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsCreatingTask(true)
    setTaskActionMessage('')

    const points = Number.parseInt(taskForm.points, 10)
    const { data, error } = await createTask({
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      points: Number.isFinite(points) && points > 0 ? points : 10,
      steps: taskForm.steps,
    })

    if (error) {
      setTaskActionMessage(error.message)
      setIsCreatingTask(false)
      return
    }

    if (data) {
      setTasks((currentTasks) => [data, ...currentTasks])
      setTaskForm(initialTaskFormState)
      setTaskActionMessage('Task created.')
    }

    setIsCreatingTask(false)
  }

  function updateStepDraft(index: number, value: string) {
    setTaskForm((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) =>
        stepIndex === index ? value : step,
      ),
    }))
  }

  function addStepDraft() {
    setTaskForm((current) => ({
      ...current,
      steps: [...current.steps, ''],
    }))
  }

  function removeStepDraft(index: number) {
    setTaskForm((current) => ({
      ...current,
      steps:
        current.steps.length === 1
          ? ['']
          : current.steps.filter((_step, stepIndex) => stepIndex !== index),
    }))
  }

  async function openTask(task: Task) {
    setTaskActionMessage('')
    const { data, error } = await getTask(task.id)

    if (error) {
      setTaskActionMessage(error.message)
      return
    }

    setSelectedTask(data)
  }

  async function updateSelectedTask(taskId: string) {
    const { data, error } = await getTask(taskId)

    if (error) {
      setTaskActionMessage(error.message)
      return null
    }

    setSelectedTask(data)
    setTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === taskId && data ? data : task)),
    )
    return data
  }

  async function handleCompleteTask(task: Task) {
    setIsUpdatingTask(true)
    setTaskActionMessage('')

    const { data, error } = await completeTask(task, profile?.total_points ?? 0)

    if (error) {
      setTaskActionMessage(error.message)
      setIsUpdatingTask(false)
      return
    }

    if (data) {
      setProfile(data as Profile)
      await updateSelectedTask(task.id)
      await refreshTasks()
      setTaskActionMessage(`Task completed. You earned ${task.points} points.`)
    }

    setIsUpdatingTask(false)
  }

  async function handleToggleStep(stepId: string, isCompleted: boolean) {
    if (!selectedTask) {
      return
    }

    setIsUpdatingTask(true)
    setTaskActionMessage('')

    const { error } = await supabase
      .from('task_steps')
      .update({ is_completed: isCompleted })
      .eq('id', stepId)

    if (error) {
      setTaskActionMessage(error.message)
      setIsUpdatingTask(false)
      return
    }

    const updatedTask = await updateSelectedTask(selectedTask.id)
    const allStepsComplete =
      updatedTask &&
      updatedTask.task_steps.length > 0 &&
      updatedTask.task_steps.every((step) => step.is_completed)

    if (updatedTask && allStepsComplete && updatedTask.status !== 'Completed') {
      await handleCompleteTask(updatedTask)
      return
    }

    setIsUpdatingTask(false)
  }

  if (isLoadingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <p className="text-sm font-medium text-slate-300">Loading Waypoint...</p>
      </main>
    )
  }

  if (user) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <nav className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                Waypoint
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white">
                Task dashboard
              </h1>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            >
              Sign out
            </button>
          </nav>

          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <aside className="space-y-6">
              <section className="rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-cyan-950/40">
                <p className="text-sm font-medium text-cyan-200">
                  Welcome back
                </p>
                <h2 className="mt-3 break-words text-2xl font-bold">
                  {profile?.display_name ?? 'Player'}
                </h2>
                {profileError ? (
                  <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                    Profile could not be loaded: {profileError}
                  </p>
                ) : null}
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  {userRows.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {label}
                      </dt>
                      <dd className="mt-1 break-words text-sm text-slate-100">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
                <h2 className="text-lg font-semibold">Create a task</h2>
                <form className="mt-5 space-y-4" onSubmit={handleCreateTask}>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-200">
                      Title
                    </span>
                    <input
                      required
                      value={taskForm.title}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                      placeholder="Clean the kitchen"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-200">
                      Description
                    </span>
                    <textarea
                      value={taskForm.description}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      className="mt-2 min-h-28 w-full resize-y rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                      placeholder="Add the main task details here."
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-200">
                      Points
                    </span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={taskForm.points}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          points: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                    />
                  </label>

                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-200">
                        Checklist steps
                      </p>
                      <button
                        type="button"
                        onClick={addStepDraft}
                        className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300"
                      >
                        Add step
                      </button>
                    </div>
                    <div className="mt-2 space-y-2">
                      {taskForm.steps.map((step, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            value={step}
                            onChange={(event) =>
                              updateStepDraft(index, event.target.value)
                            }
                            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                            placeholder={`Step ${index + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeStepDraft(index)}
                            className="rounded-md border border-white/15 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-rose-300 hover:text-rose-100"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {taskActionMessage ? (
                    <p className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
                      {taskActionMessage}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isCreatingTask}
                    className="w-full rounded-md bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isCreatingTask ? 'Creating...' : 'Create task'}
                  </button>
                </form>
              </section>
            </aside>

            <section className="rounded-lg border border-white/10 bg-white/[0.06] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Tasks</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Open a task to view details and check off steps.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={refreshTasks}
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

              <div className="mt-5 space-y-3">
                {isLoadingTasks ? (
                  <p className="text-sm text-slate-300">Loading tasks...</p>
                ) : null}

                {!isLoadingTasks && tasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/15 p-6 text-center">
                    <p className="font-semibold">No tasks yet</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Create your first task and add checklist steps to it.
                    </p>
                  </div>
                ) : null}

                {tasks.map((task) => {
                  const completedSteps = task.task_steps.filter(
                    (step) => step.is_completed,
                  ).length
                  const totalSteps = task.task_steps.length

                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => openTask(task)}
                      className="w-full rounded-lg border border-white/10 bg-slate-900/70 p-4 text-left transition hover:border-cyan-300/70 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-white">
                            {task.title}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm text-slate-300">
                            {task.description || 'No description added.'}
                          </p>
                        </div>
                        <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold text-slate-950">
                          {task.points} pts
                        </span>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-300">
                        <span>{task.status}</span>
                        <span>
                          {totalSteps
                            ? `${completedSteps}/${totalSteps} steps`
                            : 'No steps'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>
        </section>

        {selectedTask ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
          >
            <section className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/60">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                    Task details
                  </p>
                  <h2 id="task-modal-title" className="mt-2 text-2xl font-bold">
                    {selectedTask.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold text-slate-950">
                  {selectedTask.points} points
                </span>
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200">
                  {selectedTask.status}
                </span>
              </div>

              <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-200">
                {selectedTask.description || 'No description added.'}
              </p>

              <div className="mt-6">
                <h3 className="text-lg font-semibold">Checklist</h3>
                <div className="mt-3 space-y-2">
                  {selectedTask.task_steps.length === 0 ? (
                    <p className="rounded-md border border-dashed border-white/15 p-4 text-sm text-slate-300">
                      This task has no checklist steps. You can complete the
                      task manually.
                    </p>
                  ) : null}

                  {selectedTask.task_steps.map((step) => (
                    <label
                      key={step.id}
                      className="flex items-start gap-3 rounded-md border border-white/10 bg-white/[0.04] p-3"
                    >
                      <input
                        type="checkbox"
                        checked={step.is_completed}
                        disabled={
                          isUpdatingTask || selectedTask.status === 'Completed'
                        }
                        onChange={(event) =>
                          handleToggleStep(step.id, event.target.checked)
                        }
                        className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-900 accent-cyan-300"
                      />
                      <span
                        className={`text-sm ${
                          step.is_completed
                            ? 'text-slate-400 line-through'
                            : 'text-slate-100'
                        }`}
                      >
                        {step.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {taskActionMessage ? (
                <p className="mt-5 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
                  {taskActionMessage}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                {selectedTask.status !== 'Completed' ? (
                  <button
                    type="button"
                    disabled={isUpdatingTask}
                    onClick={() => handleCompleteTask(selectedTask)}
                    className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isUpdatingTask ? 'Updating...' : 'Complete task'}
                  </button>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-white">
      <section className="w-full max-w-md rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-cyan-950/50">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Waypoint
          </p>
          <h1 className="mt-3 text-3xl font-bold">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">{subtitle}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-md bg-slate-900/80 p-1">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`rounded px-3 py-2 text-sm font-semibold transition ${
              authMode === 'login'
                ? 'bg-cyan-300 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`rounded px-3 py-2 text-sm font-semibold transition ${
              authMode === 'signup'
                ? 'bg-cyan-300 text-slate-950'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Sign up
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {authMode === 'signup' ? (
            <label className="block">
              <span className="text-sm font-medium text-slate-200">
                Display name
              </span>
              <input
                type="text"
                value={formState.displayName}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                placeholder="Player"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="text-sm font-medium text-slate-200">Email</span>
            <input
              type="email"
              required
              value={formState.email}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-200">
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={formState.password}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
              placeholder="At least 6 characters"
            />
          </label>

          {message ? (
            <p className="rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting
              ? 'Working...'
              : authMode === 'login'
                ? 'Login'
                : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default App
