import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TopBar, LoadingScreen, EmptyState } from '../components/ui'
import { supabase, WAMI_PHOTOS_BUCKET } from '../lib/supabase'
import { formatMoney } from '../lib/format'
import type { Product } from '../types'

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)
  const [thumbs, setThumbs] = useState<Record<string, string>>({})

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('name')
    const list = (data as Product[]) ?? []
    setProducts(list)
    setLoading(false)

    const withPhoto = list.filter((p) => p.photo_path)
    if (withPhoto.length) {
      const entries = await Promise.all(
        withPhoto.map(async (p) => {
          const { data: signed } = await supabase.storage.from(WAMI_PHOTOS_BUCKET).createSignedUrl(p.photo_path!, 3600)
          return [p.id, signed?.signedUrl ?? ''] as const
        })
      )
      setThumbs(Object.fromEntries(entries))
    }
  }

  const visible = products.filter((p) => showInactive || p.is_active)

  return (
    <div>
      <TopBar
        title="Productos"
        right={
          <Link to="/productos/nuevo" className="topbar-back" aria-label="Nuevo producto">
            ➕
          </Link>
        }
      />
      <div className="page">
        <div className="filter-row">
          <button className={`chip ${!showInactive ? 'active' : ''}`} onClick={() => setShowInactive(false)}>
            Activos
          </button>
          <button className={`chip ${showInactive ? 'active' : ''}`} onClick={() => setShowInactive(true)}>
            Todos
          </button>
        </div>

        {loading ? (
          <LoadingScreen label="Cargando productos…" />
        ) : visible.length === 0 ? (
          <EmptyState icon="📦" title="Aún no hay productos" subtitle="Agrega tu primer producto con el botón ➕" />
        ) : (
          visible.map((p) => (
            <Link key={p.id} to={`/productos/${p.id}/editar`} className="list-card">
              <div className="product-row">
                {thumbs[p.id] ? (
                  <img src={thumbs[p.id]} className="product-thumb" alt={p.name} />
                ) : (
                  <div className="product-thumb product-thumb-empty">🍜</div>
                )}
                <div className="product-info">
                  <div className="product-name">
                    {p.name}
                    {!p.is_active && <span className="badge-inactive">Inactivo</span>}
                    {p.is_demo && <span className="badge-demo">DEMO</span>}
                  </div>
                  <div className="product-meta">
                    Costo {formatMoney(p.total_cost)} · Margen {p.margin_percent}%
                  </div>
                </div>
                <div className="product-price">{formatMoney(p.sale_price)}</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
