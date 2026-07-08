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

export type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  status: TaskStatus
  points: number
  priority: string | null
  due_date: string | null
  completed_at: string | null
  archived_at: string | null
  created_at: string
  updated_at: string
  task_steps: TaskStep[]
}

export type CreateTaskInput = {
  title: string
  description?: string
  points: number
  steps: string[]
}

export type UpdateTaskInput = CreateTaskInput

export async function getTasks() {
  const response = await supabase
    .from('tasks')
    .select(
      `
      *,
      task_steps (*)
    `,
    )
    .order('created_at', { ascending: false })

  if (response.data) {
    const sortedTasks = response.data.map((task) => ({
      ...task,
      task_steps: [...(task.task_steps ?? [])].sort(
        (first, second) => first.position - second.position,
      ),
    }))

    return { ...response, data: sortedTasks as Task[] }
  }

  return { ...response, data: null }
}

export async function createTask(input: CreateTaskInput) {
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
      points: input.points,
      status: 'Not Started' satisfies TaskStatus,
    })
    .select()
    .single()

  if (taskResponse.error || !taskResponse.data) {
    return { data: null, error: taskResponse.error }
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
      task_steps (*)
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
      } as Task,
    }
  }

  return { ...response, data: null }
}

export async function updateTask(taskId: string, input: UpdateTaskInput) {
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
      points: input.points,
      updated_at: updatedAt,
    })
    .eq('id', taskId)
    .select()
    .single()

  if (taskResponse.error || !taskResponse.data) {
    return { data: null, error: taskResponse.error }
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

export async function completeTask(task: Task, currentTotalPoints: number) {
  if (task.status === 'Completed') {
    return { data: null, error: null }
  }

  const completedAt = new Date().toISOString()
  const taskResponse = await supabase
    .from('tasks')
    .update({
      status: 'Completed' satisfies TaskStatus,
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
