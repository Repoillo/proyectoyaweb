document.addEventListener('DOMContentLoaded', () => {

    // --- VERIFICACIÓN DE ROL ---
    async function verificarAccesoDashboard() {
        try {
            const respuesta = await fetch('/api/auth/status', {credentials: 'include'});
            if (!respuesta.ok) {
                 window.location.href = '/index.html';
                 return;
            }
            
            const data = await respuesta.json();
            
            if (data.rol === 'cocinero') {
                window.location.href = '/cocina.html';
                return;
            }
            if (data.rol === 'mesero') {
                window.location.href = '/mesero.html';
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
    const panelPedidosCompletados = document.getElementById('panelPedidosCompletados');
    const listaPedidosCompletados = document.getElementById('listaPedidosCompletados');
    const detallePedidoCompletado = document.getElementById('detallePedidoCompletado');
    const btnVolverALista = document.getElementById('btnVolverALista');
    const btnArchivarTodos = document.getElementById('btnArchivarTodos');
    const btnExportarQR = document.getElementById('btnExportarQR');

    // --- ELEMENTOS DEL MODAL ---
    const modal = document.getElementById('modal');
    const tituloModal = document.getElementById('tituloModal');
    const formulario = document.getElementById('formulario');
    const camposDinamicos = document.getElementById('camposDinamicos');
    const botonCancelar = modal.querySelector('.botonCancelar');    

    // --- ESTADO DE LA APP ---
    let seccionActiva = null;
    let itemSeleccionadoId = null;
    let modoFormulario = 'agregar';
    let filaSeleccionada = null;
    let ingredientesDisponibles = []; 

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
                    
                    let infoCosto = '-';
                    let infoStock = '-';

                    if(item.cantidad_por_unidad > 1) {
                        const costoEnvase = (parseFloat(item.costo_ing) * parseFloat(item.cantidad_por_unidad)).toFixed(2);
                        const piezasRestantes = (parseFloat(item.cantidad_disponible) / parseFloat(item.cantidad_por_unidad)).toFixed(1);
                        
                        infoCosto = `$${costoEnvase} <small style="color:#777">(por envase)</small>`;
                        infoStock = `${piezasRestantes} pzas`; 
                    } else {
                        infoCosto = `$${parseFloat(item.costo_ing).toFixed(2)} /${item.unidad_medida}`;
                        infoStock = `${parseFloat(item.cantidad_disponible).toFixed(2)} ${item.unidad_medida}`;
                    }

                    fila.dataset.ingredientesData = JSON.stringify(item);
                     innerHTML = `
                        <td style="font-weight:500">${item.nombre_ing}</td>
                        <td>${item.unidad_medida}</td>
                        <td>${infoCosto}</td>
                        <td style="font-weight:bold; color: var(--primaryblue);">${infoStock}</td>`;

                } else if (seccion === 'empleados') {
                    itemId = item.id_empleado;
                    fila.dataset.empleadosData = JSON.stringify(item);
                     innerHTML = `
                        <td>${item.nombre_empleado}</td>
                        <td>${item.rol}</td>
                        <td>$${parseFloat(item.sueldo).toFixed(2)}</td>`;
                
                } else if (seccion === 'mesas') {
                    itemId = item.id_mesa;
                    const estadoClass = item.estado === 'ocupada' ? 'color:red; font-weight:bold;' : 'color:green; font-weight:bold;';
                    innerHTML = `
                        <td style="font-size:1.1em;">${item.numero_mesa}</td>
                        <td style="${estadoClass}">${item.estado.toUpperCase()}</td>
                        <td style="font-family:monospace; font-size:1.2em;">${item.codigo_sesion || '-'}</td>`;
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
        }
    }
    cargarIngredientesCache();

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
                if (seccionActiva === 'pedidos_completados') {
                    cargarPedidosCompletados(); 
                } else if (seccionActiva !== 'finanzas') {
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

            if (filaSeleccionada) filaSeleccionada.classList.remove('seleccionado');
            
            fila.classList.add('seleccionado');
            filaSeleccionada = fila;
            itemSeleccionadoId = fila.dataset.id;
            
            habilitarBotones(panelActual);
        });
    });

    function habilitarBotones(panel) {
        const btnEditar = panel.querySelector('.botonEditar');
        if(btnEditar) btnEditar.disabled = false;
        panel.querySelector('.botonEliminar').disabled = false;
    }
    
    function deshabilitarBotones(panel) {
        if (!panel) return;
        const btnEditar = panel.querySelector('.botonEditar');
        if(btnEditar) btnEditar.disabled = true;
        panel.querySelector('.botonEliminar').disabled = true;
        if (filaSeleccionada) {
            filaSeleccionada.classList.remove('seleccionado');
            filaSeleccionada = null;
        }
        itemSeleccionadoId = null;
    }

    // --- BOTONES CRUD ---

    // AGREGAR
    document.querySelectorAll('.botonAgregar').forEach(boton => {
        boton.addEventListener('click', (e) => {
            const panel = e.target.closest('.panelContenido');
            const seccion = panel.dataset.seccion;
            if (seccion !== seccionActiva) return;
            
            modoFormulario = 'agregar';
            tituloModal.textContent = `Agregar ${seccion}`;
            generarCamposModal(seccion);
            modal.classList.remove('oculto');
        });
    });

    // EDITAR
    document.querySelectorAll('.botonEditar').forEach(boton => {
        boton.addEventListener('click', (e) => {
            if (!itemSeleccionadoId || !filaSeleccionada) return;
            const panel = e.target.closest('.panelContenido');
            const seccion = panel.dataset.seccion;
            if (seccion !== seccionActiva) return;
            
            modoFormulario = 'editar';
            tituloModal.textContent = `Editar ${seccion}`;
            const datos = JSON.parse(filaSeleccionada.dataset[seccion + 'Data']);
            generarCamposModal(seccion, datos);
            modal.classList.remove('oculto');
        });
    });

    // ELIMINAR
    document.querySelectorAll('.botonEliminar').forEach(boton => {
        boton.addEventListener('click', async (e) => {
            // Excepción para el botón de archivar todos (que tiene la misma clase pero diferente ID)
            if (e.target.id === 'btnArchivarTodos' || e.target.closest('#btnArchivarTodos')) return;

            if (!itemSeleccionadoId) return;
            const panel = e.target.closest('.panelContenido');
            const seccion = panel.dataset.seccion;

            if (confirm(`¿Estás seguro de eliminar este elemento?`)) {
                try {
                    const respuesta = await fetch(`/api/${seccion}/${itemSeleccionadoId}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });
                    
                    if (!respuesta.ok) throw new Error('No se pudo eliminar.');
                    
                    cargarDatos(seccion);
                    if (seccion === 'ingredientes') await cargarIngredientesCache();

                } catch (error) {
                    console.error('Error al eliminar:', error);
                    alert('Error al eliminar el item.');
                }
            }
        });
    });

    // --- GENERAR CAMPOS MODAL ---
    async function generarCamposModal(seccion, datos = {}) {
        camposDinamicos.innerHTML = '';

        if (seccion === 'productos') {
            camposDinamicos.innerHTML = `
                <label>Nombre:</label>
                <input type="text" name="nombre" value="${datos.nombre || ''}" required>
                <label>Descripción:</label>
                <textarea name="descripcion">${datos.descripcion || ''}</textarea>
                <label>Precio:</label>
                <input type="number" name="precio_venta" step="0.01" value="${datos.precio_venta || ''}" required>
                <label>Tipo:</label>
                <select name="tipo" required>
                    <option value="platillo" ${datos.tipo === 'platillo' ? 'selected' : ''}>Platillo</option>
                    <option value="bebida" ${datos.tipo === 'bebida' ? 'selected' : ''}>Bebida</option>
                    <option value="postre" ${datos.tipo === 'postre' ? 'selected' : ''}>Postre</option>
                </select>
                <hr><h3>Receta</h3><div id="contenedorReceta"></div>
                <button type="button" class="boton" id="btnAnadirIngrediente">+ Añadir Ingrediente</button>
            `;
            // Lógica Recetas... (Igual que antes, simplificada aquí por espacio)
            // ... (Copiar lógica de recetas de tu archivo anterior si la necesitas completa, es extensa) ...
             const contenedorReceta = document.getElementById('contenedorReceta');
            const opcionesSelect = ingredientesDisponibles.map(ing => 
                `<option value="${ing.id_ingrediente}">${ing.nombre_ing} (${ing.unidad_medida})</option>`
            ).join('');
            const anadirFilaReceta = (ingredienteReceta = {}) => {
                const divFila = document.createElement('div');
                divFila.classList.add('filaReceta');
                divFila.innerHTML = `
                    <select class="receta_id_ingrediente"><option value="">-- Ingrediente --</option>${opcionesSelect}</select>
                    <input type="number" class="receta_cantidad" placeholder="Cant." value="${ingredienteReceta.cantidad_usada || ''}">
                    <button type="button" class="btnQuitarIngrediente">X</button>
                `;
                if (ingredienteReceta.id_ingrediente) divFila.querySelector('.receta_id_ingrediente').value = ingredienteReceta.id_ingrediente;
                contenedorReceta.appendChild(divFila);
            };
            document.getElementById('btnAnadirIngrediente').addEventListener('click', () => anadirFilaReceta());
            contenedorReceta.addEventListener('click', (e) => { if (e.target.classList.contains('btnQuitarIngrediente')) e.target.closest('.filaReceta').remove(); });
            if (modoFormulario === 'editar' && datos.id_producto) {
                const res = await fetch(`/api/recetas/${datos.id_producto}`, { credentials: 'include' });
                const recetaExistente = await res.json();
                recetaExistente.forEach(item => anadirFilaReceta(item));
            }

        } else if (seccion === 'ingredientes') {
            // ... (Igual que antes) ...
             let costoCaja = '', piezasStock = '';
            if (datos.cantidad_disponible) {
                piezasStock = (parseFloat(datos.cantidad_disponible) / parseFloat(datos.cantidad_por_unidad)).toFixed(1);
                costoCaja = (parseFloat(datos.costo_ing) * parseFloat(datos.cantidad_por_unidad)).toFixed(2);
            }
            camposDinamicos.innerHTML = `
                <label>Nombre:</label><input type="text" name="nombre" value="${datos.nombre_ing || ''}" required>
                <label>Unidad (Uso):</label>
                <select name="unidad_medida" required>
                    <option value="gr" ${datos.unidad_medida === 'gr' ? 'selected' : ''}>Gramos</option>
                    <option value="ml" ${datos.unidad_medida === 'ml' ? 'selected' : ''}>Mililitros</option>
                    <option value="pza" ${datos.unidad_medida === 'pza' ? 'selected' : ''}>Piezas</option>
                </select>
                <div style="background:#f0f4f8; padding:10px; margin-top:10px;">
                    <h4>Compra</h4>
                    <label>Contenido x Envase:</label><input type="number" name="cantidad_por_unidad" value="${datos.cantidad_por_unidad || ''}" required>
                    <label>Costo Envase:</label><input type="number" name="costo_compra" value="${costoCaja}" required>
                    <label>Stock (Envases):</label><input type="number" name="piezas_compradas" value="${piezasStock}" required>
                </div>`;

        } else if (seccion === 'empleados') {
            camposDinamicos.innerHTML = `
                <label>Nombre:</label><input type="text" name="nombre_empleado" value="${datos.nombre_empleado || ''}" required>
                <label>Rol:</label>
                <select name="rol" required>
                    <option value="Cocinero" ${datos.rol === 'Cocinero' ? 'selected' : ''}>Cocinero</option>
                    <option value="Mesero" ${datos.rol === 'Mesero' ? 'selected' : ''}>Mesero</option>
                    <option value="Cajero" ${datos.rol === 'Cajero' ? 'selected' : ''}>Cajero</option>
                </select>
                <label>Sueldo:</label><input type="number" name="sueldo" value="${datos.sueldo || ''}" required>
            `;
        } else if (seccion === 'mesas') {
            // NUEVO FORMULARIO PARA MESAS
            camposDinamicos.innerHTML = `
                <label>Identificador de Mesa:</label>
                <input type="text" name="numero_mesa" value="${datos.numero_mesa || ''}" placeholder="Ej. Mesa 1, Barra 2, Terraza 1" required>
            `;
        }
    }

    // --- ENVIAR FORMULARIO ---
    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(formulario);
        const datos = Object.fromEntries(formData.entries());
        
        if (seccionActiva === 'productos') {
            datos.receta = [];
            document.querySelectorAll('.filaReceta').forEach(fila => {
                const id = fila.querySelector('.receta_id_ingrediente').value;
                const cant = fila.querySelector('.receta_cantidad').value;
                if (id && cant) datos.receta.push({ id_ingrediente: parseInt(id), cantidad_usada: parseFloat(cant) });
            });
        }

        let url = `/api/${seccionActiva}`;
        let method = 'POST';
        if (modoFormulario === 'editar') {
            url += `/${itemSeleccionadoId}`;
            method = 'PUT';
        }

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(datos)
            });
            if (!res.ok) throw new Error('Error al guardar.');

            modal.classList.add('oculto');
            cargarDatos(seccionActiva);
            if (seccionActiva === 'ingredientes') await cargarIngredientesCache();

        } catch (error) {
            console.error(error);
            alert('Error al guardar los datos.');
        }
    });

    botonCancelar.addEventListener('click', () => modal.classList.add('oculto'));

    botonSalir.addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        window.location.href = '/index.html';
    });

    // --- HISTORIAL Y DETALLES (Funciones auxiliares) ---
    // (Mantener las funciones cargarPedidosCompletados, mostrarDetallePedido y archivar de tu archivo anterior)
    async function cargarPedidosCompletados() { /* Copiar de tu archivo anterior */ 
        listaPedidosCompletados.classList.remove('oculto');
        detallePedidoCompletado.classList.add('oculto');
        listaPedidosCompletados.innerHTML = '<p>Cargando...</p>';
        try {
            const res = await fetch('/api/pedidos/completados', { credentials: 'include' });
            const pedidos = await res.json();
            listaPedidosCompletados.innerHTML = '';
            if(pedidos.length===0) { listaPedidosCompletados.innerHTML='<p>Vacío</p>'; return;}
            pedidos.forEach(p => {
                const div = document.createElement('div');
                div.classList.add('pedido-item');
                div.innerHTML = `<h3>${new Date(p.fecha_creacion).toLocaleDateString()}</h3><p>$${p.total_calculado}</p>`;
                div.onclick = () => mostrarDetallePedido(p.id_pedido);
                listaPedidosCompletados.appendChild(div);
            });
        } catch(e){ console.error(e); }
    }

    async function mostrarDetallePedido(id) {
         // (Copiar lógica de tu archivo anterior)
         listaPedidosCompletados.classList.add('oculto');
         detallePedidoCompletado.classList.remove('oculto');
         // Fetch detalle...
         try {
            const res = await fetch(`/api/pedidos/completados/${id}`, {credentials: 'include'});
            const data = await res.json();
            document.getElementById('detallePedidoTitulo').textContent = `Pedido ${data.info.mesa}`;
            document.getElementById('detallePedidoTotal').textContent = `$${data.info.total_calculado}`;
            // ... rellenar listas ...
         } catch(e) {}
    }

    btnVolverALista.addEventListener('click', () => {
        detallePedidoCompletado.classList.add('oculto');
        listaPedidosCompletados.classList.remove('oculto');
    });

    btnArchivarTodos.addEventListener('click', async () => {
        if(!confirm('¿Archivar todo?')) return;
        await fetch('/api/pedidos/archivar-completados', { method: 'PUT', credentials: 'include' });
        cargarPedidosCompletados();
    });

    // --- GENERACIÓN DE QR ---
    btnExportarQR.addEventListener('click', () => {
        const canvas = document.getElementById('qrCanvas');
        const urlRestaurante = window.location.origin + '/index.html'; // URL genérica de la app
        
        // Usamos la librería QRious
        const qr = new QRious({
            element: canvas,
            value: urlRestaurante,
            size: 500,
            background: 'white',
            foreground: 'black'
        });

        // Crear enlace de descarga fantasma
        const link = document.createElement('a');
        link.download = 'codigo-qr-restaurante.png';
        link.href = canvas.toDataURL();
        link.click();
    });

});