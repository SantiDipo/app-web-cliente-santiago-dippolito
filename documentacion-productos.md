# Documentación de `assets/js/productos.js`

Módulo encargado de centralizar el catálogo de productos, renderizarlo en las páginas, mostrar el **detalle personalizado de cada producto** (`producto.html?id=<id>`) y permitir al administrador crear, **editar** y **eliminar** productos. Todo el catálogo que antes estaba duplicado en HTML (`index.html`, `busqueda.html`, `administrador.html`) ahora se genera desde este archivo, y `producto.html` dejó de estar hardcodeado: se llena dinámicamente desde las constantes del catálogo.

**Regla del proyecto:** no se usa `var` en ningún lado; solo `const` (datos/módulo) y `let` (variables reasignables). Las funciones son declaraciones `function` a nivel superior, por lo que quedan disponibles de forma global en cualquier página que incluya el script.

---

## 1. Constantes

| Constante | Qué contiene |
|---|---|
| `CATALOGO_BASE` | Array con los 10 productos originales. Cada producto: `{ id, nombre, descripcion, precio, imagen, categoria, stock }`. El `precio` es un **número** (ej: `49999`), no el string `"$49.999"` como estaba en el HTML. |
| `CLAVE_PRODUCTOS_NUEVOS` | Clave bajo la que `localStorage` guarda los productos creados por el admin: `'accesorios-shop-productos-nuevos'`. |
| `CLAVE_PRODUCTOS_EDITADOS` | Clave bajo la que `localStorage` guarda las **ediciones** (un objeto `{ id: cambios }`): `'accesorios-shop-productos-editados'`. Permite editar productos base y nuevos sin tocar `CATALOGO_BASE`. |
| `CLAVE_PRODUCTOS_ELIMINADOS` | Clave bajo la que `localStorage` guarda los **ids eliminados** (un array de strings): `'accesorios-shop-productos-eliminados'`. Como `CATALOGO_BASE` vive en el código, para dar de baja un producto original se anota su id acá en vez de borrar el array base. |
| `IMAGEN_RESERVA` | Ruta de imagen por defecto (`assets/img/2.png`) si un producto se crea sin imagen. |
| `STOCK_INICIAL` | `10`. Stock que se asigna si no se recibe uno válido. |
| `ETIQUETAS_CATEGORIA` | Objeto que mapea el id de categoría a su nombre legible para mostrar en el detalle (ej: `joyeria` → `"Joyería"`). |
| `ICONO_EDITAR` / `ICONO_ELIMINAR` | Strings con los SVG de los iconos del panel de administración (mismos que tenía el HTML estático). |

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

## 3. Persistencia (localStorage)

### `leerProductosNuevos()`
- **No recibe nada.**
- **Hace:** intenta leer la clave `CLAVE_PRODUCTOS_NUEVOS` de `localStorage` y pasarla por `JSON.parse`.
- **Devuelve:** array de productos creados por el admin, o `[]` si no hay nada guardados o si el JSON está corrupto (todo dentro de un `try/catch` que sólo hace `console.error`).
- **Por qué:** así el catálogo sobrevive a recargar la página o navegar entre `index` / `busqueda` / `administrador`.

### `guardarProductosNuevos(productos)`
- **Recibe:** el array completo de productos nuevos a guardar.
- **Hace:** `localStorage.setItem` con `JSON.stringify`.
- **Devuelve:** `true` si se guardó; `false` si falló (típicamente por cuota de storage llena, lo más probable si la imagen pesa demasiado — por eso existe `procesarImagen`).
- **Dónde se usa:** dentro de `crearProducto`, para decidir si el alta fue exitosa.

### `leerProductosEditados()`
- **No recibe nada.**
- **Hace:** lee la clave `CLAVE_PRODUCTOS_EDITADOS` de `localStorage` y la parsea con `JSON.parse`.
- **Devuelve:** un **objeto** cuyas claves son ids de producto y cuyos valores son los campos modificados (ej: `{ 'reloj-clasico': { precio: 55000 } }`), o `{}` si no hay nada o el JSON está corrupto (`try/catch` con `console.error`).
- **Por qué:** las ediciones se guardan por separado de los productos nuevos para poder sobreescribir campos de cualquier producto (base o creado) sin mutar `CATALOGO_BASE`.

### `guardarProductosEditados(editados)`
- **Recibe:** el objeto completo de ediciones.
- **Hace:** `localStorage.setItem` con `JSON.stringify`.
- **Devuelve:** `true` si se guardó; `false` si falló.

### `leerProductosEliminados()`
- **No recibe nada.**
- **Hace:** lee la clave `CLAVE_PRODUCTOS_ELIMINADOS` de `localStorage` y la parsea con `JSON.parse`.
- **Devuelve:** array de ids (strings) de productos dados de baja, o `[]` si no hay nada, si el JSON está corrupto o si el valor guardado no es un array (`Array.isArray`).
- **Por qué:** es el "registro de bajas" que permite ocultar productos del `CATALOGO_BASE` sin modificar el código fuente.

### `guardarProductosEliminados(ids)`
- **Recibe:** el array completo de ids eliminados.
- **Hace:** `localStorage.setItem` con `JSON.stringify`.
- **Devuelve:** `true` si se guardó; `false` si falló (ej: cuota de storage llena).

---

## 4. Catálogo, búsqueda y edición de productos

### `obtenerCatalogo()`
- **No recibe nada.**
- **Hace:** une `CATALOGO_BASE` con `leerProductosNuevos()` usando `concat` (no muta el array base), **descarta los ids que estén en `leerProductosEliminados()`** (`filter`) y luego aplica las ediciones guardadas: si `leerProductosEditados()` tiene cambios para el id de un producto, hace `Object.assign({}, producto, ediciones)` (también sin mutar el original).
- **Devuelve:** array completo del catálogo: los 10 originales menos los eliminados + los creados, con sus ediciones aplicadas.
- **Dónde se usa:** en `renderizarCatalogo`, `generarIdProducto`, `buscarProducto`, `obtenerProductosRelacionados` y en los tests.
- **Importante:** como todas las páginas pasan por esta función, un producto eliminado desaparece del índice, de la búsqueda, del detalle y de los relacionados al mismo tiempo.

### `buscarProducto(id)`
- **Recibe:** el `id` de un producto (string).
- **Hace:** busca en `obtenerCatalogo()` el producto cuyo `id` coincida.
- **Devuelve:** el objeto producto o `null` si no existe.
- **Dónde se usa:** en `inicializarDetalleProducto` (para llenar `producto.html`) y en `inicializarFormularioEditarProducto` (para precargar `editar-producto.html`).

### `actualizarProducto(id, cambios)`
- **Recibe:** el `id` del producto y un objeto con los campos a modificar (ej: `{ nombre, descripcion, precio, categoria, stock, imagen }`).
- **Hace:** mergea los cambios con lo que ya hubiera editado para ese id (o con `{}` si es la primera vez), agrega `fechaModificacion` con la fecha/hora actual en ISO y guarda el objeto con `guardarProductosEditados`. **No modifica** `CATALOGO_BASE` ni el array de productos nuevos: el merge se aplica en `obtenerCatalogo`.
- **Devuelve:** `true` si se guardó; `false` si falló el `localStorage`.
- **Dónde se usa:** en el `submit` de `editar-producto.html`.

### `generarIdProducto(nombre, catalogo)`
- **Recibe:** el nombre del producto y el catálogo completo (para chequear duplicados).
- **Hace:**
  1. Normaliza el nombre (`normalizarTexto`).
  2. Elimina todo lo que no sea letra/número/espacio/guion.
  3. Reemplaza los espacios por guiones → slug (`"Gorra Urbana"` → `gorra-urbana`).
  4. Si el id ya existe en el catálogo, le agrega un sufijo numérico (`gorra-urbana-2`, `-3`, …) con un `while`.
- **Devuelve:** string único. Si el nombre quedara vacío, devuelve `'producto'`.

### `crearProducto(datos)`
> **Es la función del administrador para crear productos.**

- **Recibe:** un objeto con la forma `{ nombre, descripcion, precio, categoria?, imagen?, stock? }`.
- **Hace:**
  1. **Valida:** `nombre` y `descripcion` no vacíos, `precio` numérico y mayor a 0. Si algo falla, hace `console.error` y devuelve `null` sin guardar nada.
  2. **Arma el objeto producto:** genera el `id` con `generarIdProducto`, convierte `precio` a número, aplica `imagen` (o `IMAGEN_RESERVA`), `categoria` (o `'accesorios'`), `stock` (o `STOCK_INICIAL`) y marca `fechaCreacion` con la fecha/hora actual en ISO.
  3. **Persiste:** lee los productos nuevos, hace `push` del nuevo y guarda con `guardarProductosNuevos`. Si el guardado falla, devuelve `null`.
- **Devuelve:** el producto creado (objeto completo) o `null` si no se pudo crear.
- **Ejemplo:**
  ```js
  const producto = crearProducto({
      nombre: 'Gorra Urbana',
      descripcion: 'Gorra de algodón.',
      precio: 9999.5,
      categoria: 'gorras',
      imagen: 'data:image/jpeg;base64,...'
  });
  // producto.id === 'gorra-urbana'
  ```

### `eliminarProducto(id)`
> **Es la función del administrador para eliminar productos** (también pensada para migrar luego a una base de datos: sólo hay que reemplazar su persistencia).

- **Recibe:** el `id` del producto (string).
- **Hace:**
  1. **Valida:** si el `id` viene vacío o no corresponde a ningún producto del catálogo (ni base ni nuevo), hace `console.error` y devuelve `false` sin tocar nada.
  2. **Si es un producto creado por el admin:** lo saca del array de `leerProductosNuevos()` (`splice`) y lo persiste con `guardarProductosNuevos`. Si ese guardado falla, devuelve `false`.
  3. **Si es un producto del catálogo base:** agrega su id a `leerProductosEliminados()` (evitando duplicados) y lo guarda con `guardarProductosEliminados`. No se modifica `CATALOGO_BASE`.
  4. **Limpia las ediciones:** borra `editados[id]` para que no queden cambios huérfanos (si ese guardado falla, sólo hace `console.error`, porque el producto ya se eliminó).
- **Devuelve:** `true` si el producto quedó eliminado; `false` si falló el `localStorage` o el id no existía.
- **Ejemplo:**
  ```js
  eliminarProducto('reloj-clasico');      // producto base → queda en la lista de eliminados
  eliminarProducto('gorra-urbana');       // producto nuevo → se borra del todo
  ```
- **Nota de migración:** la función es la única que conoce *cómo* se persiste la baja, por lo que al pasar a una DB sólo hay que cambiar su interior por una llamada al backend (mientras `obtenerCatalogo()` siga siendo el filtro central, el resto de la app no cambia).

---

## 5. Filtros de `busqueda.html`

### `fechaProducto(producto)`
- **Devuelve:** el timestamp (`Date.parse`) de `fechaCreacion`, o `0` si el producto no lo tiene (los del catálogo base). Ese `0` hace que los originales se consideren los más viejos y los recién creados aparezcan primero en "Más nuevo".

### `aplicarFiltros(productos, parametros)`
- **Recibe:** array de productos y un objeto `URLSearchParams` (la querystring de la página, ej: `?busqueda=gorra&categoria=joyeria`).
- **Hace, en orden:**
  1. Copia el array (`slice`) para no mutar el original.
  2. **Texto** (`busqueda`): filtra por nombre o descripción usando `normalizarTexto` + `includes`.
  3. **Categoría** (`categoria`): si no es `'todas'`, filtra por `producto.categoria`.
  4. **Disponibilidad** (`disponibilidad`): sólo filtra si viene **exactamente un** valor en la URL — `'en-stock'` → `stock > 0`, `'agotado'` → `stock <= 0`. Si vienen los dos o ninguno, no filtra.
  5. **Orden** (`orden`): con un `switch` ordena por precio (asc/desc), por nombre (`localeCompare` con `'es'`) o por fecha (`mas-nuevo` / `mas-viejo`). `'mas-vendido'` (por defecto) deja el orden original.
- **Devuelve:** array filtrado y ordenado (nuevo array).

---

## 6. Renderizado del catálogo

Las tres funciones siguientes **no usan `innerHTML` con interpolación**; construyen el DOM con `document.createElement` y `textContent`, así que un nombre de producto con HTML inyectado no puede romper la página (evita XSS).

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

### `crearTarjetaProductoAdmin(producto)`
- Igual que la anterior pero **sin enlace ni form de carrito**, y con dos controles al inicio del `<article>`:
  - `a.icono-editar` → `editar-producto.html` con `aria-label="Editar <nombre>"` e ícono de lápiz.
  - `button.icono-eliminar` con `aria-label="Eliminar <nombre>"` e ícono de equis.
- El botón de eliminar **tiene la interacción cableada**: al hacer clic pide confirmación con `window.confirm` (así un clic equivocado no borra nada), llama a `eliminarProducto(id)` y, si salió bien, vuelve a llamar `renderizarCatalogo()` para repintar la lista sin ese producto y muestra el mensaje de estado con `mostrarMensajeAdmin('Se eliminó "…" del catálogo.')`. Si falla, muestra un mensaje de error sin repintar.
- Los `innerHTML` de los iconos son SVGs fijos de las constantes (no hay datos de usuario ahí).

### `crearTarjetaNuevoProducto()`
- Crea la tarjeta punteada final del admin: `li.nuevo-producto > a[href=nuevo-producto.html] > article > span.mas ("+") + p ("Agregar nuevo producto")`.

### `actualizarContadorResultados(cantidad)`
- Si existe el párrafo `.resultado-info` (sólo está en `busqueda.html`), escribe `"Mostrando 4 productos"` o `"Mostrando 1 producto"` según corresponda. Si no existe, no hace nada.

### `renderizarCatalogo()`
Función central de pintado. Pasos:
1. Busca `#catalogo` y su `ul`. Si la página no tiene catálogo, sale. Antes de repintar, **oculta y vacía el aviso `#aviso-admin`** para que un mensaje de estado viejo no quede colgado cuando cambie la lista.
2. Detecta el modo: si la sección tiene la clase `admin` → **modo administrador**; si además existe `#filtros-busqueda form` → aplica `aplicarFiltros` con la `URLSearchParams` de la ventana.
3. Vuelca la lista con `lista.replaceChildren(...)` (borra lo anterior y agrega una tarjeta por producto).
4. En modo admin, agrega al final la tarjeta de "nuevo producto".
5. Actualiza el contador de resultados.

### `mostrarMensajeAdmin(mensaje)`
- **Recibe:** el texto a mostrar.
- **Hace:** si existe el párrafo `#aviso-admin` (`role="status"`, sólo está en `administrador.html`), le escribe el mensaje y lo desoculta (`hidden = false`). Si no existe, no hace nada.
- **Para qué sirve:** dar feedback accesible (lectores de pantalla anuncian el cambio por el `aria-live="polite"`) de que un producto se eliminó o de que hubo un error.

---

## 7. Formularios e inicialización

### `inicializarFiltrosBusqueda()`
1. Si la página no tiene `#filtros-busqueda form`, sale.
2. **Precarga** los campos del form desde la querystring (`busqueda`, `categoria`, `orden` y las casillas `disponibilidad`), así el form refleja el estado actual de la URL (por ejemplo cuando llegás desde el buscador del header).
3. **Intercepta el `submit`:** llama `preventDefault()` (evita el reload), arma una `URLSearchParams` con los valores del form (ignora los vacíos), actualiza la URL con `history.replaceState` y vuelve a llamar `renderizarCatalogo()`. La URL queda compartible y el back/forward siguen teniendo sentido.

### `procesarImagen(archivo)`
Devuelve una **Promise** porque lee archivos de forma asíncrona:
1. Si no hay archivo, resuelve con `''`.
2. `FileReader` lee el archivo como data URL.
3. Carga esos bytes en un `Image`.
4. Si supera los 600px de lado, calcula la escala y redibuja en un `<canvas>` (misma relación de aspecto).
5. Exporta el canvas con `toDataURL('image/jpeg', 0.8)` → **resuelve** con la imagen comprimida.
6. Cualquier error (archivo ilegible, no es imagen) → **rechaza** con un `Error` con mensaje en español.

**Para qué:** guardar la imagen directamente llenaría el `localStorage` (~5 MB) con una foto del celular; redimensionarla y comprimirla lo deja en pocos KB.

### `inicializarFormularioNuevoProducto()`
1. Si la página no tiene `#nuevo-producto form` (sólo existe en `nuevo-producto.html`), sale.
2. Escucha el `submit` con un handler `async`:
   - `preventDefault()` para que no recargue la página.
   - Toma el archivo del `input#imagen` y, si hay, lo pasa por `procesarImagen`. Si falla, muestra `alert` y aborta.
   - Llama a **`crearProducto`** con `nombre`, `descripcion`, `precio`, `categoria` (el select nuevo) y la imagen procesada.
   - Si devuelve `null` → `alert` de error y aborta.
   - Si sale bien → `window.location.href = 'administrador.html'`, donde el admin ve recién creado su producto.

### `iniciarPagina()`
Único punto de entrada. Ejecuta en orden:
1. `renderizarCatalogo()` — pinta la página donde estemos.
2. `inicializarFiltrosBusqueda()` — conecta los filtros (si existen).
3. `inicializarFormularioNuevoProducto()` — conecta el form de alta (si existe).

Al final del archivo:
```js
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarPagina);
} else {
    iniciarPagina();
}
```
Esto garantiza que corra después de que el HTML esté parseado, sin importar dónde se cargue el script.

---

## 8. Flujo general

```
Página carga
   └─ iniciarPagina()
        ├─ renderizarCatalogo()
        │    ├─ obtenerCatalogo() = (CATALOGO_BASE + leerProductosNuevos()) − leerProductosEliminados() + ediciones
        │    ├─ aplicarFiltros()  (sólo en busqueda.html)
        │    └─ crearTarjetaProducto() / crearTarjetaProductoAdmin() + crearTarjetaNuevoProducto()
        ├─ inicializarFiltrosBusqueda()   (busqueda.html)
        └─ inicializarFormularioNuevoProducto()   (nuevo-producto.html)
             └─ submit → procesarImagen() → crearProducto() → guardarProductosNuevos()
                                                              └─ redirect a administrador.html

   (admin) clic en la X de una tarjeta
      └─ confirm() → eliminarProducto(id)
           ├─ producto nuevo → guardarProductosNuevos()
           ├─ producto base  → guardarProductosEliminados()
           └─ limpia las ediciones del id → renderizarCatalogo() + mostrarMensajeAdmin()
```

**Archivos que incluyen el script:** `index.html`, `busqueda.html`, `administrador.html` y `nuevo-producto.html` (siempre después de `header-footer.js`). En el resto de las páginas el script no hace nada porque no existe `#catalogo` ni el form de alta.
