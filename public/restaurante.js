document.addEventListener('DOMContentLoaded', () => {
    const enlacesMenu = document.querySelectorAll('.menu a');
    const paneles = document.querySelectorAll('.panelContenido');
    const panelBienvenida = document.getElementById('panelBienvenida');
    const botonSalir = document.querySelector('.botonSalir');

    // Manejar clics en el menú
    enlacesMenu.forEach(enlace => {
        enlace.addEventListener('click', (evento) => {
            evento.preventDefault(); // Evita que la página se recargue

            // Marcar el enlace activo
            enlacesMenu.forEach(link => link.classList.remove('activo'));
            enlace.classList.add('activo');

            // Ocultar todos los paneles
            panelBienvenida.classList.add('oculto');
            paneles.forEach(panel => panel.classList.add('oculto'));

            // Mostrar el panel correcto
            const idPanel = enlace.getAttribute('data-target');
            const panelActivo = document.getElementById(idPanel);
            
            if (panelActivo) {
                panelActivo.classList.remove('oculto');
            }
        });
    });

    // Manejar el botón de cerrar sesión
    botonSalir.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        window.location.href = '/index.html';
    });
});