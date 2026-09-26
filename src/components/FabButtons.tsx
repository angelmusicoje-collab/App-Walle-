import { useNavigate } from 'react-router-dom'

export function FabButtons() {
  const navigate = useNavigate()
  return (
    <div className="fab-row">
      <button className="fab fab-expense" onClick={() => navigate('/gastos/nuevo')}>
        ➕ Gasto
      </button>
      <button className="fab fab-sale" onClick={() => navigate('/pedidos/nuevo')}>
        ➕ Venta
      </button>
    </div>
  )
}
