import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar, Card, Banner, showToast } from '../components/ui'
import { supabase } from '../lib/supabase'
import { useBusinessSettings, useProfiles } from '../hooks/useSettings'

export default function Settings() {
  const navigate = useNavigate()
  const { settings, reload } = useBusinessSettings()
  const { profiles, reload: reloadProfiles } = useProfiles()

  const [businessName, setBusinessName] = useState('')
  const [currency, setCurrency] = useState('MXN')
  const [useSplit, setUseSplit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (settings) {
      setBusinessName(settings.business_name)
      setCurrency(settings.currency)
      setUseSplit(settings.use_participation_split)
    }
  }, [settings])

  async function save() {
    setSaving(true)
    const { error } = await supabase
      .from('business_settings')
      .update({ business_name: businessName, currency, use_participation_split: useSplit })
      .eq('id', true)
    setSaving(false)
    if (!error) {
      showToast('Configuración guardada')
      reload()
    } else {
      setMsg('No se pudo guardar. Intenta de nuevo.')
    }
  }

  async function updatePercentage(id: string, value: string) {
    const pct = value === '' ? null : parseFloat(value)
    await supabase.from('profiles').update({ participation_percentage: pct }).eq('id', id)
    reloadProfiles()
  }

  return (
    <div>
      <TopBar title="⚙️ Configuración" onBack={() => navigate(-1)} />
      <div className="page">
        {msg && <Banner kind="error">{msg}</Banner>}

        <Card>
          <div className="field">
            <label className="field-label">Nombre del negocio</label>
            <input className="input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Moneda</label>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="MXN">MXN — Peso mexicano</option>
              <option value="USD">USD — Dólar</option>
            </select>
          </div>
        </Card>

        <h2 className="section-title">Socias y participación</h2>
        <p className="section-sub">
          El porcentaje es solo informativo — no altera automáticamente los cálculos de ganancia a menos que actives
          la opción de abajo.
        </p>
        <Card>
          {profiles.map((p) => (
            <div key={p.id} className="field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ flex: 1, fontWeight: 600 }}>{p.full_name}</span>
              <input
                className="input"
                style={{ width: 90 }}
                type="number"
                placeholder="%"
                defaultValue={p.participation_percentage ?? ''}
                onBlur={(e) => updatePercentage(p.id, e.target.value)}
              />
            </div>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 13, fontWeight: 600 }}>
            <input type="checkbox" checked={useSplit} onChange={(e) => setUseSplit(e.target.checked)} />
            Usar este porcentaje para repartir ganancias
          </label>
        </Card>

        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </button>

        <p className="hint" style={{ marginTop: 20, textAlign: 'center' }}>
          Para agregar una nueva usuaria, créala desde el Dashboard de Supabase (Authentication → Add user). Aparecerá
          aquí automáticamente.
        </p>
      </div>
    </div>
  )
}
