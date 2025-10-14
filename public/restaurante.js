document.addEventListener('DOMContentLoaded', () => {
    // --- NAVEGACIÓN PRINCIPAL Y ESTADO ---
    const enlacesMenu = document.querySelectorAll('.menu a');
    const paneles = document.querySelectorAll('.panelContenido');
    const panelBienvenida = document.getElementById('panelBienvenida');
    const botonSalir = document.querySelector('.botonSalir');
    
    let seccionActiva = null; // Variable para saber en qué sección estamos

    // --- FUNCIONES CRUD GENÉRICAS ---

    // 1. Carga los datos de cualquier sección y los pone en su tabla
    async function cargarDatos(seccion) {
        try {
            // Hacemos la petición a la API correcta (ej: /api/platillos)
            const respuesta = await fetch(`/api/${seccion}`);
            if (!respuesta.ok) throw new Error('No se pudieron cargar los datos.');
            
            const datos = await respuesta.json();
            const panel = document.querySelector(`.panelContenido[data-seccion="${seccion}"]`);
            const cuerpoTabla = panel.querySelector('tbody');
            
            cuerpoTabla.innerHTML = ''; // Limpiamos la tabla antes de llenarla

            // Creamos las filas dinámicamente
            datos.forEach(item => {
                const fila = document.createElement('tr');
                fila.dataset.id = item.id; // Asumimos que cada item tiene un ID
                
                // Llenamos las celdas (esto se puede hacer más dinámico, pero empecemos así)
                if (seccion === 'platillos') {
                    fila.innerHTML = `
                        <td>${item.nombre}</td>
                        <td>${item.descripcion}</td>
                        <td>$${item.precio}</td>
                    `;
                } else if (seccion === 'bebidas') {
                    fila.innerHTML = `
                        <td>${item.nombre}</td>
                        <td>$${item.precio}</td>
                    `;
                }
                // Añadir más 'else if' para otras secciones

                cuerpoTabla.appendChild(fila);
            });
        } catch (error) {
            console.error(`Error cargando ${seccion}:`, error);
        }
    }

    // --- LÓGICA DE EVENTOS ---
    
    enlacesMenu.forEach(enlace => {
        enlace.addEventListener('click', (evento) => {
            evento.preventDefault();
            
            seccionActiva = enlace.dataset.seccion; // Actualizamos la sección activa
            
            // Lógica para mostrar/ocultar paneles (la que ya teníamos)
            enlacesMenu.forEach(link => link.classList.remove('activo'));
            enlace.classList.add('activo');
            panelBienvenida.classList.add('oculto');
            paneles.forEach(panel => panel.classList.add('oculto'));
            const panelAMostrar = document.getElementById(enlace.dataset.target);
            if (panelAMostrar) {
                panelAMostrar.classList.remove('oculto');
            }
            
            // Llamamos a nuestra función genérica para cargar los datos
            cargarDatos(seccionActiva);
        });
    });

    botonSalir.addEventListener('click', () => {
        localStorage.removeItem('authToken');
        window.location.href = '/index.html';
    });

    
    // --- LÓGICA DEL MODAL (YA EXISTENTE) ---
    const modalPlatillo = document.getElementById('modalPlatillo');
    const botonCancelarModal = document.querySelector('.botonCancelar');
    const tituloModal = document.getElementById('tituloModal');

    function mostrarModal() { modalPlatillo.classList.remove('oculto'); }
    function ocultarModal() {
        modalPlatillo.classList.add('oculto');
        // Limpia la selección al cerrar el modal
        const filaActiva = cuerpoTablaPlatillos.querySelector('.seleccionado');
        if (filaActiva) {
            filaActiva.classList.remove('seleccionado');
            botonEditarPlatillo.disabled = true;
            botonEliminarPlatillo.disabled = true;
        }
    }

    botonCancelarModal.addEventListener('click', ocultarModal);
    modalPlatillo.addEventListener('click', (evento) => {
        if (evento.target === modalPlatillo) ocultarModal();
    });

    // Asignar acciones a los botones del CRUD
    botonAgregarPlatillo.addEventListener('click', () => {
        tituloModal.textContent = 'Agregar Platillo';
        // Aquí podrías limpiar el formulario si es necesario
        // document.getElementById('formularioPlatillo').reset();
        mostrarModal();
    });

    botonEditarPlatillo.addEventListener('click', () => {
        tituloModal.textContent = 'Editar Platillo';
        // Aquí iría la lógica para cargar los datos de la fila en el formulario
        mostrarModal();
    });

    botonEliminarPlatillo.addEventListener('click', () => {
        // Lógica para confirmar y eliminar
        if (confirm('¿Estás seguro de que quieres eliminar este platillo?')) {
            // Aquí iría la lógica para eliminar el platillo
            console.log('Platillo eliminado');
        }
    });

});
