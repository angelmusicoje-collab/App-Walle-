export function formatMoney(amount: number | null | undefined, currency = 'MXN') {
  const value = Number(amount ?? 0)
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(value)
}

export function formatDate(iso: string) {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
}

export function formatDateTime(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const time = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' }).format(d)
  if (sameDay) return `Hoy ${time}`
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `Ayer ${time}`
  return `${new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' }).format(d)}, ${time}`
}

export function pctChange(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 100 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

export function orderCode(n: number) {
  return `#${String(n).padStart(4, '0')}`
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(',')]
  for (const row of rows) lines.push(headers.map((h) => esc(row[h])).join(','))
  return lines.join('\n')
}

export function downloadCSV(filename: string, rows: Record<string, unknown>[]) {
  const csv = toCSV(rows)
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export function startOfWeek() {
  const d = startOfToday()
  const day = d.getDay() // 0 = domingo
  const diff = day === 0 ? 6 : day - 1 // lunes como inicio de semana
  d.setDate(d.getDate() - diff)
  return d
}

export function startOfMonth() {
  const d = startOfToday()
  d.setDate(1)
  return d
}

export function startOfPrevMonth() {
  const d = startOfMonth()
  d.setMonth(d.getMonth() - 1)
  return d
}

export function endOfPrevMonth() {
  const d = startOfMonth()
  d.setMilliseconds(-1)
  return d
}
