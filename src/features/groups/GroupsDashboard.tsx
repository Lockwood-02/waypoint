import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  createGroup,
  createGroupTask,
  deleteGroupTask,
  getGroups,
  getGroupTasks,
  joinGroup,
  leaveGroup,
  rotateGroupInvite,
  updateGroupTaskStatus,
  type Group,
  type GroupTask,
} from './groupService'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

export function GroupsDashboard() {
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [tasks, setTasks] = useState<GroupTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showJoinGroup, setShowJoinGroup] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskPoints, setTaskPoints] = useState('10')
  const [taskUrgent, setTaskUrgent] = useState(false)

  const selectedGroup = groups.find((group) => group.id === selectedGroupId) ?? null

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

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadGroups() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadGroups])
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (selectedGroupId) void loadTasks(selectedGroupId)
      else setTasks([])
    }, 0)
    return () => window.clearTimeout(timer)
  }, [selectedGroupId, loadTasks])

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
    const response = await createGroupTask(selectedGroup.id, taskTitle, taskDescription, Math.max(0, Number(taskPoints) || 0), taskUrgent)
    if (response.error) return setMessage(errorMessage(response.error))
    setTaskTitle(''); setTaskDescription(''); setTaskPoints('10'); setTaskUrgent(false); setShowCreateTask(false)
    await loadTasks(selectedGroup.id)
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
            <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h2 className="text-2xl font-bold">{selectedGroup.name}</h2><span className="rounded-full border border-white/15 px-2 py-1 text-xs capitalize text-slate-300">{selectedGroup.role}</span></div><p className="mt-2 text-sm text-slate-300">{selectedGroup.description || 'A shared place for your team’s tasks.'}</p></div><div className="flex flex-wrap gap-2"><button onClick={copyInviteCode} className="rounded-md border border-cyan-300/40 px-3 py-2 text-sm font-semibold text-cyan-100 hover:border-cyan-200">Copy invite code</button>{selectedGroup.role === 'owner' ? <button onClick={rotateInvite} className="rounded-md border border-white/15 px-3 py-2 text-sm text-slate-300 hover:text-white">Reset code</button> : <button onClick={handleLeave} className="rounded-md border border-rose-300/40 px-3 py-2 text-sm text-rose-100">Leave</button>}</div></div>
            <div className="mt-7 flex items-center justify-between"><h3 className="text-lg font-semibold">Group tasks</h3><button onClick={() => setShowCreateTask(true)} className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950">Add task</button></div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {tasks.length === 0 ? <p className="col-span-full rounded-lg border border-dashed border-white/15 p-6 text-center text-sm text-slate-300">No shared tasks yet. Add the group’s first task.</p> : null}
              {tasks.map((task) => <article key={task.id} className="rounded-lg border border-white/10 bg-slate-950/50 p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="font-semibold text-white">{task.title}</h4><p className="mt-2 line-clamp-2 text-sm text-slate-300">{task.description || 'No description.'}</p></div>{task.is_urgent ? <span className="rounded-full bg-amber-300/10 px-2 py-1 text-xs font-bold text-amber-100">Urgent</span> : null}</div><div className="mt-4 flex items-center justify-between"><span className="text-xs text-slate-400">{task.points} points · {task.status}</span><div className="flex gap-2">{task.status !== 'Completed' ? <button onClick={async () => { await updateGroupTaskStatus(task.id, 'Completed'); await loadTasks(selectedGroup.id) }} className="text-xs font-semibold text-cyan-200">Complete</button> : <button onClick={async () => { await updateGroupTaskStatus(task.id, 'In Progress'); await loadTasks(selectedGroup.id) }} className="text-xs font-semibold text-cyan-200">Reopen</button>}<button onClick={async () => { if (window.confirm('Delete this group task?')) { await deleteGroupTask(task.id); await loadTasks(selectedGroup.id) } }} className="text-xs text-rose-200">Delete</button></div></div></article>)}
            </div>
          </> : <div className="flex h-full min-h-80 items-center justify-center text-center"><div><h2 className="text-xl font-semibold">Your shared work starts here</h2><p className="mt-2 text-sm text-slate-300">Create a group, then invite teammates with one link.</p></div></div>}
        </div>
      </div>

      {showCreateGroup ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"><form onSubmit={handleCreateGroup} className="w-full max-w-lg rounded-xl border border-white/10 bg-slate-950 p-6"><h2 className="text-2xl font-bold">Create a group</h2><label className="mt-5 block text-sm">Name<input required maxLength={80} value={groupName} onChange={(e) => setGroupName(e.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3" /></label><label className="mt-4 block text-sm">Description<textarea maxLength={500} value={groupDescription} onChange={(e) => setGroupDescription(e.target.value)} className="mt-2 min-h-24 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowCreateGroup(false)} className="rounded-md border border-white/15 px-4 py-2">Cancel</button><button className="rounded-md bg-cyan-300 px-4 py-2 font-bold text-slate-950">Create</button></div></form></div> : null}
      {showJoinGroup ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"><form onSubmit={handleJoinGroup} className="w-full max-w-md rounded-xl border border-white/10 bg-slate-950 p-6"><h2 className="text-2xl font-bold">Join a group</h2><p className="mt-2 text-sm text-slate-300">Enter the invite code shared by the group owner.</p><label className="mt-5 block text-sm">Invite code<input required autoFocus autoCapitalize="characters" maxLength={20} value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="Enter code" className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 font-mono uppercase tracking-widest" /></label><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setShowJoinGroup(false); setInviteCode('') }} className="rounded-md border border-white/15 px-4 py-2">Cancel</button><button className="rounded-md bg-cyan-300 px-4 py-2 font-bold text-slate-950">Join</button></div></form></div> : null}
      {showCreateTask ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"><form onSubmit={handleCreateTask} className="w-full max-w-lg rounded-xl border border-white/10 bg-slate-950 p-6"><h2 className="text-2xl font-bold">Add group task</h2><label className="mt-5 block text-sm">Title<input required maxLength={160} value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3" /></label><label className="mt-4 block text-sm">Description<textarea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} className="mt-2 min-h-24 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3" /></label><div className="mt-4 grid grid-cols-2 gap-4"><label className="text-sm">Points<input type="number" min="0" value={taskPoints} onChange={(e) => setTaskPoints(e.target.value)} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3" /></label><label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" checked={taskUrgent} onChange={(e) => setTaskUrgent(e.target.checked)} /> Urgent</label></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowCreateTask(false)} className="rounded-md border border-white/15 px-4 py-2">Cancel</button><button className="rounded-md bg-cyan-300 px-4 py-2 font-bold text-slate-950">Add task</button></div></form></div> : null}
    </section>
  )
}
