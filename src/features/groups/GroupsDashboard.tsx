import { useCallback, useEffect, useState, type FormEvent } from 'react'
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
  updateGroupTask,
  updateGroupTaskStatus,
  updateGroupTaskStepCompletion,
  updateGroupMessage,
  type Group,
  type GroupMember,
  type GroupMessage,
  type GroupTask,
} from './groupService'
import { GroupTaskFormModal } from './GroupTaskFormModal'
import { GroupChatView } from './GroupChatView'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

export function GroupsDashboard() {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [tasks, setTasks] = useState<GroupTask[]>([])
  const [members, setMembers] = useState<GroupMember[]>([])
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [activeGroupView, setActiveGroupView] = useState<'tasks' | 'chat'>('tasks')
  const [messageDraft, setMessageDraft] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [selectedTask, setSelectedTask] = useState<GroupTask | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showJoinGroup, setShowJoinGroup] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [editingTask, setEditingTask] = useState<GroupTask | null>(null)
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskPoints, setTaskPoints] = useState('10')
  const [taskUrgent, setTaskUrgent] = useState(false)
  const [taskSteps, setTaskSteps] = useState([{ title: '', assignedTo: '' }])

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null
  const memberName = (userId: string | null) =>
    members.find((member) => member.user_id === userId)?.display_name ?? (userId ? 'Group member' : 'Unassigned')
  const memberNameClass = (userId: string) => {
    switch (members.find((member) => member.user_id === userId)?.selected_name_color) {
      case 'name-gold': return 'text-amber-200'
      case 'name-cyan': return 'text-cyan-200'
      case 'name-rose': return 'text-rose-200'
      default: return 'text-white'
    }
  }

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
    const points = Math.max(0, Number(taskPoints) || 0)
    const response = editingTask
      ? await updateGroupTask(editingTask, taskTitle, taskDescription, points, taskUrgent, taskSteps)
      : await createGroupTask(selectedGroup.id, taskTitle, taskDescription, points, taskUrgent, taskSteps)
    if (response.error) return setMessage(errorMessage(response.error))
    setTaskTitle(''); setTaskDescription(''); setTaskPoints('10'); setTaskUrgent(false); setTaskSteps([{ title: '', assignedTo: '' }]); setShowCreateTask(false); setEditingTask(null); setSelectedTask(null)
    await loadTasks(selectedGroup.id)
  }

  function openCreateTask() {
    setEditingTask(null)
    setTaskTitle('')
    setTaskDescription('')
    setTaskPoints('10')
    setTaskUrgent(false)
    setTaskSteps([{ title: '', assignedTo: '' }])
    setShowCreateTask(true)
  }

  function openEditTask(task: GroupTask) {
    setEditingTask(task)
    setTaskTitle(task.title)
    setTaskDescription(task.description ?? '')
    setTaskPoints(String(task.points))
    setTaskUrgent(task.is_urgent)
    setTaskSteps(task.group_task_steps.length
      ? task.group_task_steps.map((step) => ({ title: step.title, assignedTo: step.assigned_to ?? '' }))
      : [{ title: '', assignedTo: '' }])
    setSelectedTask(null)
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
    if (!selectedGroup || !window.confirm(`Permanently delete ${selectedGroup.name}? This will remove its tasks and chat history for every member.`)) return
    const response = await deleteGroup(selectedGroup.id)
    if (response.error) return setMessage(errorMessage(response.error))
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

  async function handleLeave() {
    if (!selectedGroup || !window.confirm(`Leave ${selectedGroup.name}?`)) return
    const response = await leaveGroup(selectedGroup.id)
    if (response.error) return setMessage(errorMessage(response.error))
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
            {groups.map((group) => <button key={group.id} onClick={() => setSelectedGroupId(group.id)} className={`w-full rounded-lg border p-3 text-left transition ${selectedGroupId === group.id ? 'border-cyan-300/50 bg-cyan-300/10' : 'border-transparent hover:bg-white/[0.05]'}`}><span className="block font-semibold text-white">{group.name}</span><span className="mt-1 block text-xs text-slate-400">{group.member_count} member{group.member_count === 1 ? '' : 's'}</span></button>)}
          </div>
        </aside>

        <div className="p-5 md:p-7">
          {selectedGroup ? <>
            <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="text-2xl font-bold">{selectedGroup.name}</h2><span className="rounded-full border border-white/15 px-2 py-1 text-xs capitalize text-slate-300">{selectedGroup.role}</span></div><p className="mt-2 text-sm text-slate-300">{selectedGroup.description || 'A shared place for your team’s tasks.'}</p></div><div className="flex flex-wrap gap-2"><button onClick={copyInviteCode} className="rounded-md border border-cyan-300/40 px-3 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-200">Copy invite code</button>{selectedGroup.role === 'owner' ? <><button onClick={rotateInvite} className="rounded-md border border-white/15 px-3 py-2 text-sm text-slate-300 hover:text-white">Reset code</button><button onClick={handleDeleteGroup} className="rounded-md border border-rose-300/50 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-200 hover:bg-rose-300 hover:text-rose-950">Delete group</button></> : <button onClick={handleLeave} className="rounded-md border border-rose-300/50 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-200 hover:bg-rose-300 hover:text-rose-950 hover:shadow-lg hover:shadow-rose-500/20">Leave</button>}</div></div>
            <div className="mt-6 flex gap-2 border-b border-white/10 pb-3">
              <button type="button" onClick={() => setActiveGroupView('tasks')} className={`rounded-md px-4 py-2 text-sm font-semibold transition ${activeGroupView === 'tasks' ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}>Tasks</button>
              <button type="button" onClick={() => setActiveGroupView('chat')} className={`rounded-md px-4 py-2 text-sm font-semibold transition ${activeGroupView === 'chat' ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'}`}>Chat</button>
            </div>

            {activeGroupView === 'tasks' ? <>
              <div className="mt-5 flex items-center justify-between"><h3 className="text-lg font-semibold">Group tasks</h3><button onClick={openCreateTask} className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300">Add task</button></div>
              <div className="mt-4 max-h-[25rem] space-y-3 overflow-y-auto pr-1">
                {tasks.length === 0 ? <div className="rounded-lg border border-dashed border-white/15 p-6 text-center"><p className="font-semibold">No shared tasks yet</p><p className="mt-2 text-sm text-slate-300">Add the group’s first task and assign checklist steps.</p></div> : null}
                {tasks.map((task) => <button type="button" key={task.id} onClick={() => setSelectedTask(task)} className={`w-full rounded-lg bg-slate-900/70 p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-300 ${task.is_urgent ? 'border border-amber-300/70 hover:border-amber-200' : 'border border-white/10 hover:border-cyan-300/70'}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><h4 className="font-semibold text-white">{task.title}</h4>{task.is_urgent ? <span className="mt-2 inline-flex rounded-full border border-amber-300/50 bg-amber-300/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-amber-100">Urgent</span> : null}<p className="mt-1 line-clamp-2 text-sm text-slate-300">{task.description || 'No description added.'}</p></div><span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold text-slate-950">{task.points} pts</span></div><div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-300"><span>{task.status}</span><span>{task.group_task_steps.length ? `${task.group_task_steps.filter((step) => step.is_completed).length}/${task.group_task_steps.length} steps` : 'No steps'}</span></div></button>)}
              </div>
            </> : <GroupChatView messages={messages} messageDraft={messageDraft} isSending={isSendingMessage} currentUserId={currentUserId} memberName={(userId) => memberName(userId)} memberNameClass={memberNameClass} onDraftChange={setMessageDraft} onSubmit={handleSendMessage} onEditMessage={handleEditMessage} onDeleteMessage={handleDeleteMessage} />}
          </> : <div className="flex h-full min-h-80 items-center justify-center text-center"><div><h2 className="text-xl font-semibold">Your shared work starts here</h2><p className="mt-2 text-sm text-slate-300">Create a group, then invite teammates with one link.</p></div></div>}
        </div>
      </div>

      {selectedTask ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="group-task-title"><section className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border border-white/10 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/60"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Group task</p><h2 id="group-task-title" className="mt-2 text-2xl font-bold">{selectedTask.title}</h2></div><div className="flex gap-2"><button type="button" onClick={() => openEditTask(selectedTask)} className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950">Edit</button><button type="button" onClick={() => setSelectedTask(null)} className="rounded-md border border-white/15 px-3 py-2 text-sm font-semibold hover:border-cyan-300 hover:text-cyan-200">Close</button></div></div><div className="mt-5 flex flex-wrap gap-3"><span className="rounded-full bg-cyan-300 px-3 py-1 text-xs font-bold text-slate-950">{selectedTask.points} points</span><span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200">{selectedTask.status}</span>{selectedTask.is_urgent ? <span className="rounded-full border border-amber-300/50 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-100">Urgent</span> : null}</div><p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-200">{selectedTask.description || 'No description added.'}</p><div className="mt-6"><h3 className="text-lg font-semibold">Checklist</h3><div className="mt-3 space-y-2">{selectedTask.group_task_steps.length === 0 ? <p className="rounded-md border border-dashed border-white/15 p-4 text-sm text-slate-300">This task has no checklist steps.</p> : null}{selectedTask.group_task_steps.map((step) => <label key={step.id} className="flex items-start justify-between gap-4 rounded-md border border-white/10 bg-white/[0.04] p-3"><span className="flex items-start gap-3"><input type="checkbox" checked={step.is_completed} disabled={selectedTask.status === 'Completed'} onChange={(event) => void handleToggleStep(step.id, event.target.checked)} className="mt-1 h-4 w-4 accent-cyan-300" /><span className={`text-sm ${step.is_completed ? 'text-slate-400 line-through' : 'text-slate-100'}`}>{step.title}</span></span><span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-xs text-slate-300">{memberName(step.assigned_to)}</span></label>)}</div></div><div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={async () => { if (!selectedGroup || !window.confirm('Delete this group task?')) return; const response = await deleteGroupTask(selectedTask.id); if (response.error) return setMessage(errorMessage(response.error)); setSelectedTask(null); await loadTasks(selectedGroup.id) }} className="rounded-md border border-rose-300/50 px-4 py-2 text-sm font-semibold text-rose-100">Delete task</button><button type="button" onClick={async () => { if (!selectedGroup) return; const nextStatus = selectedTask.status === 'Completed' ? 'In Progress' : 'Completed'; const response = await updateGroupTaskStatus(selectedTask.id, nextStatus); if (response.error) return setMessage(errorMessage(response.error)); setSelectedTask((current) => current ? { ...current, status: nextStatus } : null); await loadTasks(selectedGroup.id) }} className="rounded-md bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-950">{selectedTask.status === 'Completed' ? 'Return to in progress' : 'Complete task'}</button></div></section></div> : null}

      {showCreateGroup ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"><form onSubmit={handleCreateGroup} className="w-full max-w-lg rounded-xl border border-white/10 bg-slate-950 p-6"><h2 className="text-2xl font-bold">Create a group</h2><label className="mt-5 block text-sm">Name<input required maxLength={80} value={groupName} onChange={(e) => setGroupName(e.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3" /></label><label className="mt-4 block text-sm">Description<textarea maxLength={500} value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} className="mt-2 min-h-24 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowCreateGroup(false)} className="rounded-md border border-white/15 px-4 py-2">Cancel</button><button className="rounded-md bg-cyan-300 px-4 py-2 font-bold text-slate-950">Create</button></div></form></div> : null}
      {showJoinGroup ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"><form onSubmit={handleJoinGroup} className="w-full max-w-md rounded-xl border border-white/10 bg-slate-950 p-6"><h2 className="text-2xl font-bold">Join a group</h2><p className="mt-2 text-sm text-slate-300">Enter the invite code shared by the group owner.</p><label className="mt-5 block text-sm">Invite code<input required autoFocus autoCapitalize="characters" maxLength={20} value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="Enter code" className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 font-mono uppercase tracking-widest" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setShowJoinGroup(false); setInviteCode('') }} className="rounded-md border border-white/15 px-4 py-2">Cancel</button><button className="rounded-md bg-cyan-300 px-4 py-2 font-bold text-slate-950">Join</button></div></form></div> : null}
      {showCreateTask ? <GroupTaskFormModal isEditing={Boolean(editingTask)} title={taskTitle} description={taskDescription} points={taskPoints} isUrgent={taskUrgent} steps={taskSteps} members={members} onTitleChange={setTaskTitle} onDescriptionChange={setTaskDescription} onPointsChange={setTaskPoints} onUrgencyChange={setTaskUrgent} onStepsChange={setTaskSteps} onClose={closeTaskForm} onSubmit={handleCreateTask} /> : null}
    </section>
  )
}
