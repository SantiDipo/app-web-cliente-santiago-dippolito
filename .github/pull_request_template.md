## Descripción

Explicá brevemente qué hiciste y qué archivos modificaste o agregaste:

- Agregué un menú hamburguesa responsive en el header de todas las páginas (`index.html`, `busqueda.html`, `contacto.html`, `producto.html`, `carrito.html`, `nuevo-producto.html`, `editar-producto.html`, `login.html`, `administrador.html`).
- En pantallas responsive (hasta 900px) el navbar (Inicio, Contacto, Carrito) se esconde y se muestra un botón de 3 líneas que abre un panel lateral deslizante de manera horizontal con las secciones.
- El botón del menú quedó sin borde, mostrando solo las 3 líneas.
- En responsive se oculta el buscador del header (`#busqueda-producto`) y, en su lugar, dentro del menú hamburguesa se agregó la sección "Buscar producto" que redirige a `busqueda.html`.
- Todo se implementó sin JavaScript: el menú usa la técnica de `checkbox` + `label` con CSS puro (`.menu-toggle` / `.menu-hamburguesa` y `:checked`).
- El filtro de productos ya no se muestra suelto sobre el navbar en responsive: se accede a él desde la página de búsqueda a la que lleva la sección "Buscar producto" del menú.
- En la versión desktop (≥ 901px) el navbar y el buscador quedan igual que antes.
- Modifiqué `assets/css/styles.css` con todos los estilos del menú hamburguesa.
- Actualicé `.github/pull_request_template.md` con los cambios de esta sesión.

## Cómo probarlo

Pasos para que el profesor pueda correr o revisar el cambio (comandos, URL, capturas de pantalla si aplica):

- Abrir `index.html` en el navegador.
- Reducir la ventana a menos de 900px de ancho.
- Verificar que aparece el botón de menú (solo 3 líneas, sin borde) y que el buscador ya no se ve en el header.
- Hacer clic en el botón: se abre el panel deslizante con Inicio, Contacto, Carrito y la sección "Buscar producto".
- Hacer clic en "Buscar producto": redirige a `busqueda.html`.
- Confirmar que en la versión desktop (≥ 901px) el navbar y el buscador se ven como antes.

## Prompt usado y historial con Open Code

Pegá todo el histórico de mensajes con el agente de IA:

```
Quiero que para el resposive se quite el filtro de productos y la secciones de inicio, contacto y carrito del navbar y se utilicen desde un menu hamburguesa que se abra de manera horizantal, en donde los usuarios puedan acceder a cada seccion
```

```
el filtro tambien metelo dentro del menu hamburguesa y quitale los border, que solo queden las 3 lineas
```

```
el filtro en responsive sigue estando sobre el navbar, quiero que este dentro del menu hamburgues en una seccion que se llame "Buscar productos". Esto para evitar que se vea el filtro sobre el navbar, que no queda bien, y que se acceda directamente desde el menu desplegable
```

```
SOLO EN RESPONSIVE, EN LA VERSION DESKTOP ESTA BIEN
```

```
primero, nada de js asi que quita esa main.js que creaste, 2do de la version de movil tenes que sacar el form de buscar producto y en su lugar tenes que agregar una seccion "Buscar producto" dentro del <button type="button" class="menu-hamburguesa" aria-expanded="false" aria-controls="menu-movil" aria-haspopup="true">
            <span class="sr-only">Abrir menú de navegación</span>
            <svg class="icono-hamburguesa" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="4" y1="6" x2="20" y2="6"></line>
                <line x1="4" y1="12" x2="20" y2="12"></line>
                <line x1="4" y1="18" x2="20" y2="18"></line>
            </svg>
            <svg class="icono-cerrar" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="6" y1="6" x2="18" y2="18"></line>
                <line x1="18" y1="6" x2="6" y2="18"></line>
            </svg>
        </button> que te rediriga a la pagina de busqueda. Se entiende ?
```

## Checklist antes de enviar

- [ ] Trabajé en una rama propia (no directo en `main`).
- [ ] Probé que mi código/archivo funciona antes de subirlo.
- [ ] Este PR es dentro de mi propio repositorio.
- [ ] Completé todos los datos de esta plantilla.

## Comentarios adicionales (opcional)

Dudas, aclaraciones o algo que quieras comentarle al profesor.

- El menú hamburguesa funciona sin JavaScript usando un `checkbox` oculto y un `label` (CSS puro con `:checked`).
- Al cerrar la vista responsive el menú se restaura solo porque el checkbox permanece con su estado; en desktop el botón ni el panel se muestran.