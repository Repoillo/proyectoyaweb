document.addEventListener('DOMContentLoaded', () => {
    const listaMesas = document.getElementById('listaMesas');
    const botonSalir = document.querySelector('.botonSalir');

    // --- Verificar Sesión (Blindaje) ---
    async function verificarAcceso() {
        try {
            const res = await fetch('/api/auth/status', { credentials: 'include' });
            if (!res.ok) return window.location.href = '/index.html';
            
            const data = await res.json();
            
            if (data.rol === 'cocinero') {
                window.location.href = '/cocina.html';
                return;
            }
            if (data.rol === 'dueño') {
                // El dueño si quiere puede ver esto, pero idealmente tiene su dashboard
                window.location.href = '/restaurante.html'; 
                return;
            }
            // Si es mesero, continuamos
        } catch (e) { window.location.href = '/index.html'; }
    }
    verificarAcceso();
    cargarMesas();

    // --- Cargar Mesas ---
    async function cargarMesas() {
        try {
            const res = await fetch('/api/mesas', { credentials: 'include' });
            const mesas = await res.json();
            renderizarMesas(mesas);
        } catch (error) {
            console.error(error);
            listaMesas.innerHTML = '<p>Error al cargar mesas. Revisa tu conexión.</p>';
        }
    }

    function renderizarMesas(mesas) {
        listaMesas.innerHTML = '';
        if (mesas.length === 0) {
            listaMesas.innerHTML = '<p>No hay mesas configuradas.</p>';
            return;
        }

        mesas.forEach(mesa => {
            const esOcupada = mesa.estado === 'ocupada';
            const card = document.createElement('div');
            card.classList.add('pedido-item'); 
            
            // LÓGICA DE ICONOS DE ESTADO
            let iconoEstadoHTML = '';
            let claseAnimacion = '';

            if (esOcupada) {
                // 1. ¿Pidieron la cuenta?
                if (mesa.estado_pedido === 'por_pagar') {
                    claseAnimacion = 'parpadeo'; // CSS que agregaremos abajo
                    if (mesa.metodo_pago === 'tarjeta') {
                        iconoEstadoHTML = `<div class="icono-estado tarjeta"><ion-icon name="card-outline"></ion-icon> TARJETA</div>`;
                    } else {
                        iconoEstadoHTML = `<div class="icono-estado efectivo"><ion-icon name="cash-outline"></ion-icon> EFECTIVO</div>`;
                    }
                } 
                // 2. ¿Ya está completado (comieron) pero no han pedido cuenta?
                else if (mesa.estado_pedido === 'completado') {
                    // Aquí podrías poner la palomita si quieres indicar que ya se sirvió todo
                    iconoEstadoHTML = `<div class="icono-estado ok"><ion-icon name="checkmark-circle-outline"></ion-icon> SERVIDO</div>`;
                }
                // 3. Estado normal (Esperando o Comiendo)
                else {
                    iconoEstadoHTML = `<div class="icono-estado reloj"><ion-icon name="time-outline"></ion-icon> EN CURSO</div>`;
                }
            }

            // Bordes de color
            let colorBorde = '#2ecc71'; // Verde (Libre)
            if (esOcupada) {
                if (mesa.estado_pedido === 'por_pagar') colorBorde = '#f39c12'; // Naranja (Atención)
                else colorBorde = '#e74c3c'; // Rojo (Ocupada normal)
            }

            card.style.borderLeft = `8px solid ${colorBorde}`;
            if (claseAnimacion) card.classList.add(claseAnimacion);

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="font-size: 1.5em; margin:0;">${mesa.numero_mesa}</h3>
                    ${esOcupada ? iconoEstadoHTML : ''}
                </div>
                
                <p style="color: ${esOcupada ? '#555' : '#2ecc71'}; font-weight: bold; margin-top:10px;">
                    ${esOcupada ? 'OCUPADA' : 'LIBRE'}
                </p>

                ${esOcupada ? `
                    <div style="background: #f9f9f9; padding: 10px; border-radius: 5px; margin: 10px 0;">
                        <span style="display:block; font-size: 0.8em; color: #666;">PIN Cliente:</span>
                        <span style="font-size: 1.5em; font-weight: bold; color: #333; letter-spacing: 2px;">${mesa.codigo_sesion}</span>
                    </div>
                    <button class="boton botonEliminar btnLiberar" data-id="${mesa.id_mesa}" style="width: 100%; padding: 15px;">
                        <ion-icon name="lock-open-outline"></ion-icon> Liberar & Cerrar
                    </button>
                ` : `
                    <div style="margin: 15px 0; color: #ccc; font-style: italic;">Sin clientes</div>
                    <button class="boton botonAgregar btnOcupar" data-id="${mesa.id_mesa}" style="width: 100%; padding: 15px;">
                        <ion-icon name="key-outline"></ion-icon> Ocupar Mesa
                    </button>
                `}
            `;
            listaMesas.appendChild(card);
        });
    }
    // --- Eventos ---
    listaMesas.addEventListener('click', async (e) => {
        // Usamos closest para asegurar que detecte el clic aunque le den al icono
        const btnOcupar = e.target.closest('.btnOcupar');
        const btnLiberar = e.target.closest('.btnLiberar');

        if (btnOcupar) {
            const id = btnOcupar.dataset.id;
            if(!confirm('¿Generar código y ocupar esta mesa?')) return;
            await accionMesa(id, 'ocupar');
        }
        
        if (btnLiberar) {
            const id = btnLiberar.dataset.id;
            if(!confirm('¿Estás seguro de liberar la mesa? Esto cerrará la sesión del cliente.')) return;
            await accionMesa(id, 'liberar');
        }
    });

    async function accionMesa(id, accion) {
        try {
            const res = await fetch(`/api/mesas/${id}/${accion}`, { 
                method: 'POST',
                credentials: 'include'
            });
            
            if(res.ok) {
                cargarMesas(); // Recargar para ver cambios
            } else {
                alert('Error al procesar la acción');
            }
        } catch (e) { console.error(e); }
    }

    botonSalir.addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        window.location.href = '/index.html';
    });

    // Auto recarga cada 10 segundos para mantener sincronizados a todos los meseros
    setInterval(cargarMesas, 10000);
});