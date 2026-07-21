export const MIN_TASK_POINTS = 1
export const MAX_TASK_POINTS = 100

export function clampTaskPoints(value: number, fallback = 10) {
  const normalizedValue = Number.isFinite(value) ? Math.trunc(value) : fallback
  return Math.min(MAX_TASK_POINTS, Math.max(MIN_TASK_POINTS, normalizedValue))
}
