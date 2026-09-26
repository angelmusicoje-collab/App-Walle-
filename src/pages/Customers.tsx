import { useEffect, useState } from 'react'
import { TopBar, LoadingScreen, EmptyState } from '../components/ui'
import { supabase } from '../lib/supabase'
import { formatMoney, formatDate } from '../lib/format'
import type { Customer } from '../types'

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('customers_with_stats')
      .select('*')
      .order('last_order_at', { ascending: false, nullsFirst: false })
    setCustomers((data as Customer[]) ?? [])
    setLoading(false)
  }

  const filtered = customers.filter((c) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q)
  })

  return (
    <div>
      <TopBar title="Clientes" onBack={() => history.back()} />
      <div className="page">
        <input
          className="input search-bar"
          placeholder="Buscar por nombre o teléfono…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {loading ? (
          <LoadingScreen label="Cargando clientes…" />
        ) : filtered.length === 0 ? (
          <EmptyState icon="👤" title="Sin clientes todavía" subtitle="Se crean automáticamente al registrar una venta" />
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="list-card">
              <div className="order-card-top">
                <span className="order-customer" style={{ margin: 0 }}>
                  {c.name}
                </span>
                <span className="order-total">{formatMoney(c.total_purchased)}</span>
              </div>
              <div className="order-items-preview">{c.phone || 'Sin teléfono'}</div>
              <div className="order-card-bottom">
                <span className="order-time">
                  {c.order_count ?? 0} pedidos {c.last_order_at ? `· último ${formatDate(c.last_order_at)}` : ''}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
