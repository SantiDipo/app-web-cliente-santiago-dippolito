# Conexión con Supabase

Configuración de la base de datos del proyecto: el catálogo de productos vive en **Supabase** (PostgreSQL + API REST automática) y la app lo consulta desde el navegador con el SDK oficial `@supabase/supabase-js`. La migración ya está hecha: `assets/js/productos.js` lee, crea, edita y elimina productos en la tabla `productos`, y el viejo esquema `CATALOGO_BASE` + `localStorage` fue eliminado por completo.

**Regla del proyecto:** no se usa `var`; solo `const` y `let`, y funciones `function` a nivel superior (quedan globales en cualquier página que incluya el script).

---

## 1. Archivos nuevos

| Archivo | Qué contiene |
|---|---|
| `assets/js/supabase-config.js` | Los tres valores de conexión: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (publishable key) y `SUPABASE_TABLA_PRODUCTOS`, más el helper `supabaseSinConfigurar()`. **Único archivo a tocar** si cambian las credenciales. |
| `assets/js/supabase-client.js` | Crea el cliente único `clienteSupabase` y expone `probarConexionSupabase()` para verificar la conexión. |
| `supabase/schema.sql` | SQL para crear la tabla `productos` (con id `bigint` identity), habilitar RLS con políticas y cargar el catálogo inicial (los mismos 10 productos del viejo `CATALOGO_BASE`). |
| `supabase/reset.sql` | Reset de **una sola vez** para migrar desde la versión con id `text`: borra la tabla vieja (y sus políticas) antes de correr `schema.sql`. Es destructivo: no usarlo ya migrado. |

## 2. Páginas que cargan Supabase

Al final del `<body>`, antes de `header-footer.js` y `productos.js`, en las 6 páginas del catálogo (`index`, `busqueda`, `administrador`, `nuevo-producto`, `producto`, `editar-producto`):

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/js/supabase-config.js"></script>
<script src="assets/js/supabase-client.js"></script>
```

El orden importa: el SDK global (que expone `window.supabase`) va primero, la configuración después y el cliente al final. `login`, `contacto` y `carrito` no lo cargan porque no usan el catálogo.

## 3. Las credenciales (y por qué se pueden commitear)

- **Project URL** (`https://fnhewctbzzlpbbjpzoeb.supabase.co`): endpoint público del proyecto.
- **Publishable key** (`sb_publishable_...`): reemplaza a la antigua "anon key". Está **pensada para viajar en el navegador** y es pública por diseño: cualquiera que abra el sitio puede verla, y así debe ser. Lo que protege los datos no es la key, sino las políticas RLS de la base.
- **Secret key** (`sb_secret_...`): **jamás se pone en el frontend ni en el repo**. Da acceso total a la base (bypassea RLS) y, además, Supabase la bloquea si detecta que se usa desde un navegador (401). Sólo se usa en un backend, que este proyecto todavía no tiene.

Si algún día rotan las keys: se reemplazan los valores en `supabase-config.js` y listo.

## 4. Uso del cliente

`clienteSupabase` es una const global (mismo patrón que `CATALOGO_BASE`). Todas las operaciones del SDK son **asíncronas** y devuelven `{ data, error }`:

```js
// Leer todo el catálogo
const { data, error } = await clienteSupabase
    .from(SUPABASE_TABLA_PRODUCTOS)
    .select('*');

// Leer un producto por id (el id es numérico: 15)
const { data } = await clienteSupabase
    .from(SUPABASE_TABLA_PRODUCTOS)
    .select('*')
    .eq('id', 15)
    .maybeSingle();

// Alta (sin id: lo asigna la base con bigint identity)
const { data, error } = await clienteSupabase
    .from(SUPABASE_TABLA_PRODUCTOS)
    .insert({ nombre: 'Gorra urbana', descripcion: '...', precio: 9999, categoria: 'gorras', stock: 10 })
    .select();

// Baja
const { error } = await clienteSupabase
    .from(SUPABASE_TABLA_PRODUCTOS)
    .delete()
    .eq('id', 15);
```

> **Estado:** `productos.js` ya usa estas operaciones en producción del proyecto: `obtenerCatalogo` (lectura del catálogo), `buscarProducto` (detalle y precarga de edición), `crearProducto` (alta), `actualizarProducto` (edición) y `eliminarProducto` (baja). Ver [documentacion-productos.md](documentacion-productos.md) para el detalle de cada una.
>
> El filtrado por texto/categoría/orden **no** consulta la base: se hace síncrono sobre la caché `catalogoEnMemoria`, que se refresca con `obtenerCatalogo()` después de cada alta, edición o baja.

### Verificar la conexión

Desde la consola del navegador, en cualquier página del catálogo:

```js
probarConexionSupabase().then(console.log);
```

- `{ ok: true }` → conexión y tabla verificadas.
- `{ ok: false }` con mensaje de *PGRST205* / "falta crear la tabla" → correr `supabase/schema.sql` (paso 5).
- `clienteSupabase` en `null` + warning en consola → falta el SDK en el HTML o no se configuró `supabase-config.js`.

## 5. Crear la base (una sola vez)

1. Dashboard de Supabase → **SQL Editor** → **New query**.
2. **Sólo si venís de la versión anterior con id de tipo `text`:** pegar y correr `supabase/reset.sql` — borra la tabla vieja y sus políticas. Paso destructivo y único; después no se vuelve a usar.
3. Pegar todo el contenido de `supabase/schema.sql` y hacer clic en **Run**.
4. Verificar con `probarConexionSupabase().then(console.log)` en la consola del navegador (debe devolver `ok: true`).

El script es **repetible** (`create table if not exists`, `drop policy if exists` y seed con guardia de tabla vacía): volver a correrlo no duplica productos ni pisa ediciones hechas desde el panel de admin.

## 6. Diseño de la tabla `public.productos`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | `bigint` identity PK | Id secuencial autogenerado (1, 2, 3…): lo asigna la base al insertar y el frontend nunca lo manda (el `insert` no incluye `id`). Las URLs quedan cortas: `producto.html?id=15`. |
| `nombre` | `text` | Obligatorio. |
| `descripcion` | `text` | Obligatorio. |
| `precio` | `numeric(12,2)` | Obligatorio, > 0. |
| `imagen` | `text` | URL o data URL. Reserva: `assets/img/2.png`. |
| `categoria` | `text` | Default `'accesorios'`. Clave de `ETIQUETAS_CATEGORIA`. |
| `stock` | `integer` | Default 10, >= 0. |
| `fecha_creacion` | `timestamptz` | Default `now()` → reemplaza al `fechaCreacion` que ponía el JS. |
| `fecha_modificacion` | `timestamptz` | `null` hasta la primera edición → reemplaza a `fechaModificacion`. |

**Mapeo de nombres:** la API devuelve las columnas en `snake_case`, y el JS de la app usa `camelCase`. Esa traducción está resuelta en **`mapearProductoBD()`** (`productos.js`), el único punto que conoce los nombres de columnas: `fecha_creacion ↔ fechaCreacion` y `fecha_modificacion ↔ fechaModificacion`, más la conversión de `precio`/`stock` a número y del `id` a string (para las URLs). El resto de los nombres son idénticos, así que viajan tal cual en los `insert`/`update`.

## 7. Seguridad (RLS) — lectura de lo pendiente

Las políticas actuales permiten **select, insert, update y delete a cualquier visitante** (`to anon, authenticated`). Es una decisión temporal de la etapa de cursada: el panel de admin todavía no tiene login, y sin esas políticas la API devuelve 401/permiso denegado para todo. **Pendiente al futuro:** incorporar autenticación (Supabase Auth) y ajustar las políticas para que la edición exija un usuario admin, dejando el select público.

## 8. Migración realizada y pendientes

**Hecho** (ver [documentacion-productos.md](documentacion-productos.md) para el detalle):

1. `obtenerCatalogo()` → `async`, con `select('*')` + `order('fecha_creacion')`; el catálogo vivo ahora es la tabla, no `CATALOGO_BASE`.
2. `buscarProducto(id)` → `.eq('id', id).maybeSingle()`.
3. `crearProducto(datos)` / `actualizarProducto(id, cambios)` / `eliminarProducto(id)` → `insert` / `update` / `delete`.
4. `iniciarPagina()`, `inicializarDetalleProducto()` e `inicializarFormularioEditarProducto()` → `async` (pintan cuando responde la base).
5. Se eliminó `CATALOGO_BASE` y toda la persistencia en `localStorage` (`leerProductos*` / `guardarProductos*`): el seed de `schema.sql` es el dueño de los datos iniciales.

**Pendiente / próximos pasos sugeridos:**

- **Autenticación:** reemplazar las políticas RLS temporales (sección 7) por políticas que exijan usuario admin para editar.
- **Imágenes en Storage:** hoy las fotos se guardan como data URL en la columna `imagen`; moverlas a Supabase Storage y guardar sólo la URL liviana.
- **Paginación / búsqueda en la base:** si el catálogo crece, pasar `aplicarFiltros` a `ilike`/`range` del lado de PostgREST en vez de traer todo y filtrar en memoria.
