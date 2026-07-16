import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { signIn, signOut, signUp } from './features/auth/authService'
import {
  ensureProfile,
  getProfileShopPurchases,
  purchaseProfileShopItem,
  updateProfileCosmetics,
  uploadProfileAvatar,
  type Profile,
} from './features/profiles/profileService'
import {
  completeTask,
  createTask,
  deleteTask,
  deleteUnusedTaskTag,
  getTask,
  getTaskTags,
  getTasks,
  updateTaskStatus,
  updateTaskUrgency,
  uncompleteTask,
  updateTask,
  type Task,
  type TaskTag,
} from './features/tasks/taskService'
import { WeeklyReportDashboard } from './features/reports/WeeklyReportDashboard'
import { StatsDashboard } from './features/stats/StatsDashboard'
import { NotesDashboard } from './features/notes/NotesDashboard'
import { GroupsDashboard } from './features/groups/GroupsDashboard'
import { supabase } from './lib/supabaseClient'
import { AppNavigation } from './components/AppNavigation'
import { SettingsModal } from './components/SettingsModal'
import { PointShopModal } from './components/PointShopModal'
import { changelogVersion, colorwayOptions, initialAuthState, initialTaskFormState, shopItems } from './config/appConfig'
import type { ActiveDashboard, AuthMode, AuthState, Colorway, ShopItem, TaskCompletionFilter, TaskFormState } from './types/app'

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
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskActionMessage, setTaskActionMessage] = useState('')
  const [isUpdatingTask, setIsUpdatingTask] = useState(false)
  const [taskSearch, setTaskSearch] = useState('')
  const [taskCompletionFilter, setTaskCompletionFilter] =
    useState<TaskCompletionFilter>('all')
  const [taskTags, setTaskTags] = useState<TaskTag[]>([])
  const [taskTagFilter, setTaskTagFilter] = useState('')
  const [isConfirmingDeleteTask, setIsConfirmingDeleteTask] = useState(false)
  const [isPointShopOpen, setIsPointShopOpen] = useState(false)
  const [profileActionMessage, setProfileActionMessage] = useState('')
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [ownedShopItemIds, setOwnedShopItemIds] = useState<string[]>([])
  const [activeDashboard, setActiveDashboard] =
    useState<ActiveDashboard>('tasks')
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false)
  const [tagActionMessage, setTagActionMessage] = useState('')
  const [deletingTagId, setDeletingTagId] = useState('')
  const [isChangelogOpen, setIsChangelogOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [colorway, setColorway] = useState<Colorway>('midnight')

  function clearSignedInState() {
    setProfile(null)
    setProfileError('')
    setTasks([])
    setTasksError('')
    setEditingTask(null)
    setIsCreateTaskModalOpen(false)
    setSelectedTask(null)
    setTaskActionMessage('')
    setTaskSearch('')
    setTaskCompletionFilter('all')
    setTaskTags([])
    setTaskTagFilter('')
    setIsConfirmingDeleteTask(false)
    setIsPointShopOpen(false)
    setProfileActionMessage('')
    setIsUpdatingProfile(false)
    setOwnedShopItemIds([])
    setActiveDashboard('tasks')
    setIsManageTagsOpen(false)
    setTagActionMessage('')
    setDeletingTagId('')
    setIsChangelogOpen(false)
    setIsSettingsOpen(false)
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
    if (!user) return

    const storageKey = `waypoint-changelog:${changelogVersion}:${user.id}`
    const timer = window.setTimeout(() => {
      setIsChangelogOpen(localStorage.getItem(storageKey) !== 'dismissed')
    }, 0)

    return () => window.clearTimeout(timer)
  }, [user])

  const title = authMode === 'login' ? 'Welcome back' : 'Create your account'
  const subtitle =
    authMode === 'login'
      ? 'Sign in to continue to your Waypoint dashboard.'
      : 'Start with an email and password, then confirm your account if Supabase email verification is enabled.'

  useEffect(() => {
    if (!user) return

    const savedColorway = localStorage.getItem(`waypoint-colorway:${user.id}`)
    const timer = window.setTimeout(() => {
      if (colorwayOptions.some((option) => option.id === savedColorway)) {
        setColorway(savedColorway as Colorway)
      } else {
        setColorway('midnight')
      }
    })

    return () => window.clearTimeout(timer)
  }, [user])

  useEffect(() => {
    if (!isSettingsOpen) return

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsSettingsOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isSettingsOpen])

  function selectColorway(nextColorway: Colorway) {
    setColorway(nextColorway)
    if (user) {
      localStorage.setItem(`waypoint-colorway:${user.id}`, nextColorway)
    }
  }

  function dismissChangelog() {
    if (user) {
      const storageKey = `waypoint-changelog:${changelogVersion}:${user.id}`
      localStorage.setItem(storageKey, 'dismissed')
    }
    setIsChangelogOpen(false)
  }

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

  useEffect(() => {
    let isMounted = true

    async function loadTaskTags() {
      if (!user) {
        return
      }

      const { data } = await getTaskTags()

      if (!isMounted) {
        return
      }

      setTaskTags(data ?? [])
    }

    loadTaskTags()

    return () => {
      isMounted = false
    }
  }, [user])

  useEffect(() => {
    let isMounted = true

    async function loadShopPurchases() {
      if (!user) {
        return
      }

      const { data } = await getProfileShopPurchases(user.id)

      if (!isMounted) {
        return
      }

      setOwnedShopItemIds(data?.map((purchase) => purchase.item_id) ?? [])
    }

    loadShopPurchases()

    return () => {
      isMounted = false
    }
  }, [user])

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

  const visibleTasks = useMemo(() => {
    const normalizedSearch = taskSearch.trim().toLowerCase()

    return tasks.filter((task) => {
      const matchesSearch = normalizedSearch
        ? task.title.toLowerCase().includes(normalizedSearch)
        : true
      const matchesCompletion =
        taskCompletionFilter === 'all' ||
        (taskCompletionFilter === 'completed' &&
          task.status === 'Completed') ||
        (taskCompletionFilter === 'incomplete' &&
          task.status !== 'Completed')
      const matchesTag = taskTagFilter
        ? task.task_tag_links.some((link) => link.tag_id === taskTagFilter)
        : true

      return matchesSearch && matchesCompletion && matchesTag
    }).sort((first, second) => Number(second.is_urgent) - Number(first.is_urgent))
  }, [taskCompletionFilter, taskSearch, taskTagFilter, tasks])

  const tagUsageCounts = useMemo(() => {
    const counts = new Map<string, number>()

    tasks.forEach((task) => {
      task.task_tag_links.forEach((link) => {
        counts.set(link.tag_id, (counts.get(link.tag_id) ?? 0) + 1)
      })
    })

    return counts
  }, [tasks])

  const avatarFrameClass = useMemo(() => {
    switch (profile?.selected_avatar_frame) {
      case 'frame-cyan':
        return 'border-[#67e8f9] shadow-[#67e8f9]/30'
      case 'frame-gold':
        return 'border-amber-300 shadow-amber-300/30'
      case 'frame-fire':
        return 'border-orange-400 shadow-orange-400/40'
      case 'frame-rose':
        return 'border-rose-300 shadow-rose-300/30'
      case 'frame-violet':
        return 'border-violet-300 shadow-violet-300/30'
      case 'frame-emerald':
        return 'border-emerald-300 shadow-emerald-300/30'
      case 'frame-blue':
        return 'border-blue-300 shadow-blue-300/30'
      case 'frame-orange':
        return 'border-orange-300 shadow-orange-300/30'
      default:
        return 'border-white/15 shadow-cyan-950/20'
    }
  }, [profile?.selected_avatar_frame])

  const profileNameClass = useMemo(() => {
    switch (profile?.selected_name_color) {
      case 'name-gold':
        return 'text-amber-200'
      case 'name-cyan':
        return 'text-cyan-200'
      case 'name-rose':
        return 'text-rose-200'
      case 'name-emerald':
        return 'text-emerald-200'
      case 'name-violet':
        return 'text-violet-200'
      case 'name-blue':
        return 'text-blue-200'
      case 'name-orange':
        return 'text-orange-200'
      case 'name-fire':
        return 'text-orange-400'
      default:
        return 'text-white'
    }
  }, [profile?.selected_name_color])

  async function refreshTasks() {
    const { data, error } = await getTasks()
    setTasks(data ?? [])
    setTasksError(error?.message ?? '')
  }

  async function refreshTaskTags() {
    const { data } = await getTaskTags()
    setTaskTags(data ?? [])
  }

  async function handleDeleteTag(tag: TaskTag) {
    setDeletingTagId(tag.id)
    setTagActionMessage('')

    const { error } = await deleteUnusedTaskTag(tag.id)

    if (error) {
      setTagActionMessage(error.message)
      setDeletingTagId('')
      return
    }

    setTaskTags((currentTags) =>
      currentTags.filter((currentTag) => currentTag.id !== tag.id),
    )
    setTaskTagFilter((currentFilter) =>
      currentFilter === tag.id ? '' : currentFilter,
    )
    setTagActionMessage(`${tag.name} deleted.`)
    setDeletingTagId('')
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!user || !file) {
      return
    }

    setIsUpdatingProfile(true)
    setProfileActionMessage('')

    const { data, error } = await uploadProfileAvatar(user.id, file)

    if (error) {
      setProfileActionMessage(error.message)
      setIsUpdatingProfile(false)
      return
    }

    if (data) {
      setProfile(data as Profile)
      setProfileActionMessage('Profile picture updated.')
    }

    event.target.value = ''
    setIsUpdatingProfile(false)
  }

  async function handleBuyShopItem(item: ShopItem) {
    if (!user || !profile) {
      return
    }

    const isOwned =
      ownedShopItemIds.includes(item.id) ||
      profile.selected_avatar_frame === item.value ||
      profile.selected_name_color === item.value
    const nextPoints = isOwned ? profile.total_points : profile.total_points - item.cost

    if (!isOwned && profile.total_points < item.cost) {
      setProfileActionMessage('Not enough points for that reward yet.')
      return
    }

    setIsUpdatingProfile(true)
    setProfileActionMessage('')

    if (!isOwned) {
      const { error: purchaseError } = await purchaseProfileShopItem(
        user.id,
        item.id,
      )

      if (purchaseError) {
        setProfileActionMessage(purchaseError.message)
        setIsUpdatingProfile(false)
        return
      }
    }

    const { data, error } = await updateProfileCosmetics(user.id, {
      total_points: nextPoints,
      selected_avatar_frame:
        item.type === 'avatar_frame'
          ? item.value
          : profile.selected_avatar_frame,
      selected_name_color:
        item.type === 'name_color' ? item.value : profile.selected_name_color,
    })

    if (error) {
      setProfileActionMessage(error.message)
      setIsUpdatingProfile(false)
      return
    }

    if (data) {
      setProfile(data as Profile)
      setOwnedShopItemIds((currentItemIds) =>
        currentItemIds.includes(item.id)
          ? currentItemIds
          : [...currentItemIds, item.id],
      )
      setProfileActionMessage(
        isOwned ? `${item.label} equipped.` : `${item.label} purchased.`,
      )
    }

    setIsUpdatingProfile(false)
  }

  async function handleToggleProfileFlare(item: ShopItem) {
    if (!user || !profile) return

    const currentlyEquipped =
      item.type === 'name_color'
        ? profile.selected_name_color === item.value
        : profile.selected_avatar_frame === item.value

    setIsUpdatingProfile(true)
    setProfileActionMessage('')

    const { data, error } = await updateProfileCosmetics(user.id, {
      selected_name_color:
        item.type === 'name_color'
          ? currentlyEquipped ? null : item.value
          : profile.selected_name_color,
      selected_avatar_frame:
        item.type === 'avatar_frame'
          ? currentlyEquipped ? null : item.value
          : profile.selected_avatar_frame,
    })

    if (error) setProfileActionMessage(error.message)
    else if (data) {
      setProfile(data as Profile)
      setProfileActionMessage(`${item.label} ${currentlyEquipped ? 'unequipped' : 'equipped'}.`)
    }

    setIsUpdatingProfile(false)
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

  function openCreateTaskModal() {
    setEditingTask(null)
    setTaskForm(initialTaskFormState)
    setTaskActionMessage('')
    setIsCreateTaskModalOpen(true)
  }

  function closeCreateTaskModal() {
    if (isCreatingTask) {
      return
    }

    setIsCreateTaskModalOpen(false)
    setEditingTask(null)
    setTaskForm(initialTaskFormState)
    setTaskActionMessage('')
  }

  function openEditTaskModal(task: Task) {
    const currentTag = task.task_tag_links[0]?.task_tags

    setEditingTask(task)
    setTaskForm({
      title: task.title,
      description: task.description ?? '',
      points: String(task.points),
      steps: task.task_steps.length
        ? task.task_steps.map((step) => step.title)
        : [''],
      tagId: currentTag?.id ?? '',
      newTagName: '',
      isUrgent: task.is_urgent,
    })
    setTaskActionMessage('')
    setSelectedTask(null)
    setIsCreateTaskModalOpen(true)
  }

  async function handleCreateTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsCreatingTask(true)
    setTaskActionMessage('')

    const points = Number.parseInt(taskForm.points, 10)
    const taskInput = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      points: Number.isFinite(points) && points > 0 ? points : 10,
      steps: taskForm.steps,
      tagId: taskForm.newTagName.trim() ? undefined : taskForm.tagId,
      newTagName: taskForm.newTagName,
      isUrgent: taskForm.isUrgent,
    }

    const { data, error } = editingTask
      ? await updateTask(editingTask.id, taskInput)
      : await createTask(taskInput)

    if (error) {
      setTaskActionMessage(error.message)
      setIsCreatingTask(false)
      return
    }

    if (data) {
      setTasks((currentTasks) =>
        editingTask
          ? currentTasks.map((task) => (task.id === data.id ? data : task))
          : [data, ...currentTasks],
      )
      setEditingTask(null)
      setTaskForm(initialTaskFormState)
      setTaskActionMessage(editingTask ? 'Task saved.' : 'Task created.')
      setIsCreateTaskModalOpen(false)
      await refreshTaskTags()
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
    setIsConfirmingDeleteTask(false)
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

  async function handleToggleUrgency(task: Task) {
    setIsUpdatingTask(true)
    setTaskActionMessage('')

    const { error } = await updateTaskUrgency(task.id, !task.is_urgent)

    if (error) {
      setTaskActionMessage(error.message)
      setIsUpdatingTask(false)
      return
    }

    await updateSelectedTask(task.id)
    await refreshTasks()
    setTaskActionMessage(task.is_urgent ? 'Urgent mark removed.' : 'Task marked urgent.')
    setIsUpdatingTask(false)
  }

  async function handleUncompleteTask(task: Task) {
    setIsUpdatingTask(true)
    setTaskActionMessage('')

    const { data, error } = await uncompleteTask(task.id)

    if (error) {
      setTaskActionMessage(error.message)
      setIsUpdatingTask(false)
      return
    }

    if (data) {
      setProfile((currentProfile) =>
        currentProfile
          ? { ...currentProfile, total_points: data.total_points }
          : currentProfile,
      )
      await updateSelectedTask(task.id)
      await refreshTasks()
      setTaskActionMessage(
        data.points_removed > 0
          ? `Task returned to in progress. ${data.points_removed} points were removed.`
          : 'Task returned to in progress. No points needed to be removed.',
      )
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

    if (updatedTask && updatedTask.status !== 'Completed') {
      const hasCompletedSteps = updatedTask.task_steps.some(
        (step) => step.is_completed,
      )
      const nextStatus = hasCompletedSteps ? 'In Progress' : 'Not Started'

      if (updatedTask.status !== nextStatus) {
        const { error: statusError } = await updateTaskStatus(
          updatedTask.id,
          nextStatus,
        )

        if (statusError) {
          setTaskActionMessage(statusError.message)
          setIsUpdatingTask(false)
          return
        }

        await updateSelectedTask(updatedTask.id)
      }
    }

    setIsUpdatingTask(false)
  }

  async function handleDeleteTask(task: Task) {
    setIsUpdatingTask(true)
    setTaskActionMessage('')

    const { error } = await deleteTask(task.id)

    if (error) {
      setTaskActionMessage(error.message)
      setIsUpdatingTask(false)
      return
    }

    setTasks((currentTasks) =>
      currentTasks.filter((currentTask) => currentTask.id !== task.id),
    )
    setSelectedTask(null)
    setIsConfirmingDeleteTask(false)
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
      <main
        data-colorway={colorway}
        className="min-h-screen bg-slate-950 px-6 py-8 text-white"
      >
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
          <AppNavigation
            activeDashboard={activeDashboard}
            onDashboardChange={setActiveDashboard}
            onOpenSettings={() => {
              setProfileActionMessage('')
              setIsSettingsOpen(true)
            }}
            onSignOut={handleSignOut}
          />

          {activeDashboard === 'tasks' ? (
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <aside className="space-y-6">
              <section className="rounded-lg border border-white/10 bg-white/[0.06] p-6 shadow-2xl shadow-cyan-950/40">
                <div className="flex flex-wrap items-center gap-4">
                  <label
                    className={`group relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 bg-slate-900 text-2xl font-bold shadow-lg transition focus-within:ring-2 focus-within:ring-cyan-300 focus-within:ring-offset-2 focus-within:ring-offset-slate-950 ${avatarFrameClass}`}
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-cyan-100">
                        {(profile?.display_name ?? 'Player')
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                      Upload
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUpdatingProfile}
                      onChange={handleAvatarUpload}
                      className="sr-only"
                    />
                  </label>
                  <div>
                    <p className="text-sm font-medium text-cyan-200">
                      Welcome back
                    </p>
                    <h2
                      className={`mt-2 break-words text-2xl font-bold ${profileNameClass}`}
                    >
                      {profile?.display_name ?? 'Player'}
                    </h2>
                  </div>
                </div>
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
                {profileActionMessage ? (
                  <p className="mt-4 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
                    {profileActionMessage}
                  </p>
                ) : null}
              </section>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setProfileActionMessage('')
                    setIsPointShopOpen(true)
                  }}
                  className="rounded-lg border border-white/10 bg-white/[0.06] p-5 text-center shadow-xl shadow-cyan-950/20 transition hover:border-cyan-300/70 hover:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-cyan-300"
                >
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-300 text-2xl font-bold text-slate-950">
                    $
                  </span>
                  <span className="mt-3 block text-sm font-bold text-white">
                    Point Shop
                  </span>
                </button>
                <button
                  type="button"
                  disabled
                  className="rounded-lg border border-white/10 bg-white/[0.04] p-5 text-center opacity-75"
                >
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-amber-300/50 bg-amber-300/10 text-2xl font-bold text-amber-100">
                    !
                  </span>
                  <span className="mt-3 block text-sm font-bold text-slate-200">
                    Coming Soon
                  </span>
                </button>
              </div>
            </aside>

            <section className="flex max-h-[36rem] min-h-0 flex-col rounded-lg border border-white/10 bg-white/[0.06] p-6 lg:max-h-[calc(100vh-12rem)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Tasks</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Open a task to view details and check off steps.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openCreateTaskModal}
                    className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
                  >
                    New task
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTagActionMessage('')
                      setIsManageTagsOpen(true)
                    }}
                    className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200"
                  >
                    Manage tags
                  </button>
                  <button
                    type="button"
                    onClick={refreshTasks}
                    className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              {tasksError ? (
                <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                  Tasks could not be loaded: {tasksError}
                </p>
              ) : null}

              <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <label className="block">
                  <span className="sr-only">Search tasks by title</span>
                  <input
                    type="search"
                    value={taskSearch}
                    onChange={(event) => setTaskSearch(event.target.value)}
                    className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                    placeholder="Search task titles"
                  />
                </label>
                <div className="grid grid-cols-3 rounded-md bg-slate-900/80 p-1">
                  {[
                    ['all', 'All'],
                    ['incomplete', 'Incomplete'],
                    ['completed', 'Completed'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setTaskCompletionFilter(value as TaskCompletionFilter)
                      }
                      className={`rounded px-3 py-2 text-xs font-semibold transition ${
                        taskCompletionFilter === value
                          ? 'bg-cyan-300 text-slate-950'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label className="block">
                  <span className="sr-only">Filter tasks by tag</span>
                  <select
                    value={taskTagFilter}
                    onChange={(event) => setTaskTagFilter(event.target.value)}
                    className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30 md:w-44"
                  >
                    <option value="">All tags</option>
                    {taskTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
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

                {!isLoadingTasks && tasks.length > 0 && visibleTasks.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/15 p-6 text-center">
                    <p className="font-semibold">No matching tasks</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Try a different title search, completion filter, or tag.
                    </p>
                  </div>
                ) : null}

                {visibleTasks.map((task) => {
                  const completedSteps = task.task_steps.filter(
                    (step) => step.is_completed,
                  ).length
                  const totalSteps = task.task_steps.length
                  const taskTag = task.task_tag_links[0]?.task_tags

                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => openTask(task)}
                      className={`w-full rounded-lg bg-slate-900/70 p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-300 ${
                        task.is_urgent
                          ? 'border border-amber-300/70 hover:border-amber-200'
                          : 'border border-white/10 hover:border-cyan-300/70'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-white">
                            {task.title}
                          </h3>
                          {task.is_urgent ? (
                            <span className="mt-2 inline-flex rounded-full border border-amber-300/50 bg-amber-300/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-100">
                              Urgent
                            </span>
                          ) : null}
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
                        {taskTag ? <span>{taskTag.name}</span> : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>
          ) : activeDashboard === 'groups' ? (
            <GroupsDashboard />
          ) : activeDashboard === 'notes' ? (
            <NotesDashboard />
          ) : activeDashboard === 'weekly-report' ? (
            <WeeklyReportDashboard
              tasks={tasks}
              isLoadingTasks={isLoadingTasks}
              tasksError={tasksError}
              onRefreshTasks={refreshTasks}
            />
          ) : (
            <StatsDashboard
              tasks={tasks}
              isLoadingTasks={isLoadingTasks}
              tasksError={tasksError}
              onRefreshTasks={refreshTasks}
            />
          )}
        </section>

        {isSettingsOpen && profile ? (
          <SettingsModal
            colorway={colorway}
            profile={profile}
            ownedFlareItems={shopItems.filter((item) =>
              ownedShopItemIds.includes(item.id) ||
              profile?.selected_avatar_frame === item.value ||
              profile?.selected_name_color === item.value,
            )}
            isUpdatingProfile={isUpdatingProfile}
            flareMessage={profileActionMessage}
            onSelectColorway={selectColorway}
            onToggleFlare={handleToggleProfileFlare}
            onClose={() => setIsSettingsOpen(false)}
          />
        ) : null}

        {isChangelogOpen ? (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 px-4 py-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="changelog-modal-title"
          >
            <section className="w-full max-w-xl rounded-lg border border-cyan-300/30 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/70">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                What&apos;s new with v0.7!
              </p>
              <h2 id="changelog-modal-title" className="mt-2 text-3xl font-bold">
                Waypoint is better together
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Collaborate with your groups and personalize how you show up.
              </p>

              <div className="mt-6 space-y-3">
                <article className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 p-4">
                  <h3 className="font-bold text-cyan-100">Groups and shared tasks</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-200">
                    Create a group or join one with an invite code. Group members can build shared tasks, assign checklist steps, and track progress together.
                  </p>
                </article>
                <article className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-4">
                  <h3 className="font-bold text-amber-100">Group chat</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-200">
                    Switch to Chat inside any group to leave messages for your teammates. Press Enter to send, use Shift+Enter for a new line, and expand longer messages when you want to read more.
                  </p>
                </article>
                <article className="rounded-lg border border-cyan-300/20 bg-white/[0.04] p-4">
                  <h3 className="font-bold text-cyan-100">Choose your profile flares</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-200">
                    Open Settings to equip or unequip name colors and avatar frames you own. Equipped name colors now appear beside your messages in group chat.
                  </p>
                </article>
                <article className="rounded-lg border border-cyan-300/20 bg-white/[0.04] p-4">
                  <h3 className="font-bold text-cyan-100">Your style, your way</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-200">
                    Point Shop purchases remain yours to switch at any time, and the Midnight, Forest, Violet, and Sunset application colorways are still available in Settings.
                  </p>
                </article>
              </div>

              <button
                type="button"
                onClick={dismissChangelog}
                autoFocus
                className="mt-6 w-full rounded-md bg-cyan-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                Got it — take me to Waypoint
              </button>
            </section>
          </div>
        ) : null}

        {isCreateTaskModalOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-form-modal-title"
          >
            <section className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/60">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                    {editingTask ? 'Edit task' : 'New task'}
                  </p>
                  <h2
                    id="task-form-modal-title"
                    className="mt-2 text-2xl font-bold"
                  >
                    {editingTask ? 'Save task details' : 'Create a task'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeCreateTaskModal}
                  className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200"
                >
                  Close
                </button>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleCreateTask}>
                <label className="flex cursor-pointer items-center gap-3 rounded-md border border-amber-300/30 bg-amber-300/10 p-3 text-sm font-semibold text-amber-100">
                  <input
                    type="checkbox"
                    checked={taskForm.isUrgent}
                    onChange={(event) =>
                      setTaskForm((current) => ({
                        ...current,
                        isUrgent: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 accent-amber-300"
                  />
                  Mark this task as urgent
                </label>
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

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-200">
                      Project tag
                    </span>
                    <select
                      value={taskForm.tagId}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          tagId: event.target.value,
                          newTagName: '',
                        }))
                      }
                      className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                    >
                      <option value="">No tag</option>
                      {taskTags.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-slate-200">
                      Create new tag
                    </span>
                    <input
                      value={taskForm.newTagName}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          tagId: '',
                          newTagName: event.target.value,
                        }))
                      }
                      className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30"
                      placeholder="Waypoint app"
                    />
                  </label>
                </div>

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

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeCreateTaskModal}
                    className="rounded-md border border-white/15 px-4 py-3 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingTask}
                    className="rounded-md bg-cyan-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isCreatingTask
                      ? editingTask
                        ? 'Saving...'
                        : 'Creating...'
                      : editingTask
                        ? 'Save task'
                        : 'Create task'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}

        {isPointShopOpen && profile ? (
          <PointShopModal
            profile={profile}
            items={shopItems}
            ownedItemIds={ownedShopItemIds}
            isUpdating={isUpdatingProfile}
            message={profileActionMessage}
            onSelectItem={handleBuyShopItem}
            onClose={() => setIsPointShopOpen(false)}
          />
        ) : null}

        {isPointShopOpen && !profile ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="point-shop-title"
          >
            <section className="max-h-full w-full max-w-3xl overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/60">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                    Rewards
                  </p>
                  <h2 id="point-shop-title" className="mt-2 text-2xl font-bold">
                    Point Shop
                  </h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Current balance: {(profile as Profile | null)?.total_points ?? 0} points
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPointShopOpen(false)}
                  className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {shopItems.map((item) => {
                  const isEquipped =
                    (item.type === 'avatar_frame' &&
                      (profile as Profile | null)?.selected_avatar_frame === item.value) ||
                    (item.type === 'name_color' &&
                      (profile as Profile | null)?.selected_name_color === item.value)
                  const isOwned =
                    ownedShopItemIds.includes(item.id) ||
                    (profile as Profile | null)?.selected_avatar_frame === item.value ||
                    (profile as Profile | null)?.selected_name_color === item.value
                  const canAfford = ((profile as Profile | null)?.total_points ?? 0) >= item.cost

                  return (
                    <article
                      key={item.id}
                      className="rounded-lg border border-white/10 bg-white/[0.04] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-white">
                            {item.label}
                          </h3>
                          <p className="mt-1 text-sm leading-5 text-slate-300">
                            {item.description}
                          </p>
                        </div>
                        <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold text-slate-950">
                          {isOwned ? 'Owned' : `${item.cost} pts`}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={
                          isUpdatingProfile ||
                          isEquipped ||
                          (!isOwned && !canAfford)
                        }
                        onClick={() => handleBuyShopItem(item)}
                        className="mt-4 w-full rounded-md border border-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isEquipped
                          ? 'Equipped'
                          : isOwned
                            ? isUpdatingProfile
                              ? 'Equipping...'
                              : 'Equip'
                            : canAfford
                            ? isUpdatingProfile
                              ? 'Buying...'
                              : 'Buy and equip'
                            : 'Need more points'}
                      </button>
                    </article>
                  )
                })}
              </div>

              {profileActionMessage ? (
                <p className="mt-5 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
                  {profileActionMessage}
                </p>
              ) : null}
            </section>
          </div>
        ) : null}

        {isManageTagsOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-tags-title"
          >
            <section className="max-h-full w-full max-w-xl overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/60">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
                    Tags
                  </p>
                  <h2 id="manage-tags-title" className="mt-2 text-2xl font-bold">
                    Manage tags
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManageTagsOpen(false)}
                  className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200"
                >
                  Close
                </button>
              </div>

              {tagActionMessage ? (
                <p className="mt-5 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">
                  {tagActionMessage}
                </p>
              ) : null}

              <div className="mt-5 space-y-3">
                {taskTags.length === 0 ? (
                  <p className="rounded-md border border-dashed border-white/15 p-4 text-sm text-slate-300">
                    No tags have been created yet.
                  </p>
                ) : null}

                {taskTags.map((tag) => {
                  const usageCount = tagUsageCounts.get(tag.id) ?? 0
                  const isDeleting = deletingTagId === tag.id

                  return (
                    <div
                      key={tag.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4"
                    >
                      <div>
                        <p className="font-semibold text-white">{tag.name}</p>
                        <p className="mt-1 text-sm text-slate-300">
                          {usageCount === 0
                            ? 'Not assigned to any task.'
                            : `${usageCount} task${
                                usageCount === 1 ? '' : 's'
                              } using this tag.`}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={usageCount > 0 || Boolean(deletingTagId)}
                        onClick={() => handleDeleteTag(tag)}
                        className="rounded-md border border-rose-300/50 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </section>
          </div>
        ) : null}

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
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEditTaskModal(selectedTask)}
                    className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold transition hover:border-cyan-300 hover:text-cyan-200"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold text-slate-950">
                  {selectedTask.points} points
                </span>
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200">
                  {selectedTask.status}
                </span>
                {selectedTask.is_urgent ? (
                  <span className="rounded-full border border-amber-300/50 bg-amber-300/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-100">
                    Urgent
                  </span>
                ) : null}
                {selectedTask.task_tag_links[0]?.task_tags ? (
                  <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                    {selectedTask.task_tag_links[0].task_tags.name}
                  </span>
                ) : null}
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
                    onClick={() => handleToggleUrgency(selectedTask)}
                    className="rounded-md border border-amber-300/50 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {selectedTask.is_urgent ? 'Remove urgent mark' : 'Mark urgent'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isUpdatingTask}
                    onClick={() => handleUncompleteTask(selectedTask)}
                    className="rounded-md border border-cyan-300/50 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isUpdatingTask ? 'Updating...' : 'Return to in progress'}
                  </button>
                )}
                {isConfirmingDeleteTask ? (
                  <>
                    <button
                      type="button"
                      disabled={isUpdatingTask}
                      onClick={() => setIsConfirmingDeleteTask(false)}
                      className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Cancel delete
                    </button>
                    <button
                      type="button"
                      disabled={isUpdatingTask}
                      onClick={() => handleDeleteTask(selectedTask)}
                      className="rounded-md bg-rose-300 px-4 py-2 text-sm font-bold text-rose-950 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isUpdatingTask ? 'Deleting...' : 'Confirm delete'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={isUpdatingTask}
                    onClick={() => setIsConfirmingDeleteTask(true)}
                    className="rounded-md border border-rose-300/50 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    Delete task
                  </button>
                )}
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
