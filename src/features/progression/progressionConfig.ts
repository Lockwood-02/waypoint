export type ProgressionPathId = 'sci-fi' | 'fantasy' | 'arcane' | 'western' | 'cyberpunk'

export type ProgressionLevel = {
  level: number
  requiredXp: number
  titleId: string
  title: string
}

export type ProgressionBadge = {
  id: string
  label: string
  description: string
  requiredXp: number
}

export type ProgressionPath = {
  id: ProgressionPathId
  name: string
  description: string
  accentClass: string
  barClass: string
  levels: ProgressionLevel[]
  badges: ProgressionBadge[]
}

export type XpBundle = {
  id: 'xp-cache' | 'xp-crate' | 'xp-vault'
  name: string
  points: number
  xp: number
}

const levelThresholds = [0, 500, 1500, 3000, 5000]

function levels(pathId: ProgressionPathId, titles: string[]): ProgressionLevel[] {
  return titles.map((title, index) => ({
    level: index + 1,
    requiredXp: levelThresholds[index],
    titleId: `${pathId}-${index + 1}`,
    title,
  }))
}

export const progressionPaths: ProgressionPath[] = [
  {
    id: 'sci-fi',
    name: 'Sci-Fi',
    description: 'Chart distant systems and rise from cadet to galactic legend.',
    accentClass: 'text-sky-200',
    barClass: 'from-cyan-300 to-sky-400',
    levels: levels('sci-fi', ['Cadet', 'Starfinder', 'Void Runner', 'Vanguard', 'Galactic Legend']),
    badges: [
      { id: 'first-launch', label: 'First Launch', description: 'Reach 500 XP.', requiredXp: 500 },
      { id: 'deep-space', label: 'Deep Space', description: 'Reach 3,000 XP.', requiredXp: 3000 },
      { id: 'supernova', label: 'Supernova', description: 'Master the Sci-Fi path.', requiredXp: 5000 },
    ],
  },
  {
    id: 'fantasy',
    name: 'Fantasy',
    description: 'Answer the call to adventure and become a legend of the realm.',
    accentClass: 'text-emerald-200',
    barClass: 'from-emerald-300 to-lime-300',
    levels: levels('fantasy', ['Wanderer', 'Squire', 'Knight Errant', 'Dragon Warden', 'Realm Legend']),
    badges: [
      { id: 'quest-begun', label: 'Quest Begun', description: 'Reach 500 XP.', requiredXp: 500 },
      { id: 'dragon-mark', label: 'Dragon Mark', description: 'Reach 3,000 XP.', requiredXp: 3000 },
      { id: 'crowned', label: 'Crowned', description: 'Master the Fantasy path.', requiredXp: 5000 },
    ],
  },
  {
    id: 'arcane',
    name: 'Arcane',
    description: 'Study hidden knowledge and command increasingly powerful magic.',
    accentClass: 'text-violet-200',
    barClass: 'from-violet-300 to-fuchsia-300',
    levels: levels('arcane', ['Initiate', 'Spellweaver', 'Arcanist', 'Archmage', 'Ascendant']),
    badges: [
      { id: 'first-sigil', label: 'First Sigil', description: 'Reach 500 XP.', requiredXp: 500 },
      { id: 'grand-grimoire', label: 'Grand Grimoire', description: 'Reach 3,000 XP.', requiredXp: 3000 },
      { id: 'awakened', label: 'Awakened', description: 'Master the Arcane path.', requiredXp: 5000 },
    ],
  },
  {
    id: 'western',
    name: 'Western',
    description: 'Ride the open frontier and build a name that carries for miles.',
    accentClass: 'text-amber-200',
    barClass: 'from-amber-300 to-orange-400',
    levels: levels('western', ['Drifter', 'Trailhand', 'Gunslinger', 'Frontier Marshal', 'Legend of the West']),
    badges: [
      { id: 'first-trail', label: 'First Trail', description: 'Reach 500 XP.', requiredXp: 500 },
      { id: 'high-noon', label: 'High Noon', description: 'Reach 3,000 XP.', requiredXp: 3000 },
      { id: 'frontier-legend', label: 'Frontier Legend', description: 'Master the Western path.', requiredXp: 5000 },
    ],
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Build your street reputation and become an icon of the neon city.',
    accentClass: 'text-fuchsia-200',
    barClass: 'from-fuchsia-400 to-cyan-300',
    levels: levels('cyberpunk', ['Runner', 'Street Samurai', 'Netrunner', 'Edgerunner', 'Night City Legend']),
    badges: [
      { id: 'jacked-in', label: 'Jacked In', description: 'Reach 500 XP.', requiredXp: 500 },
      { id: 'afterlife', label: 'Afterlife', description: 'Reach 3,000 XP.', requiredXp: 3000 },
      { id: 'city-legend', label: 'City Legend', description: 'Master the Cyberpunk path.', requiredXp: 5000 },
    ],
  },
]

export const xpBundles: XpBundle[] = [
  { id: 'xp-cache', name: 'XP Cache', points: 200, xp: 100 },
  { id: 'xp-crate', name: 'XP Crate', points: 450, xp: 250 },
  { id: 'xp-vault', name: 'XP Vault', points: 800, xp: 500 },
]

export const maximumProgressionXp = levelThresholds[levelThresholds.length - 1]

export function getProgressionPath(pathId: string | null | undefined) {
  return progressionPaths.find((path) => path.id === pathId) ?? null
}

export function getProgressionLevel(path: ProgressionPath, xp: number) {
  return [...path.levels].reverse().find((level) => xp >= level.requiredXp) ?? path.levels[0]
}

export function getNextProgressionLevel(path: ProgressionPath, xp: number) {
  return path.levels.find((level) => xp < level.requiredXp) ?? null
}

export function getEquippedTitle(path: ProgressionPath, titleId: string | null) {
  return path.levels.find((level) => level.titleId === titleId) ?? getProgressionLevel(path, 0)
}

export function getProgressionTitle(titleId: string | null | undefined) {
  if (!titleId) return null
  for (const path of progressionPaths) {
    const level = path.levels.find((item) => item.titleId === titleId)
    if (level) return { path, level }
  }
  return null
}
