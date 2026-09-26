-- =====================================================================
-- WAMI — Datos de DEMO (opcional)
-- =====================================================================
-- IMPORTANTE: corre este archivo DESPUÉS de crear tus dos usuarias
-- (Authentication -> Users -> Add user) para que los movimientos de
-- prueba queden asociados a alguien.
--
-- Todo lo que crea este script tiene is_demo = true y el texto "(DEMO)"
-- en el nombre, para que sea clarísimo qué es de prueba y lo puedas
-- borrar después. NO son precios reales de WAMI, son solo ejemplos.
--
-- Para borrar todo lo de prueba más adelante, corre:
--   delete from public.order_items where order_id in (select id from public.orders where is_demo);
--   delete from public.orders where is_demo;
--   delete from public.expenses where is_demo;
--   delete from public.contributions where is_demo;
--   delete from public.withdrawals where is_demo;
--   delete from public.customers where is_demo;
--   delete from public.products where is_demo;
-- =====================================================================

do $$
declare
  v_partner1 uuid;
  v_partner2 uuid;
  v_prod_ramen uuid;
  v_prod_gyozas uuid;
  v_prod_bebida uuid;
  v_cust1 uuid;
  v_cust2 uuid;
  v_order1 uuid := gen_random_uuid();
  v_order2 uuid := gen_random_uuid();
  v_order3 uuid := gen_random_uuid();
  v_cat_ingredientes uuid;
  v_cat_publicidad uuid;
  v_cat_empaques uuid;
begin
  select id into v_partner1 from public.profiles order by created_at asc limit 1;
  select id into v_partner2 from public.profiles order by created_at asc offset 1 limit 1;

  select id into v_cat_ingredientes from public.expense_categories where name = 'Ingredientes';
  select id into v_cat_publicidad from public.expense_categories where name = 'Publicidad';
  select id into v_cat_empaques from public.expense_categories where name = 'Empaques';

  -- Productos de ejemplo
  insert into public.products (id, name, description, sale_price, ingredient_cost, packaging_cost, other_costs, is_demo, created_by)
  values (gen_random_uuid(), 'Ramen (DEMO)', 'Ramen clásico con caldo shoyu', 120, 45, 8, 2, true, v_partner1)
  returning id into v_prod_ramen;

  insert into public.products (id, name, description, sale_price, ingredient_cost, packaging_cost, other_costs, is_demo, created_by)
  values (gen_random_uuid(), 'Gyozas (DEMO)', 'Orden de 6 piezas', 70, 25, 4, 1, true, v_partner1)
  returning id into v_prod_gyozas;

  insert into public.products (id, name, description, sale_price, ingredient_cost, packaging_cost, other_costs, is_demo, created_by)
  values (gen_random_uuid(), 'Bebida (DEMO)', 'Refresco o té frío', 30, 12, 1, 0, true, v_partner2)
  returning id into v_prod_bebida;

  -- Clientes de ejemplo
  insert into public.customers (id, name, phone, is_demo, created_by)
  values (gen_random_uuid(), 'Cliente Demo Uno', '3312345678', true, v_partner1)
  returning id into v_cust1;

  insert into public.customers (id, name, phone, is_demo, created_by)
  values (gen_random_uuid(), 'Cliente Demo Dos', '3319876543', true, v_partner2)
  returning id into v_cust2;

  -- Pedidos de ejemplo (usa la misma función que usa la app, así también
  -- sirve para comprobar que create_order funciona bien)
  perform public.create_order(
    v_order1, v_cust1, 'efectivo', 'entregado', 'Pedido de prueba (DEMO)',
    jsonb_build_array(
      jsonb_build_object('product_id', v_prod_ramen, 'quantity', 2),
      jsonb_build_object('product_id', v_prod_gyozas, 'quantity', 1)
    ),
    v_partner1
  );
  update public.orders set is_demo = true where id = v_order1;

  perform public.create_order(
    v_order2, v_cust2, 'transferencia', 'pendiente', 'Pedido de prueba (DEMO)',
    jsonb_build_array(jsonb_build_object('product_id', v_prod_bebida, 'quantity', 3)),
    v_partner2
  );
  update public.orders set is_demo = true where id = v_order2;

  perform public.create_order(
    v_order3, v_cust1, 'tarjeta', 'en_preparacion', 'Pedido de prueba (DEMO)',
    jsonb_build_array(
      jsonb_build_object('product_id', v_prod_ramen, 'quantity', 1),
      jsonb_build_object('product_id', v_prod_bebida, 'quantity', 1)
    ),
    v_partner1
  );
  update public.orders set is_demo = true where id = v_order3;

  -- Gastos de ejemplo
  insert into public.expenses (expense_date, concept, category_id, amount, payment_method, status, is_demo, created_by)
  values (current_date - 2, 'Compra de verduras y pollo (DEMO)', v_cat_ingredientes, 480, 'efectivo', 'activo', true, v_partner1);

  insert into public.expenses (expense_date, concept, category_id, amount, payment_method, status, is_demo, created_by)
  values (current_date - 5, 'Publicidad en redes sociales (DEMO)', v_cat_publicidad, 200, 'tarjeta', 'activo', true, v_partner2);

  insert into public.expenses (expense_date, concept, category_id, amount, payment_method, status, is_demo, created_by)
  values (current_date - 1, 'Cajas y contenedores para llevar (DEMO)', v_cat_empaques, 150, 'efectivo', 'activo', true, v_partner1);

  -- Aportaciones y retiros (solo si ya existen las socias)
  if v_partner1 is not null then
    insert into public.contributions (partner_id, amount, movement_date, note, is_demo, created_by)
    values (v_partner1, 2000, current_date - 20, 'Aportación inicial (DEMO)', true, v_partner1);
  end if;

  if v_partner2 is not null then
    insert into public.contributions (partner_id, amount, movement_date, note, is_demo, created_by)
    values (v_partner2, 1500, current_date - 20, 'Aportación inicial (DEMO)', true, v_partner2);

    insert into public.withdrawals (partner_id, amount, movement_date, note, is_demo, created_by)
    values (v_partner2, 300, current_date - 3, 'Retiro personal (DEMO)', true, v_partner2);
  end if;

  raise notice 'Datos DEMO creados correctamente.';
end $$;
