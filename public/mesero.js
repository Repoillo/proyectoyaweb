document.addEventListener('DOMContentLoaded', () => {
    const listaMesas = document.getElementById('listaMesas');
    const botonSalir = document.querySelector('.botonSalir');

    // --- Verificar Sesión ---
    async function verificarAcceso() {
        try {
            const res = await fetch('/api/auth/status');
            if (!res.ok) return window.location.href = '/index.html';
            const data = await res.json();
            // Permitimos dueño y mesero
            if (data.rol === 'cocinero') window.location.href = '/cocina.html';
        } catch (e) { window.location.href = '/index.html'; }
    }
    verificarAcceso();
    cargarMesas();

    // --- Cargar Mesas ---
    async function cargarMesas() {
        try {
            const res = await fetch('/api/mesas');
            const mesas = await res.json();
            renderizarMesas(mesas);
        } catch (error) {
            console.error(error);
            listaMesas.innerHTML = '<p>Error al cargar mesas.</p>';
        }
    }

    function renderizarMesas(mesas) {
        listaMesas.innerHTML = '';
        if (mesas.length === 0) {
            listaMesas.innerHTML = '<p>No hay mesas configuradas en el sistema.</p>';
            return;
        }

        mesas.forEach(mesa => {
            const esOcupada = mesa.estado === 'ocupada';
            const card = document.createElement('div');
            card.classList.add('pedido-item'); // Reusamos estilo de tarjeta
            
            // Estilo condicional: Verde (libre) o Rojo (ocupada)
            card.style.borderLeft = esOcupada ? '5px solid #e74c3c' : '5px solid #2ecc71';
            
            let contenidoHTML = `
                <h3>${mesa.numero_mesa}</h3>
                <p style="color: ${esOcupada ? '#e74c3c' : '#2ecc71'}; font-size: 1em; margin-bottom: 15px;">
                    ${esOcupada ? 'OCUPADA' : 'LIBRE'}
                </p>
            `;

            if (esOcupada) {
                contenidoHTML += `
                    <div style="font-size: 2em; font-weight: bold; margin: 10px 0;">
                        ${mesa.codigo_sesion}
                    </div>
                    <small>Código de Sesión</small>
                    <button class="boton botonEliminar btnLiberar" data-id="${mesa.id_mesa}" style="margin-top: 15px; width: 100%;">
                        Liberar Mesa
                    </button>
                `;
            } else {
                contenidoHTML += `
                    <div style="font-size: 2em; color: #ccc; margin: 10px 0;">--</div>
                    <button class="boton botonAgregar btnOcupar" data-id="${mesa.id_mesa}" style="margin-top: 15px; width: 100%;">
                        Ocupar Mesa
                    </button>
                `;
            }

            card.innerHTML = contenidoHTML;
            listaMesas.appendChild(card);
        });
    }

    // --- Eventos ---
    listaMesas.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btnOcupar')) {
            const id = e.target.dataset.id;
            if(!confirm('¿Generar código para esta mesa?')) return;
            await accionMesa(id, 'ocupar');
        }
        if (e.target.classList.contains('btnLiberar')) {
            const id = e.target.dataset.id;
            if(!confirm('¿Liberar mesa? Esto cerrará la sesión de la app.')) return;
            await accionMesa(id, 'liberar');
        }
    });

    async function accionMesa(id, accion) {
        try {
            const res = await fetch(`/api/mesas/${id}/${accion}`, { method: 'POST' });
            if(res.ok) cargarMesas();
            else alert('Error al procesar la acción');
        } catch (e) { console.error(e); }
    }

    botonSalir.addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/index.html';
    });

    // Auto recarga para ver si se liberan mesas solas (futuro)
    setInterval(cargarMesas, 10000);
});