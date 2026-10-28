# Documentación de `assets/js/productos.js`

Módulo encargado de centralizar el catálogo de productos, renderizarlo en las páginas, mostrar el **detalle personalizado de cada producto** (`producto.html?id=<id>`) y permitir al administrador crear, **editar** y **eliminar** productos. Todo el catálogo que estaba hardcodeado en HTML pasó a estar en una **base de datos Supabase** (tabla `productos`, ver [documentacion-supabase.md](documentacion-supabase.md) y `supabase/schema.sql`): este archivo habla con ella a través de `clienteSupabase` y ya no guarda nada en `localStorage` ni mantiene un `CATALOGO_BASE` en el código.

**Regla del proyecto:** no se usa `var` en ningún lado; solo `const` (datos/módulo) y `let` (variables reasignables). Las funciones son declaraciones `function` a nivel superior, por lo que quedan disponibles de forma global en cualquier página que incluya el script.

---

## 1. Constantes

| Constante | Qué contiene |
|---|---|
| `IMAGEN_RESERVA` | Ruta de imagen por defecto (`assets/img/2.png`) si un producto se crea sin imagen. |
| `STOCK_INICIAL` | `10`. Stock que se asigna si no se recibe uno válido. |
| `ETIQUETAS_CATEGORIA` | Objeto que mapea el id de categoría a su nombre legible para mostrar en el detalle (ej: `joyeria` → `"Joyería"`). |
| `ICONO_EDITAR` / `ICONO_ELIMINAR` | Strings con los SVG de los iconos del panel de administración. |

Las credenciales de la base (`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_TABLA_PRODUCTOS`) viven en `assets/js/supabase-config.js`, y el cliente en `assets/js/supabase-client.js`.

---

## 2. Funciones auxiliares

### `normalizarTexto(texto)`
- **Recibe:** cualquier texto.
- **Hace:** lo pasa a minúsculas y le quita los acentos/tildes (con `normalize('NFD')` + regex que elimina los caracteres combinantes).
- **Devuelve:** string limpio.
- **Para qué sirve:** que una búsqueda de `"reloj"` o `"GOMA"` funcione sin importar mayúsculas ni tildes (`"Reloj clásico"` → `"reloj clasico"`).

### `formatearPrecio(precio)`
- **Recibe:** un número (`49999`, `7777`, `49999.99`).
- **Devuelve:** string formateado en español rioplatense: `"$49.999"`, `"$7.777"`, `"$49.999,99"` (usa `Intl.NumberFormat('es-AR')` con hasta 2 decimales y antepone `$`).
- **Dónde se usa:** al pintar el `<p>` del precio en las tarjetas.

---

## 3. Capa de datos (Supabase)

Todas las funciones de esta sección son **`async`** y devuelven Promises, porque hablar con la base es una operación asíncrona. Si el SDK no cargó o falta configurar `supabase-config.js`, devuelven el valor vacío (`[]`, `null`, `false`) sin lanzar excepciones, dejando un `console.error` explicativo.

### `mapearProductoBD(fila)`
- **Recibe:** una fila tal cual la devuelve la API (`snake_case`: `fecha_creacion`, `fecha_modificacion`).
- **Hace:** la convierte al formato que usa la app: `fecha_creacion` → `fechaCreacion`, `fecha_modificacion` → `fechaModificacion`, y `precio`/`stock` a `Number` (la API puede devolverlos como string).
- **Devuelve:** objeto producto en el formato interno (`{ id, nombre, descripcion, precio, imagen, categoria, stock, fechaCreacion, fechaModificacion }`).
- **Para qué sirve:** es el **único punto** que conoce los nombres de columna de la base: el resto del módulo trabaja siempre en `camelCase`, así que un cambio de esquema se arregla acá y en ningún otro lado.

### `clienteListo()`
- Devuelve `false` (con `console.error`) si `clienteSupabase` no existe, y `true` si hay cliente. Cada función de datos la consulta primero para fallar con un mensaje claro en vez de un `TypeError`.

### `catalogoEnMemoria` (variable `let` del módulo)
- Array con el último catálogo leído de la base. **`renderizarCatalogo()` pinta desde acá**, no desde la base: así tipear en el buscador del admin es instantáneo y no dispara una consulta por tecla. Se refresca llamando a `obtenerCatalogo()` después de crear, editar o eliminar.

### `obtenerCatalogo()`
- **No recibe nada.**
- **Hace:** `select('*')` sobre la tabla de productos, ordenado por `fecha_creacion` ascendente, y mapea cada fila con `mapearProductoBD`.
- **Devuelve:** array completo del catálogo (o `[]` si falla, con `console.error`). Además deja el resultado en `catalogoEnMemoria`.
- **Importante:** es el **único punto de lectura**: todas las páginas pintan desde `catalogoEnMemoria`, por lo que un producto eliminado o editado desaparece/actualiza en el índice, la búsqueda, el detalle y los relacionados al mismo tiempo.

### `buscarProducto(id)`
- **Recibe:** el `id` numérico del producto (ej: `'15'`). Si el id no es numérico (una URL vieja con slug, como `?id=reloj-clasico`, o texto arbitrario), devuelve `null` **sin consultar la base**.
- **Hace:** `select('*').eq('id', id).maybeSingle()` — una consulta directa a la fila, sin pasar por la caché.
- **Devuelve:** el objeto producto (mapeado) o `null` si no existe / si falla la consulta.
- **Dónde se usa:** en `inicializarDetalleProducto` (para llenar `producto.html`) y en `inicializarFormularioEditarProducto` (para precargar `editar-producto.html`).

### `actualizarProducto(id, cambios)`
- **Recibe:** el `id` del producto y un objeto con los campos a modificar (ej: `{ nombre, descripcion, precio, categoria, stock, imagen }`). Los nombres coinciden con las columnas de la base, así que viajan tal cual.
- **Hace:** `update(cambios + fecha_modificacion).eq('id', id).select('id')`. La fecha de modificación se pone desde acá con la fecha/hora actual en ISO. El `select` posterior devuelve las filas afectadas: si RLS filtrara el update en silencio (0 filas, sin error), se detecta y se avisa por `console.error` en vez de devolver un `true` mentiroso.
- **Devuelve:** `true` si la base confirmó que afectó la fila; `false` si falló la consulta o si no se aplicó ningún cambio.
- **Dónde se usa:** en el `submit` de `editar-producto.html`.

---

## 4. Alta y baja de productos

### `crearProducto(datos)`
> **Es la función del administrador para crear productos.**

- **Recibe:** un objeto con la forma `{ nombre, descripcion, precio, categoria?, imagen?, stock? }`.
- **Hace:**
  1. **Valida:** `nombre` y `descripcion` no vacíos, `precio` numérico y mayor a 0. Si algo falla, hace `console.error` y devuelve `null` sin tocar la base.
  2. **Inserta:** arma el objeto (`precio` a número, `imagen` o `IMAGEN_RESERVA`, `categoria` o `'accesorios'`, `stock` o `STOCK_INICIAL`) y hace `insert(...).select().maybeSingle()`. **Ni `id` ni `fecha_creacion` se mandan: los asigna la base (`bigint identity` y `now()`).** El id recién generado vuelve en la fila que devuelve el `insert`.
- **Devuelve:** el producto creado (fila devuelta por la base, mapeada) o `null` si la validación o el `insert` fallaron.
- **Ejemplo:**
  ```js
  const producto = await crearProducto({
      nombre: 'Gorra Urbana',
      descripcion: 'Gorra de algodón.',
      precio: 9999.5,
      categoria: 'gorras',
      stock: 25,
      imagen: 'https://…/gorra.jpg'
  });
  // producto.id === '11' (el id lo asignó la base con identity)
  ```

### `eliminarProducto(id)`
> **Es la función del administrador para eliminar productos.**

- **Recibe:** el `id` del producto (string).
- **Hace:**
  1. **Valida:** si el `id` viene vacío o si el cliente no está conectado, devuelve `false` sin tocar nada.
  2. **Borra la fila:** `delete().eq('id', id).select('id')`. El `select` posterior al `delete` devuelve las filas borradas, lo que permite distinguir *"no existía ese id"* (`data` vacío → `false` + `console.error`) de un fallo de la base (`error` → `false`).
- **Devuelve:** `true` si la base confirmó el borrado; `false` en cualquier otro caso.
- **Ejemplo:**
  ```js
  await eliminarProducto('15');     // → true (fila borrada de la tabla)
  await eliminarProducto('99999');  // → false (no existe ese id)
  ```
- **Nota:** a diferencia del esquema viejo con `localStorage`, el borrado es definitivo (no hay "lista de bajas"): el producto desaparece de la tabla para todos los visitantes.

---

## 5. Filtros de `busqueda.html`

### `fechaProducto(producto)`
- **Devuelve:** el timestamp (`Date.parse`) de `fechaCreacion`, o `0` si el producto no lo tiene. Los más viejos quedan primero en "Más viejo" y los recién creados aparecen primero en "Más nuevo".

### `aplicarFiltros(productos, parametros)`
- **Recibe:** array de productos y un objeto `URLSearchParams` (la querystring de la página, ej: `?busqueda=gorra&categoria=joyeria`).
- **Hace, en orden:**
  1. Copia el array (`slice`) para no mutar el original.
  2. **Texto** (`busqueda`): filtra por nombre o descripción usando `normalizarTexto` + `includes`.
  3. **Categoría** (`categoria`): si no es `'todas'`, filtra por `producto.categoria`.
  4. **Disponibilidad** (`disponibilidad`): sólo filtra si viene **exactamente un** valor en la URL — `'en-stock'` → `stock > 0`, `'agotado'` → `stock <= 0`. Si vienen los dos o ninguno, no filtra.
  5. **Orden** (`orden`): con un `switch` ordena por precio (asc/desc), por nombre (`localeCompare` con `'es'`) o por fecha (`mas-nuevo` / `mas-viejo`). `'mas-vendido'` (por defecto) deja el orden original.
- **Devuelve:** array filtrado y ordenado (nuevo array).
- **Nota:** filtra sobre `catalogoEnMemoria`, así que sigue siendo síncrono sobre la caché y no consulta la base.

---

## 6. Renderizado del catálogo

Las funciones siguientes **no usan `innerHTML` con interpolación**; construyen el DOM con `document.createElement` y `textContent`, así que un nombre de producto con HTML inyectado no puede romper la página (evita XSS).

### `crearTarjetaProducto(producto)`
- Crea una tarjeta del **catálogo público** con esta estructura idéntica al HTML original:
  ```
  li
  ├─ a[href=producto.html]
  │   └─ article → h3 (nombre), img, p (descripción), p (precio)
  └─ form[action=carrito.html]
      ├─ label.sr-only
      ├─ input hidden (name=producto, value=id)
      └─ button "Agregar al carrito"
  ```
- El orden `h3 → img → p → p` es obligatorio: el CSS (`p:nth-of-type(1)` / `p:nth-of-type(2)`) espera la descripción primero y el precio después.
- El `submit` del form está **interceptado**: en vez de navegar a `carrito.html`, hace `preventDefault()`, llama a `agregarAlCarrito(producto, 1)` (de `assets/js/carrito.js`, que guarda en localStorage) y a `avisarAgregado(boton)`, que muestra "Agregado ✓" un instante. El `action` queda como respaldo si el carrito no está cargado.

### `crearTarjetaProductoAdmin(producto)`
- Igual que la anterior pero **sin form de carrito**, con dos controles al inicio del `<article>` y el resto de la tarjeta convertida en enlace:
  - `a.icono-editar` → `editar-producto.html` con `aria-label="Editar <nombre>"` e ícono de lápiz.
  - `button.icono-eliminar` con `aria-label="Eliminar <nombre>"` e ícono de equis.
  - `a.tarjeta-admin` → **`editar-producto.html?id=<id>`**: envuelve el `h3`, la `img` y los dos `p`, así que **clic en la card desde el panel de admin entra a editar el producto**. Sólo cambia en modo admin: `crearTarjetaProducto` (catálogo público) sigue linkeando al detalle.
- El botón de eliminar **tiene la interacción cableada**: pide confirmación con `window.confirm`, **`await`** a `eliminarProducto(id)` (el handler es `async`: no repinta hasta que la base confirma, así el producto no queda "revivido" si la operación falla), y si salió bien vuelve a **`await obtenerCatalogo()`** (refresca la caché desde la base) + `renderizarCatalogo()` y muestra el mensaje de estado con `mostrarMensajeAdmin('Se eliminó "…" del catálogo.')`. Si falla, muestra un mensaje de error sin repintar.

### `crearTarjetaNuevoProducto()`
- Crea la tarjeta punteada final del admin: `li.nuevo-producto > a[href=nuevo-producto.html] > article > span.mas ("+") + p ("Agregar nuevo producto")`.

### `textoBusquedaAdmin` / `filtrarProductosAdmin(productos)` / `avisarSinResultadosAdmin(cantidad)`
- **`textoBusquedaAdmin`** (variable `let` del módulo, arranca en `''`): guarda lo tipeado en el buscador del admin para que cada repintado filtre con él. No se pierde al repintar porque el `<input>` está fuera del `<ul>` que se regenera.
- **`filtrarProductosAdmin(productos)`:** si el texto (normalizado con `normalizarTexto`) está vacío devuelve el array tal cual; si no, filtra por `nombre` o `descripcion` — misma lógica que `aplicarFiltros` en `busqueda.html`. Sólo se usa en modo admin.
- **`avisarSinResultadosAdmin(cantidad)`:** si no quedó ningún producto, escribe con `mostrarMensajeAdmin` un aviso en `#aviso-admin`: *"No encontramos productos que coincidan con \"…\""* cuando el filtro tiene texto, o *"Todavía no hay productos en el catálogo."* si la lista quedó vacía.

### `actualizarContadorResultados(cantidad)`
- Si existe el párrafo `.resultado-info` (en `busqueda.html` **y** en el buscador de `administrador.html`), escribe `"Mostrando 4 productos"` o `"Mostrando 1 producto"`. Si no existe, no hace nada.

### `renderizarCatalogo()`
Función central de pintado. **Es síncrona: no consulta la base**, pinta el último catálogo en `catalogoEnMemoria`. Pasos:
1. Busca `#catalogo` y su `ul`. Si la página no tiene catálogo, sale. Antes de repintar, **oculta y vacía el aviso `#aviso-admin`**.
2. Detecta el modo: si la sección tiene la clase `admin` → **modo administrador** y aplica `filtrarProductosAdmin(productos)`; si no, y existe `#filtros-busqueda form` → aplica `aplicarFiltros` con la `URLSearchParams` de la ventana.
3. Vuelca la lista con `lista.replaceChildren(...)` (borra lo anterior y agrega una tarjeta por producto).
4. En modo admin, agrega al final la tarjeta de "nuevo producto" y llama a `avisarSinResultadosAdmin()`.
5. Actualiza el contador de resultados.

### `mostrarMensajeAdmin(mensaje)` / `mostrarMensajeDetalle(mensaje)`
- Si existe el elemento correspondiente (`#aviso-admin` en `administrador.html`, `#aviso-detalle` en `producto.html`), le escriben el mensaje y lo desocultan (`hidden = false`); si no existe, no hacen nada.
- **Para qué sirven:** feedback accesible (los lectores de pantalla anuncian el cambio por `aria-live`/`role="status"`) de operaciones exitosas y de errores.

---

## 7. Formularios e inicialización

### `inicializarFiltrosBusqueda()`
1. Si la página no tiene `#filtros-busqueda form`, sale.
2. **Precarga** los campos del form desde la querystring (`busqueda`, `categoria`, `orden` y las casillas `disponibilidad`).
3. **Intercepta el `submit`:** `preventDefault()`, arma una `URLSearchParams` con los valores del form (ignora los vacíos), actualiza la URL con `history.replaceState` y vuelve a llamar `renderizarCatalogo()` (repinta con los filtros sobre la caché; no consulta la base porque no cambió).

### `inicializarBusquedaAdmin()`
1. Si la página no tiene `.busqueda-admin` ni `#busqueda-admin`, sale.
2. Escucha el **`input`** del campo: copia `campo.value` a `textoBusquedaAdmin` y llama `renderizarCatalogo()`. Es filtrado en vivo, **sin recargar, sin tocar la URL y sin consultar la base** (lee `catalogoEnMemoria`).
3. Escucha también el **`submit`** (Enter dentro del `input[type=search]`) con `preventDefault()`, para que sólo repinte.

### `procesarImagen(archivo)`
Devuelve una **Promise** porque lee archivos de forma asíncrona:
1. Si no hay archivo, resuelve con `''`.
2. `FileReader` lee el archivo como data URL.
3. Carga esos bytes en un `Image`.
4. Si supera los 600px de lado, calcula la escala y redibuja en un `<canvas>` (misma relación de aspecto).
5. Exporta el canvas con `toDataURL('image/jpeg', 0.8)` → **resuelve** con la imagen comprimida.
6. Cualquier error (archivo ilegible, no es imagen) → **rechaza** con un `Error` con mensaje en español.

### `inicializarFormularioNuevoProducto()`
1. Si la página no tiene `#nuevo-producto form`, sale.
2. Escucha el `submit` con un handler `async`:
   - `preventDefault()` para que no recargue la página.
   - Toma el archivo del `input#imagen` y, si hay, lo pasa por `procesarImagen`. Si falla, muestra `alert` y aborta.
   - **`await crearProducto(...)`** con `nombre`, `descripcion`, `precio`, `categoria`, **`stock`** (campo "Stock inicial" del form) y la imagen procesada. Es el único campo que define cuántas unidades se dan de alta: si queda vacío o trae basura, `crearProducto` cae en `STOCK_INICIAL` (10).
   - Si devuelve `null` → `alert` de error y aborta.
   - Si sale bien → `window.location.href = 'administrador.html'`, donde el admin ve recién creado su producto (esa página vuelve a leer el catálogo de la base al cargar).

### `inicializarDetalleProducto()`
1. Si la página no tiene `#detalle-producto`, sale.
2. Lee el `id` de la URL y hace **`await buscarProducto(id)`** (consulta directa a la fila). Si no existe → mensaje de "No encontramos el producto…" con `mostrarMensajeDetalle` y sale.
3. Llena título, miga, imagen, nombre, precio, descripción, características (categoría, id, fechas), stock y el formulario de compra (deshabilitado si `stock <= 0`).
4. **Intercepta el `submit` del form de compra** (`#detalle-formulario`): `preventDefault()`, llama `agregarAlCarrito(producto, campoCantidad.value)` (guarda la cantidad elegida en localStorage) y `avisarAgregado(botonAgregar)`. No navega a `carrito.html`.
5. Muestra/oculta los accesos de admin (`#enlace-volver-admin`, `#enlace-editar-admin`) según el parámetro `admin=1`.
6. **`await obtenerProductosRelacionados(producto)`** (primero los de la misma categoría, después el resto, hasta 3) y pinta las tarjetas en `#relacionados`.

### `inicializarFormularioEditarProducto()`
1. Si la página no tiene `#editar-producto form`, sale.
2. Lee el `id` de la URL y hace **`await buscarProducto(id)`**. Si no existe → redirige a `administrador.html`.
3. Precarga los campos del form (`nombre`, `descripcion`, `precio`, `categoria`, `stock`) y la imagen actual (`#imagen-actual`).
4. Escucha el `submit` con un handler `async`: `preventDefault()`, procesa la imagen si se adjuntó una nueva y hace **`await actualizarProducto(producto.id, {...})`**. Si devuelve `false` → `alert` de error; si sale bien → `window.location.href = 'administrador.html'`.

### `iniciarPagina()`
Punto de entrada (ahora `async`):
1. **`await obtenerCatalogo()`** — trae el catálogo de la base una vez y lo deja en `catalogoEnMemoria`.
2. `renderizarCatalogo()` — pinta la página donde estemos (síncrono, sobre la caché).
3. `inicializarFiltrosBusqueda()` / `inicializarBusquedaAdmin()` — conectan filtros y buscador (si existen).
4. `inicializarFormularioNuevoProducto()` — conecta el form de alta (si existe).
5. **`await inicializarDetalleProducto()`** / **`await inicializarFormularioEditarProducto()`** — llenan `producto.html` y `editar-producto.html` (si existen).

Al final del archivo:
```js
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarPagina);
} else {
    iniciarPagina();
}
```
(`iniciarPagina` es `async`: se lanza sin `await`, y su Promise no se usa — los errores internos ya se manejan con `console.error`/mensajes en pantalla.)

---

## 8. Flujo general

```
Página carga
   └─ iniciarPagina() [async]
        ├─ await obtenerCatalogo()          ← Supabase: select(*) + mapearProductoBD
        │       └─ catalogoEnMemoria
        ├─ renderizarCatalogo()             (lee catalogoEnMemoria, sin consultar)
        │    ├─ filtrarProductosAdmin()      (administrador.html)
        │    ├─ aplicarFiltros()             (busqueda.html)
        │    └─ crearTarjetaProducto() / crearTarjetaProductoAdmin() + crearTarjetaNuevoProducto()
        ├─ inicializarFiltrosBusqueda()      (busqueda.html: submit → repinta con filtros)
        ├─ inicializarBusquedaAdmin()        (administrador.html: input → repinta desde caché)
        └─ inicializarFormularioNuevoProducto()
             └─ submit → procesarImagen() → await crearProducto()
                                          → insert en Supabase → redirect administrador.html

   (admin) clic en el lápiz o en cualquier punto de la tarjeta
      └─ editar-producto.html?id=<id> → await buscarProducto(id) → precarga
         └─ submit → await actualizarProducto()  → update en Supabase → redirect
   (admin) clic en la X de una tarjeta
      └─ confirm() → [async] await eliminarProducto(id)
           └─ delete en Supabase → await obtenerCatalogo() → renderizarCatalogo() + mostrarMensajeAdmin()

   (cualquiera) producto.html?id=<id>
      └─ await buscarProducto(id) → detalle + await obtenerProductosRelacionados()
```

**Archivos que incluyen el script:** `index.html`, `busqueda.html`, `administrador.html`, `nuevo-producto.html`, `producto.html` y `editar-producto.html` (después del SDK de Supabase, `supabase-config.js` y `supabase-client.js`, y siempre después de `header-footer.js`). En el resto de las páginas el script no hace nada porque no existe `#catalogo` ni los formularios.

**Datos de prueba:** la tabla arranca con los 10 productos del viejo `CATALOGO_BASE`, cargados por el seed de `supabase/schema.sql`.
