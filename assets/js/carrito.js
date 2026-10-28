// Carrito de compras persistido en localStorage.
//
// El catálogo vive en Supabase, pero el carrito vive en el navegador: cada
// "Agregar al carrito" (tanto desde las tarjetas del catálogo como desde el
// detalle del producto) guarda el producto elegido en localStorage bajo la
// clave CLAVE_CARRITO, y la pantalla carrito.html lo pinta desde ahí. Al
// tocar "Finalizar compra" se descuenta el stock en la base (RPC
// descontar_stock_carrito) y recién entonces se abre WhatsApp con el detalle
// de la orden (productos, cantidades, precios y total) hacia NUMERO_WHATSAPP.
//
// El carrito es una caché de 24 hs: se guarda junto a los items un timestamp
// (DURACION_CARRITO_MS) que se refresca en cada operación, y al vencer se
// borra solo. Sirve para no guardar precios ni cantidades indefinidamente
// después de que el usuario dejó de usar la página.
//
// Sólo se guardan los datos mínimos para pintar el carrito (id, nombre,
// precio, imagen y cantidad): el id sirve para linkear de vuelta al detalle,
// para detectar repetidos (agregar dos veces el mismo producto suma la
// cantidad en lugar de duplicar la fila) y para descontar el stock en la base.

const CLAVE_CARRITO = 'carrito';
const CANTIDAD_MAXIMA = 10;
const DURACION_CARRITO_MS = 24 * 60 * 60 * 1000; // 24 hs en milisegundos

// true sólo si el carrito que se encontró en localStorage ya venció. Lo usa
// renderizarCarrito() para avisar "venció" en lugar de "está vacío".
let carritoVencido = false;

// Número que recibe el pedido por WhatsApp, en formato internacional sin
// "+" ni espacios: código de país (54 = Argentina) + 9 (celular) + área (11)
// + número. Ejemplo: 5491167496525.
const NUMERO_WHATSAPP = '5491167496525';

// El mismo formateador que usa productos.js; ahí se define para todo el
// catálogo y acá se reutiliza si ya cargó, o se define si carrito.html se
// abre sin ese archivo.
const formatearPrecioCarrito = typeof formatearPrecio === 'function'
    ? formatearPrecio
    : precio => '$' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(precio);

// ---------- Persistencia ----------
//
// El valor guardado bajo CLAVE_CARRITO es un objeto { items, guardadoEn },
// donde guardadoEn es un timestamp de Date.now(). El array plano que se
// guardaba antes se sigue leyendo (y se migra al nuevo formato) para no
// perder lo que un usuario ya tenía en el carrito.

function leerCarrito() {
    carritoVencido = false;

    try {
        const crudo = localStorage.getItem(CLAVE_CARRITO);

        if (!crudo) {
            return [];
        }

        const dato = JSON.parse(crudo);

        // Formato anterior (array suelto, sin timestamp): se devuelve tal cual
        // y se re-guardará con la fecha de ahora en la próxima operación.
        if (Array.isArray(dato)) {
            return dato;
        }

        if (!dato || !Array.isArray(dato.items)) {
            return [];
        }

        const guardadoEn = Number(dato.guardadoEn);

        if (!Number.isFinite(guardadoEn) || Date.now() - guardadoEn > DURACION_CARRITO_MS) {
            // Venció el cache de 24 hs: se borra y se marca el motivo, para
            // que el aviso diga "venció" en lugar de "está vacío".
            carritoVencido = true;
            localStorage.removeItem(CLAVE_CARRITO);
            return [];
        }

        return dato.items;
    } catch (error) {
        // JSON corrupto o localStorage bloqueado (modo incógnito): se arranca
        // de cero en vez de romper la página.
        console.error('No se pudo leer el carrito desde localStorage:', error);
        return [];
    }
}

function guardarCarrito(items) {
    try {
        localStorage.setItem(CLAVE_CARRITO, JSON.stringify({
            items: items,
            // Cada operación refresca el timestamp: el cache de 24 hs corre
            // desde la última vez que el usuario tocó el carrito.
            guardadoEn: Date.now()
        }));
    } catch (error) {
        console.error('No se pudo guardar el carrito en localStorage:', error);
    }

    carritoVencido = false;

    // Avisa a la página (contador del navbar y repaint de carrito.html) que
    // el carrito cambió.
    window.dispatchEvent(new CustomEvent('carrito-actualizado'));
}

function vaciarCarrito() {
    guardarCarrito([]);
}

function normalizarCantidad(cantidad) {
    const numero = Number.parseInt(cantidad, 10);

    if (!Number.isFinite(numero)) {
        return 1;
    }

    return Math.min(Math.max(numero, 1), CANTIDAD_MAXIMA);
}

// ---------- Operaciones ----------

// Suma un producto al carrito. Si ya estaba, incrementa su cantidad; si no,
// agrega una fila nueva. Devuelve el carrito actualizado.
function agregarAlCarrito(producto, cantidad) {
    const unidades = normalizarCantidad(cantidad);
    const items = leerCarrito();
    const existente = items.find(item => item.id === producto.id);

    if (existente) {
        existente.cantidad = normalizarCantidad(existente.cantidad + unidades);
    } else {
        items.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio,
            imagen: producto.imagen,
            cantidad: unidades
        });
    }

    guardarCarrito(items);
    return items;
}

function actualizarCantidadItem(id, cantidad) {
    const items = leerCarrito();
    const item = items.find(otro => otro.id === id);

    if (!item) {
        return items;
    }

    item.cantidad = normalizarCantidad(cantidad);
    guardarCarrito(items);
    return items;
}

function eliminarDelCarrito(id) {
    const items = leerCarrito().filter(item => item.id !== id);
    guardarCarrito(items);
    return items;
}

function unidadesCarrito(items) {
    return items.reduce((suma, item) => suma + item.cantidad, 0);
}

function totalCarrito(items) {
    return items.reduce((suma, item) => suma + item.precio * item.cantidad, 0);
}

// ---------- Stock en la base (Supabase) ----------
//
// El descuento vive en una RPC de la base (descontar_stock_carrito, ver
// supabase/schema.sql): hace el chequeo de stock y el descuento en UNA sola
// transacción. Un select y un update por separado desde el navegador dejarían
// una ventana donde dos compras simultáneas venderían las mismas unidades.
//
// Devuelve { ok, faltantes }: si ok es false, faltantes trae los productos
// que quedaron cortos ([{ id, pedido, disponible }]) para poder avisar.

function conectarSupabase() {
    return typeof clienteSupabase !== 'undefined' && clienteSupabase;
}

function interpretarFaltantes(error) {
    // El raise ... using detail = ... de la RPC llega como texto JSON en
    // error.details. Si algo falla antes (red, permisos), no hay detail.
    try {
        const faltantes = JSON.parse(error.details);
        return Array.isArray(faltantes) ? faltantes : [];
    } catch (parseo) {
        return [];
    }
}

async function descontarStockEnBase(items) {
    if (!conectarSupabase()) {
        return { ok: false, faltantes: [], mensaje: 'No hay conexión con la base de datos. Revisá la configuración de Supabase e intentá nuevamente.' };
    }

    // El id viaja como número para que coincida con el bigint de la base.
    const payload = items.map(item => ({
        id: Number(item.id),
        cantidad: item.cantidad
    }));

    const { error } = await clienteSupabase.rpc('descontar_stock_carrito', { items: payload });

    if (error) {
        console.error('No se pudo descontar el stock en Supabase:', error.message, error.details);

        const faltantes = interpretarFaltantes(error);

        if (faltantes.length > 0) {
            const nombres = faltantes.map(faltante => {
                const item = items.find(otro => Number(otro.id) === Number(faltante.id));
                return (item ? item.nombre : 'Producto ' + faltante.id) +
                    ' (pediste ' + faltante.pedido + ', quedan ' + faltante.disponible + ')';
            });

            return {
                ok: false,
                faltantes: faltantes,
                mensaje: 'No hay stock suficiente para todo el carrito: ' + nombres.join('; ') + '. Ajustá las cantidades o quitá esos productos.'
            };
        }

        return { ok: false, faltantes: [], mensaje: 'No se pudo descontar el stock en la base. Intentá nuevamente en unos minutos.' };
    }

    return { ok: true, faltantes: [], mensaje: '' };
}

// ---------- Mensaje de WhatsApp ----------

function construirMensajeWhatsApp() {
    const items = leerCarrito();

    const lineas = items.map(item =>
        '• ' + item.nombre + ' — ' + item.cantidad + ' x ' +
        formatearPrecioCarrito(item.precio) + ' = ' +
        formatearPrecioCarrito(item.precio * item.cantidad)
    );

    return [
        '¡Hola! Quiero finalizar mi compra:',
        '',
        ...lineas,
        '',
        'Total: ' + formatearPrecioCarrito(totalCarrito(items))
    ].join('\n');
}

// Muestra un mensaje de estado en #aviso-finalizacion (o por alert si la
// página no tiene ese elemento).
function mostrarAvisoFinalizacion(mensaje) {
    const aviso = document.querySelector('#aviso-finalizacion');

    if (!aviso) {
        alert(mensaje);
        return;
    }

    aviso.textContent = mensaje;
    aviso.hidden = false;
}

function ocultarAvisoFinalizacion() {
    const aviso = document.querySelector('#aviso-finalizacion');

    if (aviso) {
        aviso.hidden = true;
        aviso.textContent = '';
    }
}

// Secuencia de la compra:
//   1. Se abre la pestaña de WhatsApp YA, antes del await. Los bloqueadores
//      de pop-ups sólo dejan window.open dentro del gesto del usuario: si se
//      espera la respuesta de la base, Chrome/Safari la tiran.
//   2. Se descuenta el stock en la base. Si algo falla, se cierra la pestaña
//      y no se toca el carrito, para que el usuario pueda reintentar.
//   3. Recién ahí se arma el mensaje, se navega y se vacía el carrito.
async function finalizarCompra() {
    const items = leerCarrito();

    if (items.length === 0) {
        return;
    }

    ocultarAvisoFinalizacion();

    const boton = document.querySelector('#finalizar-compra');
    const textoOriginal = boton ? boton.textContent : '';

    if (boton) {
        boton.disabled = true;
        boton.textContent = 'Procesando…';
    }

    const ventana = window.open('', '_blank');
    const resultado = await descontarStockEnBase(items);

    if (!resultado.ok) {
        if (ventana) {
            ventana.close();
        }

        if (boton) {
            boton.disabled = false;
            boton.textContent = textoOriginal;
        }

        mostrarAvisoFinalizacion(resultado.mensaje);
        return;
    }

    const texto = encodeURIComponent(construirMensajeWhatsApp());
    const destino = 'https://wa.me/' + NUMERO_WHATSAPP + '?text=' + texto;

    if (ventana) {
        ventana.location.href = destino;
    } else {
        // Pop-up bloqueado: se navega en la misma pestaña para no perder el
        // mensaje, aunque el stock ya se haya descontado.
        window.location.href = destino;
    }

    // El stock ya se descontó: el carrito no puede seguir apuntando a esa
    // compra, o un segundo click volvería a descontar. vaciarCarrito()
    // despacha carrito-actualizado, que repinta la tabla y el navbar.
    vaciarCarrito();

    if (boton) {
        boton.disabled = true;
        boton.textContent = '¡Compra finalizada!';
    }
}

// ---------- Navbar ----------

// Muestra la cantidad de unidades del carrito en el badge del enlace
// "Carrito" del header. Si el header todavía no se cargó (se inyecta con
// fetch en header-footer.js), no hace nada: el evento componentes-cargados
// lo vuelve a llamar cuando ya está en el DOM.
function actualizarContadorNavbar() {
    const contador = document.querySelector('.contador-carrito');

    if (!contador) {
        return;
    }

    const unidades = unidadesCarrito(leerCarrito());
    contador.hidden = unidades === 0;
    contador.textContent = String(unidades);
}

// Cambia el texto del botón tocado a "Agregado ✓" un instante, para confirmar
// que la acción se registró sin sacar al usuario de la página.
function avisarAgregado(boton) {
    const textoOriginal = boton.textContent;

    boton.textContent = 'Agregado ✓';
    boton.disabled = true;

    setTimeout(() => {
        boton.textContent = textoOriginal;
        boton.disabled = false;
    }, 1500);
}

// ---------- Pintado de carrito.html ----------

function crearFilaItem(item) {
    const fila = document.createElement('tr');

    const celdaProducto = document.createElement('td');
    celdaProducto.dataset.titulo = 'Producto';

    const imagen = document.createElement('img');
    imagen.src = item.imagen;
    imagen.alt = 'Imagen del ' + item.nombre.toLowerCase();
    imagen.width = 64;
    imagen.height = 64;

    const enlace = document.createElement('a');
    enlace.href = 'producto.html?id=' + encodeURIComponent(item.id);
    enlace.textContent = item.nombre;

    celdaProducto.append(imagen, enlace);

    const celdaPrecio = document.createElement('td');
    celdaPrecio.dataset.titulo = 'Precio';
    celdaPrecio.textContent = formatearPrecioCarrito(item.precio);

    const celdaCantidad = document.createElement('td');
    celdaCantidad.dataset.titulo = 'Cantidad';

    const formulario = document.createElement('form');

    const etiqueta = document.createElement('label');
    etiqueta.className = 'sr-only';
    etiqueta.htmlFor = 'cantidad-' + item.id;
    etiqueta.textContent = 'Cantidad de ' + item.nombre.toLowerCase();

    const entrada = document.createElement('input');
    entrada.type = 'number';
    entrada.id = 'cantidad-' + item.id;
    entrada.value = item.cantidad;
    entrada.min = 1;
    entrada.max = CANTIDAD_MAXIMA;

    const botonActualizar = document.createElement('button');
    botonActualizar.type = 'submit';
    botonActualizar.textContent = 'Actualizar';

    formulario.append(etiqueta, entrada, botonActualizar);
    formulario.addEventListener('submit', evento => {
        evento.preventDefault();
        // guardarCarrito despacha "carrito-actualizado", y ese evento es el
        // que vuelve a pintar la tabla y el contador del navbar.
        actualizarCantidadItem(item.id, entrada.value);
    });

    celdaCantidad.append(formulario);

    const celdaSubtotal = document.createElement('td');
    celdaSubtotal.dataset.titulo = 'Subtotal';
    celdaSubtotal.textContent = formatearPrecioCarrito(item.precio * item.cantidad);

    const celdaAcciones = document.createElement('td');
    celdaAcciones.dataset.titulo = 'Acciones';

    const botonEliminar = document.createElement('button');
    botonEliminar.type = 'button';
    botonEliminar.className = 'eliminar';
    botonEliminar.textContent = 'Eliminar';
    botonEliminar.addEventListener('click', () => {
        eliminarDelCarrito(item.id);
    });

    celdaAcciones.append(botonEliminar);

    fila.append(celdaProducto, celdaPrecio, celdaCantidad, celdaSubtotal, celdaAcciones);
    return fila;
}

// Pinta la tabla y el resumen de carrito.html a partir de localStorage. Sólo
// hace algo en esa página: el resto de las páginas sólo usan el carrito para
// agregar productos y mostrar el contador del navbar.
function renderizarCarrito() {
    const cuerpo = document.querySelector('#items-carrito tbody');

    if (!cuerpo) {
        return;
    }

    const items = leerCarrito();
    const tabla = document.querySelector('#items-carrito table');
    const avisoVacio = document.querySelector('#carrito-vacio');
    const botonFinalizar = document.querySelector('#finalizar-compra');

    tabla.hidden = items.length === 0;
    avisoVacio.hidden = items.length > 0;
    botonFinalizar.disabled = items.length === 0;

    // El mismo aviso cubre los dos motivos de carrito vacío, con un texto
    // distinto: el cache de 24 hs venció, o todavía no se agregó nada.
    const enlaceSeguir = document.createElement('a');
    enlaceSeguir.href = 'index.html#catalogo';
    enlaceSeguir.textContent = 'Seguí comprando';

    if (carritoVencido) {
        avisoVacio.replaceChildren(
            'Tu carrito venció: los productos se guardan por 24 horas. ',
            enlaceSeguir,
            ' para agregarlos de nuevo.'
        );
    } else {
        avisoVacio.replaceChildren(
            'Tu carrito está vacío. ',
            enlaceSeguir,
            ' para agregar productos.'
        );
    }

    cuerpo.replaceChildren(...items.map(crearFilaItem));

    const unidades = unidadesCarrito(items);
    const total = totalCarrito(items);

    document.querySelector('#resumen-unidades').textContent = 'Productos (' + unidades + ')';
    document.querySelector('#resumen-subtotal').textContent = formatearPrecioCarrito(total);
    document.querySelector('#resumen-total').textContent = formatearPrecioCarrito(total);
}

function iniciarCarrito() {
    actualizarContadorNavbar();
    renderizarCarrito();

    const botonFinalizar = document.querySelector('#finalizar-compra');
    if (botonFinalizar) {
        botonFinalizar.addEventListener('click', finalizarCompra);
    }

    // El header se inyecta con fetch, así que puede que termine de cargar
    // después de este script: en ese caso se repinta el contador al recibir
    // el aviso de header-footer.js. Cada operación sobre el carrito también
    // dispara carrito-actualizado para mantenerlo al día en todas las páginas.
    window.addEventListener('componentes-cargados', actualizarContadorNavbar);
    window.addEventListener('carrito-actualizado', () => {
        actualizarContadorNavbar();
        renderizarCarrito();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarCarrito);
} else {
    iniciarCarrito();
}
