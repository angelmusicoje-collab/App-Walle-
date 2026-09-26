import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TopBar, LoadingScreen, EmptyState } from '../components/ui'
import { FabButtons } from '../components/FabButtons'
import { supabase } from '../lib/supabase'
import { formatMoney, formatDate } from '../lib/format'
import type { Expense } from '../types'

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('expenses')
      .select('*, expense_categories(name, emoji)')
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(300)
    setExpenses((data as Expense[]) ?? [])
    setLoading(false)
  }

  return (
    <div>
      <TopBar title="Gastos" />
      <div className="page">
        {loading ? (
          <LoadingScreen label="Cargando gastos…" />
        ) : expenses.length === 0 ? (
          <EmptyState icon="💸" title="Sin gastos registrados" subtitle="Registra uno con el botón ➕ Gasto" />
        ) : (
          expenses.map((e) => (
            <Link key={e.id} to={`/gastos/${e.id}/editar`} className="list-card">
              <div className="order-card-top">
                <span className="order-customer" style={{ margin: 0 }}>
                  {e.expense_categories?.emoji} {e.concept}
                </span>
                <span className="order-total" style={{ color: 'var(--money-out)' }}>
                  -{formatMoney(e.amount)}
                </span>
              </div>
              <div className="order-card-bottom">
                <span className="order-time">
                  {formatDate(e.expense_date)} · {e.expense_categories?.name ?? 'Otros'}
                </span>
                {e.status === 'cancelado' && (
                  <span className="status-pill" style={{ background: 'var(--ink-soft)' }}>
                    Cancelado
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
      <FabButtons />
    </div>
  )
}
