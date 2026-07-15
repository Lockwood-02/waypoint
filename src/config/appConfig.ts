import type { AuthState, ColorwayOption, ShopItem, TaskFormState } from '../types/app'

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

export const changelogVersion = 'settings-colorways-2026-07'

export const colorwayOptions: ColorwayOption[] = [
  { id: 'midnight', label: 'Midnight', description: 'The original cool blue Waypoint palette.', swatches: ['#020617', '#164e63', '#67e8f9'] },
  { id: 'forest', label: 'Forest', description: 'Deep evergreen with fresh mint accents.', swatches: ['#07140f', '#14532d', '#6ee7b7'] },
  { id: 'violet', label: 'Violet', description: 'Rich plum tones with a soft lavender glow.', swatches: ['#0f0718', '#581c87', '#d8b4fe'] },
  { id: 'sunset', label: 'Sunset', description: 'Warm charcoal with lively coral highlights.', swatches: ['#17100f', '#7f1d1d', '#fda4af'] },
]

export const shopItems: ShopItem[] = [
  { id: 'frame-cyan', label: 'Cyan Border', description: 'A clean cyan profile image border.', cost: 25, type: 'avatar_frame', value: 'frame-cyan' },
  { id: 'frame-gold', label: 'Gold Border', description: 'A bright gold profile image border.', cost: 50, type: 'avatar_frame', value: 'frame-gold' },
  { id: 'frame-fire', label: 'Static Fire Border', description: 'A warm flame-colored border effect.', cost: 75, type: 'avatar_frame', value: 'frame-fire' },
  { id: 'name-gold', label: 'Gold Name', description: 'Turns your display name gold.', cost: 60, type: 'name_color', value: 'name-gold' },
  { id: 'name-cyan', label: 'Cyan Name', description: 'Turns your display name cyan.', cost: 40, type: 'name_color', value: 'name-cyan' },
  { id: 'name-rose', label: 'Rose Name', description: 'Turns your display name rose.', cost: 40, type: 'name_color', value: 'name-rose' },
]
