import type { AuthState, ColorwayOption, ShopItem, TaskFormState } from '../types/app'

export const publicAppUrl = import.meta.env.VITE_APP_URL?.trim() ?? ''

export const initialAuthState: AuthState = {
  displayName: '',
  email: '',
  password: '',
}

export const initialTaskFormState: TaskFormState = {
  title: '',
  description: '',
  points: '10',
  steps: [''],
  tagId: '',
  newTagName: '',
  isUrgent: false,
}

export const changelogVersion = 'groups-chat-flares-2026-07'

export const colorwayOptions: ColorwayOption[] = [
  { id: 'midnight', label: 'Midnight', description: 'The original cool blue Waypoint palette.', swatches: ['#020617', '#164e63', '#67e8f9'] },
  { id: 'forest', label: 'Forest', description: 'Deep evergreen with fresh mint accents.', swatches: ['#07140f', '#14532d', '#6ee7b7'] },
  { id: 'violet', label: 'Violet', description: 'Rich plum tones with a soft lavender glow.', swatches: ['#0f0718', '#581c87', '#d8b4fe'] },
  { id: 'sunset', label: 'Sunset', description: 'Warm charcoal with lively coral highlights.', swatches: ['#17100f', '#7f1d1d', '#fda4af'] },
  { id: 'graphite', label: 'Graphite', description: 'Graphite gray surfaces with crisp white accents.', swatches: ['#111315', '#34383d', '#ffffff'] },
]

export const shopItems: ShopItem[] = [
  { id: 'frame-cyan', label: 'Cyan Border', description: 'A clean cyan profile image border.', cost: 25, type: 'avatar_frame', value: 'frame-cyan' },
  { id: 'frame-gold', label: 'Gold Border', description: 'A bright gold profile image border.', cost: 50, type: 'avatar_frame', value: 'frame-gold' },
  { id: 'frame-fire', label: 'Static Fire Border', description: 'A warm flame-colored border effect.', cost: 75, type: 'avatar_frame', value: 'frame-fire' },
  { id: 'frame-rose', label: 'Rose Border', description: 'A soft rose profile image border.', cost: 45, type: 'avatar_frame', value: 'frame-rose' },
  { id: 'frame-violet', label: 'Violet Border', description: 'A rich violet profile image border.', cost: 55, type: 'avatar_frame', value: 'frame-violet' },
  { id: 'frame-emerald', label: 'Emerald Border', description: 'A vivid emerald profile image border.', cost: 45, type: 'avatar_frame', value: 'frame-emerald' },
  { id: 'frame-blue', label: 'Blue Border', description: 'A clear blue profile image border.', cost: 45, type: 'avatar_frame', value: 'frame-blue' },
  { id: 'frame-orange', label: 'Orange Border', description: 'A bright orange profile image border.', cost: 50, type: 'avatar_frame', value: 'frame-orange' },
  { id: 'frame-white', label: 'Bright White Border', description: 'A crisp white profile image border.', cost: 55, type: 'avatar_frame', value: 'frame-white' },
  { id: 'name-gold', label: 'Gold Name', description: 'Turns your display name gold.', cost: 60, type: 'name_color', value: 'name-gold' },
  { id: 'name-cyan', label: 'Cyan Name', description: 'Turns your display name cyan.', cost: 40, type: 'name_color', value: 'name-cyan' },
  { id: 'name-rose', label: 'Rose Name', description: 'Turns your display name rose.', cost: 40, type: 'name_color', value: 'name-rose' },
  { id: 'name-emerald', label: 'Emerald Name', description: 'Turns your display name emerald.', cost: 45, type: 'name_color', value: 'name-emerald' },
  { id: 'name-violet', label: 'Violet Name', description: 'Turns your display name violet.', cost: 45, type: 'name_color', value: 'name-violet' },
  { id: 'name-blue', label: 'Blue Name', description: 'Turns your display name blue.', cost: 45, type: 'name_color', value: 'name-blue' },
  { id: 'name-orange', label: 'Orange Name', description: 'Turns your display name orange.', cost: 50, type: 'name_color', value: 'name-orange' },
  { id: 'name-fire', label: 'Static Fire Name', description: 'Turns your display name flame orange.', cost: 75, type: 'name_color', value: 'name-fire' },
  { id: 'name-white', label: 'Bright White Name', description: 'Gives your display name a bright white glow.', cost: 55, type: 'name_color', value: 'name-white' },
]
