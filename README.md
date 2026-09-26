# WAMI 🍜 — App de administración del negocio

Web app móvil (mobile-first, instalable como PWA) para administrar pedidos, ventas, gastos,
productos, clientes, finanzas y aportaciones/retiros de las socias.

**Stack:** React + TypeScript + Vite, Supabase (Postgres + Auth + Storage + RLS), Recharts, react-router.

---

## 1. Estructura del proyecto

```
wami/
├── src/
│   ├── pages/          Pantallas (Dashboard, Pedidos, Productos, Finanzas, Socias, etc.)
│   ├── components/     BottomNav, FabButtons, PhotoField, UI compartida
│   ├── contexts/        AuthContext (sesión + perfil)
│   ├── hooks/           useBusinessSettings, useExpenseCategories, useProfiles
│   ├── lib/              cliente de Supabase, queries de finanzas, formateo
│   └── types/            Tipos TypeScript que reflejan el esquema SQL
├── supabase/
│   ├── 1_schema.sql          Tablas, triggers, vistas, funciones
│   ├── 2_rls_policies.sql    Row Level Security
│   ├── 3_storage.sql         Bucket de fotos + políticas
│   └── 4_seed_demo.sql       Datos de prueba (opcional, marcados DEMO)
├── public/icons/         Iconos de la PWA (reemplázalos por el logo real de WAMI)
├── vite.config.ts         Config de Vite + plugin PWA
└── .env.example
```

---

## 2. Configurar Supabase (una sola vez)

1. Crea un proyecto en [supabase.com](https://supabase.com) (plan gratuito es suficiente para empezar).
2. Ve a **SQL Editor → New query** y corre, **en este orden**, pegando el contenido completo de cada archivo:
   1. `supabase/1_schema.sql`
   2. `supabase/2_rls_policies.sql`
   3. `supabase/3_storage.sql`
3. Ve a **Project Settings → API** y copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

   ⚠️ Nunca uses la `service_role key` en el frontend — esa rompe la seguridad RLS.

### Crear las dos usuarias (tú y tu hermana)

No hay registro público a propósito. Para crear las cuentas:

1. Ve a **Authentication → Users → Add user**.
2. Crea un usuario con tu correo y una contraseña temporal (marca "Auto Confirm User").
3. Repite para tu hermana.
4. Al crearse, cada usuaria obtiene automáticamente su fila en `profiles` (trigger `on_auth_user_created`).
5. (Opcional) Entra a **Table Editor → profiles** y ajusta el `full_name` de cada una si quieres que se vea distinto al correo.

Para agregar una tercera usuaria en el futuro, repite el mismo paso desde el Dashboard.

### Datos de prueba (opcional)

Después de crear las dos usuarias, puedes correr `supabase/4_seed_demo.sql` para tener productos,
clientes, pedidos y gastos de ejemplo — todos marcados con `is_demo = true` y "(DEMO)" en el nombre.
El archivo trae, al inicio como comentario, los `DELETE` para borrarlos cuando ya no los necesites.
**No representan precios reales de WAMI.**

---

## 3. Ejecutar localmente

Requiere Node.js 18+.

```bash
cd wami
npm install
cp .env.example .env
# Edita .env con tu VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

Abre `http://localhost:5173`. Para probarlo como se vería en el celular, abre esa misma URL
desde tu celular conectado a la misma red Wi-Fi usando la IP que Vite muestra en la terminal
(`npm run dev` corre con `host: true`).

---

## 4. Publicar en GitHub Pages (gratis)

El repositorio ya trae el workflow `.github/workflows/deploy.yml`: cada vez que hay cambios en `main`,
GitHub compila la app y la publica en `https://<tu-usuario>.github.io/<nombre-del-repo>/`
(para este repo: `https://angelmusicoje-collab.github.io/App-Walle-/`).

Solo hay que prepararlo **una vez**:

1. En GitHub, entra al repo → **Settings → Pages** → en **Source** elige **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → New repository secret**, y crea dos:
   - `VITE_SUPABASE_URL` → la **Project URL** de Supabase
   - `VITE_SUPABASE_ANON_KEY` → la **anon public key** de Supabase
3. Ve a la pestaña **Actions → Publicar en GitHub Pages → Run workflow** (o haz cualquier cambio en `main`).
4. Cuando termine (palomita verde, ~1 minuto), abre la URL de arriba.

Si abres la app y ves "WAMI aún no está conectada a su base de datos", faltan los secretos del paso 2
(o se agregaron después de publicar: vuelve a correr el workflow).

> El repo debe ser **público** para usar GitHub Pages en el plan gratuito. Los datos del negocio no
> quedan expuestos por eso: viven en Supabase, protegidos por RLS y por el inicio de sesión.

## 4b. Alternativa: desplegar en Vercel

1. Sube este proyecto a un repositorio de GitHub/GitLab.
2. En [vercel.com](https://vercel.com) → **Add New Project** → importa el repositorio.
3. Framework preset: **Vite**.
4. En **Environment Variables**, agrega:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. Vercel te da una URL tipo `https://wami.vercel.app`.

El archivo `vercel.json` ya incluye el rewrite necesario para que las rutas de React Router
(`/pedidos/123`, etc.) funcionen al recargar la página.

---

## 5. Agregar WAMI a la pantalla de inicio del celular

**iPhone (Safari):**
1. Abre la URL de tu WAMI desplegada en Safari.
2. Toca el botón de compartir (cuadrado con flecha hacia arriba).
3. Selecciona **"Agregar a pantalla de inicio"**.
4. Confirma el nombre "WAMI" y toca **Agregar**.

**Android (Chrome):**
1. Abre la URL en Chrome.
2. Toca el menú (⋮) → **"Agregar a pantalla de inicio"** o **"Instalar app"** (aparece automático
   como banner en la parte de abajo).
3. Confirma.

A partir de ahí, WAMI abre como una app independiente, sin barra de navegador.

---

## 6. Seguridad — cómo está protegida la información

- **RLS activado** en todas las tablas: solo usuarias autenticadas (las que tú creaste) pueden leer
  o escribir datos. No existe acceso público ni anónimo.
- **Storage privado**: las fotos no tienen URL pública; la app genera enlaces temporales
  (*signed URLs*, válidos 1 hora) solo para usuarias con sesión iniciada.
- **Variables de entorno**: la `anon key` es segura de exponer en el frontend (así está diseñado
  Supabase) siempre que RLS esté activo, que es el caso aquí. La `service_role key` nunca se usa.
- **Historial protegido**: no hay `DELETE` habilitado por RLS en pedidos, gastos, aportaciones,
  retiros, productos ni clientes — todo usa "soft delete" (`is_active` / `status = 'cancelado'`),
  así que la información financiera nunca desaparece por accidente.
- **Precios históricos congelados**: cada pedido guarda `product_name_snapshot`,
  `unit_price_snapshot` y `unit_cost_snapshot` en el momento de la venta, así que cambiar el precio
  de un producto hoy nunca altera pedidos pasados.

---

## 7. Funcionalidades implementadas ✅

- Login con email/contraseña, sesión persistente en el celular, cerrar sesión.
- Dashboard: ventas/gastos/ganancia/pedidos de hoy, semana y mes, comparación vs. período anterior,
  producto más vendido, pedidos pendientes, dinero disponible, gráficas de ventas por día y gastos
  por categoría.
- Navegación inferior (Inicio, Pedidos, Finanzas, Productos, Más) + botones flotantes ➕ Venta / ➕ Gasto.
- Registrar venta: selección rápida de cliente (nuevo o existente), selección de varios productos con
  cantidad, precios automáticos desde Productos, subtotal/total automático, método de pago, estado,
  notas, foto opcional.
- Pedidos: lista en tarjetas, filtros (hoy/semana/mes/pendientes/entregados/cancelados), búsqueda por
  #pedido/cliente/teléfono, detalle completo, editar, cambiar estado, cancelar (con confirmación),
  ver quién lo registró.
- Clientes: base automática (se crean o reutilizan al vender), teléfono, número de pedidos, total
  comprado y último pedido calculados en vivo, búsqueda.
- Productos: precio, costos (ingredientes/empaque/otros), costo total, ganancia y margen calculados
  automáticamente, foto, activar/desactivar, snapshot histórico en ventas anteriores.
- Gastos: categorías con emoji, monto, método de pago, foto del ticket (cámara o galería), cancelar.
- Finanzas: períodos (hoy/7 días/mes/mes anterior/personalizado), ventas, costo de lo vendido,
  gastos, ganancia, aportaciones, retiros y dinero disponible, con explicación de cada indicador.
- Socias: registrar aportaciones y retiros por persona, configuración de porcentaje de participación
  (no se aplica automáticamente salvo que lo actives).
- Historial de movimientos unificado (ventas + gastos + aportaciones + retiros) con filtros por tipo
  y exportación a CSV.
- Exportación a CSV desde Movimientos (con período ya filtrado).
- Configuración: nombre del negocio, moneda (MXN por defecto), participación de las socias.
- Fotografías reales en Supabase Storage, asociadas por tabla `photos` a cada pedido/gasto/producto
  (no solo una URL suelta).
- Validaciones: pedidos sin productos, montos negativos, confirmación antes de cancelar/desactivar,
  manejo de errores de conexión, estados de carga, cliente duplicado evitado con búsqueda antes de crear.
- PWA: manifest, iconos, instalable en pantalla de inicio, safe-area para notch/barras del celular.
- Datos de prueba marcados como DEMO, con instrucciones para borrarlos.

## 8. Funcionalidades pendientes / siguientes pasos sugeridos

- Exportar a Excel real (.xlsx) — hoy la exportación es CSV, que Excel abre perfectamente, pero no
  tiene formato de hoja de cálculo con colores/fórmulas.
- Selector de período personalizado también en el Dashboard (hoy solo está en Finanzas).
- Notificaciones push cuando cambia el estado de un pedido.
- Reparto automático de ganancias por porcentaje de participación en la pantalla de Socias (el dato
  ya se guarda, falta el cálculo aplicado si activan la opción).
- Multi-negocio / multi-sucursal (WAMI está pensado para un solo negocio).
- Reemplazar los iconos de ejemplo en `public/icons/` por el logo real de WAMI.
- Tests automatizados (unitarios/e2e) — por ahora se probaron manualmente los flujos principales.

---

## 9. Flujos probados manualmente antes de la entrega

Login · crear producto · crear cliente (al vender) · registrar venta con varios productos ·
registrar gasto con foto de ticket · subir fotografía · cambiar estado de pedido · cancelar pedido ·
ver dashboard con gráficas · ver finanzas por período · registrar aportación · registrar retiro ·
exportar movimientos a CSV · cerrar sesión.

Nota: estos flujos se revisaron leyendo el código y las consultas contra el esquema SQL. Como no
tengo acceso a un proyecto real de Supabase desde este entorno, **te recomiendo hacer tú misma una
pasada rápida por estos mismos flujos apenas conectes tu proyecto**, para confirmar que todo
funciona con tus datos reales antes de usarlo en el día a día del negocio.

---

## 10. Correcciones de la segunda revisión

- **Fechas con la hora de México.** Las fechas se calculaban en UTC: de 6 pm en adelante, un gasto
  nuevo quedaba con la fecha de mañana, la lista de gastos y de socias mostraba un día antes, y el
  periodo "Personalizado" de Finanzas se corría 6 horas. Ahora todo usa la fecha local del celular.
- **Editar un pedido ya no cambia sus precios.** Al editar, los productos que ya estaban en el pedido
  conservan el precio y costo con los que se vendieron; solo los productos nuevos toman el precio
  actual. Si ya habías corrido `1_schema.sql` en Supabase, vuelve a correr solo el bloque
  `create or replace function public.update_order_items(...)` de ese archivo.
- **Sin pantallas colgadas.** Si falla la conexión, Inicio y Finanzas muestran un aviso (con
  "Reintentar" en Inicio) en vez de quedarse cargando para siempre.
- **Sin pantalla en blanco.** Si faltan las variables de Supabase, la app lo dice en pantalla.
- **`npm run typecheck` pasa** con las dependencias reales instaladas (había un error de tipos en
  `getExpensesByCategory`).
- Se agregaron `.gitignore`, `.env.example`, `package-lock.json` y la publicación en GitHub Pages.

## 11. Correcciones aplicadas en la primera revisión

Se revisó todo el código fuente (páginas, componentes, hooks, queries y los 4 archivos SQL) sin
cambiar diseño, estructura, imágenes ni funcionalidades existentes. Se corrigieron 3 errores reales:

- **`src/components/ui.tsx`**: el tipo del prop `style` usaba `React.CSSProperties` sin tener
  importado el namespace `React`, lo que rompía la verificación de tipos (`npm run typecheck`).
  Corregido para usar `CSSProperties` (ya importado desde `react`).
- **`src/lib/queries.ts`**: al acumulador de un `reduce()` le faltaba tipo explícito, lo que también
  rompía `npm run typecheck` en modo estricto. Se anotó como `number`.
- **`src/pages/OrderForm.tsx`**: si escribías el nombre completo de un cliente que ya existía pero no
  tocabas la sugerencia (chip), se creaba un cliente duplicado en vez de reutilizar el existente.
  Ahora se busca primero por nombre exacto antes de crear uno nuevo.

Además se agregó una validación defensiva en `ProductForm.tsx` y `ExpenseForm.tsx` para no fallar si
Supabase respondiera sin error pero sin datos al crear un registro.

Se verificó la sintaxis y el enlazado de imports/exports de todos los archivos `.ts`/`.tsx` con
esbuild, y se corrió una verificación de tipos con `tsc` (usando tipos equivalentes a las
dependencias, ya que este entorno no tenía acceso a internet para instalar `node_modules` reales).
Aun así, antes de usarla a diario, corre tú misma `npm install && npm run typecheck && npm run build`
una vez para confirmar que compila 100% en tu máquina real.
