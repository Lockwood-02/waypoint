import { clampTaskPoints } from '../../lib/pointEconomy'
import { INPUT_LIMITS } from '../../lib/inputLimits'
import { validateDueDate } from '../../lib/dueDateLimits'
import { supabase } from '../../lib/supabaseClient'
import type { TaskStatus } from '../tasks/taskService'

export type GroupRole = 'owner' | 'member'
export type GroupType = 'standard' | 'business'

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
  group_type: GroupType
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
  due_date: string | null
  created_at: string
  updated_at: string
  group_task_steps: GroupTaskStep[]
}

export type GroupMember = {
  user_id: string
  display_name: string
  role: GroupRole
  selected_name_color: string | null
  avatar_url: string | null
  selected_avatar_frame: string | null
}

export type GroupTaskStep = {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  position: number
  assigned_to: string | null
  completed_by?: string | null
  completed_at?: string | null
  created_at: string
}

export type CreateGroupTaskStepInput = {
  title: string
  assignedTo: string
}

export type GroupMessage = {
  id: string
  group_id: string
  user_id: string
  body: string
  created_at: string
  updated_at: string
}

function validateGroupDetails(name: string, description: string) {
  if (!name.trim()) return new Error('Group name is required.')
  if (name.trim().length > INPUT_LIMITS.groupName) return new Error(`Group names are limited to ${INPUT_LIMITS.groupName} characters.`)
  if (description.length > INPUT_LIMITS.groupDescription) return new Error(`Group descriptions are limited to ${INPUT_LIMITS.groupDescription} characters.`)
  return null
}

function validateGroupTaskInput(title: string, description: string, dueDate: string, steps: CreateGroupTaskStepInput[]) {
  if (!title.trim()) return new Error('Group task title is required.')
  if (title.trim().length > INPUT_LIMITS.groupTaskTitle) return new Error(`Group task titles are limited to ${INPUT_LIMITS.groupTaskTitle} characters.`)
  if (description.length > INPUT_LIMITS.groupTaskDescription) return new Error(`Group task descriptions are limited to ${INPUT_LIMITS.groupTaskDescription} characters.`)
  if (steps.length > INPUT_LIMITS.groupTaskStepCount) return new Error(`Group tasks are limited to ${INPUT_LIMITS.groupTaskStepCount} checklist steps.`)
  if (steps.some((step) => step.title.trim().length > INPUT_LIMITS.groupTaskStepText)) return new Error(`Group task steps are limited to ${INPUT_LIMITS.groupTaskStepText} characters.`)
  const dueDateError = validateDueDate(dueDate)
  if (dueDateError) return dueDateError
  return null
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

export async function createGroup(name: string, description: string, groupType: GroupType) {
  const validationError = validateGroupDetails(name, description)
  if (validationError) return { data: null, error: validationError }
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { data: null, error: userError ?? new Error('Not logged in') }

  return supabase.rpc('create_typed_group', {
    group_name: name.trim(),
    group_description: description.trim() || null,
    requested_group_type: groupType,
  })
}

export async function joinGroup(inviteCode: string) {
  return supabase.rpc('join_group_by_invite', { supplied_code: inviteCode.trim().toUpperCase() })
}

export async function rotateGroupInvite(groupId: string) {
  return supabase.rpc('rotate_group_invite', { target_group_id: groupId })
}

export async function updateGroupDetails(
  groupId: string,
  name: string,
  description: string,
) {
  const validationError = validateGroupDetails(name, description)
  if (validationError) return { data: null, error: validationError }
  return supabase
    .from('groups')
    .update({
      name: name.trim(),
      description: description.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', groupId)
    .select()
    .single()
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

export async function getGroupMessages(groupId: string) {
  const response = await supabase
    .from('group_messages')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(200)
  return { ...response, data: response.data as GroupMessage[] | null }
}

export async function createGroupMessage(groupId: string, body: string) {
  if (!body.trim()) return { data: null, error: new Error('Message cannot be empty.') }
  if (body.length > INPUT_LIMITS.groupChatMessage) return { data: null, error: new Error(`Group messages are limited to ${INPUT_LIMITS.groupChatMessage} characters.`) }
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { data: null, error: userError ?? new Error('Not logged in') }
  return supabase.from('group_messages').insert({
    group_id: groupId,
    user_id: user.id,
    body: body.trim(),
  }).select().single()
}

export async function updateGroupMessage(messageId: string, body: string) {
  if (!body.trim()) return { data: null, error: new Error('Message cannot be empty.') }
  if (body.length > INPUT_LIMITS.groupChatMessage) return { data: null, error: new Error(`Group messages are limited to ${INPUT_LIMITS.groupChatMessage} characters.`) }
  return supabase.from('group_messages').update({
    body: body.trim(),
    updated_at: new Date().toISOString(),
  }).eq('id', messageId).select().single()
}

export async function deleteGroupMessage(messageId: string) {
  return supabase.from('group_messages').delete().eq('id', messageId)
}

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser()
  return { data: data.user?.id ?? null, error }
}

export async function deleteGroup(groupId: string) {
  return supabase.from('groups').delete().eq('id', groupId)
}

export async function createGroupTask(groupId: string, title: string, description: string, points: number, isUrgent: boolean, dueDate: string, steps: CreateGroupTaskStepInput[]) {
  const validationError = validateGroupTaskInput(title, description, dueDate, steps)
  if (validationError) return { data: null, error: validationError }
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { data: null, error: userError ?? new Error('Not logged in') }
  const taskResponse = await supabase.from('group_tasks').insert({
    group_id: groupId,
    created_by: user.id,
    title: title.trim(),
    description: description.trim(),
    points: clampTaskPoints(points),
    is_urgent: isUrgent,
    due_date: dueDate || null,
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

export async function updateGroupTask(task: GroupTask, title: string, description: string, points: number, isUrgent: boolean, dueDate: string, steps: CreateGroupTaskStepInput[]) {
  const validationError = validateGroupTaskInput(title, description, dueDate, steps)
  if (validationError) return { data: null, error: validationError }
  const taskResponse = await supabase.from('group_tasks').update({
    title: title.trim(),
    description: description.trim(),
    points: clampTaskPoints(points),
    is_urgent: isUrgent,
    due_date: dueDate || null,
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
  return supabase.rpc('set_group_task_step_completion', {
    target_step_id: stepId,
    should_complete: isCompleted,
  })
}

export type GroupTaskCompletionResult = {
  status: TaskStatus
  awarded_recipient_count: number
  points_each: number
  already_rewarded: boolean
}

export async function setGroupTaskCompletion(taskId: string, shouldComplete: boolean) {
  const response = await supabase.rpc('set_group_task_completion', {
    target_task_id: taskId,
    should_complete: shouldComplete,
  })

  return {
    ...response,
    data: response.data as GroupTaskCompletionResult | null,
  }
}

export async function deleteGroupTask(taskId: string) {
  return supabase.from('group_tasks').delete().eq('id', taskId)
}
