document.addEventListener('DOMContentLoaded', () => {
    // --- VERIFICAR SESIÓN AL CARGAR EL DASHBOARD ---
    async function verificarAccesoDashboard() {
        try {
            const respuesta = await fetch('/api/auth/status', {credentials: 'include'});
            if (!respuesta.ok) {
                 // Si no hay sesión válida, redirige al login
                 console.log('No hay sesión activa, redirigiendo al login...');
                 window.location.href = '/index.html';
            }
            // Si la sesión es válida, la página continúa cargándose normalmente
            console.log('Sesión activa verificada.');
        } catch (error) {
            console.error('Error verificando sesión en dashboard:', error);
            // En caso de error de red, también redirigir al login podría ser una opción
             window.location.href = '/index.html';
        }
    }
    verificarAccesoDashboard(); // Llama a la función al cargar el dashboard


    // --- NAVEGACIÓN PRINCIPAL Y ESTADO --- (sin cambios)
    const enlacesMenu = document.querySelectorAll('.menu a');
    const paneles = document.querySelectorAll('.panelContenido');
    const panelBienvenida = document.getElementById('panelBienvenida');
    const botonSalir = document.querySelector('.botonSalir');
    let seccionActiva = null;

    // --- FUNCIÓN GENÉRICA PARA CARGAR DATOS (Actualizada con fetch options) ---
    async function cargarDatos(seccion) {
        try {
            // Incluimos 'credentials: include' para que la cookie de sesión se envíe
            const respuesta = await fetch(`/api/${seccion}`, { credentials: 'include' });
            
            // Si la respuesta es 401 (No autorizado), redirige al login
            if (respuesta.status === 401) {
                window.location.href = '/index.html';
                return; // Detiene la ejecución
            }
            if (!respuesta.ok) throw new Error('No se pudieron cargar los datos.');

            const datos = await respuesta.json();
            const panel = document.querySelector(`.panelContenido[data-seccion="${seccion}"]`);
            const cuerpoTabla = panel.querySelector('tbody');
            cuerpoTabla.innerHTML = '';

            // Lógica para crear las filas (la que ya tenías)
            datos.forEach(item => {
                const fila = document.createElement('tr');
                // Asignamos el ID correcto dependiendo de la sección
                let itemId;
                if (seccion === 'platillos') itemId = item.id_platillo;
                else if (seccion === 'bebidas') itemId = item.id_bebida;
                // Añadir más 'else if' para las otras claves primarias (id_ing, id_postre, etc.)
                
                fila.dataset.id = itemId || item.id; // Usamos el ID específico o 'id' como fallback

                // Llenamos las celdas (la lógica que ya tenías)
                if (seccion === 'platillos') {
                     fila.innerHTML = `<td>${item.nombre_platillo}</td><td>${item.descripcion}</td><td>$${parseFloat(item.costo_platillo).toFixed(2)}</td>`;
                } else if (seccion === 'bebidas') {
                     fila.innerHTML = `<td>${item.nombre_bebida}</td><td>$${parseFloat(item.costo_bebida).toFixed(2)}</td>`;
                } else if (seccion === 'ingredientes') {
                     fila.innerHTML = `<td>${item.nombre_ing}</td><td>${item.unidad_medida || '-'}</td><td>$${parseFloat(item.costo_ing).toFixed(2)}</td><td>${item.cantidad_disponible}</td>`;
                } else if (seccion === 'postres') {
                     fila.innerHTML = `<td>${item.nombre_postre}</td><td>${item.descripcion}</td><td>$${parseFloat(item.costo_postre).toFixed(2)}</td>`;
                } else if (seccion === 'empleados') {
                     fila.innerHTML = `<td>${item.nombre_empleado}</td><td>${item.rol}</td><td>$${parseFloat(item.sueldo).toFixed(2)}</td>`;
                }
                cuerpoTabla.appendChild(fila);
            });
        } catch (error) {
            console.error(`Error cargando ${seccion}:`, error);
        }
    }

    // --- LÓGICA DE EVENTOS --- (sin cambios en la navegación)
    enlacesMenu.forEach(enlace => {
        enlace.addEventListener('click', (evento) => {
            evento.preventDefault();
            seccionActiva = enlace.dataset.seccion;
            enlacesMenu.forEach(link => link.classList.remove('activo'));
            enlace.classList.add('activo');
            panelBienvenida.classList.add('oculto');
            paneles.forEach(panel => panel.classList.add('oculto'));
            const panelAMostrar = document.getElementById(enlace.dataset.target);
            if (panelAMostrar) {
                panelAMostrar.classList.remove('oculto');
                // Cargamos datos solo si no es el panel de finanzas (que aún no tiene tabla)
                if (seccionActiva !== 'finanzas') {
                     cargarDatos(seccionActiva);
                }
            }
        });
    });

    // --- BOTÓN SALIR (Actualizado para llamar a la API) ---
    botonSalir.addEventListener('click', async () => {
        try {
            // Llama a la nueva ruta de logout en el backend
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
            // Borra cualquier token JWT residual (aunque ya no se usa activamente)
            localStorage.removeItem('authToken');
            // Redirige al login
            window.location.href = '/index.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            // Igualmente redirigir, aunque haya fallado la llamada
            window.location.href = '/index.html';
        }
    });

    // Aquí iría la lógica genérica para los modales, botones CRUD, etc.
});