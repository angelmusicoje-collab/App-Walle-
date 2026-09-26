import { type ReactNode, type CSSProperties, useState } from 'react'
import { createPortal } from 'react-dom'

export function TopBar({ title, right, onBack }: { title: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button className="topbar-back" onClick={onBack} aria-label="Volver">
          ←
        </button>
      ) : (
        <span className="topbar-spacer" />
      )}
      <h1 className="topbar-title">{title}</h1>
      <div className="topbar-right">{right}</div>
    </header>
  )
}

export function LoadingScreen({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  )
}

export function EmptyState({ icon = '🍜', title, subtitle }: { icon?: string; title: string; subtitle?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <p className="empty-title">{title}</p>
      {subtitle && <p className="empty-subtitle">{subtitle}</p>}
    </div>
  )
}

export function Card({
  children,
  className = '',
  style
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  )
}

export function Banner({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
  return <div className={`banner banner-${kind}`}>{children}</div>
}

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}

let confirmResolver: ((v: boolean) => void) | null = null
let setConfirmState: ((s: (ConfirmOptions & { open: boolean }) | null) => void) | null = null

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    confirmResolver = resolve
    setConfirmState?.({ ...opts, open: true })
  })
}

export function ConfirmDialogHost() {
  const [state, setState] = useState<(ConfirmOptions & { open: boolean }) | null>(null)
  setConfirmState = setState

  if (!state?.open) return null

  function resolve(v: boolean) {
    confirmResolver?.(v)
    confirmResolver = null
    setState(null)
  }

  return createPortal(
    <div className="modal-overlay" onClick={() => resolve(false)}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3>{state.title}</h3>
        <p>{state.message}</p>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => resolve(false)}>
            Cancelar
          </button>
          <button className={`btn ${state.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => resolve(true)}>
            {state.confirmLabel ?? 'Confirmar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

let toastSetter: ((msg: string | null) => void) | null = null
export function showToast(msg: string) {
  toastSetter?.(msg)
  window.setTimeout(() => toastSetter?.(null), 2600)
}

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null)
  toastSetter = setMsg
  if (!msg) return null
  return createPortal(<div className="toast">{msg}</div>, document.body)
}
