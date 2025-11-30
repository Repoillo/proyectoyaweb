document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Iniciando Sistema de Restaurante vFinal...");

    // ==========================================
    // 1. VERIFICACIÓN DE SEGURIDAD Y ROL
    // ==========================================
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
            
            console.log('✅ Sesión de dueño activa verificada.');
            
        } catch (error) {
            console.error('Error verificando sesión en dashboard:', error);
             window.location.href = '/index.html';
        }
    }
    verificarAccesoDashboard();

    // ==========================================
    // 2. REFERENCIAS DOM (GLOBALES)
    // ==========================================
    const getEl = (id) => document.getElementById(id);

    // Navegación
    const enlacesMenu = document.querySelectorAll('.menu a');
    const paneles = document.querySelectorAll('.panelContenido');
    const panelBienvenida = getEl('panelBienvenida');
    const botonSalir = document.querySelector('.botonSalir');

    // Módulos Específicos
    const panelPedidosCompletados = getEl('panelPedidosCompletados');
    const listaPedidosCompletados = getEl('listaPedidosCompletados');
    const detallePedidoCompletado = getEl('detallePedidoCompletado');
    const btnVolverALista = getEl('btnVolverALista');
    const btnArchivarTodos = getEl('btnArchivarTodos');
    const btnExportarQR = getEl('btnExportarQR');

    // Finanzas DOM
    const listaFinanzasDias = getEl('listaFinanzasDias');
    const modalDetalleFinanzas = getEl('modalDetalleFinanzas');
    const btnRegistrarGastoExtra = getEl('btnRegistrarGastoExtra');
    const btnConfigurarGastosFijos = getEl('btnConfigurarGastosFijos');
    const btnEjecutarComparacion = getEl('btnEjecutarComparacion');
    const btnCerrarFinanzas = getEl('btnCerrarFinanzas');
    const modalGastoExtra = getEl('modalGastoExtra');
    const formEgresoRapido = getEl('formEgresoRapido');
    const btnCancelarGasto = getEl('btnCancelarGasto');

    // Modal CRUD Principal
    const modal = getEl('modal');
    const tituloModal = getEl('tituloModal');
    const formulario = getEl('formulario');
    const camposDinamicos = getEl('camposDinamicos');
    const botonCancelar = modal ? modal.querySelector('.botonCancelar') : null;    

    // --- ESTADO DE LA APLICACIÓN ---
    let seccionActiva = null;
    let itemSeleccionadoId = null;
    let modoFormulario = 'agregar';
    let filaSeleccionada = null;
    let ingredientesDisponibles = []; 
    let nominaDiariaGlobal = 0;
    let datosFinanzasCache = [];

    // Validar integridad del HTML
    if(!modal) console.error("⚠️ FALTAL: No se encontró el #modal en el HTML.");
    if(!formulario) console.error("⚠️ FATAL: No se encontró el #formulario en el HTML.");

    // ==========================================
    // 3. CACHÉ DE INGREDIENTES (Para Recetas)
    // ==========================================
    async function cargarIngredientesCache() {
        try {
            const respuesta = await fetch('/api/ingredientes', { credentials: 'include' });
            if (!respuesta.ok) throw new Error('No se pudieron cargar ingredientes');
            ingredientesDisponibles = await respuesta.json();
            console.log(`📦 ${ingredientesDisponibles.length} ingredientes cargados en caché.`);
        } catch (error) {
            console.error(error);
        }
    }
    cargarIngredientesCache();

    // ==========================================
    // 4. LÓGICA DE NAVEGACIÓN (MENÚ)
    // ==========================================
    enlacesMenu.forEach(enlace => {
        enlace.addEventListener('click', (evento) => {
            evento.preventDefault();
            seccionActiva = enlace.dataset.seccion;
            const targetId = enlace.dataset.target;
            
            // 1. Limpieza de UI
            itemSeleccionadoId = null;
            filaSeleccionada = null;
            enlacesMenu.forEach(link => link.classList.remove('activo'));
            enlace.classList.add('activo');
            
            // 2. Ocultar todos los paneles
            if(panelBienvenida) panelBienvenida.classList.add('oculto');
            paneles.forEach(panel => panel.classList.add('oculto'));
            
            // 3. Mostrar panel objetivo
            const panelAMostrar = getEl(targetId);
            if (panelAMostrar) {
                panelAMostrar.classList.remove('oculto');
                
                // 4. Cargar datos específicos según la sección
                console.log(`Navegando a sección: ${seccionActiva}`);
                if (seccionActiva === 'pedidos_completados') {
                    cargarPedidosCompletados(); 
                } else if (seccionActiva === 'finanzas') {
                     cargarFinanzas(); 
                } else {
                     // Productos, Ingredientes, Empleados, Mesas
                     cargarDatos(seccionActiva);
                }
            } else {
                console.error(`No se encontró el panel con ID: ${targetId}`);
            }
        });
    });

    // ==========================================
    // 5. FUNCIÓN GENÉRICA PARA CARGAR DATOS (CRUD)
    // ==========================================
    async function cargarDatos(seccion) {
        const panel = document.querySelector(`.panelContenido[data-seccion="${seccion}"]`);
        if(!panel) return;
        const cuerpoTabla = panel.querySelector('tbody');
        if(!cuerpoTabla) return; // Finanzas no tiene tabla tbody

        cuerpoTabla.innerHTML = '<tr><td colspan="5" style="text-align:center;">Cargando datos...</td></tr>';
        deshabilitarBotones(panel);

        try {
            const respuesta = await fetch(`/api/${seccion}`, { credentials: 'include' });
            if (respuesta.status === 401) return window.location.href = '/index.html';
            if (!respuesta.ok) throw new Error('Error en la API');

            const datos = await respuesta.json();
            cuerpoTabla.innerHTML = '';

            // Actualizar caché si estamos en ingredientes
            if(seccion === 'ingredientes') ingredientesDisponibles = datos;

            datos.forEach(item => {
                const fila = document.createElement('tr');
                let itemId, innerHTML;

                // --- RENDERIZADO POR TIPO ---
                if (seccion === 'productos') {
                    itemId = item.id_producto;
                    fila.dataset.productosData = JSON.stringify(item); // Guardamos TODO el objeto para editar
                    innerHTML = `
                        <td>${item.nombre}</td>
                        <td>${item.tipo}</td>
                        <td>${item.descripcion || '-'}</td>
                        <td>$${parseFloat(item.precio_venta).toFixed(2)}</td>`;

                } else if (seccion === 'ingredientes') {
                    itemId = item.id_ing;
                    
                    let envasesEnteros = 0;
                    let totalNeto = `${parseFloat(item.cantidad_disponible).toFixed(2)} ${item.unidad_medida}`;
                    
                    if(parseFloat(item.cantidad_por_unidad) > 0) {
                        envasesEnteros = Math.floor(parseFloat(item.cantidad_disponible) / parseFloat(item.cantidad_por_unidad));
                    }

                    const stockVisual = item.cantidad_por_unidad > 1 
                        ? `${envasesEnteros} pzas cerradas` 
                        : `${parseFloat(item.cantidad_disponible).toFixed(0)} pzas`;

                    fila.dataset.ingredientesData = JSON.stringify(item);
                    
                    innerHTML = `
                        <td style="font-weight:500">${item.nombre_ing}</td>
                        <td>${item.unidad_medida}</td>
                        <td style="color:#555;">${totalNeto}</td>
                        <td style="font-weight:bold; color: var(--primaryblue);">${stockVisual}</td>`;

                } else if (seccion === 'empleados') {
                    itemId = item.id_empleado;
                    fila.dataset.empleadosData = JSON.stringify(item);
                     innerHTML = `
                        <td>${item.nombre_empleado}</td>
                        <td>${item.rol}</td>
                        <td>$${parseFloat(item.sueldo).toFixed(2)}</td>`;
                
                } else if (seccion === 'mesas') {
                    itemId = item.id_mesa;
                    fila.dataset.mesasData = JSON.stringify(item); // Importante guardar data
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

        } catch (error) {
            console.error(`Error cargando ${seccion}:`, error);
            cuerpoTabla.innerHTML = `<tr><td colspan="5" style="color:red;">Error cargando datos.</td></tr>`;
        }
    }

    // ==========================================
    // 6. INTERACCIÓN CON TABLAS (SELECCIÓN)
    // ==========================================
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

    // ==========================================
    // 7. BOTONES CRUD (AGREGAR, EDITAR, ELIMINAR)
    // ==========================================

    // AGREGAR
    document.querySelectorAll('.botonAgregar').forEach(boton => {
        boton.addEventListener('click', (e) => {
            const panel = e.target.closest('.panelContenido');
            const seccion = panel.dataset.seccion;
            if (seccion !== seccionActiva) return;
            
            modoFormulario = 'agregar';
            tituloModal.textContent = `Agregar ${seccion}`;
            
            // RESETEAR FORMULARIO (Si existe)
            if(formulario) formulario.reset();

            generarCamposModal(seccion);
            if(modal) modal.classList.remove('oculto');
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
            
            // Recuperar datos del dataset
            const datos = JSON.parse(filaSeleccionada.dataset[seccion + 'Data']);
            generarCamposModal(seccion, datos);
            if(modal) modal.classList.remove('oculto');
        });
    });

    // ELIMINAR
    document.querySelectorAll('.botonEliminar').forEach(boton => {
        boton.addEventListener('click', async (e) => {
            // Excepción para Historial
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
                    alert('Error al eliminar. Puede tener dependencias.');
                }
            }
        });
    });

    // ==========================================
    // 8. GENERACIÓN DINÁMICA DE FORMULARIOS
    // ==========================================
    async function generarCamposModal(seccion, datos = {}) {
        if(!camposDinamicos) return;
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

            const contenedorReceta = getEl('contenedorReceta');
            const opcionesSelect = ingredientesDisponibles.map(ing => 
                `<option value="${ing.id_ingrediente}">${ing.nombre_ing} (${ing.unidad_medida})</option>`
            ).join('');

            // Función interna para añadir fila de receta
            const anadirFilaReceta = (ingredienteReceta = {}) => {
                const divFila = document.createElement('div');
                divFila.classList.add('filaReceta');
                divFila.style.cssText = "display: flex; gap: 8px; align-items: center; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #f9f9f9;";

                divFila.innerHTML = `
                    <select class="receta_id_ingrediente" style="flex: 2; margin: 0; padding: 5px;" required>
                        <option value="">-- Seleccionar --</option>
                        ${opcionesSelect}
                    </select>
                    <input type="number" class="receta_cantidad" placeholder="Cant." value="${ingredienteReceta.cantidad_usada || ''}" step="0.01" style="flex: 1; margin: 0; padding: 5px;" required>
                    <button type="button" class="btnQuitarIngrediente" style="background: #e74c3c; color: white; border: none; width: 30px; height: 30px; border-radius: 5px;">X</button>
                `;

                if (ingredienteReceta.id_ingrediente) {
                    divFila.querySelector('.receta_id_ingrediente').value = ingredienteReceta.id_ingrediente;
                }

                divFila.querySelector('.btnQuitarIngrediente').addEventListener('click', () => divFila.remove());
                contenedorReceta.appendChild(divFila);
                contenedorReceta.scrollTop = contenedorReceta.scrollHeight;
            };

            getEl('btnAnadirIngrediente').addEventListener('click', () => anadirFilaReceta());

            // Cargar receta existente si editamos
            if (modoFormulario === 'editar' && datos.id_producto) {
                try {
                    const res = await fetch(`/api/recetas/${datos.id_producto}`, { credentials: 'include' });
                    if(res.ok) {
                        const recetaExistente = await res.json();
                        recetaExistente.forEach(item => anadirFilaReceta(item));
                    }
                } catch(e) { console.error(e); }
            } else {
                anadirFilaReceta(); // Una fila vacía por defecto
            }

        } else if (seccion === 'ingredientes') {
             let costoCaja = '', piezasStock = '';
             // Lógica para mostrar datos calculados
            if (datos.cantidad_disponible) {
                piezasStock = (parseFloat(datos.cantidad_disponible) / parseFloat(datos.cantidad_por_unidad || 1)).toFixed(1);
                costoCaja = (parseFloat(datos.costo_ing) * parseFloat(datos.cantidad_por_unidad || 1)).toFixed(2);
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
                    <h4>Datos de Compra</h4>
                    <label>Contenido x Envase:</label><input type="number" name="cantidad_por_unidad" value="${datos.cantidad_por_unidad || 1}" required>
                    <label>Costo Envase (Referencia):</label><input type="number" name="costo_compra" value="${costoCaja}" placeholder="Opcional">
                    <label>Stock Total (Unidades Sueltas):</label><input type="number" name="cantidad_disponible" value="${datos.cantidad_disponible || 0}" required>
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
                <label>Sueldo Diario:</label><input type="number" name="sueldo" value="${datos.sueldo || ''}" required>
            `;
        } else if (seccion === 'mesas') {
            camposDinamicos.innerHTML = `
                <label>Identificador de Mesa:</label>
                <input type="text" name="numero_mesa" value="${datos.numero_mesa || ''}" placeholder="Ej. Mesa 1, Barra 2" required>
            `;
        }
    }

    // ==========================================
    // 9. ENVÍO DE FORMULARIO (POST/PUT)
    // ==========================================
    if(formulario) formulario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(formulario);
        const datos = Object.fromEntries(formData.entries());
        
        // Procesar receta si es producto
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
            alert('Error al guardar los datos (Ver consola).');
        }
    });

    if(botonCancelar) botonCancelar.addEventListener('click', () => modal.classList.add('oculto'));

    // ==========================================
    // 10. MÓDULO DE FINANZAS (COMPLETO)
    // ==========================================
    async function cargarFinanzas() {
        if(!listaFinanzasDias) return;
        listaFinanzasDias.innerHTML = '<p style="text-align:center;">Analizando ingresos y egresos...</p>';
        
        try {
            // A. Obtener Costo de Nómina Diaria
            const resNomina = await fetch('/api/finanzas/nomina-diaria', { credentials: 'include' });
            if(resNomina.ok) {
                const dataNomina = await resNomina.json();
                nominaDiariaGlobal = parseFloat(dataNomina.nomina_diaria) || 0;
            }

            // B. Obtener Resumen de Días
            const res = await fetch('/api/finanzas/resumen', { credentials: 'include' });
            if(!res.ok) throw new Error("Error obteniendo resumen financiero");
            
            const dias = await res.json();
            // Ordenar por fecha descendente
            datosFinanzasCache = dias.sort((a,b) => new Date(b.fecha) - new Date(a.fecha));

            renderizarFinanzas(datosFinanzasCache);
            llenarSelectoresComparacion(datosFinanzasCache);

        } catch (error) {
            console.error('Error cargando finanzas:', error);
            listaFinanzasDias.innerHTML = '<p style="color:red; text-align:center;">Error de conexión.</p>';
        }
    }

    function renderizarFinanzas(dias) {
        listaFinanzasDias.innerHTML = '';
        if (dias.length === 0) {
            listaFinanzasDias.innerHTML = '<p style="text-align:center;">No hay registros financieros aún.</p>';
            return;
        }

        dias.forEach(dia => {
            const ingresos = parseFloat(dia.total_ingresos);
            const egresosManuales = parseFloat(dia.total_egresos);
            const numVentas = parseInt(dia.num_ventas);
            
            // Egresos Totales = Manuales + Nómina Diaria
            const egresosTotales = egresosManuales + nominaDiariaGlobal;
            const utilidad = ingresos - egresosTotales;
            
            // Fecha Amigable
            const fechaStr = new Date(dia.fecha).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

            const card = document.createElement('div');
            card.classList.add('pedido-item'); 
            card.style.borderLeft = utilidad >= 0 ? '5px solid #2ecc71' : '5px solid #e74c3c';
            card.style.cursor = 'pointer';

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; text-transform:capitalize;">${fechaStr}</h3>
                    <span style="font-size:0.8em; color:#777;">${numVentas} ventas</span>
                </div>
                <div style="margin:15px 0; text-align:center;">
                    <div style="font-size:2em; font-weight:bold; color:${utilidad >= 0 ? '#27ae60' : '#e74c3c'}">
                        $${utilidad.toFixed(2)}
                    </div>
                    <small style="color:#aaa;">Utilidad Neta</small>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.85em; color:#555; border-top:1px solid #eee; padding-top:10px;">
                    <span style="color:#27ae60">Ing: $${ingresos.toFixed(0)}</span>
                    <span style="color:#e74c3c">Egr: $${egresosTotales.toFixed(0)}</span>
                </div>
            `;
            
            card.onclick = () => verDetalleDia(dia.fecha, ingresos, egresosManuales, utilidad);
            listaFinanzasDias.appendChild(card);
        });
    }

    // Llenar selects para comparar SOLO fechas existentes
    function llenarSelectoresComparacion(dias) {
        const selA = getEl('fechaA');
        const selB = getEl('fechaB');
        if(!selA || !selB) return; // Si son inputs date nativos, esto fallará gracefully

        // Si son <select>, los llenamos. Si son <input type="date">, el usuario elige manualmente.
        // Asumiendo que pueden ser selects por la petición anterior:
        if(selA.tagName === 'SELECT') {
            const opts = dias.map(d => {
                const f = d.fecha.split('T')[0];
                return `<option value="${f}">${f}</option>`;
            }).join('');
            selA.innerHTML = '<option value="">-- Seleccionar --</option>' + opts;
            selB.innerHTML = '<option value="">-- Seleccionar --</option>' + opts;
        }
    }

    // Ver Detalle Día (Modal)
    async function verDetalleDia(fechaRaw, ingresos, egresosManuales, utilidad) {
        if(!modalDetalleFinanzas) return;
        listaFinanzasDias.classList.add('oculto');
        modalDetalleFinanzas.classList.remove('oculto');
        
        const fechaAPI = fechaRaw.split('T')[0]; 

        getEl('tituloDetalleFinanzas').textContent = `Corte del ${fechaAPI}`;
        getEl('detIngresos').textContent = `$${ingresos.toFixed(2)}`;
        getEl('detEgresos').textContent = `$${(egresosManuales + nominaDiariaGlobal).toFixed(2)}`;
        getEl('detUtilidad').textContent = `$${utilidad.toFixed(2)}`;

        const listaMov = getEl('listaMovimientosDia');
        listaMov.innerHTML = '<p>Cargando detalles...</p>';

        try {
            const res = await fetch(`/api/finanzas/detalle/${fechaAPI}`, { credentials: 'include' });
            const movimientos = await res.json();
            
            listaMov.innerHTML = '';
            
            // 1. Mostrar Nómina Prorrateada
            if(nominaDiariaGlobal > 0) {
                const liNomina = document.createElement('li');
                liNomina.style.borderLeft = '4px solid #e74c3c';
                liNomina.style.backgroundColor = '#fff5f5';
                liNomina.style.padding = '10px';
                liNomina.style.marginBottom = '5px';
                liNomina.innerHTML = `<div style="display:flex; justify-content:space-between;"><span>Nómina/Fijos (Auto)</span> <span style="color:#e74c3c; font-weight:bold;">-$${nominaDiariaGlobal.toFixed(2)}</span></div>`;
                listaMov.appendChild(liNomina);
            }

            // 2. Mostrar Movimientos
            if(movimientos.length === 0 && nominaDiariaGlobal === 0) {
                listaMov.innerHTML = '<p>Sin movimientos registrados.</p>';
            } else {
                movimientos.forEach(mov => {
                    const li = document.createElement('li');
                    const esIngreso = mov.tipo === 'ingreso';
                    li.style.borderLeft = esIngreso ? '4px solid #2ecc71' : '4px solid #e74c3c';
                    li.style.padding = '10px';
                    li.style.backgroundColor = '#fff';
                    li.style.marginBottom = '5px';
                    
                    li.innerHTML = `
                        <div style="display:flex; justify-content:space-between;">
                            <span>${mov.descripcion}</span> 
                            <span style="color:${esIngreso ? '#27ae60' : '#e74c3c'}; font-weight:bold;">
                                ${esIngreso ? '+' : '-'}$${parseFloat(mov.monto).toFixed(2)}
                            </span>
                        </div>`;
                    listaMov.appendChild(li);
                });
            }
        } catch (error) {
            console.error(error);
            listaMov.innerHTML = '<p>Error al obtener detalle.</p>';
        }
    }

    // Botones Finanzas
    if(btnCerrarFinanzas) btnCerrarFinanzas.addEventListener('click', () => {
        modalDetalleFinanzas.classList.add('oculto');
        listaFinanzasDias.classList.remove('oculto');
    });

    if(btnRegistrarGastoExtra) btnRegistrarGastoExtra.addEventListener('click', () => {
        if(modalGastoExtra) modalGastoExtra.classList.remove('oculto');
    });

    if(btnCancelarGasto) btnCancelarGasto.addEventListener('click', () => {
        if(modalGastoExtra) modalGastoExtra.classList.add('oculto');
    });

    if(formEgresoRapido) formEgresoRapido.addEventListener('submit', async (e) => {
        e.preventDefault();
        const descripcion = getEl('descEgreso').value;
        const monto = getEl('montoEgreso').value;

        try {
            const res = await fetch('/api/finanzas/egreso', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'include',
                body: JSON.stringify({ descripcion, monto })
            });
            if(res.ok) {
                modalGastoExtra.classList.add('oculto');
                formEgresoRapido.reset();
                cargarFinanzas(); // Recargar
                alert('Gasto registrado con éxito.');
            }
        } catch(e) { console.error(e); }
    });

    // Comparador
    if(btnEjecutarComparacion) btnEjecutarComparacion.addEventListener('click', () => {
        const fA = getEl('fechaA').value;
        const fB = getEl('fechaB').value;
        const resDiv = getEl('resultadoComparacion');

        if(!fA || !fB) return alert("Selecciona dos fechas.");

        const diaA = datosFinanzasCache.find(d => d.fecha.startsWith(fA));
        const diaB = datosFinanzasCache.find(d => d.fecha.startsWith(fB));

        if(!diaA || !diaB) {
            resDiv.innerHTML = '<span style="color:red">Datos insuficientes para comparar.</span>';
            return;
        }

        const utilidadA = parseFloat(diaA.total_ingresos) - (parseFloat(diaA.total_egresos) + nominaDiariaGlobal);
        const utilidadB = parseFloat(diaB.total_ingresos) - (parseFloat(diaB.total_egresos) + nominaDiariaGlobal);

        let diff = 0;
        if(utilidadA !== 0) diff = ((utilidadB - utilidadA) / Math.abs(utilidadA)) * 100;
        
        const esMejor = diff >= 0;
        
        resDiv.innerHTML = `
            <div style="padding:15px; background:${esMejor ? '#eafaf1' : '#fdedec'}; border:1px solid ${esMejor ? 'green' : 'red'}; border-radius:8px;">
                Diferencia: <b style="font-size:1.2em; color:${esMejor?'green':'red'}">${diff > 0 ? '+' : ''}${diff.toFixed(1)}%</b><br>
                <small>($${utilidadB.toFixed(2)} vs $${utilidadA.toFixed(2)})</small>
            </div>
        `;
    });

    // Configuración Gastos Fijos
    if(btnConfigurarGastosFijos) btnConfigurarGastosFijos.addEventListener('click', () => {
        const nuevoMonto = prompt("Ingresa el monto diario fijo (Renta + Nómina + Servicios):", nominaDiariaGlobal);
        if(nuevoMonto && !isNaN(nuevoMonto)) {
            fetch('/api/finanzas/gastos-fijos', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ concepto: 'Diario Global', monto: parseFloat(nuevoMonto) })
            }).then(() => {
                alert("Monto actualizado.");
                cargarFinanzas();
            });
        }
    });

    // ==========================================
    // 11. HISTORIAL DE PEDIDOS (ROBUSTO)
    // ==========================================
    async function cargarPedidosCompletados() {
        if(!listaPedidosCompletados) return;
        listaPedidosCompletados.classList.remove('oculto');
        if(detallePedidoCompletado) detallePedidoCompletado.classList.add('oculto');
        listaPedidosCompletados.innerHTML = '<p>Cargando historial...</p>';

        try {
            const res = await fetch('/api/pedidos/completados', { credentials: 'include' });
            
            // Verificamos si la respuesta es JSON válido
            const text = await res.text();
            let pedidos = [];
            try {
                pedidos = JSON.parse(text);
            } catch(e) {
                console.error("Respuesta inválida servidor:", text);
                listaPedidosCompletados.innerHTML = '<p style="color:red">Error del servidor al obtener historial.</p>';
                return;
            }

            listaPedidosCompletados.innerHTML = '';
            if(!Array.isArray(pedidos) || pedidos.length === 0) {
                listaPedidosCompletados.innerHTML = '<p>No hay historial disponible.</p>';
                return;
            }

            pedidos.forEach(p => {
                const div = document.createElement('div');
                div.classList.add('pedido-item');
                div.innerHTML = `
                    <h3>${p.mesa}</h3>
                    <p>Total: $${parseFloat(p.total_calculado).toFixed(2)}</p>
                    <small>${new Date(p.fecha_creacion).toLocaleString()}</small>
                `;
                div.onclick = () => mostrarDetallePedido(p.id_pedido);
                listaPedidosCompletados.appendChild(div);
            });
        } catch(e) { 
            console.error(e); 
            listaPedidosCompletados.innerHTML = '<p style="color:red">Error de conexión.</p>';
        }
    }

    async function mostrarDetallePedido(id) {
         if (!listaPedidosCompletados || !detallePedidoCompletado) return;
         
         listaPedidosCompletados.classList.add('oculto');
         detallePedidoCompletado.classList.remove('oculto');
         
         getEl('detallePedidoTitulo').textContent = 'Cargando...';
         getEl('detalleProductosLista').innerHTML = '';
         getEl('detalleIngredientesLista').innerHTML = '';

         try {
            const res = await fetch(`/api/pedidos/completados/${id}`, {credentials: 'include'});
            if (!res.ok) throw new Error('Error al cargar detalle');

            const data = await res.json();

            getEl('detallePedidoTitulo').textContent = `Pedido: ${data.info.mesa}`;
            getEl('detallePedidoTotal').innerHTML = `
                Total Cobrado: <b>$${parseFloat(data.info.total_calculado).toFixed(2)}</b><br>
                <small>Fecha: ${new Date(data.info.fecha_creacion).toLocaleString()}</small>
            `;

            const listaProd = getEl('detalleProductosLista');
            data.productos.forEach(prod => {
                const li = document.createElement('li');
                li.innerHTML = `${prod.cantidad}x ${prod.nombre} <span style="float:right">$${prod.precio_en_pedido}</span>`;
                listaProd.appendChild(li);
            });

            const listaIng = getEl('detalleIngredientesLista');
            if (data.ingredientes.length === 0) {
                listaIng.innerHTML = '<li style="color:#888">Sin descuento de inventario.</li>';
            } else {
                data.ingredientes.forEach(ing => {
                    const li = document.createElement('li');
                    li.style.borderLeft = "3px solid #e74c3c"; 
                    li.style.backgroundColor = "#fff5f5";
                    li.style.padding = "5px";
                    li.style.marginBottom = "5px";
                    li.innerHTML = `
                        <b>${ing.nombre}</b>
                        <span style="float:right; color:#c0392b">-${parseFloat(ing.total_gastado).toFixed(2)} ${ing.unidad_medida}</span>
                    `;
                    listaIng.appendChild(li);
                });
            }
         } catch(e) {
             console.error(e);
             alert('No se pudo cargar el detalle.');
             detallePedidoCompletado.classList.add('oculto');
             listaPedidosCompletados.classList.remove('oculto');
         }
    }

    if(btnVolverALista) btnVolverALista.addEventListener('click', () => {
        detallePedidoCompletado.classList.add('oculto');
        listaPedidosCompletados.classList.remove('oculto');
    });

    if(btnArchivarTodos) btnArchivarTodos.addEventListener('click', async () => {
        if(!confirm('¿Estás seguro de archivar todo el historial visual?')) return;
        await fetch('/api/pedidos/archivar-completados', { method: 'PUT', credentials: 'include' });
        cargarPedidosCompletados();
    });

    // ==========================================
    // 12. GENERACIÓN DE QR
    // ==========================================
    if(btnExportarQR) btnExportarQR.addEventListener('click', () => {
        const canvas = getEl('qrCanvas');
        if(!canvas) return alert("Falta canvas QR en HTML");
        
        const dataApp = JSON.stringify({
            accion: 'cargar_menu',
            id_restaurante: 1,
            nombre: 'Restaurante YA'
        });

        // Asegurarse de que QRious esté cargado
        if(typeof QRious === 'undefined') return alert("Librería QRious no cargada.");

        const qr = new QRious({
            element: canvas,
            value: dataApp,
            size: 500,
            background: 'white',
            foreground: 'black',
            level: 'H'
        });

        const link = document.createElement('a');
        link.download = 'QR-Restaurante.png';
        link.href = canvas.toDataURL();
        link.click();
    });

    if(botonSalir) botonSalir.addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        window.location.href = '/index.html';
    });
});