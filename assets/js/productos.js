// Catálogo de productos.
//
// El catálogo vive en Supabase (tabla `productos`, ver supabase/schema.sql):
// las funciones de lectura y escritura de este archivo hablan con la base a
// través de `clienteSupabase` (assets/js/supabase-client.js). Ya no hay
// CATALOGO_BASE en el código ni persistencia en localStorage.

const IMAGEN_RESERVA = 'assets/img/2.png';
const STOCK_INICIAL = 10;
const ETIQUETAS_CATEGORIA = {
    relojes: 'Relojes',
    bolsos: 'Bolsos',
    gorras: 'Gorras',
    lentes: 'Lentes de sol',
    joyeria: 'Joyería',
    accesorios: 'Accesorios'
};

const ICONO_EDITAR = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>';
const ICONO_ELIMINAR = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>';

function normalizarTexto(texto) {
    return String(texto)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function formatearPrecio(precio) {
    return '$' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(precio);
}

// Convierte una fila de la tabla `productos` al formato que usa la app:
// snake_case de la base → camelCase del JS (sólo cambian las fechas) y
// precio/stock a número.
function mapearProductoBD(fila) {
    return {
        // El id es un entero (bigint identity); en JS se maneja como string
        // porque sólo viaja por las URLs (producto.html?id=15) y a los filtros
        // .eq() de la API les llega igual.
        id: String(fila.id),
        nombre: fila.nombre,
        descripcion: fila.descripcion,
        precio: Number(fila.precio),
        imagen: fila.imagen,
        categoria: fila.categoria,
        stock: Number(fila.stock),
        fechaCreacion: fila.fecha_creacion,
        fechaModificacion: fila.fecha_modificacion
    };
}

// Evita fallas con errores confusos si el SDK no cargó o si todavía no se
// configuró supabase-config.js.
function clienteListo() {
    if (typeof clienteSupabase === 'undefined' || !clienteSupabase) {
        console.error('Supabase no está conectado: revisá assets/js/supabase-config.js.');
        return false;
    }
    return true;
}

// Único punto de lectura del catálogo: trae todos los productos de la base,
// los deja en `catalogoEnMemoria` y los devuelve. El pintado lee de memoria
// (por eso tipear en el buscador del admin no dispara una consulta por
// tecla); hay que volver a llamarla después de crear, editar o eliminar.
let catalogoEnMemoria = [];

async function obtenerCatalogo() {
    if (!clienteListo()) {
        catalogoEnMemoria = [];
        return [];
    }

    const { data, error } = await clienteSupabase
        .from(SUPABASE_TABLA_PRODUCTOS)
        .select('*')
        .order('fecha_creacion', { ascending: true });

    if (error) {
        console.error('No se pudo leer el catálogo desde Supabase:', error.message);
        catalogoEnMemoria = [];
        return [];
    }

    catalogoEnMemoria = (data || []).map(mapearProductoBD);
    return catalogoEnMemoria;
}

async function buscarProducto(id) {
    const idProducto = String(id || '').trim();

    // El id es numérico (bigint identity): una URL vieja con slug
    // (?id=reloj-clasico) o cualquier basura no llega a consultar la base.
    if (!/^\d+$/.test(idProducto)) {
        return null;
    }

    if (!clienteListo()) {
        return null;
    }

    const { data, error } = await clienteSupabase
        .from(SUPABASE_TABLA_PRODUCTOS)
        .select('*')
        .eq('id', idProducto)
        .maybeSingle();

    if (error) {
        console.error('No se pudo leer el producto desde Supabase:', error.message);
        return null;
    }

    return data ? mapearProductoBD(data) : null;
}

async function actualizarProducto(id, cambios) {
    if (!clienteListo()) {
        return false;
    }

    // update + select devuelve las filas afectadas: RLS puede filtrar el
    // update en silencio (0 filas, sin error), y así se detecta en vez de
    // devolver un true mentiroso.
    const { data, error } = await clienteSupabase
        .from(SUPABASE_TABLA_PRODUCTOS)
        .update(Object.assign({}, cambios, {
            fecha_modificacion: new Date().toISOString()
        }))
        .eq('id', id)
        .select('id');

    if (error) {
        console.error('No se pudo actualizar el producto en Supabase:', error.message);
        return false;
    }

    if (!data || data.length === 0) {
        console.error(
            'El cambio no se aplicó: la base no devolvió la fila. ' +
            'Casi siempre es la política RLS de update faltante (ver supabase/schema.sql).'
        );
        return false;
    }

    return true;
}

async function crearProducto(datos) {
    const nombre = String(datos.nombre || '').trim();
    const descripcion = String(datos.descripcion || '').trim();
    const precio = Number(datos.precio);
    const stock = Number(datos.stock);

    if (!nombre || !descripcion || !Number.isFinite(precio) || precio <= 0) {
        console.error('Datos de producto inválidos:', datos);
        return null;
    }

    if (!clienteListo()) {
        return null;
    }

    const producto = {
        nombre: nombre,
        descripcion: descripcion,
        precio: precio,
        imagen: datos.imagen || IMAGEN_RESERVA,
        categoria: datos.categoria || 'accesorios',
        stock: Number.isFinite(stock) && stock >= 0 ? stock : STOCK_INICIAL
    };

    // Ni `id` ni `fecha_creacion` se mandan: los asigna la base (identity y
    // now()). El id recién generado vuelve en la fila que devuelve el insert.
    const { data, error } = await clienteSupabase
        .from(SUPABASE_TABLA_PRODUCTOS)
        .insert(producto)
        .select()
        .maybeSingle();

    if (error) {
        console.error('No se pudo crear el producto en Supabase:', error.message);
        return null;
    }

    return mapearProductoBD(data);
}

async function eliminarProducto(id) {
    const idProducto = String(id || '').trim();

    if (!idProducto) {
        console.error('No se indicó un producto para eliminar.');
        return false;
    }

    if (!clienteListo()) {
        return false;
    }

    // delete + select devuelve las filas borradas: así se distingue
    // "no existía ese id" (data vacío) de un fallo de la base (error).
    const { data, error } = await clienteSupabase
        .from(SUPABASE_TABLA_PRODUCTOS)
        .delete()
        .eq('id', idProducto)
        .select('id');

    if (error) {
        console.error('No se pudo eliminar el producto de Supabase:', error.message);
        return false;
    }

    if (!data || data.length === 0) {
        console.error('No existe un producto con id:', idProducto);
        return false;
    }

    return true;
}

function fechaProducto(producto) {
    return producto.fechaCreacion ? Date.parse(producto.fechaCreacion) : 0;
}

function aplicarFiltros(productos, parametros) {
    let resultado = productos.slice();

    const texto = normalizarTexto(parametros.get('busqueda') || '').trim();
    if (texto) {
        resultado = resultado.filter(producto =>
            normalizarTexto(producto.nombre).includes(texto) ||
            normalizarTexto(producto.descripcion).includes(texto)
        );
    }

    const categoria = parametros.get('categoria');
    if (categoria && categoria !== 'todas') {
        resultado = resultado.filter(producto => producto.categoria === categoria);
    }

    const disponibilidad = parametros.getAll('disponibilidad');
    if (disponibilidad.length === 1) {
        resultado = disponibilidad[0] === 'agotado'
            ? resultado.filter(producto => producto.stock <= 0)
            : resultado.filter(producto => producto.stock > 0);
    }

    const orden = parametros.get('orden');
    switch (orden) {
        case 'precio-mayor-menor':
            resultado.sort((a, b) => b.precio - a.precio);
            break;
        case 'precio-menor-mayor':
            resultado.sort((a, b) => a.precio - b.precio);
            break;
        case 'a-z':
            resultado.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
            break;
        case 'z-a':
            resultado.sort((a, b) => b.nombre.localeCompare(a.nombre, 'es'));
            break;
        case 'mas-nuevo':
            resultado.sort((a, b) => fechaProducto(b) - fechaProducto(a));
            break;
        case 'mas-viejo':
            resultado.sort((a, b) => fechaProducto(a) - fechaProducto(b));
            break;
    }

    return resultado;
}

function crearTarjetaProducto(producto) {
    const item = document.createElement('li');

    const enlace = document.createElement('a');
    enlace.href = 'producto.html?id=' + encodeURIComponent(producto.id);

    const articulo = document.createElement('article');

    const titulo = document.createElement('h3');
    titulo.textContent = producto.nombre;

    const imagen = document.createElement('img');
    imagen.src = producto.imagen;
    imagen.alt = 'Imagen del ' + producto.nombre.toLowerCase();
    imagen.width = 200;
    imagen.height = 200;

    const parrafoDescripcion = document.createElement('p');
    parrafoDescripcion.textContent = producto.descripcion;

    const parrafoPrecio = document.createElement('p');
    parrafoPrecio.textContent = formatearPrecio(producto.precio);

    articulo.append(titulo, imagen, parrafoDescripcion, parrafoPrecio);
    enlace.append(articulo);

    const formulario = document.createElement('form');
    formulario.action = 'carrito.html';
    formulario.method = 'get';

    const etiqueta = document.createElement('label');
    etiqueta.className = 'sr-only';
    etiqueta.htmlFor = 'agregar-' + producto.id;
    etiqueta.textContent = 'Agregar ' + producto.nombre.toLowerCase() + ' al carrito';

    const inputOculto = document.createElement('input');
    inputOculto.type = 'hidden';
    inputOculto.id = 'agregar-' + producto.id;
    inputOculto.name = 'producto';
    inputOculto.value = producto.id;

    const boton = document.createElement('button');
    boton.type = 'submit';
    boton.textContent = 'Agregar al carrito';

    formulario.append(etiqueta, inputOculto, boton);
    item.append(enlace, formulario);

    return item;
}

function crearTarjetaProductoAdmin(producto) {
    const item = document.createElement('li');
    const articulo = document.createElement('article');

    const enlaceEditar = document.createElement('a');
    enlaceEditar.className = 'icono-editar';
    enlaceEditar.href = 'editar-producto.html?id=' + encodeURIComponent(producto.id);
    enlaceEditar.title = 'Editar producto';
    enlaceEditar.setAttribute('aria-label', 'Editar ' + producto.nombre);
    enlaceEditar.innerHTML = ICONO_EDITAR;

    const botonEliminar = document.createElement('button');
    botonEliminar.type = 'button';
    botonEliminar.className = 'icono-eliminar';
    botonEliminar.title = 'Eliminar producto';
    botonEliminar.setAttribute('aria-label', 'Eliminar ' + producto.nombre);
    botonEliminar.innerHTML = ICONO_ELIMINAR;
    botonEliminar.addEventListener('click', async () => {
        const confirmado = window.confirm(
            '¿Eliminar "' + producto.nombre + '" del catálogo? Esta acción no se puede deshacer.'
        );

        if (!confirmado) {
            return;
        }

        // Espera a que la base confirme y recién ahí vuelve a leer y repinta,
        // para que el producto no quede "revivido" si la operación falla.
        if (!await eliminarProducto(producto.id)) {
            mostrarMensajeAdmin('No se pudo eliminar "' + producto.nombre + '". Intentá nuevamente.');
            return;
        }

        await obtenerCatalogo();
        renderizarCatalogo();
        mostrarMensajeAdmin('Se eliminó "' + producto.nombre + '" del catálogo.');
    });

    const titulo = document.createElement('h3');
    titulo.textContent = producto.nombre;

    const imagen = document.createElement('img');
    imagen.src = producto.imagen;
    imagen.alt = 'Imagen del ' + producto.nombre.toLowerCase();
    imagen.width = 200;
    imagen.height = 200;

    const parrafoDescripcion = document.createElement('p');
    parrafoDescripcion.textContent = producto.descripcion;

    const parrafoPrecio = document.createElement('p');
    parrafoPrecio.textContent = formatearPrecio(producto.precio);

    // Toda la tarjeta (nombre, imagen, descripción y precio) es el enlace a la
    // edición: en el panel de admin el clic sobre el producto entra a editar,
    // no a ver el detalle. El lápiz de arriba queda como acceso directo.
    const enlaceEditarProducto = document.createElement('a');
    enlaceEditarProducto.className = 'tarjeta-admin';
    enlaceEditarProducto.href = 'editar-producto.html?id=' + encodeURIComponent(producto.id);
    enlaceEditarProducto.append(titulo, imagen, parrafoDescripcion, parrafoPrecio);

    articulo.append(enlaceEditar, botonEliminar, enlaceEditarProducto);
    item.append(articulo);

    return item;
}

function crearTarjetaNuevoProducto() {
    const item = document.createElement('li');
    item.className = 'nuevo-producto';

    const enlace = document.createElement('a');
    enlace.href = 'nuevo-producto.html';

    const articulo = document.createElement('article');

    const simbolo = document.createElement('span');
    simbolo.className = 'mas';
    simbolo.setAttribute('aria-hidden', 'true');
    simbolo.textContent = '+';

    const parrafo = document.createElement('p');
    parrafo.textContent = 'Agregar nuevo producto';

    articulo.append(simbolo, parrafo);
    enlace.append(articulo);
    item.append(enlace);

    return item;
}

// Texto tipeado en el buscador del panel de administración. Se mantiene entre
// repintados para que renderizarCatalogo() filtre con él en modo admin.
let textoBusquedaAdmin = '';

function filtrarProductosAdmin(productos) {
    const texto = normalizarTexto(textoBusquedaAdmin).trim();

    if (!texto) {
        return productos;
    }

    return productos.filter(producto =>
        normalizarTexto(producto.nombre).includes(texto) ||
        normalizarTexto(producto.descripcion).includes(texto)
    );
}

function avisarSinResultadosAdmin(cantidad) {
    if (cantidad > 0) {
        return;
    }

    const texto = textoBusquedaAdmin.trim();

    mostrarMensajeAdmin(texto
        ? 'No encontramos productos que coincidan con "' + texto + '". Probá con otro término.'
        : 'Todavía no hay productos en el catálogo.');
}

function actualizarContadorResultados(cantidad) {
    const contador = document.querySelector('.resultado-info');
    if (!contador) {
        return;
    }
    contador.textContent = 'Mostrando ' + cantidad + (cantidad === 1 ? ' producto' : ' productos');
}

function renderizarCatalogo() {
    const seccion = document.querySelector('#catalogo');
    const lista = seccion ? seccion.querySelector('ul') : null;
    const avisoAdmin = document.querySelector('#aviso-admin');

    if (avisoAdmin) {
        avisoAdmin.hidden = true;
        avisoAdmin.textContent = '';
    }

    if (!lista) {
        return;
    }

    const modoAdmin = seccion.classList.contains('admin');
    let productos = catalogoEnMemoria.slice();

    if (modoAdmin) {
        productos = filtrarProductosAdmin(productos);
    } else if (document.querySelector('#filtros-busqueda form')) {
        productos = aplicarFiltros(productos, new URLSearchParams(window.location.search));
    }

    lista.replaceChildren(...productos.map(producto =>
        modoAdmin ? crearTarjetaProductoAdmin(producto) : crearTarjetaProducto(producto)
    ));

    if (modoAdmin) {
        lista.append(crearTarjetaNuevoProducto());
        avisarSinResultadosAdmin(productos.length);
    }

    actualizarContadorResultados(productos.length);
}

function inicializarFiltrosBusqueda() {
    const formulario = document.querySelector('#filtros-busqueda form');

    if (!formulario) {
        return;
    }

    const parametros = new URLSearchParams(window.location.search);
    const campoBusqueda = formulario.querySelector('#busqueda-filtros');
    const campoCategoria = formulario.querySelector('#categoria');
    const campoOrden = formulario.querySelector('#orden');
    const disponibilidadElegida = parametros.getAll('disponibilidad');

    if (campoBusqueda && parametros.has('busqueda')) {
        campoBusqueda.value = parametros.get('busqueda');
    }
    if (campoCategoria && parametros.has('categoria')) {
        campoCategoria.value = parametros.get('categoria');
    }
    if (campoOrden && parametros.has('orden')) {
        campoOrden.value = parametros.get('orden');
    }
    formulario.querySelectorAll('input[name="disponibilidad"]').forEach(casilla => {
        casilla.checked = disponibilidadElegida.includes(casilla.value);
    });

    formulario.addEventListener('submit', evento => {
        evento.preventDefault();

        const datos = new FormData(formulario);
        const nuevosParametros = new URLSearchParams();

        for (const [clave, valor] of datos.entries()) {
            if (String(valor).trim() !== '') {
                nuevosParametros.append(clave, valor);
            }
        }

        const consulta = nuevosParametros.toString();
        const ruta = window.location.pathname + (consulta ? '?' + consulta : '');
        window.history.replaceState({}, '', ruta);
        renderizarCatalogo();
    });
}

function inicializarBusquedaAdmin() {
    const formulario = document.querySelector('.busqueda-admin');
    const campo = document.querySelector('#busqueda-admin');

    if (!formulario || !campo) {
        return;
    }

    const filtrar = () => {
        textoBusquedaAdmin = campo.value;
        renderizarCatalogo();
    };

    // Filtra en vivo mientras el admin tipea (sin recargar ni tocar la URL).
    campo.addEventListener('input', filtrar);

    // Si se envía con Enter, no debe recargar la página: sólo repinta.
    formulario.addEventListener('submit', evento => {
        evento.preventDefault();
        filtrar();
    });
}

function procesarImagen(archivo) {
    return new Promise((resolver, rechazar) => {
        if (!archivo) {
            resolver('');
            return;
        }

        const lector = new FileReader();

        lector.onerror = () => rechazar(new Error('No se pudo leer el archivo de imagen.'));
        lector.onload = () => {
            const imagen = new Image();

            imagen.onerror = () => rechazar(new Error('El archivo seleccionado no es una imagen válida.'));
            imagen.onload = () => {
                const tamanoMaximo = 600;
                let ancho = imagen.width;
                let alto = imagen.height;

                if (ancho > tamanoMaximo || alto > tamanoMaximo) {
                    const escala = tamanoMaximo / Math.max(ancho, alto);
                    ancho = Math.round(ancho * escala);
                    alto = Math.round(alto * escala);
                }

                const lienzo = document.createElement('canvas');
                lienzo.width = ancho;
                lienzo.height = alto;
                lienzo.getContext('2d').drawImage(imagen, 0, 0, ancho, alto);

                resolver(lienzo.toDataURL('image/jpeg', 0.8));
            };

            imagen.src = lector.result;
        };

        lector.readAsDataURL(archivo);
    });
}

function inicializarFormularioNuevoProducto() {
    const formulario = document.querySelector('#nuevo-producto form');

    if (!formulario) {
        return;
    }

    formulario.addEventListener('submit', async evento => {
        evento.preventDefault();

        const archivo = formulario.querySelector('#imagen').files[0];
        let imagen = '';

        if (archivo) {
            try {
                imagen = await procesarImagen(archivo);
            } catch (error) {
                alert(error.message);
                return;
            }
        }

        const producto = await crearProducto({
            nombre: formulario.querySelector('#nombre').value,
            descripcion: formulario.querySelector('#descripcion').value,
            precio: formulario.querySelector('#precio').value,
            categoria: formulario.querySelector('#categoria').value,
            imagen: imagen
        });

        if (!producto) {
            alert('No se pudo crear el producto. Revisá los datos e intentá nuevamente.');
            return;
        }

        window.location.href = 'administrador.html';
    });
}

function crearTarjetaRelacionado(producto, esAdmin) {
    const item = document.createElement('li');

    const enlace = document.createElement('a');
    enlace.href = 'producto.html?id=' + encodeURIComponent(producto.id) + (esAdmin ? '&admin=1' : '');

    const articulo = document.createElement('article');

    const titulo = document.createElement('h3');
    titulo.textContent = producto.nombre;

    const imagen = document.createElement('img');
    imagen.src = producto.imagen;
    imagen.alt = 'Imagen del ' + producto.nombre.toLowerCase();
    imagen.width = 200;
    imagen.height = 200;

    const parrafoPrecio = document.createElement('p');
    parrafoPrecio.textContent = formatearPrecio(producto.precio);

    const textoDetalle = document.createElement('span');
    textoDetalle.textContent = 'Ver detalle';

    articulo.append(titulo, imagen, parrafoPrecio, textoDetalle);
    enlace.append(articulo);
    item.append(enlace);

    return item;
}

async function obtenerProductosRelacionados(producto) {
    const catalogo = await obtenerCatalogo();
    const mismaCategoria = catalogo.filter(
        otro => otro.id !== producto.id && otro.categoria === producto.categoria
    );
    const resto = catalogo.filter(
        otro => otro.id !== producto.id && otro.categoria !== producto.categoria
    );
    return mismaCategoria.concat(resto).slice(0, 3);
}

function mostrarMensajeDetalle(mensaje) {
    const aviso = document.querySelector('#aviso-detalle');
    if (!aviso) {
        return;
    }
    aviso.textContent = mensaje;
    aviso.hidden = false;
}

function mostrarMensajeAdmin(mensaje) {
    const aviso = document.querySelector('#aviso-admin');
    if (!aviso) {
        return;
    }
    aviso.textContent = mensaje;
    aviso.hidden = false;
}

async function inicializarDetalleProducto() {
    const contenedor = document.querySelector('#detalle-producto');
    if (!contenedor) {
        return;
    }

    const parametros = new URLSearchParams(window.location.search);
    const id = parametros.get('id');
    const esAdmin = parametros.get('admin') === '1';
    const producto = id ? await buscarProducto(id) : null;

    if (!producto) {
        mostrarMensajeDetalle(
            id
                ? 'No encontramos el producto que buscás. Volvé al catálogo para ver los disponibles.'
                : 'Elegí un producto desde el catálogo para ver su detalle.'
        );
        return;
    }

    document.title = producto.nombre + ' | Accesorios Shop';
    document.querySelector('#miga-producto').textContent = producto.nombre;

    const imagen = document.querySelector('#detalle-imagen');
    imagen.src = producto.imagen;
    imagen.alt = 'Imagen del ' + producto.nombre.toLowerCase();

    document.querySelector('#detalle-nombre').textContent = producto.nombre;
    document.querySelector('#detalle-precio').textContent = formatearPrecio(producto.precio);
    document.querySelector('#detalle-descripcion').textContent = producto.descripcion;

    const caracteristicas = document.querySelector('#detalle-caracteristicas');
    const datos = [
        'Categoría: ' + (ETIQUETAS_CATEGORIA[producto.categoria] || producto.categoria),
        'ID del producto: ' + producto.id
    ];
    if (producto.fechaCreacion) {
        datos.push('Creado el: ' + new Date(producto.fechaCreacion).toLocaleDateString('es-AR'));
    }
    if (producto.fechaModificacion) {
        datos.push('Última modificación: ' + new Date(producto.fechaModificacion).toLocaleDateString('es-AR'));
    }
    caracteristicas.replaceChildren(...datos.map(dato => {
        const item = document.createElement('li');
        item.textContent = dato;
        return item;
    }));

    const stock = document.querySelector('#detalle-stock');
    stock.textContent = producto.stock > 0
        ? 'Stock disponible: ' + producto.stock + ' unidades'
        : 'Producto agotado';

    document.querySelector('#detalle-id').value = producto.id;
    const campoCantidad = document.querySelector('#cantidad');
    campoCantidad.max = Math.max(producto.stock, 1);
    const formulario = document.querySelector('#detalle-formulario');
    if (producto.stock <= 0) {
        formulario.querySelector('button[type="submit"]').disabled = true;
    }

    document.querySelector('#enlace-volver-admin').hidden = !esAdmin;
    const enlaceEditar = document.querySelector('#enlace-editar-admin');
    enlaceEditar.hidden = !esAdmin;
    enlaceEditar.href = 'editar-producto.html?id=' + encodeURIComponent(producto.id);

    document.querySelector('#detalle-articulo').hidden = false;

    const relacionados = document.querySelector('#relacionados');
    const lista = relacionados.querySelector('ul');
    const productosRelacionados = await obtenerProductosRelacionados(producto);
    lista.replaceChildren(...productosRelacionados.map(relacionado =>
        crearTarjetaRelacionado(relacionado, esAdmin)
    ));
    relacionados.hidden = productosRelacionados.length === 0;
}

async function inicializarFormularioEditarProducto() {
    const formulario = document.querySelector('#editar-producto form');

    if (!formulario) {
        return;
    }

    const id = new URLSearchParams(window.location.search).get('id');
    const producto = id ? await buscarProducto(id) : null;

    if (!producto) {
        window.location.href = 'administrador.html';
        return;
    }

    formulario.querySelector('#nombre').value = producto.nombre;
    formulario.querySelector('#descripcion').value = producto.descripcion;
    formulario.querySelector('#precio').value = producto.precio;
    formulario.querySelector('#categoria').value = producto.categoria;
    formulario.querySelector('#stock').value = producto.stock;

    const imagenActual = document.querySelector('#imagen-actual');
    if (imagenActual) {
        imagenActual.src = producto.imagen;
        imagenActual.alt = 'Imagen actual del ' + producto.nombre.toLowerCase();
    }

    formulario.addEventListener('submit', async evento => {
        evento.preventDefault();

        const archivo = formulario.querySelector('#imagen').files[0];
        let imagen = producto.imagen;

        if (archivo) {
            try {
                imagen = await procesarImagen(archivo);
            } catch (error) {
                alert(error.message);
                return;
            }
        }

        const actualizado = await actualizarProducto(producto.id, {
            nombre: formulario.querySelector('#nombre').value.trim(),
            descripcion: formulario.querySelector('#descripcion').value.trim(),
            precio: Number(formulario.querySelector('#precio').value),
            categoria: formulario.querySelector('#categoria').value,
            stock: Number(formulario.querySelector('#stock').value),
            imagen: imagen
        });

        if (!actualizado) {
            alert('No se pudieron guardar los cambios. Revisá los datos e intentá nuevamente.');
            return;
        }

        window.location.href = 'administrador.html';
    });
}

async function iniciarPagina() {
    // Trae el catálogo de la base una vez y a partir de ahí el pintado
    // (renderizarCatalogo) es síncrono sobre la memoria.
    await obtenerCatalogo();
    renderizarCatalogo();
    inicializarFiltrosBusqueda();
    inicializarBusquedaAdmin();
    inicializarFormularioNuevoProducto();
    await inicializarDetalleProducto();
    await inicializarFormularioEditarProducto();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarPagina);
} else {
    iniciarPagina();
}
