export type DueDateBounds = {
  min: string
  max: string
}

function toDateInputValue(date: Date) {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftYears(date: Date, years: number) {
  const shifted = new Date(date.getFullYear() + years, date.getMonth(), date.getDate())

  // Keep leap-day bounds in February when the target year is not a leap year.
  if (shifted.getMonth() !== date.getMonth()) {
    return new Date(date.getFullYear() + years, date.getMonth() + 1, 0)
  }

  return shifted
}

function isValidDateInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const parsed = new Date(0)
  parsed.setUTCHours(0, 0, 0, 0)
  parsed.setUTCFullYear(year, month - 1, day)

  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
}

export function getDueDateBounds(referenceDate = new Date()): DueDateBounds {
  return {
    min: toDateInputValue(shiftYears(referenceDate, -1)),
    max: toDateInputValue(shiftYears(referenceDate, 10)),
  }
}

export function formatDueDateBound(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(
    new Date(year, month - 1, day),
  )
}

export function validateDueDate(value?: string) {
  if (!value) return null
  if (!isValidDateInput(value)) return new Error('Enter a valid due date.')

  const bounds = getDueDateBounds()
  if (value < bounds.min || value > bounds.max) {
    return new Error(
      `Due dates must be between ${formatDueDateBound(bounds.min)} and ${formatDueDateBound(bounds.max)}.`,
    )
  }

  return null
}
