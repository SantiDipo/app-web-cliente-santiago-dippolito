# Carrito de compras (localStorage + Supabase + WhatsApp)

El carrito vive en el **navegador**, no en la base: cada "Agregar al carrito" guarda el producto en `localStorage` y `carrito.html` pinta esa lista al abrirlo. Es una **caché de 24 hs**: se guarda junto a los items un timestamp que se refresca en cada operación, y al vencer el carrito se borra solo.

Al tocar **Finalizar compra** se descuenta el stock de todos los productos en la base (vía la RPC `descontar_stock_carrito`) y, sólo si eso salió bien, se abre WhatsApp con el detalle del pedido (productos, cantidades, precios y total) hacia el número configurado.

A diferencia del catálogo (que sí vive en Supabase), el carrito es **por usuario y por dispositivo**: no se sincroniza entre navegadores ni sobrevive si el usuario limpia los datos del sitio. Es el comportamiento esperado para este proyecto.

**Regla del proyecto:** no se usa `var`; solo `const` y `let`, y funciones `function` a nivel superior (quedan globales en cualquier página que incluya el script).

---

## 1. Archivos tocados

| Archivo | Cambio |
|---|---|
| `assets/js/carrito.js` | **Nuevo.** Toda la lógica: persistencia con caché de 24 hs, operaciones, descuento de stock, pintado de `carrito.html`, contador del navbar y mensaje de WhatsApp. |
| `assets/js/productos.js` | `crearTarjetaProducto()` e `inicializarDetalleProducto()` interceptan el `submit` del form de compra para llamar `agregarAlCarrito()` en lugar de navegar. |
| `carrito.html` | La tabla ya no trae filas hardcodeadas: el `<tbody>` vacío lo llena `carrito.js`. Se agregan `#carrito-vacio`, `#aviso-finalizacion`, `#finalizar-compra` y los ids del resumen. **Ahora sí carga Supabase** (SDK + config + cliente), porque finalizar la compra descuenta stock. |
| `header.html` | El enlace "Carrito" ahora tiene un badge `<span class="contador-carrito">` con la cantidad de unidades. |
| `supabase/schema.sql` | Nueva sección 4 con la función `descontar_stock_carrito(items jsonb)`, que hace el chequeo de stock y el descuento atómicos. |
| `assets/css/styles.css` | Estilos del badge, del botón "Eliminar" (ahora es `<button>`, no `<a>`), del aviso de carrito vacío y de la nota bajo "Finalizar compra". |

`carrito.js` se carga en **todas** las páginas (antes que `productos.js` en las del catálogo): en las que venden, para poder agregar; en las demás, sólo para mostrar el contador del navbar. En `carrito.html` no se carga `productos.js` (el carrito no necesita el catálogo), pero sí los tres scripts de Supabase, porque `descontarStockEnBase()` necesita `clienteSupabase`.

## 2. Formato del dato en `localStorage`

Clave: `carrito`. Valor: un objeto con los items y el timestamp del último guardado. El `id` numérico de Supabase viaja como string, igual que en el resto de la app:

```json
{
    "items": [
        { "id": "12", "nombre": "Reloj clásico", "precio": 49999,
          "imagen": "assets/img/1.png", "cantidad": 2 }
    ],
    "guardadoEn": 1761600000000
}
```

- **`items`**: lo mínimo para pintar la pantalla y descontar el stock.
- **`guardadoEn`**: `Date.now()` del último guardado. Es el corazón del cache de 24 hs (ver §3).
- **`id`**: clave para detectar repetidos, para armar el enlace de vuelta al detalle (`producto.html?id=12`) y para identificar la fila a descontar en la base.
- **`precio`**: se guarda al momento de agregar. Si el producto cambia de precio en la base, el carrito conserva el precio viejo (es un snapshot; el stock real se valida al finalizar).
- **`cantidad`**: entero entre 1 y `CANTIDAD_MAXIMA` (10), normalizado en cada lectura/escritura.

> **Compatibilidad:** el formato anterior (un array suelto, sin timestamp) se sigue leyendo: `leerCarrito()` lo detecta con `Array.isArray(dato)` y lo devuelve tal cual. Se re-escribe en el formato nuevo con la próxima operación, sin perder los items.

## 3. Cache de 24 hs

- **`DURACION_CARRITO_MS`** = `24 * 60 * 60 * 1000`. Es el único lugar donde se define la vigencia.
- **`leerCarrito()`** compara `Date.now() - guardadoEn` contra esa duración. Si venció, **borra la clave** del storage, levanta el flag `carritoVencido` y devuelve `[]`. Ese flag es el que permite distinguir en pantalla "el carrito venció" de "el carrito está vacío" (ver `renderizarCarrito()`).
- **`guardarCarrito()`** refresca `guardadoEn` en **cada** operación (agregar, actualizar cantidad, eliminar, vaciar). El cache corre desde la última vez que el usuario tocó el carrito, no desde que lo abrió por primera vez.
- Si `guardadoEn` falta o no es numérico, también se considera vencido: nunca queda un carrito "fantasma" sin fecha.
- **`vaciarCarrito()`** = `guardarCarrito([])`. Se usa al finalizar la compra, para que un segundo click no vuelva a descontar stock.

## 4. Persistencia y eventos

- **`leerCarrito()`**: parsea `localStorage` con `try/catch`. Si el JSON está corrupto o el storage está bloqueado (modo incógnito), devuelve `[]` en vez de romper la página. También aplica el chequeo de vencimiento del §3.
- **`guardarCarrito(items)`**: serializa `{ items, guardadoEn }` y, si pudo o no, **despacha el evento `carrito-actualizado`** en `window`. Ese evento es el que mantiene al día el contador del navbar y el repaint de `carrito.html`, así que cualquier operación nueva que llame a `guardarCarrito()` queda sincronizada sin tocar nada más.
- **`normalizarCantidad(cantidad)`**: `parseInt` + clamp a `[1, CANTIDAD_MAXIMA]`; devuelve 1 ante basura.

## 5. Operaciones

| Función | Qué hace |
|---|---|
| `agregarAlCarrito(producto, cantidad)` | Si el `id` ya está en el carrito, **suma** la cantidad; si no, agrega la fila. Devuelve el array actualizado. |
| `actualizarCantidadItem(id, cantidad)` | Cambia la cantidad de una fila (usado por el form "Actualizar" de `carrito.html`). |
| `eliminarDelCarrito(id)` | Filtra la fila afuera. |
| `vaciarCarrito()` | Deja el carrito sin items (tras una compra exitosa). |
| `unidadesCarrito(items)` / `totalCarrito(items)` | Acumuladores para el resumen (`reduce`). |

Todas persisten vía `guardarCarrito()` y terminan repintando por el evento.

## 6. Cómo se agregan productos (sin salir de la página)

Tanto en la tarjeta del catálogo (`crearTarjetaProducto`) como en el detalle (`inicializarDetalleProducto`), el `submit` del form de compra se intercepta con `preventDefault()`:

```js
formulario.addEventListener('submit', evento => {
    evento.preventDefault();

    if (typeof agregarAlCarrito === 'function') {
        agregarAlCarrito(producto, campoCantidad.value);
        avisarAgregado(botonAgregar);
    }
});
```

- El guard `typeof agregarAlCarrito === 'function'` es defensivo: si por algún motivo `carrito.js` no cargó, el form navega a `carrito.html` como antes (el `action` del form sigue siendo ese).
- **`avisarAgregado(boton)`** cambia el texto del botón a "Agregado ✓" por 1,5 s y lo deshabilita mientras tanto, para confirmar la acción sin redirigir ni usar `alert`.
- Desde el catálogo se agrega **1 unidad**; desde el detalle se usa la cantidad del `input#cantidad`.

## 7. Pintado de `carrito.html`

### `crearFilaItem(item)`
Construye una fila con `document.createElement` + `textContent` (mismo criterio anti-XSS que `productos.js`). Reproduce la estructura que espera el CSS de la tabla, incluidos los `data-titulo` que el layout móvil usa como etiquetas:

```
tr
├─ td[data-titulo=Producto]   → img (64×64) + a[producto.html?id=…]
├─ td[data-titulo=Precio]
├─ td[data-titulo=Cantidad]   → form → label.sr-only + input[type=number] + button "Actualizar"
├─ td[data-titulo=Subtotal]
└─ td[data-titulo=Acciones]   → button.eliminar "Eliminar"
```

El form de cantidad y el botón eliminar vuelven a operar sobre `localStorage` y disparan el repintado vía `carrito-actualizado`.

### `renderizarCarrito()`
1. Si la página no tiene `#items-carrito tbody`, sale (sólo corre en `carrito.html`).
2. Muestra/oculta la tabla y el aviso `#carrito-vacio` según haya o no items, y habilita/deshabilita `#finalizar-compra`.
3. **Completa el aviso `#carrito-vacio`** con `replaceChildren`: si `carritoVencido` es true, explica que el cache de 24 hs venció; si no, que el carrito está vacío. En ambos casos agrega el enlace "Seguí comprando". La distinción es lo único que hace falta del flag, porque ambos motivos terminan en la misma pantalla.
4. Vuelca las filas con `cuerpo.replaceChildren(...)`.
5. Actualiza el resumen: `#resumen-unidades` ("Productos (4)"), `#resumen-subtotal` y `#resumen-total`.

## 8. Finalizar compra: stock + WhatsApp

El botón `#finalizar-compra` se conecta en `iniciarCarrito()` y ejecuta `finalizarCompra()` en este orden:

### 8.1 Descuento de stock (Supabase)

**`descontarStockEnBase(items)`** llama a la RPC `descontar_stock_carrito` de la base:

```js
const { error } = await clienteSupabase.rpc('descontar_stock_carrito', { items: payload });
```

- El `payload` manda `[{ id: 12, cantidad: 2 }, ...]`; el `id` viaja como **número** para coincidir con el `bigint` de la base.
- **El chequeo de stock y el descuento son una sola transacción en la base**, no dos pasos desde el navegador. Si se hiciera `select` de stock y luego `update` con el valor calculado, dos usuarios comprando al mismo tiempo las últimas unidades se pisarían: ambos leerían el mismo stock y ambos venderían.
- Es **todo o nada**: si a alguno de los productos le falta stock, no se descuenta nada y la función lanza un error.
- La RPC usa `security definer`, así que el descuento no depende de las políticas RLS de la tabla (que hoy dejan editar a cualquiera); y con `set search_path = public` se evitan ataques por esquemas.

**Errores que maneja el frontend** (`interpretarFaltantes()`):

| Caso | Origen | Qué hace la app |
|---|---|---|
| Sin cliente (`clienteSupabase` null) | Falta el SDK o `supabase-config.js` | Aviso "No hay conexión con la base de datos" |
| Stock insuficiente | La RPC lanza `raise ... using detail = [...]` | Cierra la pestaña abierta, **no toca el carrito** ni el stock, y muestra qué productos quedaron cortos: *"Gorra deportiva (pediste 5, quedan 1)"* |
| Error de red / permisos | Falla el `rpc()` en sí | Mismo tratamiento, sin detalle de faltantes |

El `detail` del error llega como texto JSON en `error.details`; `interpretarFaltantes()` lo parsea con `try/catch` y devuelve `[]` si no lo logra.

### 8.2 Mensaje de WhatsApp

**`construirMensajeWhatsApp()`** arma el texto del pedido leyendo `localStorage`:

```
¡Hola! Quiero finalizar mi compra:

• Reloj clásico — 2 x $49.999 = $99.998
• Gorra deportiva — 1 x $12.999 = $12.999

Total: $112.997
```

Y **`finalizarCompra()`** lo navega a:

```
https://wa.me/5491167496525?text=<texto URL-encoded>
```

`encodeURIComponent` codifica saltos de línea y símbolos para que el mensaje llegue entero.

### 8.3 Secuencia completa y por qué en ese orden

```
1. window.open('', '_blank')   ← ANTES del await
2. await descontarStockEnBase()
3. si falló → ventana.close() + aviso, y se detiene (carrito intacto)
4. si salió bien → ventana.location.href = wa.me/…?text=…
5. vaciarCarrito()
```

El detalle del paso 1 es importante: los **bloqueadores de pop-ups sólo dejan `window.open()` dentro del gesto del usuario**. Si se esperara la respuesta de la base, el `window.open` del paso 4 caería después del `await` y Chrome/Safari lo tirarían. Por eso se abre la pestaña vacía primero y se le asigna la URL después. Si aun así el pop-up quedó bloqueado (`window.open` devuelve `null`), se navega en la misma pestaña para no perder la compra ya descontada.

El paso 5 vacía el carrito porque **el stock ya se descontó**: si el carrito quedara intacto, un segundo click volvería a descontar.

### 8.4 Configurar el número

En `assets/js/carrito.js`:

```js
const NUMERO_WHATSAPP = '5491167496525';
```

Formato internacional **sin `+` ni espacios**: código de país (54 = Argentina) + 9 (celular) + área (11) + número. Ejemplo: el `11 6749-6525` de Buenos Aires es `5491167496525`. Es el único valor a tocar si cambia el número que recibe los pedidos.

## 9. Contador del navbar

`actualizarContadorNavbar()` busca `.contador-carrito` (el badge dentro del enlace "Carrito" de `header.html`) y escribe la cantidad de unidades, ocultándolo si es 0. Como el header se inyecta con `fetch`, el badge puede no existir todavía cuando corre el script: para ese caso se escucha el evento **`componentes-cargados`** (que despacha `header-footer.js`) y se vuelve a pintar. Cada operación del carrito lo actualiza además por `carrito-actualizado`.

## 10. Flujo general

```
Click "Agregar al carrito" (catálogo o detalle)
   └─ submit interceptado → preventDefault()
        └─ agregarAlCarrito(producto, cantidad)
             └─ leerCarrito() → sumar/filtrar → guardarCarrito()  ← refresca guardadoEn (24 hs)
                                                   └─ evento carrito-actualizado
                                                        ├─ actualizarContadorNavbar()
                                                        └─ renderizarCarrito()   (sólo en carrito.html)

carrito.html carga
   └─ iniciarCarrito()
        ├─ actualizarContadorNavbar()
        ├─ renderizarCarrito()            ← pinta tabla + resumen, o aviso "venció"/"vacío"
        ├─ #finalizar-compra → finalizarCompra()  [async]
        │      ├─ window.open('', '_blank')       ← dentro del gesto del click
        │      ├─ await descontarStockEnBase()    ← RPC: valida stock y descuenta (todo o nada)
        │      │      ├─ ok     → ventana.location.href = wa.me/…?text=…
        │      │      └─ falla  → ventana.close() + #aviso-finalizacion, carrito intacto
        │      └─ vaciarCarrito()
        └─ escucha componentes-cargados y carrito-actualizado
```

## 11. Posibles mejoras

- **Vaciar carrito** completo (un botón en el resumen) — hoy sólo se puede item por item.
- **Sincronizar el precio** con la base al abrir `carrito.html`, para no mostrar snapshots viejos.
- **Validar el stock al agregar** (no sólo al finalizar), avisando en la tarjeta si lo pedido supera lo disponible.
- **Persistir el carrito en la cuenta de usuario** (tabla `carritos` en Supabase) para que siga al usuario entre dispositivos. Requiere auth, que todavía no está implementada.
