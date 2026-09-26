import { type FormEvent, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email || !password) {
      setError('Escribe tu correo y contraseña.')
      return
    }
    setLoading(true)
    const { error } = await signIn(email.trim(), password)
    setLoading(false)
    if (error) setError(error)
  }

  return (
    <div className="login-screen">
      <div className="login-logo">🍜</div>
      <h1 className="login-title">WAMI</h1>
      <p className="login-subtitle">Administra pedidos, ventas y gastos</p>

      <form onSubmit={handleSubmit}>
        {error && <div className="banner banner-error">{error}</div>}
        <div className="field">
          <label className="field-label">Correo</label>
          <input
            className="input"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@ejemplo.com"
          />
        </div>
        <div className="field">
          <label className="field-label">Contraseña</label>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </form>
      <p className="hint" style={{ textAlign: 'center', marginTop: 20 }}>
        Solo las socias registradas de WAMI pueden entrar. Si olvidaste tu contraseña, pide a tu hermana que te la
        restablezca desde el Dashboard de Supabase.
      </p>
    </div>
  )
}
