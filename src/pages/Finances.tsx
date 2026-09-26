import { useEffect, useState } from 'react'
import { TopBar, Card, LoadingScreen, Banner } from '../components/ui'
import { useBusinessSettings } from '../hooks/useSettings'
import { getPeriodTotals, type PeriodTotals } from '../lib/queries'
import {
  formatMoney,
  startOfToday,
  startOfMonth,
  startOfPrevMonth,
  endOfPrevMonth,
  toLocalDateString,
  parseLocalDate
} from '../lib/format'

type Period = 'hoy' | '7dias' | 'mes' | 'mes_anterior' | 'personalizado'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'hoy', label: 'Hoy' },
  { key: '7dias', label: '7 días' },
  { key: 'mes', label: 'Este mes' },
  { key: 'mes_anterior', label: 'Mes anterior' },
  { key: 'personalizado', label: 'Personalizado' }
]

export default function Finances() {
  const { settings } = useBusinessSettings()
  const [period, setPeriod] = useState<Period>('mes')
  const [customFrom, setCustomFrom] = useState(() => toLocalDateString())
  const [customTo, setCustomTo] = useState(() => toLocalDateString())
  const [totals, setTotals] = useState<PeriodTotals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [period, customFrom, customTo])

  function rangeFor(p: Period): [Date, Date] {
    const now = new Date()
    if (p === 'hoy') return [startOfToday(), now]
    if (p === '7dias') {
      // Hoy más los 6 días anteriores, completos.
      const d = startOfToday()
      d.setDate(d.getDate() - 6)
      return [d, now]
    }
    if (p === 'mes') return [startOfMonth(), now]
    if (p === 'mes_anterior') return [startOfPrevMonth(), endOfPrevMonth()]
    const end = parseLocalDate(customTo)
    end.setDate(end.getDate() + 1)
    return [parseLocalDate(customFrom), end]
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [from, to] = rangeFor(period)
      setTotals(await getPeriodTotals(from, to))
    } catch {
      setError('No se pudieron calcular las finanzas. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const currency = settings?.currency ?? 'MXN'

  return (
    <div>
      <TopBar title="Finanzas" />
      <div className="page">
        <div className="filter-row">
          {PERIODS.map((p) => (
            <button key={p.key} className={`chip ${period === p.key ? 'active' : ''}`} onClick={() => setPeriod(p.key)}>
              {p.label}
            </button>
          ))}
        </div>

        {period === 'personalizado' && (
          <div className="grid-2" style={{ marginBottom: 12 }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label">Desde</label>
              <input className="input" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label">Hasta</label>
              <input className="input" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          </div>
        )}

        {error ? (
          <Banner kind="error">{error}</Banner>
        ) : loading || !totals ? (
          <LoadingScreen label="Calculando…" />
        ) : (
          <>
            <Card>
              <Row label="💰 Ventas" value={totals.sales} help="Ingresos totales por pedidos entregados o en curso, sin contar cancelados." />
              <Row label="🍜 Costo de lo vendido" value={-totals.cogs} muted />
              <Row label="💸 Gastos operativos" value={-totals.expenses} muted />
              <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '10px 0' }} />
              <Row label="📈 Ganancia estimada" value={totals.profit} bold help="Ventas − costo de lo vendido − gastos operativos." />
            </Card>

            <Card>
              <Row label="🤝 Aportaciones" value={totals.contributions} help="Dinero que las socias metieron al negocio." />
              <Row label="🏧 Retiros" value={-totals.withdrawals} muted help="Dinero que las socias sacaron para uso personal." />
              <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '10px 0' }} />
              <Row
                label="💵 Dinero disponible"
                value={totals.cashAvailable}
                bold
                help="Ventas + aportaciones − gastos − retiros. Es el flujo de efectivo real, distinto de la ganancia."
              />
            </Card>

            <div className="banner banner-info">
              💡 <strong>Ganancia</strong> es lo que sobra de vender menos lo que costó producir y operar.{' '}
              <strong>Dinero disponible</strong> es el efectivo real que entra y sale, incluyendo aportaciones y retiros
              — por eso pueden ser distintos.
            </div>
          </>
        )}

        <p className="hint" style={{ textAlign: 'center', marginTop: 8 }}>
          Moneda: {currency}
        </p>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  bold,
  muted,
  help
}: {
  label: string
  value: number
  bold?: boolean
  muted?: boolean
  help?: string
}) {
  return (
    <div style={{ marginBottom: help ? 4 : 0 }}>
      <div className={`summary-row ${bold ? 'total' : ''}`} style={bold ? { border: 'none', paddingTop: 0, marginTop: 0 } : {}}>
        <span>{label}</span>
        <strong style={{ color: muted ? 'var(--money-out)' : value < 0 ? 'var(--money-out)' : undefined }}>
          {formatMoney(value)}
        </strong>
      </div>
      {help && <p className="hint" style={{ marginTop: -2, marginBottom: 10 }}>{help}</p>}
    </div>
  )
}
