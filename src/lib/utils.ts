export const DEFAULT_PRODUCT_IMAGE = '/error.png'

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatTime(value?: string | null) {
  if (!value) {
    return '--:--'
  }

  return value.slice(0, 5)
}

export function isSameUtcDate(a: string, b: Date) {
  const left = new Date(a)
  return (
    left.getUTCFullYear() === b.getUTCFullYear() &&
    left.getUTCMonth() === b.getUTCMonth() &&
    left.getUTCDate() === b.getUTCDate()
  )
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}
