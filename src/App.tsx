import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { LoadingScreen } from './components/ui'
import { BottomNav } from './components/BottomNav'
import { ConfirmDialogHost, ToastHost } from './components/ui'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import OrderForm from './pages/OrderForm'
import OrderDetail from './pages/OrderDetail'
import Products from './pages/Products'
import ProductForm from './pages/ProductForm'
import Customers from './pages/Customers'
import Expenses from './pages/Expenses'
import ExpenseForm from './pages/ExpenseForm'
import Finances from './pages/Finances'
import Partners from './pages/Partners'
import Movements from './pages/Movements'
import Settings from './pages/Settings'
import More from './pages/More'

function Protected({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingScreen label="Entrando a WAMI…" />
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <LoadingScreen label="Entrando a WAMI…" />

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pedidos" element={<Orders />} />
          <Route path="/pedidos/nuevo" element={<OrderForm />} />
          <Route path="/pedidos/:id" element={<OrderDetail />} />
          <Route path="/pedidos/:id/editar" element={<OrderForm />} />
          <Route path="/productos" element={<Products />} />
          <Route path="/productos/nuevo" element={<ProductForm />} />
          <Route path="/productos/:id/editar" element={<ProductForm />} />
          <Route path="/clientes" element={<Customers />} />
          <Route path="/gastos" element={<Expenses />} />
          <Route path="/gastos/nuevo" element={<ExpenseForm />} />
          <Route path="/gastos/:id/editar" element={<ExpenseForm />} />
          <Route path="/finanzas" element={<Finances />} />
          <Route path="/socias" element={<Partners />} />
          <Route path="/movimientos" element={<Movements />} />
          <Route path="/configuracion" element={<Settings />} />
          <Route path="/mas" element={<More />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
      <ConfirmDialogHost />
      <ToastHost />
    </div>
  )
}

export { Protected }
