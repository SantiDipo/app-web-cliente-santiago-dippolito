## Descripción

Explicá brevemente qué hiciste y qué archivos modificaste o agregaste:

- Agregué `assets/js/productos.js`, un módulo nuevo que centraliza todo el catálogo de productos: los 10 productos originales ahora viven en el array `CATALOGO_BASE` en JavaScript en lugar de estar escritos a mano en el HTML.
- El catálogo se renderiza dinámicamente con `renderizarCatalogo()`: las páginas `index.html`, `busqueda.html` y `administrador.html` dejaron de tener los productos hardcodeados y ahora solo tienen un `<ul></ul>` vacío que pinta el JS (respetando la estructura `h3 → img → p → p` que espera el CSS).
- Agregué la función `crearProducto(datos)` para que desde el administrador se puedan crear productos nuevos: valida los datos, genera un id slug único, guarda el producto en `localStorage` y lo muestra al instante en el panel.
- Conecté el formulario de `nuevo-producto.html` a `crearProducto()`: al enviarlo redirige a `administrador.html` con el producto recién creado visible. También agregué un select de categoría (mismas opciones que los filtros de búsqueda) y su estilo en `assets/css/styles.css`.
- La imagen del formulario se procesa con `procesarImagen()`: se redimensiona a 600px por canvas y se comprime a JPEG antes de guardarse, para no agotar la cuota del `localStorage`.
- Los filtros de `busqueda.html` ahora funcionan de verdad (texto, categoría, disponibilidad y los 7 órdenes) mediante `aplicarFiltros()`, y el contador "Mostrando X productos" se actualiza con `actualizarContadorResultados()`.
- Agregué `documentacion-productos.md` con la explicación de cada función del módulo.
- En las tarjetas del administrador se conservaron los iconos de editar/eliminar con la misma estructura del HTML anterior.

## Cómo probarlo

Pasos para que el profesor pueda correr o revisar el cambio (comandos, URL, capturas de pantalla si aplica):

- Levantar un servidor local en la raíz del proyecto (el `fetch` de header/footer lo requiere): por ejemplo `npx serve` o la extensión Live Server, y abrir la URL que indique.
- Abrir `index.html`: deben renderizarse los 10 productos desde JavaScript (nombre, imagen, descripción, precio formateado `49.999` y botón "Agregar al carrito").
- Abrir `administrador.html`: debe mostrar los mismos productos con los iconos de editar/eliminar y la tarjeta punteada "Agregar nuevo producto" al final.
- Ir a `nuevo-producto.html`, completar nombre, descripción, precio, categoría e imagen y enviar el formulario: redirige al administrador y el producto nuevo aparece en la grilla.
- Recargar `administrador.html` (o volver a `index.html`): el producto sigue ahí, porque se guardó en `localStorage`.
- Repetir la creación con un nombre ya existente: se crea igual, pero con un id distinto (ej: `gorra-urbana-2`).
- Abrir `busqueda.html`: probar el texto de búsqueda, el select de categoría, el de orden y las casillas de disponibilidad; el contador debe actualizarse. Como atajo, abrir `busqueda.html?categoria=joyeria` y verificar que diga "Mostrando 4 productos".
- Usar el buscador del header desde cualquier página: debe llegar a `busqueda.html` con los resultados filtrados.
- Verificar en la consola del navegador que no haya errores y que en el código no haya declaraciones con `var`.

## Prompt usado y historial con Open Code

Pegá todo el histórico de mensajes con el agente de IA:

```
Quiero que todo el catalogo de productos ahora lo pacemos a un codigo java script, y que ahora desde el administrador sea capaz de crear nuevos productos por medio de una function. Dato a tener en cuenta, NO DECLARES CON VAR a noser que quieras usar variables globales.
```

```
explicame en un .md como funciona cada function
```

```
En pull_request_template llena el formulario con lo requerido y MUY IMPORTANTE utiliza el mismo propt que use en esta seccion para decir con que prompt genere el pr
```

## Checklist antes de enviar

- [ ] Trabajé en una rama propia (no directo en `main`).
- [ ] Probé que mi código/archivo funciona antes de subirlo.
- [ ] Este PR es dentro de mi propio repositorio.
- [ ] Completé todos los datos de esta plantilla.

## Comentarios adicionales (opcional)

Dudas, aclaraciones o algo que quieras comentarle al profesor:

- El módulo `productos.js` no usa `var` en ninguna parte: solo `const` para datos/constantes y `let` donde hace falta reasignar.
- Las tarjetas se construyen con `document.createElement` + `textContent` (nunca `innerHTML` con datos del usuario), para que un nombre de producto con HTML no pueda inyectar código.
- Los productos creados se guardan en `localStorage` bajo la clave `accesorios-shop-productos-nuevos`; el catálogo base permanece en el código fuente del JS.
- Solo se implementó la creación de productos, como se pidió: los iconos de editar y eliminar quedaron con la misma estructura que antes, sin lógica todavía.
- Dejé `documentacion-productos.md` que explica función por función cómo trabaja el módulo.
