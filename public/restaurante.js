document.addEventListener('DOMContentLoaded', () => {

    // --- VERIFICACIÓN DE SESIÓN ---
    async function verificarAccesoDashboard() {
        try {
            const respuesta = await fetch('/api/auth/status', {credentials: 'include'});
            if (!respuesta.ok) {
                 console.log('No hay sesión activa, redirigiendo al login...');
                 window.location.href = '/index.html';
                 return;
            }
            
            const data = await respuesta.json();
            
            if (data.rol === 'cocinero') {
                console.log('Rol de cocinero detectado. Redirigiendo a la cocina...');
                window.location.href = '/cocina.html'; // O 'consultarpedido.html'
                return;
            }
            
            console.log('Sesión de dueño activa verificada.');
            
        } catch (error) {
            console.error('Error verificando sesión en dashboard:', error);
             window.location.href = '/index.html';
        }
    }
    verificarAccesoDashboard();

    // --- ELEMENTOS DOM PRINCIPALES ---
    const enlacesMenu = document.querySelectorAll('.menu a');
    const paneles = document.querySelectorAll('.panelContenido');
    const panelBienvenida = document.getElementById('panelBienvenida');
    const botonSalir = document.querySelector('.botonSalir');
    
    // --- ELEMENTOS DEL MODAL ---
    const modal = document.getElementById('modal');
    const tituloModal = document.getElementById('tituloModal');
    const formulario = document.getElementById('formulario');
    const camposDinamicos = document.getElementById('camposDinamicos');
    const botonCancelar = document.querySelector('.botonCancelar');

    // --- ESTADO DE LA APP ---
    let seccionActiva = null;
    let itemSeleccionadoId = null;
    let modoFormulario = 'agregar';
    let filaSeleccionada = null;
    let ingredientesDisponibles = []; // Caché de ingredientes

    // --- FUNCIÓN GENÉRICA PARA CARGAR DATOS ---
    async function cargarDatos(seccion) {
        try {
            const respuesta = await fetch(`/api/${seccion}`, { credentials: 'include' });
            if (respuesta.status === 401) {
                window.location.href = '/index.html';
                return;
            }
            if (!respuesta.ok) throw new Error('No se pudieron cargar los datos.');

            const datos = await respuesta.json();
            const panel = document.querySelector(`.panelContenido[data-seccion="${seccion}"]`);
            const cuerpoTabla = panel.querySelector('tbody');
            cuerpoTabla.innerHTML = '';

            datos.forEach(item => {
                const fila = document.createElement('tr');
                let itemId, innerHTML;

                if (seccion === 'productos') {
                    itemId = item.id_producto;
                    fila.dataset.productosData = JSON.stringify(item); 
                    innerHTML = `
                        <td>${item.nombre}</td>
                        <td>${item.tipo}</td>
                        <td>${item.descripcion || '-'}</td>
                        <td>$${parseFloat(item.precio_venta).toFixed(2)}</td>`;

                } else if (seccion === 'ingredientes') {
                    itemId = item.id_ing;
                    fila.dataset.ingredientesData = JSON.stringify(item);
                     innerHTML = `
                        <td>${item.nombre_ing}</td>
                        <td>${item.unidad_medida || '-'}</td>
                        <td>$${parseFloat(item.costo_ing).toFixed(2)}</td>
                        <td>${item.cantidad_disponible}</td>`;

                } else if (seccion === 'empleados') {
                    itemId = item.id_empleado;
                    fila.dataset.empleadosData = JSON.stringify(item);
                     innerHTML = `
                        <td>${item.nombre_empleado}</td>
                        <td>${item.rol}</td>
                        <td>$${parseFloat(item.sueldo).toFixed(2)}</td>`;
                }
                
                fila.dataset.id = itemId;
                fila.innerHTML = innerHTML;
                cuerpoTabla.appendChild(fila);
            });

            deshabilitarBotones(panel);

        } catch (error) {
            console.error(`Error cargando ${seccion}:`, error);
        }
    }
    
    // --- Cargar ingredientes a la caché ---
    async function cargarIngredientesCache() {
        try {
            const respuesta = await fetch('/api/ingredientes', { credentials: 'include' });
            if (!respuesta.ok) throw new Error('No se pudieron cargar ingredientes');
            ingredientesDisponibles = await respuesta.json();
        } catch (error) {
            console.error(error);
            alert('Error al cargar ingredientes. La creación de recetas no funcionará.');
        }
    }
    cargarIngredientesCache(); // Cargar al inicio

    // --- NAVEGACIÓN PRINCIPAL ---
    enlacesMenu.forEach(enlace => {
        enlace.addEventListener('click', (evento) => {
            evento.preventDefault();
            seccionActiva = enlace.dataset.seccion;
            itemSeleccionadoId = null;
            filaSeleccionada = null;

            enlacesMenu.forEach(link => link.classList.remove('activo'));
            enlace.classList.add('activo');
            
            panelBienvenida.classList.add('oculto');
            paneles.forEach(panel => panel.classList.add('oculto'));
            
            const panelAMostrar = document.getElementById(enlace.dataset.target);
            if (panelAMostrar) {
                panelAMostrar.classList.remove('oculto');
                if (seccionActiva !== 'finanzas') {
                     cargarDatos(seccionActiva);
                }
            }
        });
    });

    // --- LÓGICA DE SELECCIÓN DE FILAS ---
    document.querySelectorAll('.tablaDatos tbody').forEach(tbody => {
        tbody.addEventListener('click', (e) => {
            const fila = e.target.closest('tr');
            if (!fila) return;

            const panelActual = fila.closest('.panelContenido');
            const seccion = panelActual.dataset.seccion;

            if (seccion !== seccionActiva) return;

            if (filaSeleccionada) {
                filaSeleccionada.classList.remove('seleccionado');
            }
            
            fila.classList.add('seleccionado');
            filaSeleccionada = fila;
            itemSeleccionadoId = fila.dataset.id;
            
            habilitarBotones(panelActual);
        });
    });

    function habilitarBotones(panel) {
        panel.querySelector('.botonEditar').disabled = false;
        panel.querySelector('.botonEliminar').disabled = false;
    }
    
    function deshabilitarBotones(panel) {
        if (!panel) return;
        panel.querySelector('.botonEditar').disabled = true;
        panel.querySelector('.botonEliminar').disabled = true;
        if (filaSeleccionada) {
            filaSeleccionada.classList.remove('seleccionado');
            filaSeleccionada = null;
        }
        itemSeleccionadoId = null;
    }

    // --- LÓGICA DE BOTONES CRUD ---

    // Botones AGREGAR
    document.querySelectorAll('.botonAgregar').forEach(boton => {
        boton.addEventListener('click', (e) => {
            const panel = e.target.closest('.panelContenido');
            const seccion = panel.dataset.seccion;
            if (seccion !== seccionActiva) return;
            
            modoFormulario = 'agregar';
            tituloModal.textContent = `Agregar ${seccion.slice(0, -1)}`;
            generarCamposModal(seccion);
            modal.classList.remove('oculto');
        });
    });

    // Botones EDITAR
    document.querySelectorAll('.botonEditar').forEach(boton => {
        boton.addEventListener('click', (e) => {
            if (!itemSeleccionadoId || !filaSeleccionada) return;

            const panel = e.target.closest('.panelContenido');
            const seccion = panel.dataset.seccion;
            if (seccion !== seccionActiva) return;
            
            modoFormulario = 'editar';
            tituloModal.textContent = `Editar ${seccion.slice(0, -1)}`;
            
            const datos = JSON.parse(filaSeleccionada.dataset[seccion + 'Data']);
            generarCamposModal(seccion, datos);
            modal.classList.remove('oculto');
        });
    });

    // Botones ELIMINAR (Soft Delete)
    document.querySelectorAll('.botonEliminar').forEach(boton => {
        boton.addEventListener('click', async (e) => {
            if (!itemSeleccionadoId) return;

            const panel = e.target.closest('.panelContenido');
            const seccion = panel.dataset.seccion;
            if (seccion !== seccionActiva) return;

            if (confirm(`¿Estás seguro de que quieres eliminar este item?`)) {
                try {
                    const respuesta = await fetch(`/api/${seccion}/${itemSeleccionadoId}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });
                    
                    if (!respuesta.ok) throw new Error('No se pudo eliminar.');
                    
                    cargarDatos(seccion);

                } catch (error) {
                    console.error('Error al eliminar:', error);
                    alert('Error al eliminar el item.');
                }
            }
        });
    });


    // --- LÓGICA DEL MODAL Y FORMULARIO (ACTUALIZADA) ---

    // Esta función ahora es async para poder cargar recetas
    // --- LÓGICA DEL MODAL Y FORMULARIO (ACTUALIZADA) ---

    // Esta función ahora es async para poder cargar recetas
    async function generarCamposModal(seccion, datos = {}) {
        camposDinamicos.innerHTML = ''; // Limpiar campos anteriores

        if (seccion === 'productos') {
            camposDinamicos.innerHTML = `
                <label for="nombre">Nombre:</label>
                <input type="text" id="nombre" name="nombre" value="${datos.nombre || ''}" required>
                
                <label for="descripcion">Descripción:</label>
                <textarea id="descripcion" name="descripcion">${datos.descripcion || ''}</textarea>
                
                <label for="precio_venta">Precio:</label>
                <input type="number" id="precio_venta" name="precio_venta" step="0.01" value="${datos.precio_venta || ''}" required>
                
                <label for="tipo">Tipo:</label>
                <select id="tipo" name="tipo" required>
                    <option value="platillo" ${datos.tipo === 'platillo' ? 'selected' : ''}>Platillo</option>
                    <option value="bebida" ${datos.tipo === 'bebida' ? 'selected' : ''}>Bebida</option>
                    <option value="postre" ${datos.tipo === 'postre' ? 'selected' : ''}>Postre</option>
                </select>

                <hr>
                <h3>Receta</h3>
                <div id="contenedorReceta"></div>
                <button type="button" class="boton" id="btnAnadirIngrediente">+ Añadir Ingrediente</button>
            `;

            // Lógica para el constructor de recetas
            const contenedorReceta = document.getElementById('contenedorReceta');
            
            // Generar un <select> con todos los ingredientes
            const opcionesSelect = ingredientesDisponibles.map(ing => 
                `<option value="${ing.id_ingrediente}">${ing.nombre_ing} (${ing.unidad_medida})</option>`
            ).join('');

            const anadirFilaReceta = (ingredienteReceta = {}) => {
                const divFila = document.createElement('div');
                divFila.classList.add('filaReceta');
                divFila.innerHTML = `
                    <select class="receta_id_ingrediente">
                        <option value="">-- Ingrediente --</option>
                        ${opcionesSelect}
                    </select>
                    <input type="number" class="receta_cantidad" placeholder="Cant." value="${ingredienteReceta.cantidad_usada || ''}">
                    <button type="button" class="btnQuitarIngrediente">X</button>
                `;
                // Seleccionar el ingrediente correcto si estamos editando
                if (ingredienteReceta.id_ingrediente) {
                    divFila.querySelector('.receta_id_ingrediente').value = ingredienteReceta.id_ingrediente;
                }
                contenedorReceta.appendChild(divFila);
            };

            // Event listener para el botón de "Añadir Ingrediente"
            document.getElementById('btnAnadirIngrediente').addEventListener('click', () => anadirFilaReceta());

            // Event listener para los botones "Quitar" (delegado)
            contenedorReceta.addEventListener('click', (e) => {
                if (e.target.classList.contains('btnQuitarIngrediente')) {
                    e.target.closest('.filaReceta').remove();
                }
            });

            // Si estamos editando, cargar la receta existente
            if (modoFormulario === 'editar' && datos.id_producto) {
                try {
                    const res = await fetch(`/api/recetas/${datos.id_producto}`, { credentials: 'include' });
                    const recetaExistente = await res.json();
                    recetaExistente.forEach(item => anadirFilaReceta(item));
                } catch (error) {
                    console.error('Error al cargar receta existente:', error);
                }
            }

        } else if (seccion === 'ingredientes') {
            camposDinamicos.innerHTML = `
                <label for="nombre">Nombre del Ingrediente:</label>
                <input type="text" id="nombre" name="nombre" value="${datos.nombre_ing || ''}" required>
                
                <label for="unidad_medida">Unidad de Medida:</label>
                <select id="unidad_medida" name="unidad_medida" required>
                    <option value="">-- Selecciona --</option>
                    <option value="gr" ${datos.unidad_medida === 'gr' ? 'selected' : ''}>Gramos (gr)</option>
                    <option value="ml" ${datos.unidad_medida === 'ml' ? 'selected' : ''}>Mililitros (ml)</option>
                    <option value="pza" ${datos.unidad_medida === 'pza' ? 'selected' : ''}>Piezas (pza)</option>
                </select>

                <label for="costo_unitario">Costo por Unidad (Ej: costo de 1 gr):</label>
                <input type="number" id="costo_unitario" name="costo_unitario" step="0.01" value="${datos.costo_ing || 0.00}" required>

                <label for="stock">Cantidad en Inventario (Stock):</label>
                <input type="number" id="stock" name="stock" step="0.01" value="${datos.cantidad_disponible || 0.00}" required>
            `;
        
        } else if (seccion === 'empleados') {
            // ¡ESTE ES EL BLOQUE NUEVO PARA EMPLEADOS!
            camposDinamicos.innerHTML = `
                <label for="nombre_empleado">Nombre del Empleado:</label>
                <input type="text" id="nombre_empleado" name="nombre_empleado" value="${datos.nombre_empleado || ''}" required>
                
                <label for="rol">Rol:</label>
                <select id="rol" name="rol" required>
                    <option value="">-- Selecciona un rol --</option>
                    <option value="Cocinero" ${datos.rol === 'Cocinero' ? 'selected' : ''}>Cocinero</option>
                    <option value="Mesero" ${datos.rol === 'Mesero' ? 'selected' : ''}>Mesero</option>
                    <option value="Cajero" ${datos.rol === 'Cajero' ? 'selected' : ''}>Cajero</option>
                    <option value="Conserje" ${datos.rol === 'Conserje' ? 'selected' : ''}>Conserje</option>
                    <option value="Gerente" ${datos.rol === 'Gerente' ? 'selected' : ''}>Gerente</option>
                </select>

                <label for="sueldo">Sueldo Mensual:</label>
                <input type="number" id="sueldo" name="sueldo" step="100" value="${datos.sueldo || 3000}" required>
            `;
        }
    }

    // Enviar formulario (ACTUALIZADO para incluir recetas)
    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(formulario);
        const datos = Object.fromEntries(formData.entries());
        
        // Si estamos en productos, empaquetar la receta
        if (seccionActiva === 'productos') {
            datos.receta = [];
            document.querySelectorAll('.filaReceta').forEach(fila => {
                const id_ingrediente = fila.querySelector('.receta_id_ingrediente').value;
                const cantidad_usada = fila.querySelector('.receta_cantidad').value;
                
                if (id_ingrediente && cantidad_usada) {
                    datos.receta.push({
                        id_ingrediente: parseInt(id_ingrediente),
                        cantidad_usada: parseFloat(cantidad_usada)
                    });
                }
            });
        }

        let url = `/api/${seccionActiva}`;
        let method = 'POST';

        if (modoFormulario === 'editar') {
            url += `/${itemSeleccionadoId}`;
            method = 'PUT';
        }

        try {
            const respuesta = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(datos)
            });

            if (!respuesta.ok) {
                const errorData = await respuesta.json();
                throw new Error(errorData.message || 'Error al guardar.');
            }

            modal.classList.add('oculto');
            cargarDatos(seccionActiva);

        } catch (error) {
            console.error('Error al guardar:', error);
            alert(`Error: ${error.message}`);
        }
    });

    // Cancelar modal
    botonCancelar.addEventListener('click', () => {
        modal.classList.add('oculto');
    });

    // --- BOTÓN SALIR ---
    botonSalir.addEventListener('click', async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
            localStorage.removeItem('authToken');
            window.location.href = '/index.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            window.location.href = '/index.html';
        }
    });
});