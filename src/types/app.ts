export type AuthMode = 'login' | 'signup'
export type ActiveDashboard = 'tasks' | 'groups' | 'notes' | 'weekly-report' | 'stats'
export type TaskCompletionFilter = 'all' | 'incomplete' | 'completed'
export type Colorway = 'midnight' | 'forest' | 'violet' | 'sunset'

export type AuthState = {
  displayName: string
  email: string
  password: string
}

export type TaskFormState = {
  title: string
  description: string
  points: string
  steps: string[]
  tagId: string
  newTagName: string
  isUrgent: boolean
}

export type ColorwayOption = {
  id: Colorway
  label: string
  description: string
  swatches: string[]
}

export type ShopItem = {
  id: string
  label: string
  description: string
  cost: number
  type: 'avatar_frame' | 'name_color'
  value: string | null
}
