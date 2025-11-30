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
                    
                    let envasesEnteros = 0;
                    let totalNeto = '';

                    if(parseFloat(item.cantidad_por_unidad) > 0) {
                        envasesEnteros = Math.floor(parseFloat(item.cantidad_disponible) / parseFloat(item.cantidad_por_unidad));
                    }

                    totalNeto = `${parseFloat(item.cantidad_disponible).toFixed(2)} ${item.unidad_medida}`;
                    const stockVisual = item.cantidad_por_unidad > 1 
                        ? `${envasesEnteros} pzas cerradas` 
                        : `${parseFloat(item.cantidad_disponible).toFixed(0)} pzas`;

                    fila.dataset.ingredientesData = JSON.stringify(item);
                    
                    innerHTML = `
                        <td style="font-weight:500">${item.nombre_ing}</td>
                        <td>${item.unidad_medida}</td>
                        <td style="color:#555;">${totalNeto}</td>
                        <td style="font-weight:bold; color: var(--primaryblue);">${stockVisual}</td>`;
                }else if (seccion === 'empleados') {
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
                
                // === AQUÍ ESTÁ EL CAMBIO IMPORTANTE ===
                if (seccionActiva === 'pedidos_completados') {
                    cargarPedidosCompletados(); 
                } else if (seccionActiva === 'finanzas') {
                     // ¡ESTA LÍNEA ES LA QUE FALTABA!
                     cargarFinanzas(); 
                } else {
                     cargarDatos(seccionActiva);
                }
                // ======================================
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
                
                <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h3 style="margin:0; font-size:1.1em; color:var(--primaryblue);">Receta</h3>
                    <button type="button" class="boton" id="btnAnadirIngrediente" style="padding: 5px 10px; font-size: 0.85em;">+ Ingrediente</button>
                </div>

                <div id="contenedorReceta" style="max-height: 150px; overflow-y: auto; padding-right: 5px; margin-bottom: 15px; border: 1px solid #f0f0f0; border-radius: 5px; padding: 10px;"></div>
            `;

            const contenedorReceta = document.getElementById('contenedorReceta');
            
            // Preparamos las opciones una sola vez
            const opcionesSelect = ingredientesDisponibles.map(ing => 
                `<option value="${ing.id_ingrediente}">${ing.nombre_ing} (${ing.unidad_medida})</option>`
            ).join('');

            // Función para añadir una fila visualmente compacta
            const anadirFilaReceta = (ingredienteReceta = {}) => {
                const divFila = document.createElement('div');
                divFila.classList.add('filaReceta');
                
                // ESTILO FLEX PARA ALINEAR TODO EN UNA LÍNEA
                divFila.style.cssText = "display: flex; gap: 8px; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #f9f9f9;";

                divFila.innerHTML = `
                    <select class="receta_id_ingrediente" style="flex: 2; margin: 0; padding: 5px;" required>
                        <option value="">-- Seleccionar --</option>
                        ${opcionesSelect}
                    </select>
                    
                    <input type="number" class="receta_cantidad" placeholder="Cant." value="${ingredienteReceta.cantidad_usada || ''}" step="0.01" style="flex: 1; margin: 0; padding: 5px;" required>
                    
                    <button type="button" class="btnQuitarIngrediente" style="background: #e74c3c; color: white; border: none; width: 30px; height: 30px; border-radius: 5px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <ion-icon name="trash-outline" style="font-size: 1.2em; pointer-events: none;"></ion-icon>
                    </button>
                `;

                // Asignar valor si estamos editando
                if (ingredienteReceta.id_ingrediente) {
                    divFila.querySelector('.receta_id_ingrediente').value = ingredienteReceta.id_ingrediente;
                }

                // Evento para borrar la fila
                divFila.querySelector('.btnQuitarIngrediente').addEventListener('click', () => {
                    divFila.remove();
                });

                contenedorReceta.appendChild(divFila);
                
                // Auto-scroll al fondo al agregar
                contenedorReceta.scrollTop = contenedorReceta.scrollHeight;
            };

            document.getElementById('btnAnadirIngrediente').addEventListener('click', () => anadirFilaReceta());

            // Cargar datos existentes si es edición
            if (modoFormulario === 'editar' && datos.id_producto) {
                try {
                    const res = await fetch(`/api/recetas/${datos.id_producto}`, { credentials: 'include' });
                    if(res.ok) {
                        const recetaExistente = await res.json();
                        recetaExistente.forEach(item => anadirFilaReceta(item));
                    }
                } catch(e) { console.error(e); }
            } else {
                // Si es nuevo, agregamos una fila vacía por defecto
                anadirFilaReceta();
            }
        } else if (seccion === 'ingredientes') {
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

   // --- FUNCIÓN CORREGIDA Y COMPLETA ---
    async function mostrarDetallePedido(id) {
         const listaPrincipal = document.getElementById('listaPedidosCompletados');
         const panelDetalle = document.getElementById('detallePedidoCompletado');
         
         // 1. Cambiar visibilidad
         listaPrincipal.classList.add('oculto');
         panelDetalle.classList.remove('oculto');
         
         // Limpiar datos previos
         document.getElementById('detallePedidoTitulo').textContent = 'Cargando...';
         document.getElementById('detalleProductosLista').innerHTML = '';
         document.getElementById('detalleIngredientesLista').innerHTML = '';

         try {
            const res = await fetch(`/api/pedidos/completados/${id}`, {credentials: 'include'});
            
            if (!res.ok) throw new Error('Error al cargar detalle');

            const data = await res.json();

            // 2. Rellenar Información Encabezado
            document.getElementById('detallePedidoTitulo').textContent = `Detalle del Pedido: ${data.info.mesa}`;
            document.getElementById('detallePedidoTotal').innerHTML = `
                Total Cobrado: <b>$${parseFloat(data.info.total_calculado).toFixed(2)}</b><br>
                <small>Fecha: ${new Date(data.info.fecha_creacion).toLocaleString()}</small>
            `;

            // 3. Rellenar Lista de Productos
            const listaProd = document.getElementById('detalleProductosLista');
            if (data.productos.length === 0) {
                listaProd.innerHTML = '<li>Sin productos registrados</li>';
            } else {
                data.productos.forEach(prod => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span>${prod.cantidad}x ${prod.nombre}</span>
                        <span>$${prod.precio_en_pedido} c/u</span>
                    `;
                    listaProd.appendChild(li);
                });
            }

            // 4. Rellenar Lista de Ingredientes (Cálculo de Merma)
            const listaIng = document.getElementById('detalleIngredientesLista');
            if (data.ingredientes.length === 0) {
                listaIng.innerHTML = '<li style="color:#888">No se descontaron ingredientes (¿Sin receta?)</li>';
            } else {
                data.ingredientes.forEach(ing => {
                    const li = document.createElement('li');
                    // Estilo diferente para resaltar que es gasto de inventario
                    li.style.borderLeft = "3px solid #e74c3c"; 
                    li.style.backgroundColor = "#fff5f5";
                    li.innerHTML = `
                        <b>${ing.nombre}</b>
                        <span style="color:#c0392b">-${parseFloat(ing.total_gastado).toFixed(2)} ${ing.unidad_medida}</span>
                    `;
                    listaIng.appendChild(li);
                });
            }

         } catch(e) {
             console.error(e);
             alert('No se pudo cargar el detalle del pedido.');
             // Volver atrás si falla
             panelDetalle.classList.add('oculto');
             listaPrincipal.classList.remove('oculto');
         }
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
        
        // Payload para la App
        const dataApp = JSON.stringify({
            accion: 'cargar_menu',
            id_restaurante: 1,
            nombre: 'Restaurante YA'
        });

        // Usamos la librería QRious
        const qr = new QRious({
            element: canvas,
            value: dataApp,
            size: 500,
            background: 'white',
            foreground: 'black',
            level: 'H' // Alto nivel de corrección de errores
        });

        // Crear enlace de descarga
        const link = document.createElement('a');
        link.download = 'QR-Restaurante-General.png';
        link.href = canvas.toDataURL();
        link.click();
    });
    // ==========================================
    // === LÓGICA DE FINANZAS (NUEVO BLOQUE) ===
    // ==========================================
    
    const listaFinanzasDias = document.getElementById('listaFinanzasDias');
    const modalDetalleFinanzas = document.getElementById('modalDetalleFinanzas');
    const listaMovimientosDia = document.getElementById('listaMovimientosDia');
    const formEgresoRapido = document.getElementById('formEgresoRapido');
    const selectFechaA = document.getElementById('fechaA');
    const selectFechaB = document.getElementById('fechaB');
    const btnComparar = document.getElementById('btnComparar');
    const resComparacion = document.getElementById('resultadoComparacion');
    
    let nominaDiariaGlobal = 0;
    let datosFinanzasCache = []; // Para poder comparar sin recargar

    // 1. Cargar Datos Generales
    async function cargarFinanzas() {
        try {
            // A. Obtener Costo de Nómina Diaria
            const resNomina = await fetch('/api/finanzas/nomina-diaria', { credentials: 'include' });
            const dataNomina = await resNomina.json();
            nominaDiariaGlobal = parseFloat(dataNomina.nomina_diaria);

            // B. Obtener Resumen de Días
            const res = await fetch('/api/finanzas/resumen', { credentials: 'include' });
            const dias = await res.json();
            datosFinanzasCache = dias; // Guardar para comparador

            renderizarFinanzas(dias);
            llenarSelectoresComparacion(dias);

        } catch (error) {
            console.error('Error cargando finanzas:', error);
        }
    }

    // 2. Renderizar Tarjetas de Días
    function renderizarFinanzas(dias) {
        listaFinanzasDias.innerHTML = '';
        modalDetalleFinanzas.classList.add('oculto');
        listaFinanzasDias.classList.remove('oculto');

        if (dias.length === 0) {
            listaFinanzasDias.innerHTML = '<p>No hay registros financieros aún.</p>';
            return;
        }

        dias.forEach(dia => {
            const ingresos = parseFloat(dia.total_ingresos);
            const egresosManuales = parseFloat(dia.total_egresos);
            const numVentas = parseInt(dia.num_ventas);
            
            // Cálculo Clave: Egresos Totales = Manuales + Nómina Diaria
            const egresosTotales = egresosManuales + nominaDiariaGlobal;
            const utilidad = ingresos - egresosTotales;
            
            // Ticket Promedio
            const ticketPromedio = numVentas > 0 ? (ingresos / numVentas).toFixed(2) : '0.00';

            // Formato de Fecha Amigable
            const fechaObj = new Date(dia.fecha);
            const fechaStr = fechaObj.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

            // Crear Tarjeta
            const card = document.createElement('div');
            card.classList.add('pedido-item'); // Reusamos estilo
            
            // Color de borde según utilidad (Verde si gana, Rojo si pierde)
            card.style.borderLeft = utilidad >= 0 ? '5px solid #2ecc71' : '5px solid #e74c3c';

            card.innerHTML = `
                <h3 style="text-transform:capitalize;">${fechaStr}</h3>
                <div style="margin:15px 0;">
                    <div style="font-size:0.9em; color:#777;">Ingresos</div>
                    <div style="font-size:1.4em; font-weight:bold; color:#27ae60;">$${ingresos.toFixed(2)}</div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.85em; color:#555; border-top:1px solid #eee; padding-top:10px;">
                    <span>Ticket Prom: <b>$${ticketPromedio}</b></span>
                    <span>Utilidad: <b style="color:${utilidad >= 0 ? '#2980b9' : '#e74c3c'}">$${utilidad.toFixed(2)}</b></span>
                </div>
            `;
            
            card.onclick = () => verDetalleDia(dia.fecha, ingresos, egresosManuales, utilidad);
            listaFinanzasDias.appendChild(card);
        });
    }

    // 3. Ver Detalle (Modal)
    async function verDetalleDia(fechaRaw, ingresos, egresosManuales, utilidad) {
        listaFinanzasDias.classList.add('oculto');
        modalDetalleFinanzas.classList.remove('oculto');
        
        // Convertir fecha YYYY-MM-DDT... a YYYY-MM-DD para la API
        const fechaAPI = fechaRaw.split('T')[0]; 

        document.getElementById('tituloDetalleFinanzas').textContent = `Detalle del ${fechaAPI}`;
        document.getElementById('detIngresos').textContent = `$${ingresos.toFixed(2)}`;
        document.getElementById('detEgresos').textContent = `$${(egresosManuales + nominaDiariaGlobal).toFixed(2)}`;
        document.getElementById('detUtilidad').textContent = `$${utilidad.toFixed(2)}`;

        listaMovimientosDia.innerHTML = '<p>Cargando movimientos...</p>';

        try {
            const res = await fetch(`/api/finanzas/detalle/${fechaAPI}`, { credentials: 'include' });
            const movimientos = await res.json();
            
            listaMovimientosDia.innerHTML = '';
            
            // A. Insertar Nómina como primer gasto (Virtual)
            const liNomina = document.createElement('li');
            liNomina.style.borderLeft = '4px solid #e74c3c';
            liNomina.innerHTML = `<span>Nómina Diaria (Prorrateada)</span> <span style="color:#e74c3c;">-$${nominaDiariaGlobal.toFixed(2)}</span>`;
            listaMovimientosDia.appendChild(liNomina);

            // B. Listar Movimientos Reales
            movimientos.forEach(mov => {
                const li = document.createElement('li');
                const esIngreso = mov.tipo === 'ingreso';
                li.style.borderLeft = esIngreso ? '4px solid #2ecc71' : '4px solid #e74c3c';
                
                li.innerHTML = `
                    <span>${mov.descripcion}</span> 
                    <span style="color:${esIngreso ? '#27ae60' : '#e74c3c'}; font-weight:bold;">
                        ${esIngreso ? '+' : '-'}$${parseFloat(mov.monto).toFixed(2)}
                    </span>`;
                listaMovimientosDia.appendChild(li);
            });

        } catch (error) {
            console.error(error);
            listaMovimientosDia.innerHTML = '<p>Error cargando detalles.</p>';
        }
    }

    document.getElementById('btnCerrarFinanzas').addEventListener('click', () => {
        modalDetalleFinanzas.classList.add('oculto');
        listaFinanzasDias.classList.remove('oculto');
    });

    // 4. Registro de Gasto Manual
    formEgresoRapido.addEventListener('submit', async (e) => {
        e.preventDefault();
        const descripcion = document.getElementById('descEgreso').value;
        const monto = document.getElementById('montoEgreso').value;

        try {
            const res = await fetch('/api/finanzas/egreso', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
                body: JSON.stringify({ descripcion, monto })
            });
            if(res.ok) {
                formEgresoRapido.reset();
                alert('Gasto registrado');
                cargarFinanzas(); // Recargar para ver el impacto inmediato
            }
        } catch(e) { console.error(e); }
    });

    // 5. Lógica de Comparación
    function llenarSelectoresComparacion(dias) {
        const opts = dias.map(d => `<option value="${d.fecha}">${new Date(d.fecha).toLocaleDateString()}</option>`).join('');
        selectFechaA.innerHTML = opts;
        selectFechaB.innerHTML = opts;
    }

    btnComparar.addEventListener('click', () => {
        const fechaA = selectFechaA.value;
        const fechaB = selectFechaB.value;
        
        const diaA = datosFinanzasCache.find(d => d.fecha === fechaA);
        const diaB = datosFinanzasCache.find(d => d.fecha === fechaB);

        if(!diaA || !diaB) return;

        // Usamos la utilidad neta para comparar (Ingresos - Egresos - Nomina)
        const utilidadA = parseFloat(diaA.total_ingresos) - (parseFloat(diaA.total_egresos) + nominaDiariaGlobal);
        const utilidadB = parseFloat(diaB.total_ingresos) - (parseFloat(diaB.total_egresos) + nominaDiariaGlobal);

        let diffPorcentaje = 0;
        if (utilidadA !== 0) {
            diffPorcentaje = ((utilidadB - utilidadA) / Math.abs(utilidadA)) * 100;
        }

        const mejorPeor = diffPorcentaje > 0 ? 'MEJOR' : 'PEOR';
        const color = diffPorcentaje > 0 ? '#27ae60' : '#c0392b';
        const icono = diffPorcentaje > 0 ? '📈' : '📉';

        resComparacion.classList.remove('oculto');
        resComparacion.style.color = color;
        resComparacion.innerHTML = `
            ${icono} El día seleccionado (B) fue un 
            <span style="font-size:1.2em;">${Math.abs(diffPorcentaje).toFixed(1)}% ${mejorPeor}</span> 
            que el día base (A).
            <br><small style="color:#555; font-weight:normal;">(Comparando Utilidad Neta)</small>
        `;
    });

    async function cargarFinanzasDia(fecha = new Date().toISOString().split('T')[0]) {
        try {
            const res = await fetch(`/api/finanzas/dia?fecha=${fecha}`, { credentials: 'include' });
            if(!res.ok) throw new Error("Error cargando finanzas");
            
            const datos = await res.json();
            
            // Suma total de todos los tipos de egresos
            const totalGastos = parseFloat(datos.gastos_extra) + parseFloat(datos.gastos_fijos) + parseFloat(datos.sueldos);
            const balance = parseFloat(datos.ingresos) - totalGastos;
            
            const colorBalance = balance >= 0 ? '#27ae60' : '#e74c3c'; // Verde o Rojo

            const html = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 20px;">
                    <div class="pedido-item" style="border-left: 5px solid #27ae60; padding: 15px;">
                        <h4 style="margin:0 0 10px 0; color:#555;">Ingresos (Ventas)</h4>
                        <p style="font-size: 1.5em; font-weight:bold; margin:0; color:#27ae60;">$${datos.ingresos.toFixed(2)}</p>
                    </div>
                    
                    <div class="pedido-item" style="border-left: 5px solid #e74c3c; padding: 15px;">
                        <h4 style="margin:0 0 10px 0; color:#555;">Sueldos (Diario)</h4>
                        <p style="font-size: 1.2em; font-weight:bold; margin:0; color:#e74c3c;">$${datos.sueldos.toFixed(2)}</p>
                    </div>

                    <div class="pedido-item" style="border-left: 5px solid #e67e22; padding: 15px;">
                        <h4 style="margin:0 0 10px 0; color:#555;">Gastos Fijos (Renta..)</h4>
                        <p style="font-size: 1.2em; font-weight:bold; margin:0; color:#e67e22;">$${datos.gastos_fijos.toFixed(2)}</p>
                    </div>

                    <div class="pedido-item" style="border-left: 5px solid #f1c40f; padding: 15px;">
                        <h4 style="margin:0 0 10px 0; color:#555;">Gastos Extra (Hoy)</h4>
                        <p style="font-size: 1.2em; font-weight:bold; margin:0; color:#f39c12;">$${datos.gastos_extra.toFixed(2)}</p>
                    </div>
                </div>

                <div style="margin-top: 30px; text-align: center; padding: 20px; background: #fff; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <h3 style="margin:0; color: #333;">Balance Final del Día</h3>
                    <span style="font-size: 2.5em; font-weight:bold; color:${colorBalance};">$${balance.toFixed(2)}</span>
                </div>
            `;
            
            const contenedor = document.getElementById('detalleFinanzasDia');
            if(contenedor) contenedor.innerHTML = html;

        } catch (e) {
            console.error(e);
            document.getElementById('detalleFinanzasDia').innerHTML = '<p style="color:red; text-align:center;">Error al cargar datos financieros.</p>';
        }
    }

    // 2. Comparar Fechas (Lógica corregida: Utilidad Neta)
    async function compararFechas() {
        const fA = document.getElementById('fechaA').value;
        const fB = document.getElementById('fechaB').value;
        const resDiv = document.getElementById('resultadoComparacion');

        if(!fA || !fB) {
            alert("Por favor selecciona ambas fechas para comparar.");
            return;
        }

        resDiv.innerHTML = 'Calculando...';
        resDiv.classList.remove('oculto');

        try {
            // Obtenemos los datos completos de ambos días
            const [resA, resB] = await Promise.all([
                fetch(`/api/finanzas/dia?fecha=${fA}`, { credentials: 'include' }).then(r => r.json()),
                fetch(`/api/finanzas/dia?fecha=${fB}`, { credentials: 'include' }).then(r => r.json())
            ]);

            // Calculamos utilidad neta (Ingresos - Todos los gastos)
            const utilidadA = resA.ingresos - (resA.gastos_extra + resA.gastos_fijos + resA.sueldos);
            const utilidadB = resB.ingresos - (resB.gastos_extra + resB.gastos_fijos + resB.sueldos);

            // Diferencia Porcentual
            let diferencia = 0;
            let esMejor = false;

            // Evitar división por cero
            if (utilidadA !== 0) {
                diferencia = ((utilidadB - utilidadA) / Math.abs(utilidadA)) * 100;
            } else if (utilidadB > 0) {
                diferencia = 100; // De 0 a algo positivo es un aumento "infinito", lo topamos a 100% simbólico
            }

            esMejor = utilidadB > utilidadA;
            const colorDif = esMejor ? '#27ae60' : '#e74c3c';
            const icono = esMejor ? 'trending-up-outline' : 'trending-down-outline';
            const textoMejor = esMejor ? 'MEJOR' : 'PEOR';

            // Formatear fechas para mostrar bonito
            const fechaFormatA = new Date(fA).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
            const fechaFormatB = new Date(fB).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });

            resDiv.innerHTML = `
                <div style="background: #fff; padding: 20px; border-radius: 10px; border: 1px solid #eee; display: flex; align-items: center; justify-content: space-between;">
                    <div style="text-align: left;">
                        <div style="color: #777; font-size: 0.9em;">Comparando Utilidad Neta</div>
                        <div style="margin-top: 5px;">
                            ${fechaFormatA}: <b>$${utilidadA.toFixed(2)}</b>
                        </div>
                        <div>
                            ${fechaFormatB}: <b>$${utilidadB.toFixed(2)}</b>
                        </div>
                    </div>
                    
                    <div style="text-align: right;">
                        <div style="font-size: 1.5em; font-weight: bold; color: ${colorDif}; display: flex; align-items: center; gap: 5px;">
                            <ion-icon name="${icono}"></ion-icon> ${Math.abs(diferencia).toFixed(1)}%
                        </div>
                        <div style="color: ${colorDif}; font-weight: bold; font-size: 0.9em;">${textoMejor} QUE EL DÍA BASE</div>
                    </div>
                </div>
            `;

        } catch (e) {
            console.error(e);
            resDiv.innerHTML = 'Error al comparar datos.';
        }
    }

    // 3. Modal para Configurar Gastos DIARIOS (Prompt Simple)
    function mostrarModalConfiguracionDiaria() {
        // Usamos prompts nativos para no crear más HTML complejo, funcional y rápido
        const concepto = prompt("Nombre del gasto fijo diario (Ej: Renta diaria, Luz, Internet):");
        if(!concepto) return; // Cancelado
        
        const monto = prompt(`¿Cuánto se debe descontar DIARIO por "${concepto}"?`);
        if(!monto || isNaN(monto)) {
            alert("Monto inválido");
            return;
        }

        // Enviar al backend
        fetch('/api/finanzas/gastos-fijos', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            credentials: 'include',
            body: JSON.stringify({ concepto, monto: parseFloat(monto) })
        })
        .then(res => {
            if(res.ok) {
                alert("Gasto fijo configurado. Se aplicará en el reporte de todos los días.");
                // Recargar la vista actual para ver el impacto
                const hoy = new Date().toISOString().split('T')[0];
                cargarFinanzasDia(hoy);
            } else {
                alert("Error al guardar.");
            }
        })
        .catch(e => console.error(e));
    }
});
