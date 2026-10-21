-- ============================================================
-- Reset de la tabla productos — SÓLO para la transición de id texto → id
-- numérico. Ejecutar UNA VEZ en el SQL Editor, y después volver siempre a
-- supabase/schema.sql.
--
-- Orden:
--   1) reset.sql   (borra la tabla vieja junto con sus políticas RLS)
--   2) schema.sql  (crea la tabla nueva con id bigint identity, RLS,
--                   políticas y seed)
--
-- ⚠ Destruye TODOS los productos existentes (incluidos los creados desde el
--   panel de administración). Elegiste empezar de cero.
-- ============================================================

drop table if exists public.productos cascade;
