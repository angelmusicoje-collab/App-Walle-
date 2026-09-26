export type PaymentMethod = 'efectivo' | 'transferencia' | 'tarjeta' | 'otro'
export type OrderStatus = 'pendiente' | 'confirmado' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado'
export type MovementStatus = 'activo' | 'cancelado'
export type PhotoEntity = 'product' | 'order' | 'expense'
export type PhotoKind = 'foto' | 'comprobante' | 'ticket'

export interface Profile {
  id: string
  full_name: string
  email: string | null
  participation_percentage: number | null
  created_at: string
  updated_at: string
}

export interface BusinessSettings {
  id: boolean
  business_name: string
  logo_path: string | null
  currency: string
  use_participation_split: boolean
  created_at: string
  updated_at: string
}

export interface ExpenseCategory {
  id: string
  name: string
  emoji: string
  is_active: boolean
}

export interface Product {
  id: string
  name: string
  description: string | null
  sale_price: number
  ingredient_cost: number
  packaging_cost: number
  other_costs: number
  total_cost: number
  profit_estimate: number
  margin_percent: number
  photo_path: string | null
  is_active: boolean
  is_demo: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  notes: string | null
  is_demo: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  order_count?: number
  total_purchased?: number
  last_order_at?: string | null
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name_snapshot: string
  unit_price_snapshot: number
  unit_cost_snapshot: number
  quantity: number
}

export interface Order {
  id: string
  order_number: number
  customer_id: string
  status: OrderStatus
  payment_method: PaymentMethod
  subtotal: number
  total: number
  notes: string | null
  is_demo: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  customers?: Customer
  order_items?: OrderItem[]
  creator?: Profile
}

export interface Expense {
  id: string
  expense_date: string
  concept: string
  category_id: string | null
  amount: number
  payment_method: PaymentMethod
  status: MovementStatus
  notes: string | null
  is_demo: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  expense_categories?: ExpenseCategory
}

export interface Contribution {
  id: string
  partner_id: string
  amount: number
  movement_date: string
  note: string | null
  status: MovementStatus
  is_demo: boolean
  created_by: string | null
  created_at: string
  profiles?: Profile
}

export interface Withdrawal {
  id: string
  partner_id: string
  amount: number
  movement_date: string
  note: string | null
  status: MovementStatus
  is_demo: boolean
  created_by: string | null
  created_at: string
  profiles?: Profile
}

export interface Photo {
  id: string
  entity_type: PhotoEntity
  entity_id: string
  kind: PhotoKind
  storage_path: string
  uploaded_by: string | null
  created_at: string
}

export interface Movement {
  id: string
  type: 'venta' | 'gasto' | 'aportacion' | 'retiro'
  at: string
  status: string
  concept: string
  amount: number
  person: string | null
  category: string | null
  created_by: string | null
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado'
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pendiente: '#E8A33D',
  confirmado: '#3D8BE8',
  en_preparacion: '#8A5FE0',
  listo: '#2FA5A9',
  entregado: '#3FA65C',
  cancelado: '#D95555'
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  otro: 'Otro'
}
