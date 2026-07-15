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
    .select('*')
    .eq('group_id', groupId)
    .order('is_urgent', { ascending: false })
    .order('created_at', { ascending: false })
  return { ...response, data: response.data as GroupTask[] | null }
}

export async function createGroupTask(groupId: string, title: string, description: string, points: number, isUrgent: boolean) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { data: null, error: userError ?? new Error('Not logged in') }
  return supabase.from('group_tasks').insert({
    group_id: groupId,
    created_by: user.id,
    title: title.trim(),
    description: description.trim(),
    points,
    is_urgent: isUrgent,
  }).select().single()
}

export async function updateGroupTaskStatus(taskId: string, status: TaskStatus) {
  return supabase.from('group_tasks').update({ status, updated_at: new Date().toISOString() }).eq('id', taskId).select().single()
}

export async function deleteGroupTask(taskId: string) {
  return supabase.from('group_tasks').delete().eq('id', taskId)
}
