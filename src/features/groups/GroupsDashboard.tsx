import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createGroup,
  createGroupMessage,
  createGroupTask,
  deleteGroup,
  deleteGroupMessage,
  deleteGroupTask,
  getGroups,
  getGroupMembers,
  getGroupMessages,
  getCurrentUserId,
  getGroupTasks,
  joinGroup,
  leaveGroup,
  rotateGroupInvite,
  updateGroupDetails,
  updateGroupTask,
  setGroupTaskCompletion,
  updateGroupTaskStepCompletion,
  updateGroupMessage,
  type Group,
  type GroupMember,
  type GroupMessage,
  type GroupTask,
} from './groupService'
import { GroupTaskFormModal } from './GroupTaskFormModal'
import { GroupTaskDetailsModal } from './GroupTaskDetailsModal'
import { GroupChatView } from './GroupChatView'
import { GroupMembersView } from './GroupMembersView'
import { TaskDueIndicator } from '../../components/TaskDueIndicator'
import { clampTaskPoints } from '../../lib/pointEconomy'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

type GroupsDashboardProps = {
  onPointsChanged?: () => Promise<void> | void
}

export function GroupsDashboard({ onPointsChanged }: GroupsDashboardProps) {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [tasks, setTasks] = useState<GroupTask[]>([])
  const [members, setMembers] = useState<GroupMember[]>([])
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [activeGroupView, setActiveGroupView] = useState<'tasks' | 'chat' | 'members'>('tasks')
  const [messageDraft, setMessageDraft] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [selectedTask, setSelectedTask] = useState<GroupTask | null>(null)
  const [taskActionMessage, setTaskActionMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showJoinGroup, setShowJoinGroup] = useState(false)
  const [showRenameGroup, setShowRenameGroup] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [groupConfirmation, setGroupConfirmation] = useState<'delete' | 'leave' | null>(null)
  const [isProcessingGroupAction, setIsProcessingGroupAction] = useState(false)
  const [editingTask, setEditingTask] = useState<GroupTask | null>(null)
  const [groupName, setGroupName] = useState('')
  const [renameGroupName, setRenameGroupName] = useState('')
  const [renameGroupDescription, setRenameGroupDescription] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskPoints, setTaskPoints] = useState('10')
  const [taskUrgent, setTaskUrgent] = useState(false)
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskSearch, setTaskSearch] = useState('')
  const [taskSteps, setTaskSteps] = useState([{ title: '', assignedTo: '' }])

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null
  const memberName = (userId: string | null) =>
    members.find((member) => member.user_id === userId)?.display_name ?? (userId ? 'Group member' : 'Unassigned')
  const memberNameClass = (userId: string) => {
    switch (members.find((member) => member.user_id === userId)?.selected_name_color) {
      case 'name-gold': return 'text-amber-200'
      case 'name-cyan': return 'text-cyan-200'
      case 'name-rose': return 'text-rose-200'
      case 'name-emerald': return 'text-emerald-200'
      case 'name-violet': return 'text-violet-200'
      case 'name-blue': return 'text-blue-200'
      case 'name-orange': return 'text-orange-200'
      case 'name-fire': return 'text-orange-400'
      case 'name-white': return 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.65)]'
      default: return 'text-white'
    }
  }
  const visibleTasks = useMemo(() => {
    const query = taskSearch.trim().toLowerCase()
    if (!query) return tasks
    return tasks.filter((task) => task.title.toLowerCase().includes(query))
  }, [tasks, taskSearch])

  const loadGroups = useCallback(async () => {
    setIsLoading(true)
    const response = await getGroups()
    if (response.error) setMessage(errorMessage(response.error))
    else {
      setGroups(response.data ?? [])
      setSelectedGroupId((current) => current && response.data?.some((group) => group.id === current) ? current : response.data?.[0]?.id ?? '')
    }
    setIsLoading(false)
  }, [])

  const loadTasks = useCallback(async (groupId: string) => {
    const response = await getGroupTasks(groupId)
    if (response.error) setMessage(errorMessage(response.error))
    else setTasks(response.data ?? [])
  }, [])

  const loadMembers = useCallback(async (groupId: string) => {
    const response = await getGroupMembers(groupId)
    if (response.error) setMessage(errorMessage(response.error))
    else setMembers(response.data ?? [])
  }, [])

  const loadMessages = useCallback(async (groupId: string) => {
    const response = await getGroupMessages(groupId)
    if (response.error) setMessage(errorMessage(response.error))
    else setMessages(response.data ?? [])
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadGroups() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadGroups])
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void getCurrentUserId().then((response) => setCurrentUserId(response.data ?? ''))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (selectedGroupId) void loadTasks(selectedGroupId)
      else setTasks([])
      if (selectedGroupId) void loadMembers(selectedGroupId)
      else setMembers([])
    }, 0)
    return () => window.clearTimeout(timer)
  }, [selectedGroupId, loadTasks, loadMembers])

  useEffect(() => {
    if (!selectedGroupId || activeGroupView !== 'chat') return
    const timer = window.setTimeout(() => { void loadMessages(selectedGroupId) }, 0)
    const interval = window.setInterval(() => { void loadMessages(selectedGroupId) }, 5000)
    return () => {
      window.clearTimeout(timer)
      window.clearInterval(interval)
    }
  }, [selectedGroupId, activeGroupView, loadMessages])

  async function handleCreateGroup(event: FormEvent) {
    event.preventDefault()
    const response = await createGroup(groupName, groupDescription)
    if (response.error) return setMessage(errorMessage(response.error))
    setGroupName(''); setGroupDescription(''); setShowCreateGroup(false)
    setMessage('Group created. Share its invite link when you are ready.')
    await loadGroups()
  }

  async function handleCreateTask(event: FormEvent) {
    event.preventDefault()
    if (!selectedGroup) return
    const points = clampTaskPoints(Number(taskPoints))
    const response = editingTask
      ? await updateGroupTask(editingTask, taskTitle, taskDescription, points, taskUrgent, taskDueDate, taskSteps)
      : await createGroupTask(selectedGroup.id, taskTitle, taskDescription, points, taskUrgent, taskDueDate, taskSteps)
    if (response.error) return setMessage(errorMessage(response.error))
    setTaskTitle(''); setTaskDescription(''); setTaskPoints('10'); setTaskUrgent(false); setTaskDueDate(''); setTaskSteps([{ title: '', assignedTo: '' }]); setShowCreateTask(false); setEditingTask(null); setSelectedTask(null)
    await loadTasks(selectedGroup.id)
  }

  function openCreateTask() {
    setEditingTask(null)
    setTaskTitle('')
    setTaskDescription('')
    setTaskPoints('10')
    setTaskUrgent(false)
    setTaskDueDate('')
    setTaskSteps([{ title: '', assignedTo: '' }])
    setShowCreateTask(true)
  }

  function openEditTask(task: GroupTask) {
    if (selectedGroup?.role !== 'owner' && task.created_by !== currentUserId) {
      setMessage('Only the group owner or task creator can edit this task.')
      return
    }
    setEditingTask(task)
    setTaskTitle(task.title)
    setTaskDescription(task.description ?? '')
    setTaskPoints(String(task.points))
    setTaskUrgent(task.is_urgent)
    setTaskDueDate(task.due_date ?? '')
    setTaskSteps(task.group_task_steps.length
      ? task.group_task_steps.map((step) => ({ title: step.title, assignedTo: step.assigned_to ?? '' }))
      : [{ title: '', assignedTo: '' }])
    setSelectedTask(null)
    setTaskActionMessage('')
    setShowCreateTask(true)
  }

  function closeTaskForm() {
    setShowCreateTask(false)
    setEditingTask(null)
  }

  async function handleToggleStep(stepId: string, isCompleted: boolean) {
    if (!selectedGroup) return
    const response = await updateGroupTaskStepCompletion(stepId, isCompleted)
    if (response.error) return setMessage(errorMessage(response.error))
    await loadTasks(selectedGroup.id)
    setSelectedTask((current) => current ? {
      ...current,
      group_task_steps: current.group_task_steps.map((step) =>
        step.id === stepId ? { ...step, is_completed: isCompleted } : step,
      ),
    } : null)
  }

  async function handleDeleteSelectedTask() {
    if (!selectedGroup || !selectedTask) return
    const response = await deleteGroupTask(selectedTask.id)
    if (response.error) return setMessage(errorMessage(response.error))
    setSelectedTask(null)
    await loadTasks(selectedGroup.id)
  }

  async function handleToggleSelectedTaskStatus() {
    if (!selectedGroup || !selectedTask) return
    const shouldComplete = selectedTask.status !== 'Completed'
    setTaskActionMessage('')
    const response = await setGroupTaskCompletion(selectedTask.id, shouldComplete)
    if (response.error) return setTaskActionMessage(errorMessage(response.error))
    const nextStatus = response.data?.status ?? (shouldComplete ? 'Completed' : 'In Progress')
    setSelectedTask((current) => current ? { ...current, status: nextStatus } : null)
    await loadTasks(selectedGroup.id)
    if (!shouldComplete) {
      setTaskActionMessage('Task returned to in progress. Previously awarded group points remain on member accounts.')
      return
    }
    if (response.data?.awarded_recipient_count) {
      const recipientCount = response.data.awarded_recipient_count
      setTaskActionMessage(
        `Task completed. ${recipientCount} assigned member${recipientCount === 1 ? '' : 's'} each earned ${response.data.points_each} points.`,
      )
      await onPointsChanged?.()
    } else if (response.data?.already_rewarded) {
      setTaskActionMessage('Task completed. Points for this group task were already awarded.')
    } else {
      setTaskActionMessage('Task completed. No members were assigned checklist steps, so no points were awarded.')
    }
  }

  async function handleJoinGroup(event: FormEvent) {
    event.preventDefault()
    const response = await joinGroup(inviteCode)
    if (response.error) return setMessage(errorMessage(response.error))
    setInviteCode('')
    setShowJoinGroup(false)
    setMessage('You joined the group.')
    await loadGroups()
    if (response.data) setSelectedGroupId(response.data as string)
  }

  async function handleSendMessage(event: FormEvent) {
    event.preventDefault()
    if (!selectedGroup || !messageDraft.trim()) return
    setIsSendingMessage(true)
    const response = await createGroupMessage(selectedGroup.id, messageDraft)
    if (response.error) setMessage(errorMessage(response.error))
    else {
      setMessageDraft('')
      await loadMessages(selectedGroup.id)
    }
    setIsSendingMessage(false)
  }

  async function handleEditMessage(messageId: string, body: string) {
    if (!selectedGroup) return false
    const response = await updateGroupMessage(messageId, body)
    if (response.error) {
      setMessage(errorMessage(response.error))
      return false
    }
    await loadMessages(selectedGroup.id)
    return true
  }

  async function handleDeleteMessage(messageId: string) {
    if (!selectedGroup) return false
    const response = await deleteGroupMessage(messageId)
    if (response.error) {
      setMessage(errorMessage(response.error))
      return false
    }
    await loadMessages(selectedGroup.id)
    return true
  }

  async function handleDeleteGroup() {
    if (!selectedGroup) return
    setIsProcessingGroupAction(true)
    const response = await deleteGroup(selectedGroup.id)
    if (response.error) {
      setMessage(errorMessage(response.error))
      setIsProcessingGroupAction(false)
      return
    }
    setGroupConfirmation(null)
    setIsProcessingGroupAction(false)
    setMessage('Group deleted.')
    setMessages([])
    setTasks([])
    await loadGroups()
  }

  async function copyInviteCode() {
    if (!selectedGroup) return
    await navigator.clipboard.writeText(selectedGroup.invite_code)
    setMessage(`Invite code ${selectedGroup.invite_code} copied to your clipboard.`)
  }

  async function rotateInvite() {
    if (!selectedGroup) return
    const response = await rotateGroupInvite(selectedGroup.id)
    if (response.error) return setMessage(errorMessage(response.error))
    setMessage('A new invite code is ready. The previous code no longer works.')
    await loadGroups()
  }

  function openRenameGroup() {
    if (!selectedGroup) return
    setRenameGroupName(selectedGroup.name)
    setRenameGroupDescription(selectedGroup.description ?? '')
    setShowRenameGroup(true)
  }

  async function handleRenameGroup(event: FormEvent) {
    event.preventDefault()
    if (!selectedGroup) return

    const nextName = renameGroupName.trim()

    if (!nextName) {
      setMessage('Group name cannot be empty.')
      return
    }

    const response = await updateGroupDetails(
      selectedGroup.id,
      nextName,
      renameGroupDescription,
    )
    if (response.error) return setMessage(errorMessage(response.error))
    setMessage('Group details updated.')
    setShowRenameGroup(false)
    setRenameGroupName('')
    setRenameGroupDescription('')
    await loadGroups()
  }

  async function handleLeave() {
    if (!selectedGroup) return
    setIsProcessingGroupAction(true)
    const response = await leaveGroup(selectedGroup.id)
    if (response.error) {
      setMessage(errorMessage(response.error))
      setIsProcessingGroupAction(false)
      return
    }
    setGroupConfirmation(null)
    setIsProcessingGroupAction(false)
    setMessage('You left the group.')
    await loadGroups()
  }

  return (
    <section>
      {message ? <p className="mb-5 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm text-cyan-100">{message}</p> : null}

      <div className="grid min-h-[32rem] overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] shadow-2xl shadow-cyan-950/30 lg:grid-cols-[18rem_1fr]">
        <aside className="border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 px-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Your groups</h2>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setShowJoinGroup(true)} className="rounded-md border border-white/15 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200">Join group</button>
              <button type="button" onClick={() => setShowCreateGroup(true)} aria-label="Create group" title="Create group" className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-300 text-lg font-bold leading-none text-slate-950 transition hover:bg-cyan-200">+</button>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {isLoading ? <p className="px-2 text-sm text-slate-400">Loading groups…</p> : null}
            {!isLoading && groups.length === 0 ? <div className="rounded-lg border border-dashed border-white/15 p-4 text-sm text-slate-300"><p className="font-semibold text-white">No groups yet</p><p className="mt-2">Create one or open an invite link to begin.</p></div> : null}
            {groups.map((group) => (
              <div key={group.id} className={`flex min-w-0 items-stretch rounded-lg border transition ${selectedGroupId === group.id ? 'border-cyan-300/50 bg-cyan-300/10' : 'border-transparent hover:bg-white/[0.05]'}`}>
                <button type="button" onClick={() => { setSelectedGroupId(group.id); setActiveGroupView('tasks') }} className="min-w-0 flex-1 p-3 text-left">
                  <span className="block truncate font-semibold text-white" title={group.name}>{group.name}</span>
                  <span className="mt-1 block text-xs text-slate-400">{group.member_count} member{group.member_count === 1 ? '' : 's'}</span>
                </button>
                <button type="button" onClick={() => { setSelectedGroupId(group.id); setActiveGroupView('members') }} aria-label={`View members of ${group.name}`} title="View group members" className={`m-2 ml-0 flex w-9 shrink-0 items-center justify-center rounded-md border transition ${selectedGroupId === group.id && activeGroupView === 'members' ? 'border-cyan-300 bg-cyan-300 text-slate-950' : 'border-white/15 text-slate-300 hover:border-cyan-300 hover:text-cyan-200'}`}>
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                </button>
              </div>
            ))}
          </div>
        </aside>

        <div className="p-5 md:p-7">
          {selectedGroup ? <>
            <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="text-2xl font-bold">{selectedGroup.name}</h2>{selectedGroup.role === 'owner' ? <button type="button" onClick={openRenameGroup} aria-label="Rename group" title="Rename group" className="rounded-md border border-white/15 px-2 py-1 text-sm font-semibold text-cyan-100 transition hover:border-cyan-300 hover:text-cyan-200">&#9998;</button> : null}<span className="rounded-full border border-white/15 px-2 py-1 text-xs capitalize text-slate-300">{selectedGroup.role}</span></div><p className="mt-2 text-sm text-slate-300">{selectedGroup.description || 'A shared place for your team’s tasks.'}</p></div><div className="flex flex-wrap gap-2"><button onClick={copyInviteCode} className="rounded-md border border-cyan-300/40 px-3 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-200">Copy invite code</button>{selectedGroup.role === 'owner' ? <><button onClick={rotateInvite} className="rounded-md border border-white/15 px-3 py-2 text-sm text-slate-300 hover:text-white">Reset code</button><button onClick={() => { setMessage(''); setGroupConfirmation('delete') }} className="rounded-md border border-rose-300/50 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-200 hover:bg-rose-300 hover:text-rose-950">Delete group</button></> : <button onClick={() => { setMessage(''); setGroupConfirmation('leave') }} className="rounded-md border border-rose-300/50 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-200 hover:bg-rose-300 hover:text-rose-950 hover:shadow-lg hover:shadow-rose-500/20">Leave</button>}</div></div>
            <div className="mt-6 flex gap-2 border-b border-white/10 pb-3">
              <button type="button" onClick={() => setActiveGroupView('tasks')} className={`rounded-md px-4 py-2 text-sm font-semibold transition ${activeGroupView === 'tasks' ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}>Tasks</button>
              <button type="button" onClick={() => setActiveGroupView('chat')} className={`rounded-md px-4 py-2 text-sm font-semibold transition ${activeGroupView === 'chat' ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}>Chat</button>
              <button type="button" onClick={() => setActiveGroupView('members')} className={`rounded-md px-4 py-2 text-sm font-semibold transition ${activeGroupView === 'members' ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}>Members</button>
            </div>

            {activeGroupView === 'tasks' ? <>
              <div className="mt-5 flex items-center justify-between"><h3 className="text-lg font-semibold">Group tasks</h3><button onClick={openCreateTask} className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300">Add task</button></div>
              <label className="mt-4 block"><span className="sr-only">Search group tasks by title</span><input type="search" value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} placeholder="Search task titles" className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/30" /></label>
              <div className="mt-4 max-h-[25rem] space-y-3 overflow-y-auto pr-1">
                {tasks.length === 0 ? <div className="rounded-lg border border-dashed border-white/15 p-6 text-center"><p className="font-semibold">No shared tasks yet</p><p className="mt-2 text-sm text-slate-300">Add the group’s first task and assign checklist steps.</p></div> : null}
                {tasks.length > 0 && visibleTasks.length === 0 ? <div className="rounded-lg border border-dashed border-white/15 p-6 text-center"><p className="font-semibold">No matching tasks</p><p className="mt-2 text-sm text-slate-300">Try a different task title.</p></div> : null}
                {visibleTasks.map((task) => <button type="button" key={task.id} onClick={() => setSelectedTask(task)} className={`w-full rounded-lg bg-slate-900/70 p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-300 ${task.is_urgent ? 'border border-amber-300/70 hover:border-amber-200' : 'border border-white/10 hover:border-cyan-300/70'}`}><div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3"><div className="min-w-0"><h4 className="truncate font-semibold text-white" title={task.title}>{task.title}</h4>{task.is_urgent ? <span className="mt-2 inline-flex rounded-full border border-amber-300/50 bg-amber-300/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-100">Urgent</span> : null}<p className="mt-1 line-clamp-2 text-sm text-slate-300">{task.description || 'No description added.'}</p></div><span className="shrink-0 rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold text-slate-950">{task.points} pts</span></div><div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-300"><span>{task.status}</span><span>{task.group_task_steps.length ? `${task.group_task_steps.filter((step) => step.is_completed).length}/${task.group_task_steps.length} steps` : 'No steps'}</span>{task.status !== 'Completed' ? <TaskDueIndicator dueDate={task.due_date} /> : null}<span>Created by {memberName(task.created_by)}</span></div></button>)}
              </div>
            </> : activeGroupView === 'chat' ? <GroupChatView messages={messages} messageDraft={messageDraft} isSending={isSendingMessage} currentUserId={currentUserId} memberName={(userId) => memberName(userId)} memberNameClass={memberNameClass} onDraftChange={setMessageDraft} onSubmit={handleSendMessage} onEditMessage={handleEditMessage} onDeleteMessage={handleDeleteMessage} /> : <GroupMembersView members={members} nameClass={memberNameClass} />}
          </> : <div className="flex h-full min-h-80 items-center justify-center text-center"><div><h2 className="text-xl font-semibold">Your shared work starts here</h2><p className="mt-2 text-sm text-slate-300">Create a group, then invite teammates with one link.</p></div></div>}
        </div>
      </div>

      {selectedTask && selectedGroup ? <GroupTaskDetailsModal task={selectedTask} group={selectedGroup} members={members} currentUserId={currentUserId} actionMessage={taskActionMessage} onClose={() => { setSelectedTask(null); setTaskActionMessage('') }} onEdit={() => openEditTask(selectedTask)} onToggleStep={(stepId, isCompleted) => void handleToggleStep(stepId, isCompleted)} onDelete={handleDeleteSelectedTask} onToggleStatus={() => void handleToggleSelectedTaskStatus()} /> : null}

      {groupConfirmation && selectedGroup ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="group-confirmation-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isProcessingGroupAction) {
              setGroupConfirmation(null)
              setMessage('')
            }
          }}
        >
          <section className="w-full max-w-lg rounded-xl border border-rose-300/25 bg-slate-950 p-6 shadow-2xl shadow-rose-950/50">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-rose-300/30 bg-rose-300/10 text-rose-200">
                <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.8 2.4 17.5A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.5L13.7 3.8a2 2 0 0 0-3.4 0Z" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-rose-200">
                  {groupConfirmation === 'delete' ? 'Permanent action' : 'Confirm departure'}
                </p>
                <h2 id="group-confirmation-title" className="mt-2 break-words text-2xl font-bold">
                  {groupConfirmation === 'delete'
                    ? `Delete “${selectedGroup.name}”?`
                    : `Leave “${selectedGroup.name}”?`}
                </h2>
              </div>
            </div>

            {groupConfirmation === 'delete' ? (
              <div className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
                <p>
                  This will permanently delete the group for all {selectedGroup.member_count} member{selectedGroup.member_count === 1 ? '' : 's'}.
                </p>
                <p className="rounded-md border border-rose-300/25 bg-rose-300/10 px-4 py-3 font-semibold text-rose-100">
                  All shared tasks, checklist progress, member access, and chat history will be removed. This cannot be undone.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
                <p>
                  You will lose access to this group’s tasks, members, and chat history. The group and its content will remain available to everyone else.
                </p>
                <p className="rounded-md border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-amber-100">
                  You will need a valid invite code if you want to join this group again.
                </p>
              </div>
            )}

            {message ? (
              <p className="mt-4 rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                {message}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isProcessingGroupAction}
                onClick={() => { setGroupConfirmation(null); setMessage('') }}
                className="rounded-md border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-300 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessingGroupAction}
                onClick={() => void (groupConfirmation === 'delete' ? handleDeleteGroup() : handleLeave())}
                className="rounded-md bg-rose-300 px-4 py-2 text-sm font-bold text-rose-950 transition hover:bg-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isProcessingGroupAction
                  ? groupConfirmation === 'delete' ? 'Deleting group...' : 'Leaving group...'
                  : groupConfirmation === 'delete' ? 'Permanently delete group' : 'Leave group'}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {showCreateGroup ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"><form onSubmit={handleCreateGroup} className="w-full max-w-lg rounded-xl border border-white/10 bg-slate-950 p-6"><h2 className="text-2xl font-bold">Create a group</h2><label className="mt-5 block text-sm">Name<input required maxLength={80} value={groupName} onChange={(e) => setGroupName(e.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3" /></label><label className="mt-4 block text-sm">Description<textarea maxLength={500} value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} className="mt-2 min-h-24 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowCreateGroup(false)} className="rounded-md border border-white/15 px-4 py-2 font-semibold transition hover:border-cyan-300 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300">Cancel</button><button className="rounded-md bg-cyan-300 px-4 py-2 font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950">Create</button></div></form></div> : null}
      {showRenameGroup ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"><form onSubmit={handleRenameGroup} className="w-full max-w-md rounded-xl border border-white/10 bg-slate-950 p-6"><h2 className="text-2xl font-bold">Edit group details</h2><p className="mt-2 text-sm text-slate-300">Update the name and description everyone sees for this group.</p><label className="mt-5 block text-sm">Group name<input required autoFocus maxLength={80} value={renameGroupName} onChange={(e) => setRenameGroupName(e.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3" /></label><label className="mt-4 block text-sm">Description<textarea maxLength={500} value={renameGroupDescription} onChange={(e) => setRenameGroupDescription(e.target.value)} className="mt-2 min-h-24 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setShowRenameGroup(false); setRenameGroupName(''); setRenameGroupDescription('') }} className="rounded-md border border-white/15 px-4 py-2">Cancel</button><button className="rounded-md bg-cyan-300 px-4 py-2 font-bold text-slate-950">Save details</button></div></form></div> : null}
      {showJoinGroup ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"><form onSubmit={handleJoinGroup} className="w-full max-w-md rounded-xl border border-white/10 bg-slate-950 p-6"><h2 className="text-2xl font-bold">Join a group</h2><p className="mt-2 text-sm text-slate-300">Enter the invite code shared by the group owner.</p><label className="mt-5 block text-sm">Invite code<input required autoFocus autoCapitalize="characters" maxLength={20} value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="Enter code" className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 font-mono uppercase tracking-widest" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setShowJoinGroup(false); setInviteCode('') }} className="rounded-md border border-white/15 px-4 py-2 font-semibold transition hover:border-cyan-300 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300">Cancel</button><button className="rounded-md bg-cyan-300 px-4 py-2 font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-950">Join</button></div></form></div> : null}
      {showCreateTask ? <GroupTaskFormModal isEditing={Boolean(editingTask)} title={taskTitle} description={taskDescription} points={taskPoints} isUrgent={taskUrgent} dueDate={taskDueDate} steps={taskSteps} members={members} onTitleChange={setTaskTitle} onDescriptionChange={setTaskDescription} onPointsChange={setTaskPoints} onUrgencyChange={setTaskUrgent} onDueDateChange={setTaskDueDate} onStepsChange={setTaskSteps} onClose={closeTaskForm} onSubmit={handleCreateTask} /> : null}
    </section>
  )
}


