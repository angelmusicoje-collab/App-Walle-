import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Inicio', icon: '🏠', end: true },
  { to: '/pedidos', label: 'Pedidos', icon: '🛍️' },
  { to: '/finanzas', label: 'Finanzas', icon: '💰' },
  { to: '/productos', label: 'Productos', icon: '📦' },
  { to: '/mas', label: 'Más', icon: '☰' }
]

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}
        >
          <span className="bottom-nav-icon">{it.icon}</span>
          <span className="bottom-nav-label">{it.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
