import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TopBar, Card, Banner, confirmDialog, showToast, LoadingScreen } from '../components/ui'
import { PhotoField } from '../components/PhotoField'
import { supabase, WAMI_PHOTOS_BUCKET, buildPhotoPath } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatMoney } from '../lib/format'
import type { Product } from '../types'

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [ingredientCost, setIngredientCost] = useState('')
  const [packagingCost, setPackagingCost] = useState('')
  const [otherCosts, setOtherCosts] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [productId, setProductId] = useState<string | null>(null)
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) loadProduct(id)
  }, [id])

  async function loadProduct(pid: string) {
    const { data } = await supabase.from('products').select('*').eq('id', pid).single()
    const p = data as Product | null
    if (p) {
      setName(p.name)
      setDescription(p.description ?? '')
      setSalePrice(String(p.sale_price))
      setIngredientCost(String(p.ingredient_cost))
      setPackagingCost(String(p.packaging_cost))
      setOtherCosts(String(p.other_costs))
      setIsActive(p.is_active)
      setProductId(p.id)
    }
    setLoading(false)
  }

  const price = parseFloat(salePrice) || 0
  const ing = parseFloat(ingredientCost) || 0
  const pack = parseFloat(packagingCost) || 0
  const other = parseFloat(otherCosts) || 0
  const totalCost = ing + pack + other
  const profit = price - totalCost
  const margin = price > 0 ? (profit / price) * 100 : 0

  async function handleSubmit() {
    setError(null)
    if (!name.trim()) return setError('Ponle un nombre al producto.')
    if (price < 0 || ing < 0 || pack < 0 || other < 0) return setError('Los montos no pueden ser negativos.')

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        sale_price: price,
        ingredient_cost: ing,
        packaging_cost: pack,
        other_costs: other,
        is_active: isActive
      }

      let pid = productId
      if (isEdit && pid) {
        const { error: upErr } = await supabase.from('products').update(payload).eq('id', pid)
        if (upErr) throw upErr
      } else {
        const { data, error: insErr } = await supabase
          .from('products')
          .insert({ ...payload, created_by: user?.id ?? null })
          .select('id')
          .single()
        if (insErr || !data) throw insErr ?? new Error('No se pudo crear el producto.')
        pid = data.id
      }

      if (pendingFile && pid) {
        const ext = pendingFile.name.split('.').pop() || 'jpg'
        const path = buildPhotoPath('product', pid, ext)
        const { error: upErr } = await supabase.storage.from(WAMI_PHOTOS_BUCKET).upload(path, pendingFile)
        if (!upErr) {
          await supabase.from('products').update({ photo_path: path }).eq('id', pid)
          await supabase.from('photos').insert({
            entity_type: 'product',
            entity_id: pid,
            kind: 'foto',
            storage_path: path,
            uploaded_by: user?.id ?? null
          })
        }
      }

      showToast(isEdit ? 'Producto actualizado' : 'Producto creado')
      navigate('/productos')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el producto.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!productId) return
    const ok = await confirmDialog({
      title: 'Desactivar producto',
      message: 'El producto se marcará como inactivo. No se elimina el historial de ventas anteriores.',
      confirmLabel: 'Desactivar',
      danger: true
    })
    if (!ok) return
    await supabase.from('products').update({ is_active: false }).eq('id', productId)
    showToast('Producto desactivado')
    navigate('/productos')
  }

  if (loading) return <LoadingScreen />

  return (
    <div>
      <TopBar title={isEdit ? 'Editar producto' : 'Nuevo producto'} onBack={() => navigate(-1)} />
      <div className="page">
        {error && <Banner kind="error">{error}</Banner>}

        <div className="field">
          <label className="field-label">Nombre</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ramen" />
        </div>
        <div className="field">
          <label className="field-label">Descripción (opcional)</label>
          <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <PhotoField entityType="product" entityId={productId} onPendingFile={setPendingFile} />

        <div className="field" style={{ marginTop: 14 }}>
          <label className="field-label">Precio de venta</label>
          <input
            className="input"
            type="number"
            inputMode="decimal"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            placeholder="120"
          />
        </div>

        <div className="grid-2">
          <div className="field">
            <label className="field-label">Costo ingredientes</label>
            <input className="input" type="number" inputMode="decimal" value={ingredientCost} onChange={(e) => setIngredientCost(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">Empaque</label>
            <input className="input" type="number" inputMode="decimal" value={packagingCost} onChange={(e) => setPackagingCost(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label className="field-label">Otros costos variables</label>
          <input className="input" type="number" inputMode="decimal" value={otherCosts} onChange={(e) => setOtherCosts(e.target.value)} />
        </div>

        <Card>
          <div className="summary-row">
            <span>Costo total</span>
            <strong>{formatMoney(totalCost)}</strong>
          </div>
          <div className="summary-row">
            <span>Ganancia estimada</span>
            <strong className={profit >= 0 ? 'positive' : 'negative'}>{formatMoney(profit)}</strong>
          </div>
          <div className="summary-row total">
            <span>Margen</span>
            <span>{margin.toFixed(2)}%</span>
          </div>
        </Card>

        <div className="field">
          <label className="field-label">Estado</label>
          <div className="chip-row">
            <button className={`chip ${isActive ? 'active' : ''}`} onClick={() => setIsActive(true)} type="button">
              Activo
            </button>
            <button className={`chip ${!isActive ? 'active' : ''}`} onClick={() => setIsActive(false)} type="button">
              Inactivo
            </button>
          </div>
        </div>

        {isEdit && (
          <p className="hint" style={{ marginBottom: 14 }}>
            Si cambias el precio o costo, las ventas anteriores conservan el precio que tenían al momento de
            venderse — no se alteran.
          </p>
        )}

        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        {isEdit && (
          <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={handleDelete}>
            Desactivar producto
          </button>
        )}
      </div>
    </div>
  )
}
