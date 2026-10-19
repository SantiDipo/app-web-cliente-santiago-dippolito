## Descripción

Explicá brevemente qué hiciste y qué archivos modificaste o agregaste:

- Agregué la funcionalidad de **eliminar productos** desde la sección del administrador (`administrador.html`), manteniendo la persistencia actual en `localStorage` y dejando la lógica preparada para migrar después a una base de datos.
- En `assets/js/productos.js` agregué la constante `CLAVE_PRODUCTOS_ELIMINADOS = 'accesorios-shop-productos-eliminados'` junto con `leerProductosEliminados()` y `guardarProductosEliminados(ids)`, con el mismo patrón `try/catch` que ya usan las claves de productos nuevos y editados.
- Agregué la función `eliminarProducto(id)`: valida el id, si es un producto creado por el admin lo saca del array de `leerProductosNuevos()` y si es un producto del `CATALOGO_BASE` anota su id en la lista de bajas (porque el catálogo base vive en el código y no se puede borrar de ahí). También limpia las ediciones huérfanas del producto eliminado y devuelve `true`/`false` según pudo persistir.
- Modifiqué `obtenerCatalogo()` para que **filtre los ids de `leerProductosEliminados()`**: como todo el catálogo pasa por esa función (índice, búsqueda, detalle, relacionados y el panel admin), un producto eliminado desaparece de toda la app al mismo tiempo.
- Cableé el botón **X** (`button.icono-eliminar`) de `crearTarjetaProductoAdmin()`: pide confirmación con `window.confirm`, llama a `eliminarProducto()`, vuelve a pintar la lista con `renderizarCatalogo()` y muestra un mensaje de estado con `mostrarMensajeAdmin()`.
- Agregué `mostrarMensajeAdmin(mensaje)` y limpio ese aviso al inicio de `renderizarCatalogo()`, para que no quede un mensaje viejo colgado cuando cambia la lista.
- En `crearProducto()` evito reutilizar ids de productos eliminados: si no, crear un producto con el mismo nombre que uno borrado reviviría al anterior (que seguiría filtrado por la lista de bajas).
- En `administrador.html` agregué `<p id="aviso-admin" class="admin-aviso" role="status" aria-live="polite" hidden>` para anunciar el resultado de la eliminación a los lectores de pantalla.
- En `assets/css/styles.css` agregué el estilo de `#catalogo p.admin-aviso` (con la especificidad necesaria para no pisarse con `#catalogo p:nth-of-type(1)`) y actualicé el comentario de la X, que ya no es "interacción con JS en el futuro".
- Actualicé `documentacion-productos.md` con la nueva clave, `leerProductosEliminados()` / `guardarProductosEliminados(ids)`, `eliminarProducto(id)`, los cambios en `obtenerCatalogo()` / `crearTarjetaProductoAdmin()` / `renderizarCatalogo()` y el flujo de eliminación.

## Cómo probarlo

Pasos para que el profesor pueda correr o revisar el cambio (comandos, URL, capturas de pantalla si aplica):

- Levantar un servidor local en la raíz del proyecto (el `fetch` de header/footer lo requiere): por ejemplo `npx serve` o la extensión Live Server, y abrir la URL que indique.
- Abrir `administrador.html`: debe mostrarse la grilla de productos con los iconos de editar/eliminar (X arriba a la izquierda de cada tarjeta).
- Hacer clic en la X de un producto: aparece un `confirm` con el nombre del producto y el texto "Esta acción no se puede deshacer". Si se **cancela**, no cambia nada.
- Si se **acepta**: el producto desaparece de la grilla al instante y arriba de la lista se muestra el aviso "Se eliminó "…" del catálogo."
- Recargar `administrador.html`: el producto sigue borrado, porque la baja quedó guardada en `localStorage` (clave `accesorios-shop-productos-eliminados` para los base, o sacado de `accesorios-shop-productos-nuevos` para los creados por el admin).
- Repetir la prueba con un producto creado por el admin (desde `nuevo-producto.html`): debe eliminarse igual y ya no aparecer en el storage de productos nuevos.
- Abrir `index.html` y `busqueda.html`: el producto eliminado ya no aparece en el catálogo ni en los resultados.
- Abrir `producto.html?id=<id-del-eliminado>`: debe mostrarse "No encontramos el producto que buscás…".
- Probar a crear desde `nuevo-producto.html` un producto con el mismo nombre que uno base eliminado (ej: eliminar "Reloj clásico" y luego crear "Reloj clásico"): debe crearse con un id distinto (`reloj-clasico-2`) y sí aparecer en la grilla.
- Probar la eliminación dos veces sobre el mismo producto (recargando entre medio): la lista de ids eliminados no debe tener duplicados.
- Verificar en la consola del navegador que no haya errores y que en el código no haya declaraciones con `var`.
- Testeo de lógica sin navegador: `node --check assets/js/productos.js` y un script con `localStorage` simulado que cubre alta, edición, eliminación de base y de nuevo, doble eliminación, id inexistente/vacío, limpieza de ediciones y no reutilización de ids borrados (todas las aserciones en verde).

## Prompt usado y historial con Open Code

Pegá todo el histórico de mensajes con el agente de IA:

```
dale funcionalidad a la seccion de administrador para eliminar productos. Por ahora utilizamos el local storage, pero luego lo utilizaremos una db.
```

```
pull_request_template llena el md con lo que solicita y utiliza extrictamente el prompt que usamos en esta sesion
```

## Checklist antes de enviar

- [ ] Trabajé en una rama propia (no directo en `main`).
- [x] Probé que mi código/archivo funciona antes de subirlo.
- [ ] Este PR es dentro de mi propio repositorio.
- [x] Completé todos los datos de esta plantilla.

## Comentarios adicionales (opcional)

Dudas, aclaraciones o algo que quieras comentarle al profesor:

- El módulo `productos.js` no usa `var` en ninguna parte: solo `const` para datos/constantes y `let` donde hace falta reasignar.
- El código sigue sin `innerHTML` con datos del usuario: las tarjetas se construyen con `document.createElement` + `textContent`, así que un nombre de producto con HTML inyectado no rompe la página (evita XSS). El único `innerHTML` son los SVGs fijos de los iconos.
- Los productos nuevos siguen guardándose en `localStorage` bajo `accesorios-shop-productos-nuevos`; las ediciones en `accesorios-shop-productos-editados`; y ahora las bajas en `accesorios-shop-productos-eliminados`. El catálogo base permanece en el código fuente del JS.
- **Sobre la base de datos del futuro:** `eliminarProducto(id)` es la única función que sabe *cómo* se persiste la baja, y `obtenerCatalogo()` es el único filtro central del catálogo. Al pasar a una DB sólo habrá que reemplazar el interior de `eliminarProducto()` (y los lectores/guardadores) por llamadas al backend: el resto de la app no cambia.
- La eliminación pide confirmación antes de actuar, porque no hay "deshacer": para reponer un producto base habría que borrar su id de la lista de eliminados en las DevTools (`localStorage.removeItem('accesorios-shop-productos-eliminados')`).
- Dejé `documentacion-productos.md` actualizado, que explica función por función cómo trabaja el módulo, incluida la nueva función de eliminación.
