## Descripción

Explicá brevemente qué hiciste y qué archivos modificaste o agregaste:

- Quité del navbar las secciones "Productos" y "Ofertas" en todas las páginas (`index.html`, `contacto.html`, `producto.html`, `carrito.html`, `nuevo-producto.html`).
- Agregué en `index.html` un buscador de productos (`#busqueda-producto`) al lado del filtro por categorías, con `datalist` de sugerencias y botón "Buscar".
- Amplié el catálogo en `assets/css/styles.css` para que ocupe más pantalla y no quede tan centrado (aumenté el `max-width` y el tamaño mínimo de las celdas de la grilla).
- Actualicé `predicciones.md` con las predicciones de esta sesión.

## Cómo probarlo

Pasos para que el profesor pueda correr o revisar el cambio (comandos, URL, capturas de pantalla si aplica):

- Abrir `index.html` en el navegador.
- Verificar que en el navbar ya no aparecen "Productos" ni "Ofertas" (solo Inicio, Contacto y Carrito).
- Confirmar que el buscador de productos aparece junto al filtro de categorías en el header y que sugiere los productos al escribir.
- Comprobar que los productos del índice ocupan más ancho de pantalla y están menos centrados que antes.

## Prompt usado y historial con Open Code

Pegá todo el histórico de mensajes con el agente de IA:

```
Quiero que quitemos del navbar la seccion ofertas y productos, que agreguemos una busqueda nueva (aparte de la de catgorias) para filtrar por un producto en particular. Ademas, quiero que los productos del index ocupen mas pantalla y no esten tan centrados en el medio de la misma. Quiero que todo esto se usando css y html, no apliquemos js por el momento
```

## Checklist antes de enviar

- [ ] Trabajé en una rama propia (no directo en `main`).
- [ ] Probé que mi código/archivo funciona antes de subirlo.
- [ ] Este PR es dentro de mi propio repositorio.
- [ ] Completé todos los datos de esta plantilla.

## Comentarios adicionales (opcional)

Dudas, aclaraciones o algo que quieras comentarle al profesor.

- La búsqueda actualmente solo envía el término vía GET; el filtrado dinámico del catálogo requeriría JS, que por ahora no se aplicó por pedido.
