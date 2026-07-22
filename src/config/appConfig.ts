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
  dueDate: '',
}

// Increment the tenths place for major releases and the hundredths/thousandths
// places for smaller feature or patch releases.
export const appVersion = 'v0.9.5'
export const changelogVersion = 'v0.9'

export const colorwayOptions: ColorwayOption[] = [
  { id: 'midnight', label: 'Midnight', description: 'The original cool blue Waypoint palette.', swatches: ['#020617', '#164e63', '#67e8f9'] },
  { id: 'forest', label: 'Forest', description: 'Deep evergreen with fresh mint accents.', swatches: ['#07140f', '#14532d', '#6ee7b7'] },
  { id: 'violet', label: 'Violet', description: 'Rich plum tones with a soft lavender glow.', swatches: ['#0f0718', '#581c87', '#d8b4fe'] },
  { id: 'sunset', label: 'Sunset', description: 'Warm charcoal with lively coral highlights.', swatches: ['#17100f', '#7f1d1d', '#fda4af'] },
  { id: 'graphite', label: 'Graphite', description: 'Graphite gray surfaces with crisp white accents.', swatches: ['#111315', '#34383d', '#ffffff'] },
]

export const shopItems: ShopItem[] = [
  { id: 'frame-cyan', label: 'Cyan Border', description: 'A clean cyan profile image border.', cost: 600, type: 'avatar_frame', value: 'frame-cyan' },
  { id: 'frame-rose', label: 'Rose Border', description: 'A soft rose profile image border.', cost: 700, type: 'avatar_frame', value: 'frame-rose' },
  { id: 'frame-emerald', label: 'Emerald Border', description: 'A vivid emerald profile image border.', cost: 800, type: 'avatar_frame', value: 'frame-emerald' },
  { id: 'frame-blue', label: 'Blue Border', description: 'A clear blue profile image border.', cost: 800, type: 'avatar_frame', value: 'frame-blue' },
  { id: 'frame-violet', label: 'Violet Border', description: 'A rich violet profile image border.', cost: 900, type: 'avatar_frame', value: 'frame-violet' },
  { id: 'frame-orange', label: 'Orange Border', description: 'A bright orange profile image border.', cost: 900, type: 'avatar_frame', value: 'frame-orange' },
  { id: 'frame-white', label: 'Bright White Border', description: 'A crisp white profile image border.', cost: 1050, type: 'avatar_frame', value: 'frame-white' },
  { id: 'frame-gold', label: 'Gold Border', description: 'A bright gold profile image border.', cost: 1250, type: 'avatar_frame', value: 'frame-gold' },
  { id: 'frame-fire', label: 'Static Fire Border', description: 'A warm flame-colored border effect.', cost: 1500, type: 'avatar_frame', value: 'frame-fire' },
  { id: 'name-cyan', label: 'Cyan Name', description: 'Turns your display name cyan.', cost: 500, type: 'name_color', value: 'name-cyan' },
  { id: 'name-rose', label: 'Rose Name', description: 'Turns your display name rose.', cost: 500, type: 'name_color', value: 'name-rose' },
  { id: 'name-emerald', label: 'Emerald Name', description: 'Turns your display name emerald.', cost: 650, type: 'name_color', value: 'name-emerald' },
  { id: 'name-blue', label: 'Blue Name', description: 'Turns your display name blue.', cost: 650, type: 'name_color', value: 'name-blue' },
  { id: 'name-violet', label: 'Violet Name', description: 'Turns your display name violet.', cost: 750, type: 'name_color', value: 'name-violet' },
  { id: 'name-orange', label: 'Orange Name', description: 'Turns your display name orange.', cost: 750, type: 'name_color', value: 'name-orange' },
  { id: 'name-white', label: 'Bright White Name', description: 'Gives your display name a bright white glow.', cost: 900, type: 'name_color', value: 'name-white' },
  { id: 'name-gold', label: 'Gold Name', description: 'Turns your display name gold.', cost: 1100, type: 'name_color', value: 'name-gold' },
  { id: 'name-fire', label: 'Static Fire Name', description: 'Turns your display name flame orange.', cost: 1400, type: 'name_color', value: 'name-fire' },
]
