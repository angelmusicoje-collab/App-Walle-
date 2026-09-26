import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar, Banner, showToast, confirmDialog, LoadingScreen } from '../components/ui'
import { PhotoField } from '../components/PhotoField'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useExpenseCategories } from '../hooks/useSettings'
import { PAYMENT_LABELS } from '../types'
import type { Expense, PaymentMethod } from '../types'

const PAYMENT_METHODS: PaymentMethod[] = ['efectivo', 'transferencia', 'tarjeta', 'otro']

export default function ExpenseForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { categories } = useExpenseCategories()

  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [concept, setConcept] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo')
  const [notes, setNotes] = useState('')
  const [expenseId, setExpenseId] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) loadExpense(id)
  }, [id])

  useEffect(() => {
    if (!isEdit && categories.length && !categoryId) setCategoryId(categories[0].id)
  }, [categories, isEdit, categoryId])

  async function loadExpense(eid: string) {
    const { data } = await supabase.from('expenses').select('*').eq('id', eid).single()
    const e = data as Expense | null
    if (e) {
      setExpenseDate(e.expense_date)
      setConcept(e.concept)
      setCategoryId(e.category_id)
      setAmount(String(e.amount))
      setPaymentMethod(e.payment_method)
      setNotes(e.notes ?? '')
      setExpenseId(e.id)
    }
    setLoading(false)
  }

  async function handleSubmit() {
    setError(null)
    const amt = parseFloat(amount)
    if (!concept.trim()) return setError('Escribe el concepto del gasto.')
    if (!amt || amt <= 0) return setError('El monto debe ser mayor a 0.')

    setSaving(true)
    try {
      const payload = {
        expense_date: expenseDate,
        concept: concept.trim(),
        category_id: categoryId,
        amount: amt,
        payment_method: paymentMethod,
        notes: notes.trim() || null
      }

      let eid = expenseId
      if (isEdit && eid) {
        const { error: upErr } = await supabase.from('expenses').update(payload).eq('id', eid)
        if (upErr) throw upErr
      } else {
        const { data, error: insErr } = await supabase
          .from('expenses')
          .insert({ ...payload, created_by: user?.id ?? null })
          .select('id')
          .single()
        if (insErr || !data) throw insErr ?? new Error('No se pudo crear el gasto.')
        eid = data.id
      }

      if (pendingFile && eid) {
        const ext = pendingFile.name.split('.').pop() || 'jpg'
        const path = `expense/${eid}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('wami-photos').upload(path, pendingFile)
        if (!upErr) {
          await supabase
            .from('photos')
            .insert({ entity_type: 'expense', entity_id: eid, kind: 'ticket', storage_path: path, uploaded_by: user?.id ?? null })
        }
      }

      showToast(isEdit ? 'Gasto actualizado' : 'Gasto registrado')
      navigate('/gastos')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el gasto.')
    } finally {
      setSaving(false)
    }
  }

  async function handleCancelExpense() {
    if (!expenseId) return
    const ok = await confirmDialog({
      title: 'Cancelar gasto',
      message: 'Este gasto se marcará como cancelado y no contará en tus finanzas. No se elimina el registro.',
      confirmLabel: 'Cancelar gasto',
      danger: true
    })
    if (!ok) return
    await supabase.from('expenses').update({ status: 'cancelado' }).eq('id', expenseId)
    showToast('Gasto cancelado')
    navigate('/gastos')
  }

  if (loading) return <LoadingScreen />

  return (
    <div>
      <TopBar title={isEdit ? 'Editar gasto' : 'Nuevo gasto'} onBack={() => navigate(-1)} />
      <div className="page">
        {error && <Banner kind="error">{error}</Banner>}

        <div className="field">
          <label className="field-label">Concepto</label>
          <input className="input" value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Compra de verduras" />
        </div>

        <div className="field">
          <label className="field-label">Monto</label>
          <input className="input" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </div>

        <div className="field">
          <label className="field-label">Categoría</label>
          <div className="chip-row">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip ${categoryId === c.id ? 'active' : ''}`}
                onClick={() => setCategoryId(c.id)}
              >
                {c.emoji} {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label">Fecha</label>
          <input className="input" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
        </div>

        <div className="field">
          <label className="field-label">Método de pago</label>
          <div className="chip-row">
            {PAYMENT_METHODS.map((pm) => (
              <button key={pm} type="button" className={`chip ${paymentMethod === pm ? 'active' : ''}`} onClick={() => setPaymentMethod(pm)}>
                {PAYMENT_LABELS[pm]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label">Notas (opcional)</label>
          <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <PhotoField entityType="expense" entityId={expenseId} kind="ticket" label="Foto del ticket / comprobante" onPendingFile={setPendingFile} />

        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={handleSubmit} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar gasto'}
        </button>
        {isEdit && (
          <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={handleCancelExpense}>
            Cancelar este gasto
          </button>
        )}
      </div>
    </div>
  )
}
