import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TopBar, LoadingScreen, Card, Banner } from '../components/ui'
import { FabButtons } from '../components/FabButtons'
import { useAuth } from '../contexts/AuthContext'
import { useBusinessSettings } from '../hooks/useSettings'
import {
  getPeriodTotals,
  getPendingOrdersCount,
  getTopProduct,
  getSalesByDay,
  getExpensesByCategory,
  type PeriodTotals
} from '../lib/queries'
import { formatMoney, pctChange, startOfToday, startOfWeek, startOfMonth } from '../lib/format'

const COLORS = ['#E85D3D', '#3D8BE8', '#2FA5A9', '#8A5FE0', '#E8A33D', '#3FA65C']

export default function Dashboard() {
  const { profile } = useAuth()
  const { settings } = useBusinessSettings()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [today, setToday] = useState<PeriodTotals | null>(null)
  const [week, setWeek] = useState<PeriodTotals | null>(null)
  const [month, setMonth] = useState<PeriodTotals | null>(null)
  const [yesterday, setYesterday] = useState<PeriodTotals | null>(null)
  const [pending, setPending] = useState(0)
  const [topProduct, setTopProduct] = useState<string | null>(null)
  const [salesByDay, setSalesByDay] = useState<{ day: string; total: number }[]>([])
  const [expensesByCat, setExpensesByCat] = useState<{ name: string; total: number }[]>([])

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const now = new Date()
      const todayStart = startOfToday()
      const yestStart = new Date(todayStart)
      yestStart.setDate(yestStart.getDate() - 1)
      const weekStart = startOfWeek()
      const monthStart = startOfMonth()
      const monthAgoStart = new Date(monthStart)
      monthAgoStart.setDate(monthAgoStart.getDate() - 30)

      const [t, y, w, m, p, tp, sbd, ebc] = await Promise.all([
        getPeriodTotals(todayStart, now),
        getPeriodTotals(yestStart, todayStart),
        getPeriodTotals(weekStart, now),
        getPeriodTotals(monthStart, now),
        getPendingOrdersCount(),
        getTopProduct(monthStart, now),
        getSalesByDay(monthAgoStart, now),
        getExpensesByCategory(monthStart, now)
      ])
      setToday(t)
      setYesterday(y)
      setWeek(w)
      setMonth(m)
      setPending(p)
      setTopProduct(tp?.name ?? null)
      setSalesByDay(sbd)
      setExpensesByCat(ebc)
    } catch {
      setError('No se pudo cargar la información. Revisa tu conexión e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const currency = settings?.currency ?? 'MXN'

  if (loading) return <LoadingScreen label="Cargando el dashboard…" />

  if (error || !today) {
    return (
      <div>
        <TopBar title="Inicio" />
        <div className="page">
          <Banner kind="error">{error ?? 'No se pudo cargar la información.'}</Banner>
          <button className="btn btn-primary" onClick={load}>
            Reintentar
          </button>
        </div>
        <FabButtons />
      </div>
    )
  }

  const salesDelta = pctChange(today.sales, yesterday?.sales ?? 0)

  return (
    <div>
      <TopBar
        title={`Hola${profile?.full_name ? ', ' + profile.full_name.split(' ')[0] : ''} 👋`}
        right={
          <Link to="/configuracion" className="topbar-back" aria-label="Configuración">
            ⚙️
          </Link>
        }
      />
      <div className="page">
        <p className="section-sub">{settings?.business_name ?? 'WAMI'} · Hoy</p>

        <div className="grid-2">
          <div className="stat-card">
            <div className="stat-label">💰 Ventas</div>
            <div className="stat-value">{formatMoney(today.sales, currency)}</div>
            {salesDelta !== null && (
              <div className="stat-delta">
                {salesDelta >= 0 ? '▲' : '▼'} {Math.abs(salesDelta).toFixed(0)}% vs ayer
              </div>
            )}
          </div>
          <div className="stat-card">
            <div className="stat-label">💸 Gastos</div>
            <div className="stat-value">{formatMoney(today.expenses, currency)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">📈 Ganancia estimada</div>
            <div className={`stat-value ${today.profit >= 0 ? 'positive' : 'negative'}`}>
              {formatMoney(today.profit, currency)}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">🍜 Pedidos</div>
            <div className="stat-value">{today.orderCount}</div>
          </div>
        </div>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>🍜 Pedidos pendientes</span>
            <strong>{pending}</strong>
          </div>
          {topProduct && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span>🏆 Producto más vendido (mes)</span>
              <strong>{topProduct}</strong>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span>💵 Dinero disponible (mes)</span>
            <strong>{formatMoney(month?.cashAvailable, currency)}</strong>
          </div>
        </Card>

        <h2 className="section-title">Esta semana</h2>
        <PeriodRow data={week} currency={currency} />

        <h2 className="section-title">Este mes</h2>
        <PeriodRow data={month} currency={currency} />

        {salesByDay.length > 0 && (
          <>
            <h2 className="section-title">Ventas por día</h2>
            <Card>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={salesByDay}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis hide />
                  <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
                  <Bar dataKey="total" fill="#E85D3D" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}

        {expensesByCat.length > 0 && (
          <>
            <h2 className="section-title">Gastos por categoría (mes)</h2>
            <Card>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={expensesByCat} dataKey="total" nameKey="name" outerRadius={75} label={(d) => d.name}>
                    {expensesByCat.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatMoney(v, currency)} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </>
        )}
      </div>
      <FabButtons />
    </div>
  )
}

function PeriodRow({ data, currency }: { data: PeriodTotals | null; currency: string }) {
  if (!data) return null
  return (
    <div className="grid-2">
      <div className="stat-card">
        <div className="stat-label">Ventas</div>
        <div className="stat-value">{formatMoney(data.sales, currency)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Gastos</div>
        <div className="stat-value">{formatMoney(data.expenses, currency)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Ganancia</div>
        <div className={`stat-value ${data.profit >= 0 ? 'positive' : 'negative'}`}>
          {formatMoney(data.profit, currency)}
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Pedidos</div>
        <div className="stat-value">{data.orderCount}</div>
      </div>
    </div>
  )
}
