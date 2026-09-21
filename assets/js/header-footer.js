async function cargarComponentes() {
    try {
        const [headerHtml, footerHtml] = await Promise.all([
            fetch('header.html').then(resp => resp.text()),
            fetch('footer.html').then(resp => resp.text())
        ]);

        const header = document.querySelector('header');
        const footer = document.querySelector('footer');

        if (header) {
            header.innerHTML = headerHtml;
        }
        if (footer) {
            footer.innerHTML = footerHtml;
        }

        marcarEnlaceActivo();
        window.dispatchEvent(new CustomEvent('componentes-cargados'));
    } catch (error) {
        console.error('No se pudieron cargar los componentes compartidos:', error);
    }
}

function marcarEnlaceActivo() {
    const paginaActual = (location.pathname.split('/').pop() || 'index.html').split('?')[0];

    document.querySelectorAll('.navbar a').forEach(enlace => {
        const destino = (enlace.getAttribute('href') || '').split('?')[0];
        if (destino === paginaActual) {
            enlace.classList.add('activo');
            enlace.setAttribute('aria-current', 'page');
        }
    });
}

cargarComponentes();