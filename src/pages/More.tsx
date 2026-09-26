import { Link } from 'react-router-dom'
import { TopBar, confirmDialog } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'

const items = [
  { to: '/clientes', icon: '👤', label: 'Clientes' },
  { to: '/gastos', icon: '💸', label: 'Gastos' },
  { to: '/socias', icon: '👥', label: 'Socias' },
  { to: '/movimientos', icon: '📜', label: 'Historial de movimientos' },
  { to: '/configuracion', icon: '⚙️', label: 'Configuración' }
]

export default function More() {
  const { profile, signOut } = useAuth()

  async function handleLogout() {
    const ok = await confirmDialog({ title: 'Cerrar sesión', message: '¿Segura que quieres salir de WAMI?', confirmLabel: 'Cerrar sesión' })
    if (ok) await signOut()
  }

  return (
    <div>
      <TopBar title="Más" />
      <div className="page">
        <p className="section-sub">Sesión iniciada como {profile?.full_name ?? profile?.email}</p>
        <nav className="menu-list">
          {items.map((it) => (
            <Link key={it.to} to={it.to} className="menu-item">
              <span className="menu-item-icon">{it.icon}</span>
              {it.label}
              <span className="menu-item-arrow">›</span>
            </Link>
          ))}
          <button className="menu-item" onClick={handleLogout}>
            <span className="menu-item-icon">🚪</span>
            Cerrar sesión
          </button>
        </nav>
      </div>
    </div>
  )
}
