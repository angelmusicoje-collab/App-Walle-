import { useEffect, useState } from 'react'
import { TopBar, LoadingScreen, EmptyState } from '../components/ui'
import { supabase } from '../lib/supabase'
import { formatMoney, formatDateTime, downloadCSV, toLocalDateString } from '../lib/format'
import type { Movement } from '../types'

const TYPE_LABELS: Record<Movement['type'], string> = {
  venta: '🛍️ Venta',
  gasto: '💸 Gasto',
  aportacion: '🤝 Aportación',
  retiro: '🏧 Retiro'
}

export default function Movements() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<Movement['type'] | 'todos'>('todos')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('movements_view').select('*').order('at', { ascending: false }).limit(500)
    setMovements((data as Movement[]) ?? [])
    setLoading(false)
  }

  const filtered = movements.filter((m) => typeFilter === 'todos' || m.type === typeFilter)

  function exportCSV() {
    downloadCSV(
      `wami_movimientos_${toLocalDateString()}.csv`,
      filtered.map((m) => ({
        fecha: m.at,
        tipo: m.type,
        concepto: m.concept,
        monto: m.amount,
        persona: m.person ?? '',
        categoria: m.category ?? '',
        estado: m.status
      }))
    )
  }

  return (
    <div>
      <TopBar title="Movimientos" right={<button className="topbar-back" onClick={exportCSV}>⬇️</button>} />
      <div className="page">
        <div className="filter-row">
          <button className={`chip ${typeFilter === 'todos' ? 'active' : ''}`} onClick={() => setTypeFilter('todos')}>
            Todos
          </button>
          {(Object.keys(TYPE_LABELS) as Movement['type'][]).map((t) => (
            <button key={t} className={`chip ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingScreen label="Cargando movimientos…" />
        ) : filtered.length === 0 ? (
          <EmptyState icon="📜" title="Sin movimientos" />
        ) : (
          filtered.map((m) => (
            <div key={`${m.type}-${m.id}`} className="list-card">
              <div className="order-card-top">
                <span>{TYPE_LABELS[m.type]}</span>
                <strong style={{ color: m.type === 'venta' || m.type === 'aportacion' ? 'var(--money-in)' : 'var(--money-out)' }}>
                  {formatMoney(m.amount)}
                </strong>
              </div>
              <div className="order-items-preview">{m.concept}</div>
              <div className="order-card-bottom">
                <span className="order-time">
                  {formatDateTime(m.at)} {m.person ? `· ${m.person}` : ''} {m.category ? `· ${m.category}` : ''}
                </span>
                {m.status === 'cancelado' && <span className="status-pill" style={{ background: 'var(--ink-soft)' }}>Cancelado</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
