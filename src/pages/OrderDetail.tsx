import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { TopBar, Card, LoadingScreen, confirmDialog, showToast } from '../components/ui'
import { PhotoField } from '../components/PhotoField'
import { supabase } from '../lib/supabase'
import { formatMoney, formatDateTime } from '../lib/format'
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PAYMENT_LABELS } from '../types'
import type { Order, OrderStatus, Profile } from '../types'

const STATUSES: OrderStatus[] = ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado', 'cancelado']

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [creator, setCreator] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) load(id)
  }, [id])

  async function load(oid: string) {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, customers(name, phone), order_items(*)')
      .eq('id', oid)
      .single()
    const o = data as Order | null
    setOrder(o)
    if (o?.created_by) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', o.created_by).single()
      setCreator(p as Profile | null)
    }
    setLoading(false)
  }

  async function changeStatus(newStatus: OrderStatus) {
    if (!order) return
    if (newStatus === 'cancelado') {
      const ok = await confirmDialog({
        title: 'Cancelar pedido',
        message: 'El pedido se marcará como cancelado y no contará en ventas ni ganancias. No se elimina.',
        confirmLabel: 'Cancelar pedido',
        danger: true
      })
      if (!ok) return
    }
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id)
    if (!error) {
      setOrder({ ...order, status: newStatus })
      showToast('Estado actualizado')
    }
  }

  if (loading) return <LoadingScreen />
  if (!order) return <LoadingScreen label="Pedido no encontrado" />

  const codeFmt = `#${String(order.order_number).padStart(4, '0')}`

  return (
    <div>
      <TopBar
        title={codeFmt}
        onBack={() => navigate(-1)}
        right={
          order.status !== 'cancelado' && (
            <Link to={`/pedidos/${order.id}/editar`} className="topbar-back" aria-label="Editar">
              ✏️
            </Link>
          )
        }
      />
      <div className="page">
        <Card>
          <div className="order-card-top">
            <span className="order-customer" style={{ margin: 0, fontSize: 17 }}>
              {order.customers?.name}
            </span>
            <span
              className="status-pill"
              style={{ background: ORDER_STATUS_COLORS[order.status] }}
            >
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>
          {order.customers?.phone && <p className="hint">{order.customers.phone}</p>}
          <p className="hint">{formatDateTime(order.created_at)}</p>
          {creator && <p className="hint">Registrado por {creator.full_name}</p>}
        </Card>

        <h2 className="section-title">Productos</h2>
        <Card>
          {order.order_items?.map((it) => (
            <div key={it.id} className="summary-row">
              <span>
                {it.quantity} × {it.product_name_snapshot}
              </span>
              <strong>{formatMoney(it.unit_price_snapshot * it.quantity)}</strong>
            </div>
          ))}
          <div className="summary-row total">
            <span>Total</span>
            <span>{formatMoney(order.total)}</span>
          </div>
        </Card>

        <Card>
          <div className="summary-row">
            <span>Método de pago</span>
            <strong>{PAYMENT_LABELS[order.payment_method]}</strong>
          </div>
        </Card>

        {order.notes && (
          <Card>
            <p className="field-label">Notas</p>
            <p>{order.notes}</p>
          </Card>
        )}

        <h2 className="section-title">Fotografía / comprobante</h2>
        <Card>
          <PhotoField entityType="order" entityId={order.id} label="" />
        </Card>

        <h2 className="section-title">Cambiar estado</h2>
        <div className="chip-row" style={{ marginBottom: 24 }}>
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`chip ${order.status === s ? 'active' : ''}`}
              onClick={() => changeStatus(s)}
              type="button"
            >
              {ORDER_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
