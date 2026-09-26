import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TopBar, LoadingScreen, EmptyState } from '../components/ui'
import { FabButtons } from '../components/FabButtons'
import { supabase } from '../lib/supabase'
import { formatMoney, formatDateTime, orderCode, startOfToday, startOfWeek, startOfMonth } from '../lib/format'
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, type Order, type OrderStatus } from '../types'

type Filter = 'todos' | 'hoy' | 'semana' | 'mes' | 'pendientes' | 'entregados' | 'cancelados'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'hoy', label: 'Hoy' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'mes', label: 'Este mes' },
  { key: 'pendientes', label: 'Pendientes' },
  { key: 'entregados', label: 'Entregados' },
  { key: 'cancelados', label: 'Cancelados' }
]

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('todos')
  const [query, setQuery] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, customers(name, phone), order_items(product_name_snapshot, quantity)')
      .order('created_at', { ascending: false })
      .limit(300)
    setOrders((data as Order[]) ?? [])
    setLoading(false)
  }

  const filtered = orders.filter((o) => {
    if (filter === 'pendientes' && !['pendiente', 'confirmado', 'en_preparacion', 'listo'].includes(o.status)) return false
    if (filter === 'entregados' && o.status !== 'entregado') return false
    if (filter === 'cancelados' && o.status !== 'cancelado') return false
    if (filter === 'hoy' && new Date(o.created_at) < startOfToday()) return false
    if (filter === 'semana' && new Date(o.created_at) < startOfWeek()) return false
    if (filter === 'mes' && new Date(o.created_at) < startOfMonth()) return false

    const q = query.trim().toLowerCase()
    if (!q) return true
    return (
      String(o.order_number).includes(q) ||
      (o.customers?.name ?? '').toLowerCase().includes(q) ||
      (o.customers?.phone ?? '').includes(q)
    )
  })

  return (
    <div>
      <TopBar title="Pedidos" />
      <div className="page">
        <input
          className="input search-bar"
          placeholder="Buscar por # pedido, cliente o teléfono…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="filter-row">
          {FILTERS.map((f) => (
            <button key={f.key} className={`chip ${filter === f.key ? 'active' : ''}`} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingScreen label="Cargando pedidos…" />
        ) : filtered.length === 0 ? (
          <EmptyState icon="🛍️" title="No hay pedidos aquí" subtitle="Registra una venta con el botón ➕ Venta" />
        ) : (
          filtered.map((o) => <OrderCard key={o.id} order={o} />)
        )}
      </div>
      <FabButtons />
    </div>
  )
}

function OrderCard({ order }: { order: Order }) {
  const itemsPreview =
    order.order_items?.map((it) => `${it.quantity} ${it.product_name_snapshot}`).join(' + ') || 'Sin productos'
  const status = order.status as OrderStatus
  return (
    <Link to={`/pedidos/${order.id}`} className="order-card">
      <div className="order-card-top">
        <span className="order-num">{orderCode(order.order_number)}</span>
        <span className="order-total">{formatMoney(order.total)}</span>
      </div>
      <div className="order-customer">{order.customers?.name ?? 'Cliente'}</div>
      <div className="order-items-preview">{itemsPreview}</div>
      <div className="order-card-bottom">
        <span className="order-time">{formatDateTime(order.created_at)}</span>
        <span className="status-pill" style={{ background: ORDER_STATUS_COLORS[status] }}>
          {ORDER_STATUS_LABELS[status]}
        </span>
      </div>
    </Link>
  )
}
