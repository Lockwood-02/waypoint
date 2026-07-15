import { supabase } from '../../lib/supabaseClient'
import type { TaskStatus } from '../tasks/taskService'

export type GroupRole = 'owner' | 'member'

export type Group = {
  id: string
  name: string
  description: string | null
  owner_id: string
  invite_code: string
  created_at: string
  updated_at: string
  member_count: number
  role: GroupRole
}

export type GroupTask = {
  id: string
  group_id: string
  created_by: string
  title: string
  description: string | null
  status: TaskStatus
  points: number
  is_urgent: boolean
  created_at: string
  updated_at: string
  group_task_steps: GroupTaskStep[]
}

export type GroupMember = {
  user_id: string
  display_name: string
  role: GroupRole
}

export type GroupTaskStep = {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  position: number
  assigned_to: string | null
  created_at: string
}

export type CreateGroupTaskStepInput = {
  title: string
  assignedTo: string
}

export async function getGroups() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { data: null, error: userError ?? new Error('Not logged in') }
  }

  const response = await supabase
    .from('group_members')
    .select('role, groups(*, group_members(count))')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })

  if (response.error || !response.data) return { data: null, error: response.error }

  const groupsById = new Map<string, Group>()

  response.data.forEach((row) => {
    const value = row.groups as unknown as (Omit<Group, 'role' | 'member_count'> & {
      group_members?: { count: number }[]
    }) | null
    if (!value) return
    groupsById.set(value.id, {
      ...value,
      role: row.role as GroupRole,
      member_count: value.group_members?.[0]?.count ?? 0,
    })
  })

  return { data: [...groupsById.values()], error: null }
}

export async function createGroup(name: string, description: string) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { data: null, error: userError ?? new Error('Not logged in') }

  return supabase.rpc('create_group', {
    group_name: name.trim(),
    group_description: description.trim() || null,
  })
}

export async function joinGroup(inviteCode: string) {
  return supabase.rpc('join_group_by_invite', { supplied_code: inviteCode.trim().toUpperCase() })
}

export async function rotateGroupInvite(groupId: string) {
  return supabase.rpc('rotate_group_invite', { target_group_id: groupId })
}

export async function leaveGroup(groupId: string) {
  return supabase.from('group_members').delete().eq('group_id', groupId)
}

export async function getGroupTasks(groupId: string) {
  const response = await supabase
    .from('group_tasks')
    .select('*, group_task_steps(*)')
    .eq('group_id', groupId)
    .order('is_urgent', { ascending: false })
    .order('created_at', { ascending: false })
  const tasks = response.data?.map((task) => ({
    ...task,
    group_task_steps: [...(task.group_task_steps ?? [])].sort(
      (first, second) => first.position - second.position,
    ),
  })) as GroupTask[] | undefined
  return { ...response, data: tasks ?? null }
}

export async function getGroupMembers(groupId: string) {
  const response = await supabase.rpc('get_group_members', {
    target_group_id: groupId,
  })
  return { ...response, data: response.data as GroupMember[] | null }
}

export async function createGroupTask(groupId: string, title: string, description: string, points: number, isUrgent: boolean, steps: CreateGroupTaskStepInput[]) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { data: null, error: userError ?? new Error('Not logged in') }
  const taskResponse = await supabase.from('group_tasks').insert({
    group_id: groupId,
    created_by: user.id,
    title: title.trim(),
    description: description.trim(),
    points,
    is_urgent: isUrgent,
  }).select().single()

  if (taskResponse.error || !taskResponse.data) return taskResponse

  const stepRows = steps
    .map((step) => ({ ...step, title: step.title.trim() }))
    .filter((step) => step.title)
    .map((step, position) => ({
      task_id: taskResponse.data.id,
      title: step.title,
      position,
      assigned_to: step.assignedTo || null,
    }))

  if (stepRows.length) {
    const stepsResponse = await supabase.from('group_task_steps').insert(stepRows)
    if (stepsResponse.error) {
      await deleteGroupTask(taskResponse.data.id)
      return { data: null, error: stepsResponse.error }
    }
  }

  return { data: taskResponse.data, error: null }
}

export async function updateGroupTask(task: GroupTask, title: string, description: string, points: number, isUrgent: boolean, steps: CreateGroupTaskStepInput[]) {
  const taskResponse = await supabase.from('group_tasks').update({
    title: title.trim(),
    description: description.trim(),
    points,
    is_urgent: isUrgent,
    updated_at: new Date().toISOString(),
  }).eq('id', task.id).select().single()

  if (taskResponse.error) return { data: null, error: taskResponse.error }

  const deleteResponse = await supabase
    .from('group_task_steps')
    .delete()
    .eq('task_id', task.id)

  if (deleteResponse.error) return { data: null, error: deleteResponse.error }

  const stepRows = steps
    .map((step) => ({ ...step, title: step.title.trim() }))
    .filter((step) => step.title)
    .map((step, position) => {
      const existingStep = task.group_task_steps[position]?.title === step.title
        ? task.group_task_steps[position]
        : task.group_task_steps.find((item) => item.title === step.title)

      return {
        task_id: task.id,
        title: step.title,
        position,
        assigned_to: step.assignedTo || null,
        is_completed: existingStep?.is_completed ?? false,
      }
    })

  if (stepRows.length) {
    const stepsResponse = await supabase.from('group_task_steps').insert(stepRows)
    if (stepsResponse.error) return { data: null, error: stepsResponse.error }
  }

  return { data: taskResponse.data, error: null }
}

export async function updateGroupTaskStepCompletion(stepId: string, isCompleted: boolean) {
  return supabase.from('group_task_steps').update({ is_completed: isCompleted }).eq('id', stepId).select().single()
}

export async function updateGroupTaskStatus(taskId: string, status: TaskStatus) {
  return supabase.from('group_tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', taskId).select().single()
}

export async function deleteGroupTask(taskId: string) {
  return supabase.from('group_tasks').delete().eq('id', taskId)
}
