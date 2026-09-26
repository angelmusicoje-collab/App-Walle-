import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar, Card, Banner, showToast, LoadingScreen } from '../components/ui'
import { PhotoField } from '../components/PhotoField'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatMoney } from '../lib/format'
import { PAYMENT_LABELS, ORDER_STATUS_LABELS } from '../types'
import type { Customer, OrderStatus, PaymentMethod, Product } from '../types'

interface LineItem {
  product: Product
  quantity: number
}

const PAYMENT_METHODS: PaymentMethod[] = ['efectivo', 'transferencia', 'tarjeta', 'otro']
const STATUSES: OrderStatus[] = ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado', 'cancelado']

export default function OrderForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerQuery, setCustomerQuery] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [showNewCustomer, setShowNewCustomer] = useState(false)

  const [items, setItems] = useState<LineItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo')
  const [status, setStatus] = useState<OrderStatus>('pendiente')
  const [notes, setNotes] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBaseData()
  }, [])

  useEffect(() => {
    if (id) loadExistingOrder(id)
  }, [id])

  async function loadBaseData() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('products').select('*').eq('is_active', true).order('name'),
      supabase.from('customers').select('*').order('name')
    ])
    setProducts((p as Product[]) ?? [])
    setCustomers((c as Customer[]) ?? [])
    setLoading(false)
  }

  async function loadExistingOrder(oid: string) {
    const { data } = await supabase.from('orders').select('*, order_items(*)').eq('id', oid).single()
    if (!data) return
    setOrderId(data.id)
    setCustomerId(data.customer_id)
    setPaymentMethod(data.payment_method)
    setStatus(data.status)
    setNotes(data.notes ?? '')
    const { data: prods } = await supabase.from('products').select('*')
    const prodMap = new Map((prods as Product[] | null)?.map((p) => [p.id, p]) ?? [])
    setItems(
      (data.order_items ?? []).map((it: { product_id: string; quantity: number; unit_price_snapshot: number; product_name_snapshot: string }) => {
        const p = prodMap.get(it.product_id)
        return {
          product:
            p ??
            ({
              id: it.product_id,
              name: it.product_name_snapshot,
              sale_price: it.unit_price_snapshot,
              total_cost: 0
            } as Product),
          quantity: it.quantity
        }
      })
    )
  }

  const filteredCustomers = useMemo(() => {
    const q = customerQuery.trim().toLowerCase()
    if (!q) return customers.slice(0, 8)
    return customers.filter((c) => c.name.toLowerCase().includes(q) || (c.phone ?? '').includes(q)).slice(0, 8)
  }, [customers, customerQuery])

  const subtotal = items.reduce((acc, it) => acc + it.product.sale_price * it.quantity, 0)

  function addProduct(product: Product) {
    setItems((prev) => {
      const existing = prev.find((it) => it.product.id === product.id)
      if (existing) return prev.map((it) => (it.product.id === product.id ? { ...it, quantity: it.quantity + 1 } : it))
      return [...prev, { product, quantity: 1 }]
    })
  }

  function changeQty(productId: string, delta: number) {
    setItems((prev) =>
      prev
        .map((it) => (it.product.id === productId ? { ...it, quantity: it.quantity + delta } : it))
        .filter((it) => it.quantity > 0)
    )
  }

  const selectedCustomer = customers.find((c) => c.id === customerId)

  async function ensureCustomer(): Promise<string | null> {
    if (customerId) return customerId
    const name = customerQuery.trim()
    if (!name) {
      setError('Escribe o selecciona un cliente.')
      return null
    }
    // Evita crear un cliente duplicado si ya existe uno con el mismo nombre
    // exacto y el usuario escribió el nombre en vez de tocar la sugerencia.
    const existing = customers.find((c) => c.name.trim().toLowerCase() === name.toLowerCase())
    if (existing) return existing.id

    const { data, error: insErr } = await supabase
      .from('customers')
      .insert({ name, phone: newCustomerPhone.trim() || null, created_by: user?.id ?? null })
      .select('id')
      .single()
    if (insErr || !data) {
      setError('No se pudo crear el cliente.')
      return null
    }
    return data.id
  }

  async function handleSubmit() {
    setError(null)
    if (items.length === 0) {
      setError('Agrega al menos un producto al pedido.')
      return
    }
    setSaving(true)
    try {
      const cid = await ensureCustomer()
      if (!cid) {
        setSaving(false)
        return
      }

      const itemsPayload = items.map((it) => ({ product_id: it.product.id, quantity: it.quantity }))

      if (isEdit && orderId) {
        const { error: updErr } = await supabase
          .from('orders')
          .update({ customer_id: cid, payment_method: paymentMethod, status, notes: notes.trim() || null })
          .eq('id', orderId)
        if (updErr) throw updErr
        const { error: itemsErr } = await supabase.rpc('update_order_items', {
          p_order_id: orderId,
          p_items: itemsPayload
        })
        if (itemsErr) throw itemsErr
        showToast('Pedido actualizado')
        navigate(`/pedidos/${orderId}`)
      } else {
        const newId = crypto.randomUUID()
        const { data: newOrderId, error: rpcErr } = await supabase.rpc('create_order', {
          p_id: newId,
          p_customer_id: cid,
          p_payment_method: paymentMethod,
          p_status: status,
          p_notes: notes.trim() || null,
          p_items: itemsPayload,
          p_created_by: user?.id ?? null
        })
        if (rpcErr) throw rpcErr
        const finalId = (newOrderId as string) ?? newId

        if (pendingFile) {
          const ext = pendingFile.name.split('.').pop() || 'jpg'
          const path = `order/${finalId}/${Date.now()}.${ext}`
          const { error: upErr } = await supabase.storage.from('wami-photos').upload(path, pendingFile)
          if (!upErr) {
            await supabase
              .from('photos')
              .insert({ entity_type: 'order', entity_id: finalId, kind: 'foto', storage_path: path, uploaded_by: user?.id ?? null })
          }
        }

        showToast('Pedido registrado 🎉')
        navigate(`/pedidos/${finalId}`)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el pedido. Revisa tu conexión.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingScreen />

  return (
    <div>
      <TopBar title={isEdit ? 'Editar pedido' : 'Nueva venta'} onBack={() => navigate(-1)} />
      <div className="page">
        {error && <Banner kind="error">{error}</Banner>}

        <div className="field">
          <label className="field-label">Cliente</label>
          {selectedCustomer ? (
            <div className="chip-row">
              <span className="chip active">
                {selectedCustomer.name} {selectedCustomer.phone ? `· ${selectedCustomer.phone}` : ''}
              </span>
              <button
                className="chip"
                onClick={() => {
                  setCustomerId(null)
                  setCustomerQuery('')
                }}
                type="button"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <input
                className="input"
                placeholder="Nombre del cliente"
                value={customerQuery}
                onChange={(e) => {
                  setCustomerQuery(e.target.value)
                  setShowNewCustomer(true)
                }}
              />
              {showNewCustomer && customerQuery && (
                <div className="chip-row" style={{ marginTop: 8 }}>
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      className="chip"
                      type="button"
                      onClick={() => {
                        setCustomerId(c.id)
                        setShowNewCustomer(false)
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              {customerQuery && !filteredCustomers.some((c) => c.name.toLowerCase() === customerQuery.trim().toLowerCase()) && (
                <input
                  className="input"
                  style={{ marginTop: 8 }}
                  placeholder="Teléfono (opcional, cliente nuevo)"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  inputMode="tel"
                />
              )}
            </>
          )}
        </div>

        <div className="field">
          <label className="field-label">Productos</label>
          <div className="chip-row">
            {products.map((p) => (
              <button key={p.id} className="chip" type="button" onClick={() => addProduct(p)}>
                + {p.name}
              </button>
            ))}
          </div>
          {products.length === 0 && <p className="hint">No tienes productos activos. Crea uno en la sección Productos.</p>}
        </div>

        {items.length > 0 && (
          <Card>
            {items.map((it) => (
              <div key={it.product.id} className="order-item-row">
                <div style={{ flex: 1 }}>
                  <div className="order-item-name">{it.product.name}</div>
                  <div className="order-item-price">{formatMoney(it.product.sale_price)} c/u</div>
                </div>
                <div className="qty-stepper">
                  <button className="qty-btn" type="button" onClick={() => changeQty(it.product.id, -1)}>
                    −
                  </button>
                  <span className="qty-value">{it.quantity}</span>
                  <button className="qty-btn" type="button" onClick={() => changeQty(it.product.id, 1)}>
                    +
                  </button>
                </div>
              </div>
            ))}
            <div className="summary-row total">
              <span>Total</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
          </Card>
        )}

        <div className="field">
          <label className="field-label">Método de pago</label>
          <div className="chip-row">
            {PAYMENT_METHODS.map((pm) => (
              <button
                key={pm}
                className={`chip ${paymentMethod === pm ? 'active' : ''}`}
                type="button"
                onClick={() => setPaymentMethod(pm)}
              >
                {PAYMENT_LABELS[pm]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label">Estado</label>
          <div className="chip-row">
            {STATUSES.map((s) => (
              <button key={s} className={`chip ${status === s ? 'active' : ''}`} type="button" onClick={() => setStatus(s)}>
                {ORDER_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label">Notas (opcional)</label>
          <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {!isEdit && <PhotoField entityType="order" entityId={null} onPendingFile={setPendingFile} label="Fotografía (opcional)" />}

        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleSubmit} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar pedido'}
        </button>
      </div>
    </div>
  )
}
