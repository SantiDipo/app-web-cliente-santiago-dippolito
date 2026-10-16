const CATALOGO_BASE = [
    {
        id: 'reloj-clasico',
        nombre: 'Reloj clásico',
        descripcion: 'Reloj analógico con correa de cuero.',
        precio: 49999,
        imagen: 'https://images.unsplash.com/photo-1777457900943-7fd2f7c42529?q=85&fm=jpg&crop=entropy&cs=srgb&w=800',
        categoria: 'relojes',
        stock: 10
    },
    {
        id: 'bolso-de-mano',
        nombre: 'Bolso de mano',
        descripcion: 'Bolso de cuero sintético, ideal para uso diario.',
        precio: 39999,
        imagen: 'https://images.unsplash.com/photo-1598532163257-ae3c6b2524b6?q=85&fm=jpg&crop=entropy&cs=srgb&w=800',
        categoria: 'bolsos',
        stock: 10
    },
    {
        id: 'gorra-deportiva',
        nombre: 'Gorra deportiva',
        descripcion: 'Gorra ajustable transpirable.',
        precio: 12999,
        imagen: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=85&fm=jpg&crop=entropy&cs=srgb&w=800',
        categoria: 'gorras',
        stock: 10
    },
    {
        id: 'lentes-de-sol',
        nombre: 'Lentes de sol',
        descripcion: 'Lentes polarizados con protección UV400.',
        precio: 25999,
        imagen: 'https://images.unsplash.com/photo-1584036553516-bf83210aa16c?q=85&fm=jpg&crop=entropy&cs=srgb&w=800',
        categoria: 'lentes',
        stock: 10
    },
    {
        id: 'pulsera-de-plata',
        nombre: 'Pulsera de plata',
        descripcion: 'Pulsera de plata 925 con diseño minimalista.',
        precio: 18499,
        imagen: 'https://images.unsplash.com/photo-1681091638833-b2409f8ee8d8?q=85&fm=jpg&crop=entropy&cs=srgb&w=800',
        categoria: 'joyeria',
        stock: 10
    },
    {
        id: 'cinturon-de-cuero',
        nombre: 'Cinturón de cuero',
        descripcion: 'Cinturón de cuero genuino con hebilla metálica.',
        precio: 15999,
        imagen: 'https://images.unsplash.com/photo-1565251419287-9097aa7299ec?q=85&fm=jpg&crop=entropy&cs=srgb&w=800',
        categoria: 'accesorios',
        stock: 10
    },
    {
        id: 'collar-de-plata',
        nombre: 'Collar de plata',
        descripcion: 'Collar de plata con colgante de piedra azul.',
        precio: 24999,
        imagen: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=85&fm=jpg&crop=entropy&cs=srgb&w=800',
        categoria: 'joyeria',
        stock: 10
    },
    {
        id: 'aretes-dorados',
        nombre: 'Aretes dorados',
        descripcion: 'Aretes de aro dorados, livianos y elegantes.',
        precio: 16999,
        imagen: 'https://images.unsplash.com/photo-1630019852942-f89202989a59?q=85&fm=jpg&crop=entropy&cs=srgb&w=800',
        categoria: 'joyeria',
        stock: 10
    },
    {
        id: 'billetera-de-cuero',
        nombre: 'Billetera de cuero',
        descripcion: 'Billetera de cuero marrón con varios compartimentos.',
        precio: 22999,
        imagen: 'https://images.unsplash.com/photo-1627123424574-724758594e93?q=85&fm=jpg&crop=entropy&cs=srgb&w=800',
        categoria: 'accesorios',
        stock: 10
    },
    {
        id: 'set-de-anillos',
        nombre: 'Set de anillos',
        descripcion: 'Set de anillos finos con acabado dorado.',
        precio: 18999,
        imagen: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=85&fm=jpg&crop=entropy&cs=srgb&w=800',
        categoria: 'joyeria',
        stock: 10
    }
];

const CLAVE_PRODUCTOS_NUEVOS = 'accesorios-shop-productos-nuevos';
const CLAVE_PRODUCTOS_EDITADOS = 'accesorios-shop-productos-editados';
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

function leerProductosNuevos() {
    try {
        const guardados = localStorage.getItem(CLAVE_PRODUCTOS_NUEVOS);
        return guardados ? JSON.parse(guardados) : [];
    } catch (error) {
        console.error('No se pudieron leer los productos guardados:', error);
        return [];
    }
}

function guardarProductosNuevos(productos) {
    try {
        localStorage.setItem(CLAVE_PRODUCTOS_NUEVOS, JSON.stringify(productos));
        return true;
    } catch (error) {
        console.error('No se pudieron guardar los productos:', error);
        return false;
    }
}

function leerProductosEditados() {
    try {
        const guardados = localStorage.getItem(CLAVE_PRODUCTOS_EDITADOS);
        return guardados ? JSON.parse(guardados) : {};
    } catch (error) {
        console.error('No se pudieron leer los productos editados:', error);
        return {};
    }
}

function guardarProductosEditados(editados) {
    try {
        localStorage.setItem(CLAVE_PRODUCTOS_EDITADOS, JSON.stringify(editados));
        return true;
    } catch (error) {
        console.error('No se pudieron guardar las ediciones:', error);
        return false;
    }
}

function obtenerCatalogo() {
    const editados = leerProductosEditados();
    const aplicarEdicion = producto => editados[producto.id]
        ? Object.assign({}, producto, editados[producto.id])
        : producto;

    return CATALOGO_BASE.concat(leerProductosNuevos()).map(aplicarEdicion);
}

function buscarProducto(id) {
    return obtenerCatalogo().find(producto => producto.id === id) || null;
}

function actualizarProducto(id, cambios) {
    const editados = leerProductosEditados();
    editados[id] = Object.assign({}, editados[id] || {}, cambios, {
        fechaModificacion: new Date().toISOString()
    });
    return guardarProductosEditados(editados);
}

function generarIdProducto(nombre, catalogo) {
    const base = normalizarTexto(nombre)
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

    let id = base || 'producto';
    let intento = 2;

    while (catalogo.some(producto => producto.id === id)) {
        id = base + '-' + intento;
        intento += 1;
    }

    return id;
}

function crearProducto(datos) {
    const nombre = String(datos.nombre || '').trim();
    const descripcion = String(datos.descripcion || '').trim();
    const precio = Number(datos.precio);
    const stock = Number(datos.stock);

    if (!nombre || !descripcion || !Number.isFinite(precio) || precio <= 0) {
        console.error('Datos de producto inválidos:', datos);
        return null;
    }

    const producto = {
        id: generarIdProducto(nombre, obtenerCatalogo()),
        nombre: nombre,
        descripcion: descripcion,
        precio: precio,
        imagen: datos.imagen || IMAGEN_RESERVA,
        categoria: datos.categoria || 'accesorios',
        stock: Number.isFinite(stock) && stock >= 0 ? stock : STOCK_INICIAL,
        fechaCreacion: new Date().toISOString()
    };

    const productosNuevos = leerProductosNuevos();
    productosNuevos.push(producto);

    if (!guardarProductosNuevos(productosNuevos)) {
        return null;
    }

    return producto;
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

    const enlaceDetalle = document.createElement('a');
    enlaceDetalle.className = 'tarjeta-detalle';
    enlaceDetalle.href = 'producto.html?id=' + encodeURIComponent(producto.id) + '&admin=1';
    enlaceDetalle.append(titulo, imagen, parrafoDescripcion, parrafoPrecio);

    articulo.append(enlaceEditar, botonEliminar, enlaceDetalle);
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

    if (!lista) {
        return;
    }

    const modoAdmin = seccion.classList.contains('admin');
    let productos = obtenerCatalogo();

    if (!modoAdmin && document.querySelector('#filtros-busqueda form')) {
        productos = aplicarFiltros(productos, new URLSearchParams(window.location.search));
    }

    lista.replaceChildren(...productos.map(producto =>
        modoAdmin ? crearTarjetaProductoAdmin(producto) : crearTarjetaProducto(producto)
    ));

    if (modoAdmin) {
        lista.append(crearTarjetaNuevoProducto());
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

        const producto = crearProducto({
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

function obtenerProductosRelacionados(producto) {
    const catalogo = obtenerCatalogo();
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

function inicializarDetalleProducto() {
    const contenedor = document.querySelector('#detalle-producto');
    if (!contenedor) {
        return;
    }

    const parametros = new URLSearchParams(window.location.search);
    const id = parametros.get('id');
    const esAdmin = parametros.get('admin') === '1';
    const producto = id ? buscarProducto(id) : null;

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
    const productosRelacionados = obtenerProductosRelacionados(producto);
    lista.replaceChildren(...productosRelacionados.map(relacionado =>
        crearTarjetaRelacionado(relacionado, esAdmin)
    ));
    relacionados.hidden = productosRelacionados.length === 0;
}

function inicializarFormularioEditarProducto() {
    const formulario = document.querySelector('#editar-producto form');

    if (!formulario) {
        return;
    }

    const id = new URLSearchParams(window.location.search).get('id');
    const producto = id ? buscarProducto(id) : null;

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

        const actualizado = actualizarProducto(producto.id, {
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

function iniciarPagina() {
    renderizarCatalogo();
    inicializarFiltrosBusqueda();
    inicializarFormularioNuevoProducto();
    inicializarDetalleProducto();
    inicializarFormularioEditarProducto();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarPagina);
} else {
    iniciarPagina();
}
