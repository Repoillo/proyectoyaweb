document.addEventListener('DOMContentLoaded', () => {

    // 1. FUNCIÓN DE SEGURIDAD (Blindaje contra virus/XSS)
    function escapeHTML(str) {
        if (!str && str !== 0) return '';
        return str.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // --- ELEMENTOS DOM ---
    const listaComandas = document.getElementById('listaComandas');
    const botonSalir = document.querySelector('.botonSalir');
    const modalReceta = document.getElementById('modalReceta');
    const tituloModalReceta = document.getElementById('tituloModalReceta');
    const contenedorRecetasModal = document.getElementById('contenedorRecetasModal');
    const botonCerrarModal = modalReceta.querySelector('.botonCancelar');
    const toast = document.getElementById('toast');

    async function verificarAccesoCocina() {
        try {
            const respuesta = await fetch('/api/auth/status', { credentials: 'include' });
            if (!respuesta.ok) {
                 window.location.href = '/index.html';
                 return;
            }
            
            const data = await respuesta.json();
            
            if (data.rol === 'dueño') {
                window.location.href = '/restaurante.html';
                return;
            }
            // Corrección clave: Si es mesero, redirigir a su vista
            if (data.rol === 'mesero') {
                window.location.href = '/mesero.html';
                return;
            }
            
            console.log('Sesión de cocinero activa verificada.');
            
        } catch (error) {
            console.error('Error verificando sesión en cocina:', error);
             window.location.href = '/index.html';
        }
    }
    
    // --- INICIALIZACIÓN ---
    verificarAccesoCocina();
    cargarPedidosActivos();

    // --- CARGAR PEDIDOS ---
    async function cargarPedidosActivos() {
        try {
            const res = await fetch('/api/pedidos/cocina/activos', { credentials: 'include' });
            if (!res.ok) throw new Error('No se pudieron cargar los pedidos');
            
            const pedidos = await res.json();
            renderizarListaComandas(pedidos);

        } catch (error) {
            console.error(error);
            listaComandas.innerHTML = '<p>Error al cargar pedidos. Intenta recargar.</p>';
        }
    }

    // --- RENDERIZAR PEDIDOS ---
    function renderizarListaComandas(pedidos) {
        listaComandas.innerHTML = ''; 

        if (pedidos.length === 0) {
            listaComandas.innerHTML = '<p style="text-align: center; font-size: 1.2em; color: #777;">No hay pedidos pendientes.</p>';
            return;
        }

        pedidos.forEach(pedido => {
            const comandaItem = document.createElement('div');
            comandaItem.classList.add('comanda-item');
            comandaItem.dataset.id = pedido.id_pedido;

            const fechaPedido = new Date(pedido.fecha_creacion);
            const diffMins = Math.floor((new Date() - fechaPedido) / 60000);
            const claseEstado = `estado-${pedido.estado.replace(' ', '-')}`;

            // Lógica visual para la caja de alertas por fuera
            let alertasHTML = '';
            if (pedido.alertas && pedido.alertas.length > 0) {
                let listaAlertas = pedido.alertas.map(alerta => {
                    let textoExcluidos = alerta.excluidos.length > 0 
                        ? `<span style="color:#c0392b; font-weight:bold; background:#fadbd8; padding: 2px 6px; border-radius:4px;">Sin: ${alerta.excluidos.join(', ')}</span>` 
                        : '';
                    let textoNotas = alerta.notas 
                        ? `<span style="color:#b9770e; font-style:italic;">"${escapeHTML(alerta.notas)}"</span>` 
                        : '';
                    
                    return `<li style="margin-bottom: 6px;">
                                <strong>${alerta.cantidad}x ${escapeHTML(alerta.producto)}</strong> 
                                <div style="margin-top:3px; padding-left:10px;">${textoExcluidos} ${textoNotas}</div>
                            </li>`;
                }).join('');

                // Usamos grid-column: 1 / -1 para que la alerta abarque todo el ancho debajo de los botones
                alertasHTML = `
                    <div style="grid-column: 1 / -1; background-color: #fdf2e9; border-left: 5px solid #e74c3c; padding: 12px; margin-top: 10px; border-radius: 5px; font-size: 0.95em;">
                        <h4 style="margin: 0 0 8px 0; color: #c0392b;"><ion-icon name="warning-outline" style="vertical-align: middle;"></ion-icon> Instrucciones Especiales:</h4>
                        <ul style="margin: 0; padding-left: 20px; color: #444; list-style-type: square;">
                            ${listaAlertas}
                        </ul>
                    </div>
                `;
            }

            comandaItem.innerHTML = `
                <div class="comanda-info" data-id="${pedido.id_pedido}">
                    <h3>${escapeHTML(pedido.mesa)}</h3>
                    <p>Pedido #${pedido.id_pedido}</p>
                </div>
                <div class="comanda-info" data-id="${pedido.id_pedido}">
                    <p>${diffMins} min</p>
                </div>
                <div class="comanda-estado">
                    <span class="${claseEstado}">${escapeHTML(pedido.estado)}</span>
                </div>
                <div class="comanda-acciones">
                    <button class="boton-accion boton-proceso" title="Marcar 'En Proceso'" data-id="${pedido.id_pedido}" data-estado="en proceso">⏱</button>
                    <button class="boton-accion boton-completar" title="Marcar 'Completado'" data-id="${pedido.id_pedido}" data-estado="completado">✅</button>
                </div>
                ${alertasHTML}
            `;
            listaComandas.appendChild(comandaItem);
        });
    }

    // --- MANEJO DE EVENTOS (DELEGADOS) ---
    listaComandas.addEventListener('click', (e) => {
        
        // Clic en Botón "En Proceso" (Reloj)
        if (e.target.classList.contains('boton-proceso')) {
            const id = e.target.dataset.id;
            actualizarEstado(id, 'en proceso', false); // false = no confirmar
        }
        
        // Clic en Botón "Completado" (Palomita)
        if (e.target.classList.contains('boton-completar')) {
            const id = e.target.dataset.id;
            actualizarEstado(id, 'completado', true); // true = confirmar
        }

        // Clic en la Info del Pedido (Abrir Modal)
        if (e.target.closest('.comanda-info')) {
            const id = e.target.closest('.comanda-item').dataset.id;
            abrirModalReceta(id);
        }
    });

    // --- LÓGICA DE ACTUALIZAR ESTADO ---
    async function actualizarEstado(id, nuevoEstado, necesitaConfirmacion) {
        
        if (necesitaConfirmacion) {
            if (!confirm(`¿Estás seguro de que quieres marcar este pedido como '${nuevoEstado}'?`)) {
                return;
            }
        }

        try {
            const res = await fetch(`/api/pedidos/${id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ nuevoEstado })
            });

            const data = await res.json();

            if (!res.ok) {
                // Si es error de stock, data.message lo dirá
                throw new Error(data.message || 'No se pudo actualizar el estado.');
            }

            // ¡Éxito!
            if (!necesitaConfirmacion) {
                // Mostrar feedback visual (Toast)
                mostrarToast(`Pedido #${id} se marcó 'En Proceso'`);
            }
            
            // Recargar la lista de pedidos
            cargarPedidosActivos();

        } catch (error) {
            console.error('Error al actualizar estado:', error);
            alert(`Error: ${error.message}`); // Mostrar error (ej. stock insuficiente)
        }
    }

    async function abrirModalReceta(idPedido) {
        tituloModalReceta.textContent = `Cargando Receta (Pedido #${idPedido})...`;
        contenedorRecetasModal.innerHTML = '';
        modalReceta.classList.remove('oculto');

        try {
            const res = await fetch(`/api/pedidos/cocina/detalles/${idPedido}`, { credentials: 'include' });
            if (!res.ok) throw new Error('No se pudo cargar la receta');

            const productosConReceta = await res.json();
            tituloModalReceta.textContent = `Receta del Pedido #${idPedido}`;
            
            if (productosConReceta.length === 0) {
                contenedorRecetasModal.innerHTML = '<p>No hay productos con receta en este pedido.</p>';
                return;
            }

            let htmlReceta = '';
            productosConReceta.forEach(item => {
                htmlReceta += `<h3 style="color:var(--primaryblue); border-bottom:1px solid #eee; padding-bottom:5px;">${item.cantidad_a_preparar}x ${escapeHTML(item.nombre_producto)}</h3>`;
                
                if (item.receta.length > 0) {
                    htmlReceta += '<ul style="list-style:none; padding-left:10px;">';
                    item.receta.forEach(ing => {
                        // Si está excluido, lo mostramos gris, tachado y con la palabra (SIN)
                        if (ing.excluido) {
                            htmlReceta += `<li style="margin-bottom:8px;">
                                <del style="color:#aaa;">${escapeHTML(ing.nombre)} (${ing.cantidad_usada} ${escapeHTML(ing.unidad_medida)})</del> 
                                <span style="color:#e74c3c; font-weight:bold; font-size:0.9em; margin-left:5px;">(OMITIR)</span>
                            </li>`;
                        } else {
                            htmlReceta += `<li style="margin-bottom:8px;">
                                <ion-icon name="checkmark-outline" style="color:#27ae60; margin-right:5px;"></ion-icon>
                                ${escapeHTML(ing.nombre)} <span style="color:#777; font-size:0.9em;">(${ing.cantidad_usada} ${escapeHTML(ing.unidad_medida)})</span>
                            </li>`;
                        }
                    });
                    htmlReceta += '</ul>';
                } else {
                    htmlReceta += '<p style="color:#777; font-style:italic;">(Preparación directa, sin receta ligada)</p>';
                }
            });

            contenedorRecetasModal.innerHTML = htmlReceta;

        } catch (error) {
            console.error(error);
            tituloModalReceta.textContent = 'Error al cargar la receta';
        }
    }

    // Cerrar Modal
    botonCerrarModal.addEventListener('click', () => {
        modalReceta.classList.add('oculto');
    });

    // --- LÓGICA DEL TOAST ---
    function mostrarToast(mensaje) {
        toast.textContent = mensaje;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000); // El toast desaparece después de 3 segundos
    }

    // --- BOTÓN SALIR ---
    botonSalir.addEventListener('click', async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
            window.location.href = '/index.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            window.location.href = '/index.html';
        }
    });

    // --- RECARGA AUTOMÁTICA ---
    setInterval(cargarPedidosActivos, 30000);
    verificarAccesoCocina();
});