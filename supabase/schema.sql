-- ============================================================
-- Esquema de la base de datos del catálogo de productos
-- ============================================================
-- Cómo usarlo: dashboard de Supabase → SQL Editor → New query → pegar este
-- archivo entero → Run.
--
-- Es REPETIBLE: create table if not exists + drop policy if exists + seed con
-- guardia de tabla vacía, así que volver a correrlo no duplica productos ni
-- pisa cambios hechos desde el panel de administración.
--
-- Si venís de la versión anterior con id de tipo text (slug), primero hay que
-- borrar la tabla vieja: ejecutar supabase/reset.sql UNA VEZ y después este
-- archivo. La transición destruye los productos existentes.
--
-- Después de correrlo, verificar la conexión desde el navegador con:
--   probarConexionSupabase().then(console.log)
-- en la consola de cualquier página del catálogo.

-- ============================================================
-- 0) Diagnóstico: políticas actuales de la tabla
--    (debe aparecer cmd = select, insert, update y delete)
-- ============================================================
select policyname, cmd, roles
from pg_policies
where tablename = 'productos';

-- ============================================================
-- 1) Tabla
-- ============================================================
-- El id es un entero secuencial autogenerado (bigint identity, el mismo
-- default del dashboard de Supabase): la base lo asigna sola al insertar y
-- el frontend nunca lo manda. Las URLs del detalle quedan cortas
-- (producto.html?id=15).
create table if not exists public.productos (
    id bigint generated always as identity primary key,
    nombre text not null,
    descripcion text not null,
    precio numeric(12, 2) not null check (precio > 0),
    imagen text,
    categoria text not null default 'accesorios',
    stock integer not null default 10 check (stock >= 0),
    fecha_creacion timestamptz not null default now(),
    fecha_modificacion timestamptz
);

-- Los nombres de columna llegan desde la API en snake_case; en el JS de la
-- app se mapean a camelCase en mapearProductoBD() (productos.js):
--   fecha_creacion    ↔ fechaCreacion
--   fecha_modificacion ↔ fechaModificacion

-- ============================================================
-- 2) Seguridad a nivel de filas (RLS)
-- ============================================================
-- Si RLS está habilitado sin políticas, Supabase rechaza todo desde la API.
alter table public.productos enable row level security;

-- Limpieza: la política "for all" del esquema anterior (si existiera) queda
-- reemplazada por las cuatro granulares de abajo.
drop policy if exists "Productos editables sin login (temporal)" on public.productos;

-- IMPORTANTE (etapa de cursada): mientras no haya login, cualquier visitante
-- puede leer y modificar el catálogo desde el navegador. Es una decisión
-- temporal a propósito; al incorporar autenticación hay que reemplazar estas
-- políticas por otras que exijan rol admin para insert / update / delete.
--
-- Sin la política de update y delete, PostgREST no da error: sólo afecta 0
-- filas, y la app no puede guardar cambios ni borrar productos.

-- 2.1 Lectura (select) — buscador, detalle y productos relacionados
drop policy if exists "Productos visibles para todos" on public.productos;
create policy "Productos visibles para todos"
    on public.productos for select
    to anon, authenticated
    using (true);

-- 2.2 Alta (insert) — panel admin: crear producto
drop policy if exists "Productos altas sin login (temporal)" on public.productos;
create policy "Productos altas sin login (temporal)"
    on public.productos for insert
    to anon, authenticated
    with check (true);

-- 2.3 Edición (update) — panel admin: editar producto
drop policy if exists "Productos editables" on public.productos;
create policy "Productos editables"
    on public.productos for update
    to anon, authenticated
    using (true)
    with check (true);

-- 2.4 Borrado (delete) — panel admin: eliminar producto
drop policy if exists "Productos eliminables" on public.productos;
create policy "Productos eliminables"
    on public.productos for delete
    to anon, authenticated
    using (true);

-- ============================================================
-- 3) Catálogo inicial
-- ============================================================
-- Los mismos 10 productos que tenía el viejo CATALOGO_BASE. El id no se manda
-- (lo asigna el identity); la guardia "where not exists" hace que el seed
-- sólo corra contra una tabla recién creada y vacía, así re-ejecutar este
-- archivo no duplica nada.
insert into public.productos (nombre, descripcion, precio, imagen, categoria, stock)
select v.nombre, v.descripcion, v.precio, v.imagen, v.categoria, v.stock
from (values
    ('Reloj clásico', 'Reloj analógico con correa de cuero.', 49999, 'https://images.unsplash.com/photo-1777457900943-7fd2f7c42529?q=85&fm=jpg&crop=entropy&cs=srgb&w=800', 'relojes', 10),
    ('Bolso de mano', 'Bolso de cuero sintético, ideal para uso diario.', 39999, 'https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?q=85&fm=jpg&crop=entropy&cs=srgb&w=800', 'bolsos', 10),
    ('Gorra deportiva', 'Gorra ajustable transpirable.', 12999, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=85&fm=jpg&crop=entropy&cs=srgb&w=800', 'gorras', 10),
    ('Lentes de sol', 'Lentes polarizados con protección UV400.', 25999, 'https://images.unsplash.com/photo-1584036553516-bf83210aa16c?q=85&fm=jpg&crop=entropy&cs=srgb&w=800', 'lentes', 10),
    ('Pulsera de plata', 'Pulsera de plata 925 con diseño minimalista.', 18499, 'https://images.unsplash.com/photo-1681091638833-b2409f8ee8d8?q=85&fm=jpg&crop=entropy&cs=srgb&w=800', 'joyeria', 10),
    ('Cinturón de cuero', 'Cinturón de cuero genuino con hebilla metálica.', 15999, 'https://images.unsplash.com/photo-1565251419287-9097aa7299ec?q=85&fm=jpg&crop=entropy&cs=srgb&w=800', 'accesorios', 10),
    ('Collar de plata', 'Collar de plata con colgante de piedra azul.', 24999, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=85&fm=jpg&crop=entropy&cs=srgb&w=800', 'joyeria', 10),
    ('Aretes dorados', 'Aretes de aro dorados, livianos y elegantes.', 16999, 'https://images.unsplash.com/photo-1630019852942-f89202989a59?q=85&fm=jpg&crop=entropy&cs=srgb&w=800', 'joyeria', 10),
    ('Billetera de cuero', 'Billetera de cuero marrón con varios compartimentos.', 22999, 'https://images.unsplash.com/photo-1627123424574-724758594e93?q=85&fm=jpg&crop=entropy&cs=srgb&w=800', 'accesorios', 10),
    ('Set de anillos', 'Set de anillos finos con acabado dorado.', 18999, 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=85&fm=jpg&crop=entropy&cs=srgb&w=800', 'joyeria', 10)
) as v (nombre, descripcion, precio, imagen, categoria, stock)
where not exists (select 1 from public.productos);

-- ============================================================
-- 4) RPC: descuento atómico de stock al finalizar la compra
-- ============================================================
-- assets/js/carrito.js la llama desde carrito.html con:
--   clienteSupabase.rpc('descontar_stock_carrito', { items: [...] })
--
-- Recibe un array JSON con la forma [{ "id": 12, "cantidad": 2 }, ...] y
-- descuenta el stock de todos los productos en UNA sola transacción. Si a
-- alguno le falta stock, no se descuenta nada (todo o nada) y la función
-- lanza un error cuyo DETAIL trae el detalle en JSON, para que el frontend
-- pueda mostrar qué productos quedaron cortos.
--
-- Dos motivos para hacerlo en la base y no desde el navegador:
--   1. Atomicidad: un select y un update separados dejan una ventana donde
--      dos compras simultáneas pueden vender las mismas unidades.
--   2. Con security definer el descuento no depende de las políticas RLS de
--      la tabla, y sólo puede descontar (no permite editar nada más). El
--      set search_path = public evita ataques por esquemas.
--
-- Si ya corriste este archivo antes, alcanza con pegar y ejecutar esta
-- sección 4 en el SQL Editor (es "create or replace", no toca datos).
create or replace function public.descontar_stock_carrito(items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    item jsonb;
    stock_restante integer;
    faltantes jsonb := '[]'::jsonb;
    resultado jsonb := '[]'::jsonb;
begin
    -- 4.1 Primera pasada: valida stock sin modificar nada.
    for item in select * from jsonb_array_elements(items) loop
        if (item ->> 'cantidad')::integer <= 0 then
            raise exception 'Cantidad inválida para el producto %.', item ->> 'id';
        end if;

        if not exists (
            select 1 from public.productos
            where id = (item ->> 'id')::bigint
              and stock >= (item ->> 'cantidad')::integer
        ) then
            faltantes := faltantes || jsonb_build_object(
                'id', (item ->> 'id')::bigint,
                'pedido', (item ->> 'cantidad')::integer,
                'disponible', (select coalesce(max(stock), 0)
                               from public.productos
                               where id = (item ->> 'id')::bigint)
            );
        end if;
    end loop;

    if jsonb_array_length(faltantes) > 0 then
        raise exception 'No hay stock suficiente para todos los productos del carrito.'
            using detail = faltantes::text;
    end if;

    -- 4.2 Segunda pasada: descuenta y devuelve el stock restante de cada uno.
    for item in select * from jsonb_array_elements(items) loop
        update public.productos
           set stock = stock - (item ->> 'cantidad')::integer,
               fecha_modificacion = now()
         where id = (item ->> 'id')::bigint
        returning stock into stock_restante;

        resultado := resultado || jsonb_build_object(
            'id', (item ->> 'id')::bigint,
            'stock', stock_restante
        );
    end loop;

    return resultado;
end;
$$;

grant execute on function public.descontar_stock_carrito(jsonb) to anon, authenticated;
