# Explicación del diseño responsive

Este documento explica cómo se logró que las 5 pantallas del sitio de **Accesorios Shop** sean adaptables (responsive) utilizando únicamente **CSS**.

## ¿Qué significa que un sitio sea responsive?

Que el diseño se adapta automáticamente al tamaño de la pantalla del dispositivo: celular, tablet, notebook o monitor grande. No hace falta una versión separada para móviles: el mismo HTML se muestra de forma distinta según el ancho de la ventana.

## Archivos modificados

- `assets/css/styles.css` → Único archivo de estilos. Aquí se hizo todo el trabajo.
- Los 5 archivos HTML (`index.html`, `producto.html`, `carrito.html`, `contacto.html`, `nuevo-producto.html`) ya contenían la etiqueta necesaria:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

Esta etiqueta le dice al navegador del celular que use el ancho real de la pantalla (sin esto, los celulares simulaban una pantalla de 980px y el sitio se veía minúsculo).

## Estrategia utilizada

### 1. Mobile-first (diseñar primero para móvil)

El CSS base (sin media queries) define el diseño para móviles: contenidos apilados en una columna, elementos a ancho completo. Luego, con `@media` se van "ampliando" los diseños para pantallas cada vez más grandes.

### 2. Breakpoints (puntos de corte)

Se definieron 3 rangos de tamaño:

| Rango | Ancho | Dispositivos típicos |
|------|-------|----------------------|
| Móvil | menos de 600px | Celulares |
| Tablet | 600px a 1023px | Tablets, celulares en horizontal |
| Desktop | 1024px o más | Notebooks y monitores |

Se usa `@media (max-width: 600px)` para móvil y `@media (min-width: 600px)` / `@media (min-width: 1024px)` para el resto.

### 3. Técnicas CSS usadas

- **Flexbox con `flex-wrap`**: permite que los elementos del encabezado "salten" de línea cuando no entran.
- **CSS Grid con `repeat(auto-fill, minmax(...))`**: el catálogo y los productos relacionados calculan solos cuántas columnas mostrar según el espacio disponible.
- **Media queries**: aplican reglas específicas por rango de tamaño.
- **`scroll-snap`**: la galería de fotos se convierte en un carrusel deslizable en móvil.
- **`::before { content: attr(data-titulo) }`**: en móvil, las celdas de la tabla del carrito muestran su encabezado como etiqueta usando los atributos `data-titulo` ya presentes en el HTML.
- **`aspect-ratio`**: las imágenes de producto mantienen proporción cuadrada sin importar el ancho.

## Cambios por pantalla

### Encabezado (header) - todas las pantallas

La barra de navegación es fija (`position: sticky`) y comparte el mismo HTML en las 5 páginas. Era el punto donde más desbordaba el contenido en móvil.

- **Móvil:** el logo y la navegación quedan en una fila superior, mientras que el filtro de categorías y el buscador pasan a ocupar el **100% del ancho** apilados debajo. La navegación cambia de vertical a horizontal para ocupar menos altura.
- **Tablet:** el filtro y el buscador se acomodan a la izquierda junto al logo, y el menú a la derecha. Si no entran, se envuelven a una segunda línea gracias a `flex-wrap`.
- **Desktop:** más padding y más separación entre enlaces.

### 1. Inicio / Catálogo (`index.html`)

- **Galería de fotos:** en móvil se convierte en un **carrusel** que se desliza horizontalmente (cada imagen ocupa el ancho completo, con `scroll-snap` para que se alinee prolijamente). En desktop las tres imágenes siguen juntas en una fila y la altura sube a 240px.
- **Catálogo:** usa `grid-template-columns: repeat(auto-fill, minmax(240px, 1fr))` en desktop: las tarjetas cambian solas de 4, 3, 2 a 1 columna según el ancho. En móvil se reduce el mínimo a `160px` y se ajusta el espaciado para que nunca queden columnas demasiado angostas ni scroll horizontal.

### 2. Detalle de producto (`producto.html`)

- **Móvil:** la imagen y la información se apilan en una columna (imagen arriba, datos abajo).
- **Tablet en adelante:** el artículo cambia a `flex-direction: row`, imagen a la izquierda e información a la derecha.
- **Móvil:** el formulario de cantidad ("Agregar al carrito") ocupa todo el ancho y el botón se estira para facilitar el toque con el dedo.
- **Productos relacionados:** grilla autoajustable (`minmax(160px, 1fr)`).

### 3. Carrito de compras (`carrito.html`)

- **Desktop:** tabla tradicional con encabezados y resumen a la derecha (`aside`).
- **Móvil:** la tabla se convierte en **tarjetas apiladas**:
  1. Se oculta el `<thead>` (los encabezados).
  2. Cada `<tr>` pasa a `display: block`.
  3. Cada celda `<td>` se muestra como una fila con su etiqueta a la izquierda (proveniente de `attr(data-titulo)`) y el valor a la derecha.
  4. El resumen de la compra pasa de estar a la derecha (`max-width: 360px`) a ocupar el 100% del ancho debajo de la tabla.
  5. La imagen del producto y el formulario de cantidad se mantienen táctiles y ajustables.

### 4. Contacto (`contacto.html`) y 5. Nuevo producto (`nuevo-producto.html`)

- Los formularios tienen `max-width: 600px` y están centrados, por lo que se ven bien en cualquier tamaño.
- En móvil se reduce el padding interno (`1rem`) y el externo (`0.75rem`) para aprovechar mejor la pantalla.
- Los botones de envío ya son `width: 100%` (fáciles de tocar en celular).

### Pie de página (footer)

- Los enlaces de redes sociales usan `flex-wrap`, de modo que si no entran en una línea se acomodan automáticamente en la siguiente. En móvil se reduce el padding.

## Regla global de imágenes

Se agregó una regla base:

```css
img {
    max-width: 100%;
    height: auto;
}
```

Esto evita que cualquier imagen (productos, logos, galería) desborde el ancho del contenedor en pantallas chicas.

## Cómo probarlo

1. Abrir cualquiera de los HTML en el navegador.
2. Reducir el ancho de la ventana hasta el mínimo (o emular un celular desde las herramientas de desarrollo presionando `F12` y activando el modo "device toolbar", con dispositivos como iPhone o Galaxy).
3. Verificar que no aparezca barra de scroll horizontal y que el contenido se reacomode.
4. Probar en los tres rangos: menos de 600px, entre 600px y 1024px, y más de 1024px.

## Resumen de media queries finales

| Media query | Línea | Propósito |
|-------------|-------|-----------|
| `@media (min-width: 600px)` | 740 | Contacto: título más grande en tablet |
| `@media (min-width: 600px)` | 824 | Nuevo producto: título más grande en tablet |
| `@media (max-width: 600px)` | 847 | Reglas de móvil: header, galería-carrusel, catálogo, detalle, carrito, formularios, footer |
| `@media (min-width: 600px)` | 990 | Detalle de producto: imagen e info en fila (columna en móvil) |
| `@media (min-width: 600px)` | 1031 | Header horizontal: filtros a la izquierda, menú a la derecha |
| `@media (min-width: 1024px)` | 1071 | Pantallas grandes: más aire, galería más alta |