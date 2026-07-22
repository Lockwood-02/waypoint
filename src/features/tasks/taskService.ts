import { clampTaskPoints } from '../../lib/pointEconomy'
import { INPUT_LIMITS } from '../../lib/inputLimits'
import { supabase } from '../../lib/supabaseClient'

export type TaskStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Completed'
  | 'Archived'

export type TaskStep = {
  id: string
  task_id: string
  title: string
  is_completed: boolean
  position: number
  created_at: string
}

export type TaskTag = {
  id: string
  user_id: string
  name: string
  color: string | null
  created_at: string
  updated_at: string
}

export type TaskTagLink = {
  task_id: string
  tag_id: string
  created_at: string
  task_tags: TaskTag | null
}

export type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  status: TaskStatus
  points: number
  priority: string | null
  is_urgent: boolean
  due_date: string | null
  completed_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
  task_steps: TaskStep[]
  task_tag_links: TaskTagLink[]
}

export type CreateTaskInput = {
  title: string
  description?: string
  points: number
  steps: string[]
  tagId?: string
  newTagName?: string
  isUrgent: boolean
  dueDate?: string
}

export type UpdateTaskInput = CreateTaskInput

function validateTaskInput(input: CreateTaskInput) {
  if (!input.title.trim()) return new Error('Task title is required.')
  if (input.title.trim().length > INPUT_LIMITS.taskTitle) return new Error(`Task titles are limited to ${INPUT_LIMITS.taskTitle} characters.`)
  if ((input.description ?? '').length > INPUT_LIMITS.taskDescription) return new Error(`Task descriptions are limited to ${INPUT_LIMITS.taskDescription} characters.`)
  if (input.steps.length > INPUT_LIMITS.taskStepCount) return new Error(`Tasks are limited to ${INPUT_LIMITS.taskStepCount} checklist steps.`)
  if (input.steps.some((step) => step.trim().length > INPUT_LIMITS.taskStepText)) return new Error(`Checklist steps are limited to ${INPUT_LIMITS.taskStepText} characters.`)
  if ((input.newTagName?.trim().length ?? 0) > INPUT_LIMITS.taskTagName) return new Error(`Task tags are limited to ${INPUT_LIMITS.taskTagName} characters.`)
  return null
}

export async function getTasks() {
  const response = await supabase
    .from('tasks')
    .select(
      `
      *,
      task_steps (*),
      task_tag_links (
        *,
        task_tags (*)
      )
    `,
    )
    .order('is_urgent', { ascending: false })
    .order('created_at', { ascending: false })

  if (response.data) {
    const sortedTasks = response.data.map((task) => ({
      ...task,
      task_steps: [...(task.task_steps ?? [])].sort(
        (first, second) => first.position - second.position,
      ),
      task_tag_links: task.task_tag_links ?? [],
    }))

    return { ...response, data: sortedTasks as Task[] }
  }

  return { ...response, data: null }
}

export async function getTaskTags() {
  const response = await supabase
    .from('task_tags')
    .select('*')
    .order('name', { ascending: true })

  return {
    ...response,
    data: response.data ? (response.data as TaskTag[]) : null,
  }
}

export async function deleteUnusedTaskTag(tagId: string) {
  const linksResponse = await supabase
    .from('task_tag_links')
    .select('task_id')
    .eq('tag_id', tagId)
    .limit(1)

  if (linksResponse.error) {
    return { data: null, error: linksResponse.error }
  }

  if (linksResponse.data && linksResponse.data.length > 0) {
    return {
      data: null,
      error: new Error('This tag is still assigned to a task.'),
    }
  }

  return supabase.from('task_tags').delete().eq('id', tagId)
}

async function resolveTagId(tagId?: string, newTagName?: string) {
  const trimmedName = newTagName?.trim()

  if (!trimmedName) {
    return { data: tagId || null, error: null }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { data: null, error: userError ?? new Error('Not logged in') }
  }

  const existingResponse = await supabase
    .from('task_tags')
    .select('*')
    .eq('user_id', user.id)
    .ilike('name', trimmedName)
    .maybeSingle()

  if (existingResponse.error) {
    return { data: null, error: existingResponse.error }
  }

  if (existingResponse.data) {
    return { data: existingResponse.data.id as string, error: null }
  }

  const createResponse = await supabase
    .from('task_tags')
    .insert({
      user_id: user.id,
      name: trimmedName,
    })
    .select()
    .single()

  if (createResponse.error || !createResponse.data) {
    return { data: null, error: createResponse.error }
  }

  return { data: createResponse.data.id as string, error: null }
}

async function replaceTaskTag(taskId: string, tagId: string | null) {
  const deleteResponse = await supabase
    .from('task_tag_links')
    .delete()
    .eq('task_id', taskId)

  if (deleteResponse.error) {
    return { error: deleteResponse.error }
  }

  if (!tagId) {
    return { error: null }
  }

  const linkResponse = await supabase.from('task_tag_links').insert({
    task_id: taskId,
    tag_id: tagId,
  })

  return { error: linkResponse.error }
}

export async function createTask(input: CreateTaskInput) {
  const validationError = validateTaskInput(input)
  if (validationError) return { data: null, error: validationError }
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { data: null, error: userError ?? new Error('Not logged in') }
  }

  const taskResponse = await supabase
    .from('tasks')
    .insert({
      user_id: user.id,
      title: input.title,
      description: input.description ?? '',
      points: clampTaskPoints(input.points),
      status: 'Not Started' satisfies TaskStatus,
      is_urgent: input.isUrgent,
      due_date: input.dueDate || null,
    })
    .select()
    .single()

  if (taskResponse.error || !taskResponse.data) {
    return { data: null, error: taskResponse.error }
  }

  const resolvedTag = await resolveTagId(input.tagId, input.newTagName)

  if (resolvedTag.error) {
    return { data: null, error: resolvedTag.error }
  }

  const tagResponse = await replaceTaskTag(taskResponse.data.id, resolvedTag.data)

  if (tagResponse.error) {
    return { data: null, error: tagResponse.error }
  }

  const stepRows = input.steps
    .map((title) => title.trim())
    .filter(Boolean)
    .map((title, position) => ({
      task_id: taskResponse.data.id,
      title,
      position,
    }))

  if (stepRows.length) {
    const stepsResponse = await supabase.from('task_steps').insert(stepRows)

    if (stepsResponse.error) {
      return { data: null, error: stepsResponse.error }
    }
  }

  return getTask(taskResponse.data.id)
}

export async function getTask(taskId: string) {
  const response = await supabase
    .from('tasks')
    .select(
      `
      *,
      task_steps (*),
      task_tag_links (
        *,
        task_tags (*)
      )
    `,
    )
    .eq('id', taskId)
    .single()

  if (response.data) {
    return {
      ...response,
      data: {
        ...response.data,
        task_steps: [...(response.data.task_steps ?? [])].sort(
          (first, second) => first.position - second.position,
        ),
        task_tag_links: response.data.task_tag_links ?? [],
      } as Task,
    }
  }

  return { ...response, data: null }
}

export async function updateTask(taskId: string, input: UpdateTaskInput) {
  const validationError = validateTaskInput(input)
  if (validationError) return { data: null, error: validationError }
  const updatedAt = new Date().toISOString()
  const existingStepsResponse = await supabase
    .from('task_steps')
    .select('title, is_completed, position')
    .eq('task_id', taskId)

  if (existingStepsResponse.error) {
    return { data: null, error: existingStepsResponse.error }
  }

  const existingSteps = [...(existingStepsResponse.data ?? [])].sort(
    (first, second) => first.position - second.position,
  )

  const taskResponse = await supabase
    .from('tasks')
    .update({
      title: input.title,
      description: input.description ?? '',
      points: clampTaskPoints(input.points),
      is_urgent: input.isUrgent,
      due_date: input.dueDate || null,
      updated_at: updatedAt,
    })
    .eq('id', taskId)
    .select()
    .single()

  if (taskResponse.error || !taskResponse.data) {
    return { data: null, error: taskResponse.error }
  }

  const resolvedTag = await resolveTagId(input.tagId, input.newTagName)

  if (resolvedTag.error) {
    return { data: null, error: resolvedTag.error }
  }

  const tagResponse = await replaceTaskTag(taskId, resolvedTag.data)

  if (tagResponse.error) {
    return { data: null, error: tagResponse.error }
  }

  const deleteResponse = await supabase
    .from('task_steps')
    .delete()
    .eq('task_id', taskId)

  if (deleteResponse.error) {
    return { data: null, error: deleteResponse.error }
  }

  const stepRows = input.steps
    .map((title) => title.trim())
    .filter(Boolean)
    .map((title, position) => {
      const matchingStep =
        existingSteps[position]?.title === title
          ? existingSteps[position]
          : existingSteps.find((step) => step.title === title)

      return {
        task_id: taskId,
        title,
        position,
        is_completed: matchingStep?.is_completed ?? false,
      }
    })

  if (stepRows.length) {
    const stepsResponse = await supabase.from('task_steps').insert(stepRows)

    if (stepsResponse.error) {
      return { data: null, error: stepsResponse.error }
    }
  }

  return getTask(taskId)
}

export async function updateTaskStepCompletion(
  stepId: string,
  isCompleted: boolean,
) {
  return supabase
    .from('task_steps')
    .update({ is_completed: isCompleted })
    .eq('id', stepId)
    .select()
    .single()
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  return supabase
    .from('tasks')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single()
}

export async function updateTaskUrgency(taskId: string, isUrgent: boolean) {
  return supabase
    .from('tasks')
    .update({
      is_urgent: isUrgent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single()
}

export async function deleteTask(taskId: string) {
  return supabase.from('tasks').delete().eq('id', taskId)
}

export async function completeTask(task: Task, currentTotalPoints: number) {
  if (task.status === 'Completed') {
    return { data: null, error: null }
  }

  const completedAt = new Date().toISOString()
  const taskResponse = await supabase
    .from('tasks')
    .update({
      status: 'Completed' satisfies TaskStatus,
      is_urgent: false,
      completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq('id', task.id)
    .select()
    .single()

  if (taskResponse.error) {
    return { data: null, error: taskResponse.error }
  }

  const transactionResponse = await supabase
    .from('point_transactions')
    .insert({
      user_id: task.user_id,
      task_id: task.id,
      amount: task.points,
      type: 'task_completed',
    })

  if (transactionResponse.error) {
    return { data: null, error: transactionResponse.error }
  }

  const profileResponse = await supabase
    .from('profiles')
    .update({
      total_points: currentTotalPoints + task.points,
      updated_at: completedAt,
    })
    .eq('id', task.user_id)
    .select()
    .single()

  if (profileResponse.error) {
    return { data: null, error: profileResponse.error }
  }

  return { data: profileResponse.data, error: null }
}

export async function uncompleteTask(taskId: string) {
  const response = await supabase.rpc('uncomplete_task', {
    target_task_id: taskId,
  })

  if (response.error) {
    return { data: null, error: response.error }
  }

  return {
    data: response.data as {
      total_points: number
      points_removed: number
    },
    error: null,
  }
}
