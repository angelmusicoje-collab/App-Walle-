import { useEffect, useState } from 'react'
import { TopBar, Card, Banner, showToast } from '../components/ui'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useProfiles } from '../hooks/useSettings'
import { formatMoney, formatDate } from '../lib/format'
import type { Contribution, Withdrawal } from '../types'

type MovType = 'aportacion' | 'retiro'

export default function Partners() {
  const { user, profile } = useAuth()
  const { profiles } = useProfiles()
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])

  const [showForm, setShowForm] = useState<MovType | null>(null)
  const [partnerId, setPartnerId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (profile && !partnerId) setPartnerId(profile.id)
  }, [profile])

  async function load() {
    const [{ data: c }, { data: w }] = await Promise.all([
      supabase.from('contributions').select('*, profiles(full_name)').order('movement_date', { ascending: false }),
      supabase.from('withdrawals').select('*, profiles(full_name)').order('movement_date', { ascending: false })
    ])
    setContributions((c as Contribution[]) ?? [])
    setWithdrawals((w as Withdrawal[]) ?? [])
  }

  const totalsByPartner = profiles.map((p) => {
    const contrib = contributions.filter((c) => c.partner_id === p.id && c.status === 'activo').reduce((a, c) => a + Number(c.amount), 0)
    const withd = withdrawals.filter((w) => w.partner_id === p.id && w.status === 'activo').reduce((a, w) => a + Number(w.amount), 0)
    return { profile: p, contrib, withd }
  })

  async function handleSubmit() {
    setError(null)
    const amt = parseFloat(amount)
    if (!partnerId) return setError('Selecciona quién hizo el movimiento.')
    if (!amt || amt <= 0) return setError('El monto debe ser mayor a 0.')

    setSaving(true)
    try {
      const table = showForm === 'aportacion' ? 'contributions' : 'withdrawals'
      const { error: insErr } = await supabase.from(table).insert({
        partner_id: partnerId,
        amount: amt,
        note: note.trim() || null,
        created_by: user?.id ?? null
      })
      if (insErr) throw insErr
      showToast(showForm === 'aportacion' ? 'Aportación registrada' : 'Retiro registrado')
      setAmount('')
      setNote('')
      setShowForm(null)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <TopBar title="👥 Socias" />
      <div className="page">
        <div className="grid-2">
          {totalsByPartner.map((t) => (
            <Card key={t.profile.id}>
              <div style={{ fontWeight: 700 }}>{t.profile.full_name}</div>
              {t.profile.participation_percentage != null && (
                <p className="hint">Participación: {t.profile.participation_percentage}%</p>
              )}
              <div className="summary-row">
                <span>Aportó</span>
                <strong>{formatMoney(t.contrib)}</strong>
              </div>
              <div className="summary-row">
                <span>Retiró</span>
                <strong>{formatMoney(t.withd)}</strong>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid-2" style={{ marginTop: 4 }}>
          <button className="btn btn-secondary" onClick={() => setShowForm('aportacion')}>
            ➕ Aportación
          </button>
          <button className="btn btn-secondary" onClick={() => setShowForm('retiro')}>
            ➕ Retiro
          </button>
        </div>

        {showForm && (
          <Card style={{ marginTop: 14 }}>
            <h3 style={{ marginTop: 0 }}>{showForm === 'aportacion' ? 'Nueva aportación' : 'Nuevo retiro'}</h3>
            {error && <Banner kind="error">{error}</Banner>}
            <div className="field">
              <label className="field-label">Socia</label>
              <div className="chip-row">
                {profiles.map((p) => (
                  <button key={p.id} className={`chip ${partnerId === p.id ? 'active' : ''}`} onClick={() => setPartnerId(p.id)}>
                    {p.full_name}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="field-label">Monto</label>
              <input className="input" type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Nota (opcional)</label>
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </Card>
        )}

        <h2 className="section-title">Historial</h2>
        {[...contributions.map((c) => ({ ...c, kind: 'aportacion' as const })), ...withdrawals.map((w) => ({ ...w, kind: 'retiro' as const }))]
          .sort((a, b) => new Date(b.movement_date).getTime() - new Date(a.movement_date).getTime())
          .map((m) => (
            <div key={m.id} className="list-card">
              <div className="order-card-top">
                <span>
                  {m.kind === 'aportacion' ? '🤝' : '🏧'} {(m as Contribution).profiles?.full_name}
                </span>
                <strong style={{ color: m.kind === 'aportacion' ? 'var(--money-in)' : 'var(--money-out)' }}>
                  {m.kind === 'aportacion' ? '+' : '-'}
                  {formatMoney(m.amount)}
                </strong>
              </div>
              <div className="order-card-bottom">
                <span className="order-time">
                  {formatDate(m.movement_date)} {m.note ? `· ${m.note}` : ''}
                </span>
                {m.status === 'cancelado' && <span className="status-pill" style={{ background: 'var(--ink-soft)' }}>Cancelado</span>}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
