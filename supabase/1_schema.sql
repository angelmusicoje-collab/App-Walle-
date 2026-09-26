-- =====================================================================
-- WAMI — Esquema de base de datos (Supabase / PostgreSQL)
-- =====================================================================
-- Cómo usar este archivo:
-- 1. Abre tu proyecto en https://supabase.com/dashboard
-- 2. Ve a "SQL Editor" -> "New query"
-- 3. Pega TODO este archivo y dale "Run"
-- 4. Después corre, en este orden: 2_rls_policies.sql, 3_storage.sql
-- 5. Crea tus dos usuarias (ver README) y AL FINAL corre 4_seed_demo.sql
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Función genérica para mantener updated_at al día
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- PROFILES — una fila por cada usuaria (extiende auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  participation_percentage numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cuando se crea un usuario en auth.users (desde el Dashboard de Supabase),
-- se crea automáticamente su fila en profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- BUSINESS_SETTINGS — una sola fila (configuración general de WAMI)
-- ---------------------------------------------------------------------
create table public.business_settings (
  id boolean primary key default true,
  business_name text not null default 'WAMI',
  logo_path text,
  currency text not null default 'MXN',
  use_participation_split boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_settings_singleton check (id)
);

create trigger trg_business_settings_updated_at
  before update on public.business_settings
  for each row execute function public.set_updated_at();

insert into public.business_settings (id, business_name, currency) values (true, 'WAMI', 'MXN');

-- ---------------------------------------------------------------------
-- EXPENSE_CATEGORIES — configurable desde Configuración
-- ---------------------------------------------------------------------
create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  emoji text not null default '🧾',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_expense_categories_updated_at
  before update on public.expense_categories
  for each row execute function public.set_updated_at();

insert into public.expense_categories (name, emoji) values
  ('Ingredientes', '🥬'),
  ('Empaques', '📦'),
  ('Bebidas', '🥤'),
  ('Publicidad', '📣'),
  ('Envíos', '🛵'),
  ('Equipo', '🛠️'),
  ('Servicios', '💡'),
  ('Software', '📱'),
  ('Otros', '🧾');

-- ---------------------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sale_price numeric(10,2) not null default 0 check (sale_price >= 0),
  ingredient_cost numeric(10,2) not null default 0 check (ingredient_cost >= 0),
  packaging_cost numeric(10,2) not null default 0 check (packaging_cost >= 0),
  other_costs numeric(10,2) not null default 0 check (other_costs >= 0),
  total_cost numeric(10,2) generated always as (ingredient_cost + packaging_cost + other_costs) stored,
  profit_estimate numeric(10,2) generated always as
    (sale_price - (ingredient_cost + packaging_cost + other_costs)) stored,
  margin_percent numeric(6,2) generated always as (
    case when sale_price > 0
      then round(((sale_price - (ingredient_cost + packaging_cost + other_costs)) / sale_price) * 100, 2)
      else 0
    end
  ) stored,
  photo_path text,
  is_active boolean not null default true,
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create index products_is_active_idx on public.products (is_active);

comment on column public.products.total_cost is 'Calculado automáticamente: ingredient_cost + packaging_cost + other_costs';
comment on column public.products.profit_estimate is 'Calculado automáticamente: sale_price - total_cost';

-- ---------------------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  notes text,
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_customers_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create index customers_phone_idx on public.customers (phone);
create index customers_name_idx on public.customers (lower(name));

-- ---------------------------------------------------------------------
-- ORDERS / ORDER_ITEMS
-- ---------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number integer generated always as identity,
  customer_id uuid not null references public.customers(id) on delete restrict,
  status text not null default 'pendiente'
    check (status in ('pendiente','confirmado','en_preparacion','listo','entregado','cancelado')),
  payment_method text not null
    check (payment_method in ('efectivo','transferencia','tarjeta','otro')),
  subtotal numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  notes text,
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create index orders_status_idx on public.orders (status);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_customer_idx on public.orders (customer_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  unit_price_snapshot numeric(10,2) not null default 0,
  unit_cost_snapshot numeric(10,2) not null default 0,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  line_subtotal numeric(10,2) generated always as (quantity * unit_price_snapshot) stored,
  created_at timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

comment on column public.order_items.product_name_snapshot is
  'Copia congelada del nombre del producto al momento de la venta (no cambia si el producto cambia después)';
comment on column public.order_items.unit_price_snapshot is
  'Copia congelada del precio de venta al momento de la venta';
comment on column public.order_items.unit_cost_snapshot is
  'Copia congelada del costo total del producto al momento de la venta';

-- Recalcula subtotal/total de la orden cada vez que cambian sus items.
create or replace function public.recalc_order_totals()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_order_id uuid;
  v_sum numeric(10,2);
begin
  v_order_id := coalesce(new.order_id, old.order_id);
  select coalesce(sum(line_subtotal), 0) into v_sum
  from public.order_items where order_id = v_order_id;

  update public.orders
  set subtotal = v_sum, total = v_sum, updated_at = now()
  where id = v_order_id;

  return null;
end;
$$;

create trigger trg_order_items_recalc
  after insert or update or delete on public.order_items
  for each row execute function public.recalc_order_totals();

-- Crea una orden completa (orden + items) en una sola transacción, tomando
-- el precio/costo del producto EN ESE MOMENTO desde la tabla products
-- (así garantizamos que el snapshot histórico sea correcto y no se pueda falsear).
create or replace function public.create_order(
  p_id uuid,
  p_customer_id uuid,
  p_payment_method text,
  p_status text,
  p_notes text,
  p_items jsonb,
  p_created_by uuid
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item jsonb;
  v_product record;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido debe tener al menos un producto';
  end if;

  insert into public.orders (id, customer_id, payment_method, status, notes, created_by)
  values (p_id, p_customer_id, p_payment_method, coalesce(p_status, 'pendiente'), p_notes, p_created_by);

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select id, name, sale_price, total_cost into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid;

    if v_product.id is null then
      raise exception 'Producto no encontrado: %', (v_item->>'product_id');
    end if;

    insert into public.order_items
      (order_id, product_id, product_name_snapshot, unit_price_snapshot, unit_cost_snapshot, quantity)
    values (
      p_id, v_product.id, v_product.name, v_product.sale_price, v_product.total_cost,
      (v_item->>'quantity')::numeric
    );
  end loop;

  return p_id;
end;
$$;

-- Reemplaza los items de una orden existente (usado al editar un pedido).
-- Los productos que ya estaban en el pedido conservan su precio/costo de la
-- venta original; solo los productos nuevos toman el precio actual. Así,
-- editar un pedido viejo no lo "re-cobra" con los precios de hoy.
create or replace function public.update_order_items(
  p_order_id uuid,
  p_items jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item jsonb;
  v_product record;
  v_old jsonb;
  v_prev jsonb;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido debe tener al menos un producto';
  end if;

  select coalesce(jsonb_object_agg(product_id::text, jsonb_build_object(
           'name', product_name_snapshot,
           'price', unit_price_snapshot,
           'cost', unit_cost_snapshot)), '{}'::jsonb)
  into v_old
  from public.order_items
  where order_id = p_order_id and product_id is not null;

  delete from public.order_items where order_id = p_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_prev := v_old -> (v_item->>'product_id');

    if v_prev is not null then
      insert into public.order_items
        (order_id, product_id, product_name_snapshot, unit_price_snapshot, unit_cost_snapshot, quantity)
      values (
        p_order_id, (v_item->>'product_id')::uuid, v_prev->>'name',
        (v_prev->>'price')::numeric, (v_prev->>'cost')::numeric,
        (v_item->>'quantity')::numeric
      );
      continue;
    end if;

    select id, name, sale_price, total_cost into v_product
    from public.products
    where id = (v_item->>'product_id')::uuid;

    if v_product.id is null then
      raise exception 'Producto no encontrado: %', (v_item->>'product_id');
    end if;

    insert into public.order_items
      (order_id, product_id, product_name_snapshot, unit_price_snapshot, unit_cost_snapshot, quantity)
    values (
      p_order_id, v_product.id, v_product.name, v_product.sale_price, v_product.total_cost,
      (v_item->>'quantity')::numeric
    );
  end loop;
end;
$$;

revoke all on function public.create_order(uuid,uuid,text,text,text,jsonb,uuid) from public;
grant execute on function public.create_order(uuid,uuid,text,text,text,jsonb,uuid) to authenticated;
revoke all on function public.update_order_items(uuid,jsonb) from public;
grant execute on function public.update_order_items(uuid,jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- EXPENSES
-- ---------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  concept text not null,
  category_id uuid references public.expense_categories(id) on delete set null,
  amount numeric(10,2) not null check (amount > 0),
  payment_method text not null
    check (payment_method in ('efectivo','transferencia','tarjeta','otro')),
  status text not null default 'activo' check (status in ('activo','cancelado')),
  notes text,
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

create index expenses_date_idx on public.expenses (expense_date desc);
create index expenses_category_idx on public.expenses (category_id);

-- ---------------------------------------------------------------------
-- CONTRIBUTIONS (aportaciones) y WITHDRAWALS (retiros) de las socias
-- ---------------------------------------------------------------------
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  movement_date date not null default current_date,
  note text,
  status text not null default 'activo' check (status in ('activo','cancelado')),
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_contributions_updated_at
  before update on public.contributions
  for each row execute function public.set_updated_at();

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(10,2) not null check (amount > 0),
  movement_date date not null default current_date,
  note text,
  status text not null default 'activo' check (status in ('activo','cancelado')),
  is_demo boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_withdrawals_updated_at
  before update on public.withdrawals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- PHOTOS — relación real entre una imagen en Storage y su registro
-- ---------------------------------------------------------------------
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('product','order','expense')),
  entity_id uuid not null,
  kind text not null default 'foto' check (kind in ('foto','comprobante','ticket')),
  storage_path text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index photos_entity_idx on public.photos (entity_type, entity_id);

-- ---------------------------------------------------------------------
-- Vista con estadísticas del cliente (pedidos, total comprado, último pedido)
-- calculadas al vuelo, SIN duplicar esos datos en la tabla customers.
-- ---------------------------------------------------------------------
create or replace view public.customers_with_stats
with (security_invoker = true)
as
select
  c.*,
  coalesce(stats.order_count, 0) as order_count,
  coalesce(stats.total_purchased, 0) as total_purchased,
  stats.last_order_at
from public.customers c
left join (
  select
    customer_id,
    count(*) filter (where status <> 'cancelado') as order_count,
    sum(total) filter (where status <> 'cancelado') as total_purchased,
    max(created_at) as last_order_at
  from public.orders
  group by customer_id
) stats on stats.customer_id = c.id;

-- ---------------------------------------------------------------------
-- Vista unificada de MOVIMIENTOS (ventas + gastos + aportaciones + retiros)
-- ---------------------------------------------------------------------
create or replace view public.movements_view
with (security_invoker = true)
as
select
  o.id, 'venta'::text as type, o.created_at as at, o.status,
  ('Pedido #' || o.order_number) as concept,
  o.total as amount,
  cu.name as person,
  null::text as category,
  o.created_by
from public.orders o
join public.customers cu on cu.id = o.customer_id
union all
select
  e.id, 'gasto'::text as type, e.created_at as at, e.status,
  e.concept, e.amount, null::text as person,
  ec.name as category, e.created_by
from public.expenses e
left join public.expense_categories ec on ec.id = e.category_id
union all
select
  ct.id, 'aportacion'::text as type, ct.created_at as at, ct.status,
  coalesce(ct.note, 'Aportación') as concept, ct.amount,
  p.full_name as person, null::text as category, ct.created_by
from public.contributions ct
join public.profiles p on p.id = ct.partner_id
union all
select
  w.id, 'retiro'::text as type, w.created_at as at, w.status,
  coalesce(w.note, 'Retiro') as concept, w.amount,
  p.full_name as person, null::text as category, w.created_by
from public.withdrawals w
join public.profiles p on p.id = w.partner_id;

comment on view public.movements_view is
  'Historial unificado: no duplica datos, solo une orders+expenses+contributions+withdrawals.';

-- Las vistas necesitan su propio GRANT (no heredan el de las tablas).
grant select on public.customers_with_stats to authenticated;
grant select on public.movements_view to authenticated;
