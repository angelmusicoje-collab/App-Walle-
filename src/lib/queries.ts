import { supabase } from './supabase'
import { toLocalDateString } from './format'

export interface PeriodTotals {
  sales: number
  cogs: number // costo de lo vendido
  expenses: number
  contributions: number
  withdrawals: number
  orderCount: number
  profit: number // sales - cogs - expenses
  cashAvailable: number // ventas + aportaciones - gastos - retiros (aprox. dinero disponible)
}

/** Suma ventas + costo de lo vendido en un rango de fechas [from, to) usando order_items. */
async function ordersTotals(fromISO: string, toISO: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, total, created_at, status, order_items(unit_price_snapshot, unit_cost_snapshot, quantity)')
    .gte('created_at', fromISO)
    .lt('created_at', toISO)
    .neq('status', 'cancelado')

  if (error) throw error
  let sales = 0
  let cogs = 0
  for (const o of data ?? []) {
    sales += Number(o.total) || 0
    for (const it of o.order_items ?? []) {
      cogs += Number(it.unit_cost_snapshot) * Number(it.quantity)
    }
  }
  return { sales, cogs, orderCount: (data ?? []).length }
}

/**
 * Rango [from, to) expresado como fechas locales, para columnas tipo date
 * (expense_date, movement_date). Si `to` no cae justo en medianoche (por
 * ejemplo "ahora"), el día de `to` también cuenta.
 */
function localDateRange(from: Date, to: Date) {
  const end = new Date(to)
  if (end.getHours() || end.getMinutes() || end.getSeconds() || end.getMilliseconds()) {
    end.setHours(0, 0, 0, 0)
    end.setDate(end.getDate() + 1)
  }
  return { fromDate: toLocalDateString(from), toDate: toLocalDateString(end) }
}

async function sumTable(table: 'expenses' | 'contributions' | 'withdrawals', dateCol: string, from: Date, to: Date) {
  const { fromDate, toDate } = localDateRange(from, to)
  const { data, error } = await supabase
    .from(table)
    .select('amount')
    .gte(dateCol, fromDate)
    .lt(dateCol, toDate)
    .eq('status', 'activo')
  if (error) throw error
  return (data ?? []).reduce((acc: number, r: { amount: number }) => acc + Number(r.amount), 0)
}

export async function getPeriodTotals(from: Date, to: Date): Promise<PeriodTotals> {
  const fromISO = from.toISOString()
  const toISO = to.toISOString()
  const [{ sales, cogs, orderCount }, expenses, contributions, withdrawals] = await Promise.all([
    ordersTotals(fromISO, toISO),
    sumTable('expenses', 'expense_date', from, to),
    sumTable('contributions', 'movement_date', from, to),
    sumTable('withdrawals', 'movement_date', from, to)
  ])
  const profit = sales - cogs - expenses
  const cashAvailable = sales + contributions - expenses - withdrawals
  return { sales, cogs, expenses, contributions, withdrawals, orderCount, profit, cashAvailable }
}

export async function getPendingOrdersCount() {
  const { count, error } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pendiente', 'confirmado', 'en_preparacion', 'listo'])
  if (error) throw error
  return count ?? 0
}

export async function getTopProduct(from: Date, to: Date) {
  const { data, error } = await supabase
    .from('order_items')
    .select('product_name_snapshot, quantity, orders!inner(created_at, status)')
    .gte('orders.created_at', from.toISOString())
    .lt('orders.created_at', to.toISOString())
    .neq('orders.status', 'cancelado')
  if (error) throw error
  const totals = new Map<string, number>()
  for (const row of data ?? []) {
    const name = row.product_name_snapshot as string
    totals.set(name, (totals.get(name) ?? 0) + Number(row.quantity))
  }
  let best: { name: string; qty: number } | null = null
  for (const [name, qty] of totals) {
    if (!best || qty > best.qty) best = { name, qty }
  }
  return best
}

export async function getSalesByDay(from: Date, to: Date) {
  const { data, error } = await supabase
    .from('orders')
    .select('created_at, total, status')
    .gte('created_at', from.toISOString())
    .lt('created_at', to.toISOString())
    .neq('status', 'cancelado')
    .order('created_at')
  if (error) throw error
  const map = new Map<string, number>()
  for (const o of data ?? []) {
    const day = new Date(o.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
    map.set(day, (map.get(day) ?? 0) + Number(o.total))
  }
  return Array.from(map.entries()).map(([day, total]) => ({ day, total }))
}

export async function getExpensesByCategory(from: Date, to: Date) {
  const { fromDate, toDate } = localDateRange(from, to)
  const { data, error } = await supabase
    .from('expenses')
    .select('amount, expense_categories(name, emoji)')
    .gte('expense_date', fromDate)
    .lt('expense_date', toDate)
    .eq('status', 'activo')
  if (error) throw error
  const map = new Map<string, number>()
  for (const e of data ?? []) {
    // supabase-js tipa la relación como arreglo, pero expenses -> expense_categories es muchos-a-uno
    // y en tiempo de ejecución llega un solo objeto (o null).
    const cat = (e.expense_categories as unknown as { name: string } | null)?.name ?? 'Otros'
    map.set(cat, (map.get(cat) ?? 0) + Number(e.amount))
  }
  return Array.from(map.entries()).map(([name, total]) => ({ name, total }))
}

export async function getSalesByProduct(from: Date, to: Date) {
  const { data, error } = await supabase
    .from('order_items')
    .select('product_name_snapshot, unit_price_snapshot, quantity, orders!inner(created_at, status)')
    .gte('orders.created_at', from.toISOString())
    .lt('orders.created_at', to.toISOString())
    .neq('orders.status', 'cancelado')
  if (error) throw error
  const map = new Map<string, number>()
  for (const row of data ?? []) {
    const total = Number(row.unit_price_snapshot) * Number(row.quantity)
    map.set(row.product_name_snapshot, (map.get(row.product_name_snapshot) ?? 0) + total)
  }
  return Array.from(map.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)
}
