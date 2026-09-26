-- =====================================================================
-- WAMI — Row Level Security
-- =====================================================================
-- Regla general de este negocio: solo existen 1-3 usuarias, y CUALQUIER
-- usuaria autenticada debe poder ver y administrar TODOS los datos del
-- negocio (no hay datos "privados" de una socia frente a la otra, excepto
-- su propio perfil). Por eso las políticas son "to authenticated using
-- (true)" en vez de reglas por dueño de fila.
--
-- Lo que SÍ queda bloqueado siempre: cualquier usuario NO autenticado
-- (rol "anon"), que es como llega cualquier visitante sin haber iniciado
-- sesión. No hay registro público (ver sección de Authentication del README).
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.business_settings enable row level security;
alter table public.expense_categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.expenses enable row level security;
alter table public.contributions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.photos enable row level security;

-- PROFILES: todas pueden leer los perfiles (para ver el nombre de la otra
-- socia), pero cada quien solo edita el suyo.
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- BUSINESS_SETTINGS
create policy "business_settings_select" on public.business_settings
  for select to authenticated using (true);
create policy "business_settings_update" on public.business_settings
  for update to authenticated using (true) with check (true);

-- EXPENSE_CATEGORIES
create policy "expense_categories_select" on public.expense_categories
  for select to authenticated using (true);
create policy "expense_categories_insert" on public.expense_categories
  for insert to authenticated with check (true);
create policy "expense_categories_update" on public.expense_categories
  for update to authenticated using (true) with check (true);

-- PRODUCTS
create policy "products_select" on public.products
  for select to authenticated using (true);
create policy "products_insert" on public.products
  for insert to authenticated with check (true);
create policy "products_update" on public.products
  for update to authenticated using (true) with check (true);

-- CUSTOMERS
create policy "customers_select" on public.customers
  for select to authenticated using (true);
create policy "customers_insert" on public.customers
  for insert to authenticated with check (true);
create policy "customers_update" on public.customers
  for update to authenticated using (true) with check (true);

-- ORDERS
create policy "orders_select" on public.orders
  for select to authenticated using (true);
create policy "orders_insert" on public.orders
  for insert to authenticated with check (true);
create policy "orders_update" on public.orders
  for update to authenticated using (true) with check (true);

-- ORDER_ITEMS (insert/delete se usan desde create_order/update_order_items,
-- que corren "security invoker", es decir con estos mismos permisos)
create policy "order_items_select" on public.order_items
  for select to authenticated using (true);
create policy "order_items_insert" on public.order_items
  for insert to authenticated with check (true);
create policy "order_items_update" on public.order_items
  for update to authenticated using (true) with check (true);
create policy "order_items_delete" on public.order_items
  for delete to authenticated using (true);

-- EXPENSES
create policy "expenses_select" on public.expenses
  for select to authenticated using (true);
create policy "expenses_insert" on public.expenses
  for insert to authenticated with check (true);
create policy "expenses_update" on public.expenses
  for update to authenticated using (true) with check (true);

-- CONTRIBUTIONS
create policy "contributions_select" on public.contributions
  for select to authenticated using (true);
create policy "contributions_insert" on public.contributions
  for insert to authenticated with check (true);
create policy "contributions_update" on public.contributions
  for update to authenticated using (true) with check (true);

-- WITHDRAWALS
create policy "withdrawals_select" on public.withdrawals
  for select to authenticated using (true);
create policy "withdrawals_insert" on public.withdrawals
  for insert to authenticated with check (true);
create policy "withdrawals_update" on public.withdrawals
  for update to authenticated using (true) with check (true);

-- PHOTOS
create policy "photos_select" on public.photos
  for select to authenticated using (true);
create policy "photos_insert" on public.photos
  for insert to authenticated with check (true);
create policy "photos_delete" on public.photos
  for delete to authenticated using (true);

-- Nota: a propósito NO hay políticas de DELETE para orders, expenses,
-- products, customers, contributions ni withdrawals. La app nunca borra
-- esa información: usa is_active/status = 'cancelado' (soft delete),
-- tal como pide la sección 27 del brief.
